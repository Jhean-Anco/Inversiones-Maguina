import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { lineaDeServicio } from "../domain/ingresos/edicion-nota-venta";
import { ErrorApi } from "../services/api-cliente";
import { servicioIngresos, type NotaVentaEditable, type ResultadoEdicionNotaVenta } from "../services/ingresos.service";
import { useEditarNotaVenta } from "./use-editar-nota-venta";

vi.mock("../services/ingresos.service", () => ({ servicioIngresos: { obtenerNotaVenta: vi.fn(), editarNotaVenta: vi.fn() } }));
const obtener = vi.mocked(servicioIngresos.obtenerNotaVenta);
const editar = vi.mocked(servicioIngresos.editarNotaVenta);

const nota: NotaVentaEditable = {
  id: "n1", codigo: "NV01-1", fecha: "2026-01-02", clienteId: "c1", clienteNombre: "Ana", clienteNumeroDocumento: "12345678", medioPago: "EFECTIVO", observacion: null,
  total: "25.00", importePagado: "25.00", versionDocumento: "v1", editable: true, motivoNoEditable: null,
  detalles: [
    { id: "l1", tipo: "PRODUCTO", presentacionId: "p1", mototaxiModeloId: null, codigoProducto: "A", descripcion: "Filtro", presentacion: "Unidad", cantidad: "2.000", precioUnitario: "10.0000", descuento: "0.00", afectacionIgv: "GRAVADO", total: "20.00", bloqueo: null },
    { id: "l2", tipo: "SERVICIO", presentacionId: null, mototaxiModeloId: null, codigoProducto: null, descripcion: "Fijo", presentacion: null, cantidad: "1.000", precioUnitario: "5.0000", descuento: "0.00", afectacionIgv: "GRAVADO", total: "5.00", bloqueo: "Bloqueada" },
  ],
};
const respuesta = (sinCambios = false) => ({ sinCambios, cambios: [], nota }) as ResultadoEdicionNotaVenta;

async function montar() {
  const guardada = vi.fn();
  const hook = renderHook(() => useEditarNotaVenta("n1", guardada));
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return { ...hook, guardada };
}

beforeEach(() => { obtener.mockReset(); editar.mockReset(); obtener.mockResolvedValue(nota); });

describe("useEditarNotaVenta", () => {
  it("precarga la nota y calcula el total", async () => {
    const { result } = await montar();
    expect(result.current.formulario?.lineas).toHaveLength(2);
    expect(result.current.total).toBe(25);
  });

  it("muestra el error de carga y permite reintentar", async () => {
    obtener.mockRejectedValueOnce(new Error("Sin conexión"));
    const { result } = await montar();
    expect(result.current.error).toBe("Sin conexión");
    expect(result.current.total).toBe(0);
    act(() => result.current.cambiar({ medioPago: "TARJETA" }));
    await act(() => result.current.guardar());
    expect(editar).not.toHaveBeenCalled();
    await act(() => result.current.recargar());
    expect(result.current.nota?.id).toBe("n1");
  });

  it("usa un mensaje propio ante fallos desconocidos", async () => {
    obtener.mockRejectedValueOnce("x");
    const { result } = await montar();
    expect(result.current.error).toMatch(/No se pudo cargar/);
  });

  it("agrega, acumula, modifica y quita líneas sin quitar las bloqueadas", async () => {
    const { result } = await montar();
    act(() => result.current.agregarLinea({ ...lineaDeServicio("x"), tipo: "PRODUCTO", presentacionId: "p1" }));
    expect(result.current.formulario?.lineas[0].cantidad).toBe("3");
    act(() => result.current.agregarLinea(lineaDeServicio("s")));
    act(() => result.current.cambiarLinea("s", { descripcion: "Lavado", precio: "10" }));
    expect(result.current.total).toBe(45);
    act(() => result.current.quitarLinea("s"));
    act(() => result.current.quitarLinea("l2"));
    expect(result.current.formulario?.lineas.map((linea) => linea.clave)).toEqual(["l1", "l2"]);
  });

  it("no envía datos inválidos", async () => {
    const { result } = await montar();
    act(() => result.current.cambiarLinea("l1", { cantidad: "0" }));
    await act(() => result.current.guardar({ preventDefault: vi.fn() } as never));
    expect(result.current.error).toMatch(/cantidad/);
    expect(editar).not.toHaveBeenCalled();
  });

  it("evita el doble envío e informa el resultado", async () => {
    const { result, guardada } = await montar();
    let resolver!: (valor: ResultadoEdicionNotaVenta) => void;
    editar.mockImplementationOnce(() => new Promise((ok) => { resolver = ok; }));
    let primero!: Promise<boolean>;
    act(() => { primero = result.current.guardar(); void result.current.guardar(); });
    expect(result.current.guardando).toBe(true);
    await act(async () => { resolver(respuesta()); await primero; });
    expect(editar).toHaveBeenCalledTimes(1);
    expect(guardada).toHaveBeenCalledWith("La nota NV01-1 se actualizó.");
    editar.mockResolvedValueOnce(respuesta(true));
    await act(() => result.current.guardar());
    expect(guardada).toHaveBeenLastCalledWith("La nota NV01-1 no tenía cambios por guardar.");
  });

  it("pide confirmar la devolución ante el conflicto y la olvida si cambian los datos", async () => {
    const { result } = await montar();
    editar.mockRejectedValueOnce(new ErrorApi("Los pagos superan. Confirma la devolución de S/ 5.00", 409));
    await act(() => result.current.guardar());
    expect(result.current.requiereDevolucion).toBe(true);
    act(() => result.current.setDevolucionConfirmada(true));
    editar.mockResolvedValueOnce(respuesta());
    await act(() => result.current.guardar());
    expect(editar.mock.calls[1][1].confirmarDevolucionExceso).toBe(true);
    act(() => result.current.cambiar({ observacion: "otra" }));
    expect(result.current.requiereDevolucion).toBe(false);
    expect(result.current.devolucionConfirmada).toBe(false);
  });

  it("muestra otros rechazos sin pedir devolución y no guarda notas no editables", async () => {
    const { result } = await montar();
    editar.mockRejectedValueOnce(new ErrorApi("Stock insuficiente", 409));
    await act(() => result.current.guardar());
    expect(result.current.error).toBe("Stock insuficiente");
    expect(result.current.requiereDevolucion).toBe(false);
    obtener.mockResolvedValue({ ...nota, editable: false, motivoNoEditable: "Anulada" });
    await act(() => result.current.recargar());
    editar.mockClear();
    await act(() => result.current.guardar());
    expect(editar).not.toHaveBeenCalled();
  });
});
