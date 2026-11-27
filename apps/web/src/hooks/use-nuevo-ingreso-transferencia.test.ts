import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useNuevoIngresoTransferencia } from "./use-nuevo-ingreso-transferencia";
import { servicioIngresos } from "../services/ingresos.service";
import type { OrdenServicioTransferida, CotizacionTransferida } from "../types/nuevo-ingreso-transferencia";

vi.mock("../services/ingresos.service", () => ({ servicioIngresos: { emitirOrdenServicio: vi.fn() } }));
const emitir = vi.mocked(servicioIngresos.emitirOrdenServicio);

const orden: OrdenServicioTransferida = { id: "os1", codigo: "OS-1", clienteId: "c1", clienteNombre: "Ana", motivo: "Afinado", adelanto: "30", adelantoMedioPago: "BILLETERA_DIGITAL", adelantoCuentaFinancieraId: null, tipoComprobante: "FACTURA", detalles: [] };
const cotizacion: CotizacionTransferida = { id: "co1", codigo: "COT-1", clienteId: null, clienteNombre: null, observacion: null, tipoComprobante: "BOLETA", detalles: [] };

type Props = Parameters<typeof useNuevoIngresoTransferencia>[0];
function crearVenta(cambios: Record<string, unknown> = {}) {
  return { cargarOrdenServicio: vi.fn().mockResolvedValue(undefined), cargarCotizacion: vi.fn().mockResolvedValue(undefined), setError: vi.fn(), exito: null, totales: { total: 100 }, tipoComprobante: "BOLETA", ...cambios };
}
function montar(cambios: Partial<Omit<Props, "venta">> & { venta?: ReturnType<typeof crearVenta> } = {}) {
  const props = {
    venta: crearVenta(), tipoVenta: "REPUESTOS", cotizacion: null, ordenServicio: null, cuentaSaldo: "cta", medioSaldo: "EFECTIVO",
    setMedioSaldo: vi.fn(), setCuentaSaldo: vi.fn(), setTipoDocumentoBusqueda: vi.fn(), mediosPagoDisponibles: [{ codigo: "BILLETERA_DIGITAL", nombre: "Yape / Plin" }], ...cambios,
  } as unknown as Props;
  const hook = renderHook((p: Props) => useNuevoIngresoTransferencia(p), { initialProps: props });
  return { ...hook, props, venta: props.venta as unknown as ReturnType<typeof crearVenta> };
}

beforeEach(() => emitir.mockReset());

