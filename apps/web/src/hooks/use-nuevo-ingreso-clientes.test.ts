import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useNuevoIngresoClientes } from "./use-nuevo-ingreso-clientes";
import { servicioIngresos, type ClienteRegistrado } from "../services/ingresos.service";

vi.mock("../services/ingresos.service", () => ({ servicioIngresos: { buscarClientes: vi.fn(), registrarCliente: vi.fn() } }));
const buscar = vi.mocked(servicioIngresos.buscarClientes);
const registrar = vi.mocked(servicioIngresos.registrarCliente);

const cliente = (cambios: Partial<ClienteRegistrado> = {}) => ({ id: "c1", tipoPersona: "NATURAL", tipoDocumento: "01", numeroDocumento: "12345678", nombres: "Ana", apellidoPaterno: "Ríos", apellidoMaterno: null, razonSocial: null, direccion: "Av. 1", ...cambios }) as ClienteRegistrado;

function montar() {
  const actualizarCampoNubefact = vi.fn();
  const setError = vi.fn();
  const hook = renderHook(() => useNuevoIngresoClientes({ actualizarCampoNubefact, setError }));
  return { ...hook, actualizarCampoNubefact, setError };
}

beforeEach(() => { buscar.mockReset(); registrar.mockReset(); });

describe("useNuevoIngresoClientes", () => {
  it("solo busca documentos completos del tipo elegido", async () => {
    const { result } = montar();
    act(() => result.current.setBusquedaCliente("1234"));
    let r: unknown = "x";
    await act(async () => { r = await result.current.buscarClientes("01"); });
    expect(r).toBeNull();
    act(() => result.current.setBusquedaCliente("12345678"));
    await act(async () => { r = await result.current.buscarClientes("06"); });
    expect(r).toBeNull();
    expect(buscar).not.toHaveBeenCalled();
  });

  it("filtra los clientes por el tipo y número de documento", async () => {
    const { result } = montar();
    buscar.mockResolvedValueOnce([
      cliente(),
      cliente({ id: "c2", documentos: [{ tipoDocumento: "06", numeroDocumento: "10123456789" }, { tipoDocumento: "01", numeroDocumento: "12345678" }] }),
      cliente({ id: "c3", tipoDocumento: "06" }),
    ]);
    act(() => result.current.setBusquedaCliente(" 12345678 "));
    let r: ClienteRegistrado[] | null = null;
    await act(async () => { r = await result.current.buscarClientes("01"); });
    expect(buscar).toHaveBeenCalledWith("12345678");
    expect(r!.map((c) => c.id)).toEqual(["c1", "c2"]);
    expect(result.current.clientesEncontrados).toHaveLength(2);
    expect(result.current.buscandoClientes).toBe(false);
  });

  it("descarta resultados de búsquedas reemplazadas e informa errores", async () => {
    const { result, setError } = montar();
    let resolver!: (c: ClienteRegistrado[]) => void;
    buscar.mockReturnValueOnce(new Promise((res) => { resolver = res; }));
    act(() => result.current.setBusquedaCliente("12345678"));
    let pendiente!: Promise<unknown>;
    act(() => { pendiente = result.current.buscarClientes("01"); });
    act(() => result.current.setBusquedaCliente("87654321"));
    await act(async () => { resolver([cliente()]); expect(await pendiente).toBeNull(); });
    expect(result.current.clientesEncontrados).toEqual([]);

    buscar.mockRejectedValueOnce(new Error("Sin conexión")).mockRejectedValueOnce("x");
    await act(() => result.current.buscarClientes("01"));
    expect(setError).toHaveBeenLastCalledWith("Sin conexión");
    await act(() => result.current.buscarClientes("01"));
    expect(setError).toHaveBeenLastCalledWith("No se pudo buscar clientes.");

    let rechazar!: (e: unknown) => void;
    buscar.mockReturnValueOnce(new Promise((_r, rej) => { rechazar = rej; }));
    act(() => { pendiente = result.current.buscarClientes("01"); });
    act(() => result.current.setBusquedaCliente("11111111"));
    setError.mockClear();
    await act(async () => { rechazar(new Error("tarde")); await pendiente; });
    expect(setError).not.toHaveBeenCalled();
  });

  it("selecciona un cliente prefiriendo su DNI y completa NubeFact", () => {
    const { result, actualizarCampoNubefact } = montar();
    act(() => result.current.seleccionarCliente(cliente({ documentos: [{ tipoDocumento: "06", numeroDocumento: "10123456789" }, { tipoDocumento: "01", numeroDocumento: "12345678" }] })));
    expect(actualizarCampoNubefact.mock.calls).toEqual([
      ["cliente_tipo_de_documento", "1"], ["cliente_numero_de_documento", "12345678"], ["cliente_denominacion", "Ana Ríos"], ["cliente_direccion", "Av. 1"],
    ]);
    expect(result.current.clienteSeleccionado?.id).toBe("c1");
  });

  it("usa la razón social y el primer documento disponible", async () => {
    const { result, actualizarCampoNubefact } = montar();
    act(() => result.current.seleccionarCliente(cliente({ razonSocial: "ACME", tipoDocumento: "06", numeroDocumento: "20123456789", direccion: null })));
    expect(actualizarCampoNubefact).toHaveBeenCalledWith("cliente_tipo_de_documento", "6");
    expect(actualizarCampoNubefact).toHaveBeenCalledWith("cliente_denominacion", "ACME");
    expect(actualizarCampoNubefact).toHaveBeenCalledWith("cliente_direccion", "");
    act(() => result.current.seleccionarDocumentoCliente({ tipoDocumento: "04", numeroDocumento: "X" }));
    expect(actualizarCampoNubefact).toHaveBeenCalledWith("cliente_tipo_de_documento", "4");
    act(() => result.current.seleccionarDocumentoCliente({ tipoDocumento: "07", numeroDocumento: "X" }));
    act(() => result.current.seleccionarDocumentoCliente({ tipoDocumento: "99", numeroDocumento: "X" }));
    expect(actualizarCampoNubefact).toHaveBeenLastCalledWith("cliente_numero_de_documento", "X");
    expect(actualizarCampoNubefact).toHaveBeenCalledWith("cliente_tipo_de_documento", "0");
    // Con cliente seleccionado no se vuelve a buscar.
    act(() => result.current.setBusquedaCliente("12345678"));
    await act(() => result.current.buscarClientes("01"));
    expect(buscar).not.toHaveBeenCalled();
  });

  it("actualiza clientes en resultados y reselecciona el actual", async () => {
    const { result, actualizarCampoNubefact } = montar();
    buscar.mockResolvedValueOnce([cliente(), cliente({ id: "c2" })]);
    act(() => result.current.setBusquedaCliente("12345678"));
    await act(() => result.current.buscarClientes("01"));
    act(() => result.current.actualizarClienteEnResultados(cliente({ id: "c2", nombres: "Eva" })));
    expect(result.current.clientesEncontrados[1].nombres).toBe("Eva");
    expect(actualizarCampoNubefact).not.toHaveBeenCalled();
    act(() => result.current.seleccionarCliente(cliente()));
    act(() => result.current.actualizarClienteEnResultados(cliente({ direccion: "Nueva" })));
    expect(actualizarCampoNubefact).toHaveBeenLastCalledWith("cliente_direccion", "Nueva");
  });

  it("registra un cliente y lo selecciona", async () => {
    const { result, setError } = montar();
    registrar.mockResolvedValueOnce({ id: "c1", creado: true });
    buscar.mockResolvedValueOnce([cliente()]);
    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.guardarCliente({ tipoDocumento: "DNI", numeroDocumento: "12345678" }); });
    expect(ok).toBe(true);
    expect(result.current.clienteSeleccionado?.id).toBe("c1");
    expect(result.current.registrandoCliente).toBe(false);

    registrar.mockResolvedValueOnce({ id: "c9", creado: true });
    buscar.mockResolvedValueOnce([cliente()]);
    await act(async () => { ok = await result.current.guardarCliente({ tipoDocumento: "DNI", numeroDocumento: "1" }); });
    expect(ok).toBe(false);
    expect(setError).toHaveBeenLastCalledWith("Cliente registrado, pero no se pudo cargar para esta venta. Búscalo por su documento.");

    registrar.mockRejectedValueOnce("x");
    await act(async () => { ok = await result.current.guardarCliente({ tipoDocumento: "DNI", numeroDocumento: "1" }); });
    expect(setError).toHaveBeenLastCalledWith("No se pudo registrar el cliente.");
  });

  it("quita el cliente y limpia los campos de NubeFact", () => {
    const { result, actualizarCampoNubefact } = montar();
    act(() => result.current.seleccionarCliente(cliente()));
    actualizarCampoNubefact.mockClear();
    act(() => result.current.quitarCliente());
    expect(result.current.clienteSeleccionado).toBeNull();
    expect(actualizarCampoNubefact.mock.calls).toEqual([["cliente_tipo_de_documento", "0"], ["cliente_numero_de_documento", ""], ["cliente_denominacion", ""], ["cliente_direccion", ""]]);
  });
});
