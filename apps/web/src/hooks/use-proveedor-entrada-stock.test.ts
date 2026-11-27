import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useProveedorEntradaStock } from "./use-proveedor-entrada-stock";
import { servicioIdentidad } from "../services/identidad.service";
import { servicioProveedores, type ProveedorRegistrado } from "../services/proveedores.service";

vi.mock("../services/identidad.service", () => ({ servicioIdentidad: { consultar: vi.fn() } }));
vi.mock("../services/proveedores.service", () => ({ servicioProveedores: { listar: vi.fn(), crear: vi.fn() } }));

const consultar = vi.mocked(servicioIdentidad.consultar);
const listar = vi.mocked(servicioProveedores.listar);
const crear = vi.mocked(servicioProveedores.crear);
const proveedor = (cambios: Partial<ProveedorRegistrado> = {}) => ({ id: "p1", nombre: "ACME SAC", razonSocial: "ACME SAC", nombres: null, apellidoPaterno: null, apellidoMaterno: null, tipoDocumento: "06", numeroDocumento: "20123456789", ...cambios });

function montar() {
  const setError = vi.fn();
  const manejarError = vi.fn();
  const hook = renderHook(() => useProveedorEntradaStock(setError, manejarError));
  return { ...hook, setError, manejarError };
}

beforeEach(() => { consultar.mockReset(); listar.mockReset(); crear.mockReset(); });