describe("useNuevoIngresoTransferencia", () => {
  it("sin orden calcula saldo y medio por defecto", () => {
    const { result } = montar({ mediosPagoDisponibles: [] });
    expect(result.current).toMatchObject({ cargandoOS: false, vinculandoOS: false, ordenVinculadaOS: false, saldoOrdenServicio: 100, medioAdelantoOrden: "Sin adelanto registrado" });
  });

  it("carga la orden una sola vez y prepara el cobro del saldo", async () => {
    const { result, props, venta, rerender } = montar({ ordenServicio: orden });
    expect(props.setCuentaSaldo).toHaveBeenCalledWith("");
    expect(props.setMedioSaldo).toHaveBeenCalledWith("BILLETERA_DIGITAL");
    expect(props.setTipoDocumentoBusqueda).toHaveBeenCalledWith("06");
    await waitFor(() => expect(result.current.cargandoOS).toBe(false));
    expect(venta.cargarOrdenServicio).toHaveBeenCalledWith(orden);
    rerender({ ...props, tipoVenta: "MOTOTAXIS" });
    expect(venta.cargarOrdenServicio).toHaveBeenCalledTimes(1);
    expect(result.current.saldoOrdenServicio).toBe(70);
    expect(result.current.medioAdelantoOrden).toBe("Yape / Plin");
  });

  it("usa efectivo y humaniza el medio de adelanto desconocido", () => {
    const { result, props } = montar({ ordenServicio: { ...orden, adelantoMedioPago: null, tipoComprobante: "BOLETA", adelanto: "500" }, mediosPagoDisponibles: [] });
    expect(props.setMedioSaldo).toHaveBeenCalledWith("EFECTIVO");
    expect(props.setTipoDocumentoBusqueda).not.toHaveBeenCalled();
    expect(result.current.saldoOrdenServicio).toBe(0);
    const { result: r2 } = montar({ ordenServicio: { ...orden, adelantoMedioPago: "TARJETA_CREDITO" }, mediosPagoDisponibles: [] });
    expect(r2.current.medioAdelantoOrden).toBe("tarjeta credito");
  });

  it("informa si no se pudo cargar la orden o la cotización", async () => {
    const venta = crearVenta();
    venta.cargarOrdenServicio.mockRejectedValueOnce(new Error("Cliente no encontrado"));
    venta.cargarCotizacion.mockRejectedValueOnce("x");
    const { rerender, props } = montar({ venta, ordenServicio: orden, cotizacion });
    await waitFor(() => expect(venta.setError).toHaveBeenCalledWith("Cliente no encontrado"));
    await waitFor(() => expect(venta.setError).toHaveBeenCalledWith("No se pudo cargar la cotización en la venta."));
    venta.cargarOrdenServicio.mockRejectedValueOnce(1);
    rerender({ ...props, ordenServicio: { ...orden }, cotizacion: { ...cotizacion } });
    await waitFor(() => expect(venta.setError).toHaveBeenCalledWith("No se pudo cargar la orden en el formulario de venta."));
    expect(venta.cargarCotizacion).toHaveBeenCalledTimes(2);
  });

  it("vincula la orden cuando la venta se emitió", async () => {
    emitir.mockResolvedValue({} as never);
    const venta = crearVenta({ exito: { id: "i1", tipoComprobante: "NOTA_VENTA" } });
    const { result, rerender, props } = montar({ venta, ordenServicio: orden });
    await waitFor(() => expect(result.current.ordenVinculadaOS).toBe(true));
    expect(emitir).toHaveBeenCalledWith("os1", { tipoComprobante: "NOTA_VENTA", medioPago: "EFECTIVO", ingresoId: "i1", saldoCuentaFinancieraId: "cta" });
    rerender({ ...props, medioSaldo: "TARJETA" });
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(result.current.vinculandoOS).toBe(false);
  });

  it("espera la confirmación de SUNAT y usa el tipo de la venta si falta", async () => {
    emitir.mockResolvedValue({} as never);
    const pendiente = crearVenta({ exito: { id: "i1", tipoComprobante: "BOLETA", nubefact: { estado: "PENDIENTE" } } });
    montar({ venta: pendiente, ordenServicio: orden });
    expect(emitir).not.toHaveBeenCalled();
    const emitida = crearVenta({ exito: { id: "i2", nubefact: { estado: "EMITIDO" } }, tipoComprobante: "FACTURA" });
    montar({ venta: emitida, ordenServicio: orden });
    await waitFor(() => expect(emitir).toHaveBeenCalledWith("os1", expect.objectContaining({ tipoComprobante: "FACTURA", ingresoId: "i2" })));
  });

  it("informa si la orden no se pudo cerrar", async () => {
    emitir.mockRejectedValueOnce(new Error("Orden anulada")).mockRejectedValueOnce("x");
    const venta = crearVenta({ exito: { id: "i1", tipoComprobante: "NOTA_VENTA" } });
    const { rerender, props } = montar({ venta, ordenServicio: orden });
    await waitFor(() => expect(venta.setError).toHaveBeenCalledWith("El documento se emitió, pero no se pudo cerrar la orden: Orden anulada"));
    rerender({ ...props, medioSaldo: "TARJETA" });
    await waitFor(() => expect(venta.setError).toHaveBeenCalledWith("El documento se emitió, pero no se pudo vincular la orden."));
  });
});