describe("useProveedorEntradaStock", () => {
  it.each([
    ["DNI", "123", "Ingresa los 8 dígitos del DNI para buscar al proveedor."],
    ["RUC", "201234567890", "Ingresa los 11 dígitos del RUC para buscar al proveedor."],
    ["EXT", "  ", "Ingresa el documento extranjero para buscar al proveedor."],
  ])("valida la longitud del %s", async (tipo, numero, mensaje) => {
    const { result, setError } = montar();
    act(() => { result.current.setProveedorTipoDocumento(tipo); result.current.setProveedorNumeroDocumento(numero); });
    await act(() => result.current.buscarProveedor());
    expect(setError).toHaveBeenCalledWith(mensaje);
    expect(listar).not.toHaveBeenCalled();
  });

  it("busca coincidencias exactas por número y tipo", async () => {
    const { result } = montar();
    listar.mockResolvedValueOnce([proveedor(), proveedor({ id: "p2", numeroDocumento: "20123456780" }), proveedor({ id: "p3", tipoDocumento: "RUC" })]);
    act(() => result.current.setProveedorNumeroDocumento(" 20123456789 "));
    await act(() => result.current.buscarProveedor());
    expect(listar).toHaveBeenCalledWith("20123456789");
    expect(result.current.proveedoresEncontrados.map((p) => p.id)).toEqual(["p1", "p3"]);
    expect(result.current.proveedorNoEncontrado).toBe(false);

    listar.mockResolvedValueOnce([]);
    act(() => { result.current.setProveedorTipoDocumento("DNI"); result.current.setProveedorNumeroDocumento("12345678"); });
    await act(() => result.current.buscarProveedor());
    expect(result.current.proveedorNoEncontrado).toBe(true);

    listar.mockResolvedValueOnce([proveedor({ tipoDocumento: "EXT", numeroDocumento: "X1" })]);
    act(() => { result.current.setProveedorTipoDocumento("EXT"); result.current.setProveedorNumeroDocumento("X1"); });
    await act(() => result.current.buscarProveedor());
    expect(result.current.proveedoresEncontrados).toHaveLength(1);
  });

  it("delega los errores de búsqueda", async () => {
    const { result, manejarError } = montar();
    const error = new Error("x");
    listar.mockRejectedValueOnce(error);
    act(() => result.current.setProveedorNumeroDocumento("20123456789"));
    await act(() => result.current.buscarProveedor());
    expect(manejarError).toHaveBeenCalledWith(error, "No se pudo buscar el proveedor en el directorio.");
    expect(result.current.buscandoProveedores).toBe(false);
  });

  it("consulta la identidad para registrar un proveedor nuevo", async () => {
    const { result, setError, manejarError } = montar();
    act(() => result.current.setProveedorTipoDocumento("EXT"));
    await act(() => result.current.abrirRegistroProveedor());
    expect(setError).toHaveBeenLastCalledWith("El directorio de proveedores permite registrar DNI o RUC.");

    consultar.mockResolvedValueOnce({ tipoDocumento: "DNI", numeroDocumento: "12345678", tipoPersona: "NATURAL", nombres: "Ana", apellidoPaterno: "Ríos" });
    act(() => { result.current.setProveedorTipoDocumento("DNI"); result.current.setProveedorNumeroDocumento(" 12345678 "); });
    await act(() => result.current.abrirRegistroProveedor());
    expect(consultar).toHaveBeenCalledWith("DNI", "12345678");
    expect(result.current).toMatchObject({ proveedor: "Ana Ríos", proveedorTipoPersona: "NATURAL", proveedorDireccion: "", datosProveedorEditables: true, creandoProveedor: true });

    consultar.mockResolvedValueOnce({ tipoDocumento: "RUC", numeroDocumento: "20123456789", tipoPersona: "JURIDICA", razonSocial: "ACME", direccion: "Av. 1" });
    act(() => result.current.setProveedorTipoDocumento("RUC"));
    await act(() => result.current.abrirRegistroProveedor());
    expect(result.current).toMatchObject({ proveedor: "ACME", proveedorDireccion: "Av. 1" });

    consultar.mockRejectedValueOnce("x");
    await act(() => result.current.abrirRegistroProveedor());
    expect(manejarError).toHaveBeenCalledWith("x", "No se pudieron consultar los datos del documento.");
  });

  it("exige consultar la identidad antes de crear", async () => {
    const { result, setError } = montar();
    await act(() => result.current.crearProveedor());
    expect(setError).toHaveBeenCalledWith("Busca los datos del proveedor antes de registrarlo.");
    expect(crear).not.toHaveBeenCalled();
  });

  it.each([
    ["RUC", "20123456789", { razonSocial: "ACME", nombres: undefined }, "JURIDICA"],
    ["RUC", "10123456789", { razonSocial: undefined, nombres: "Ana" }, "NATURAL"],
    ["DNI", "12345678", { razonSocial: undefined, nombres: "Ana", apellidoPaterno: "Ríos" }, "NATURAL"],
  ])("crea el proveedor %s %s con los datos según su tipo", async (tipo, numero, esperado, tipoPersona) => {
    const { result, manejarError } = montar();
    consultar.mockResolvedValue({ tipoDocumento: tipo as "RUC", numeroDocumento: numero, tipoPersona: tipoPersona as "NATURAL", razonSocial: tipo === "RUC" && numero.startsWith("20") ? "ACME" : undefined, nombres: "Ana", apellidoPaterno: "Ríos" });
    crear.mockResolvedValueOnce(proveedor({ nombre: "Creado" })).mockRejectedValueOnce("falla");
    act(() => { result.current.setProveedorTipoDocumento(tipo); result.current.setProveedorNumeroDocumento(numero); });
    await act(() => result.current.abrirRegistroProveedor());
    await act(() => result.current.crearProveedor());
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ tipoDocumento: tipo, numeroDocumento: numero, ...esperado }));
    expect(result.current).toMatchObject({ proveedor: "Creado", proveedorTipoPersona: tipoPersona, datosProveedorEditables: false, creandoProveedor: false });
    expect(result.current.proveedoresEncontrados).toHaveLength(1);
    await act(() => result.current.crearProveedor());
    expect(manejarError).toHaveBeenCalledWith("falla", "No se pudo registrar el proveedor en el directorio.");
  });

  it("usa la razón social ingresada si la consulta no la trae", async () => {
    const { result } = montar();
    consultar.mockResolvedValueOnce({ tipoDocumento: "RUC", numeroDocumento: "20123456789", tipoPersona: "JURIDICA" });
    crear.mockResolvedValueOnce(proveedor());
    act(() => result.current.setProveedorNumeroDocumento("20123456789"));
    await act(() => result.current.abrirRegistroProveedor());
    act(() => result.current.setProveedor("Manual SAC"));
    await act(() => result.current.crearProveedor());
    expect(crear).toHaveBeenCalledWith(expect.objectContaining({ razonSocial: "Manual SAC" }));
  });

  it.each([
    [proveedor(), "RUC", "JURIDICA", "ACME SAC"],
    [proveedor({ nombre: "", razonSocial: null, nombres: "Ana", apellidoPaterno: "Ríos", tipoDocumento: "01", numeroDocumento: "12345678" }), "DNI", "NATURAL", "Ana Ríos"],
    [proveedor({ nombre: "", razonSocial: "Pérez EIRL", numeroDocumento: "10123456789" }), "RUC", "NATURAL", "Pérez EIRL"],
    [proveedor({ tipoDocumento: "EXT", numeroDocumento: "X1" }), "EXT", "JURIDICA", "ACME SAC"],
  ])("selecciona un proveedor del directorio", (entrada, tipo, tipoPersona, nombre) => {
    const { result } = montar();
    act(() => result.current.seleccionarProveedor(entrada));
    expect(result.current).toMatchObject({ proveedor: nombre, proveedorTipoDocumento: tipo, proveedorTipoPersona: tipoPersona, proveedorNumeroDocumento: entrada.numeroDocumento, datosProveedorEditables: true });
  });

  it("limpia todos los datos del proveedor", () => {
    const { result } = montar();
    act(() => { result.current.seleccionarProveedor(proveedor()); result.current.setDatosProveedorEditables(true); result.current.setProveedorDireccion("x"); result.current.setProveedorTipoPersona("X"); });
    act(() => result.current.limpiarProveedor());
    expect(result.current).toMatchObject({ proveedor: "", proveedorTipoPersona: "", proveedorTipoDocumento: "RUC", proveedorNumeroDocumento: "", proveedorDireccion: "", datosProveedorEditables: false });
  });
});
