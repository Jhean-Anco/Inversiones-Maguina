import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { servicioIngresos, type MedioPagoDisponible } from "../services/ingresos.service";
import { useNuevoIngreso } from "./use-nuevo-ingreso";
import type { TipoVenta } from "../types/nuevo-ingreso";
import type { CotizacionTransferida, OrdenServicioTransferida } from "../types/nuevo-ingreso-transferencia";

type PropiedadesTransferenciaIngreso = {
  venta: ReturnType<typeof useNuevoIngreso>;
  tipoVenta: TipoVenta;
  cotizacion: CotizacionTransferida | null;
  ordenServicio: OrdenServicioTransferida | null;
  cuentaSaldo: string;
  medioSaldo: string;
  setMedioSaldo: Dispatch<SetStateAction<string>>;
  setCuentaSaldo: Dispatch<SetStateAction<string>>;
  setTipoDocumentoBusqueda: Dispatch<SetStateAction<"01" | "06">>;
  mediosPagoDisponibles: MedioPagoDisponible[];
};

const redondearCentimos = (monto: number) => Math.round((monto + Number.EPSILON) * 100) / 100;

export function useNuevoIngresoTransferencia({
  venta,
  tipoVenta,
  cotizacion,
  ordenServicio,
  cuentaSaldo,
  medioSaldo,
  setMedioSaldo,
  setCuentaSaldo,
  setTipoDocumentoBusqueda,
  mediosPagoDisponibles,
}: PropiedadesTransferenciaIngreso) {
  const [cargandoOS, setCargandoOS] = useState(false);
  const [vinculandoOS, setVinculandoOS] = useState(false);
  const [ordenVinculadaOS, setOrdenVinculadaOS] = useState(false);
  const cargaOSRef = useRef<string | null>(null);
  const cargaCotizacionRef = useRef<string | null>(null);
  const vinculoOSRef = useRef<string | null>(null);

  useEffect(() => {
    if (!ordenServicio || cargaOSRef.current === ordenServicio.id) return;
    cargaOSRef.current = ordenServicio.id;
    setCargandoOS(true);
    setCuentaSaldo("");
    setMedioSaldo(ordenServicio.adelantoMedioPago ?? "EFECTIVO");
    setOrdenVinculadaOS(false);
    if (ordenServicio.tipoComprobante === "FACTURA") setTipoDocumentoBusqueda("06");
    void venta.cargarOrdenServicio(ordenServicio)
      .catch((problema) => {
        venta.setError(problema instanceof Error ? problema.message : "No se pudo cargar la orden en el formulario de venta.");
        cargaOSRef.current = null;
      })
      .finally(() => setCargandoOS(false));
  }, [ordenServicio, tipoVenta]);

  useEffect(() => {
    if (!cotizacion || cargaCotizacionRef.current === cotizacion.id) return;
    cargaCotizacionRef.current = cotizacion.id;
    void venta.cargarCotizacion(cotizacion).catch((problema) => {
      venta.setError(problema instanceof Error ? problema.message : "No se pudo cargar la cotización en la venta.");
      cargaCotizacionRef.current = null;
    });
  }, [cotizacion, tipoVenta]);

  useEffect(() => {
    if (!ordenServicio || !venta.exito?.id || vinculoOSRef.current === venta.exito.id) return;
    if (venta.exito.tipoComprobante !== "NOTA_VENTA" && venta.exito.nubefact?.estado !== "EMITIDO") return;
    vinculoOSRef.current = venta.exito.id;
    setVinculandoOS(true);
    void servicioIngresos.emitirOrdenServicio(ordenServicio.id, {
      tipoComprobante: venta.exito.tipoComprobante ?? venta.tipoComprobante,
      medioPago: medioSaldo,
      ingresoId: venta.exito.id,
      saldoCuentaFinancieraId: cuentaSaldo,
    })
      .then(() => setOrdenVinculadaOS(true))
      .catch((problema) => {
        vinculoOSRef.current = null;
        venta.setError(problema instanceof Error
          ? `El documento se emitió, pero no se pudo cerrar la orden: ${problema.message}`
          : "El documento se emitió, pero no se pudo vincular la orden.");
      })
      .finally(() => setVinculandoOS(false));
  }, [ordenServicio, venta.exito, medioSaldo, cuentaSaldo]);

  const saldoOrdenServicio = Math.max(0, redondearCentimos(venta.totales.total - Number(ordenServicio?.adelanto || 0)));
  const medioAdelantoOrden = mediosPagoDisponibles.find((medio) => medio.codigo === ordenServicio?.adelantoMedioPago)?.nombre
    ?? ordenServicio?.adelantoMedioPago?.toLocaleLowerCase("es-PE").replaceAll("_", " ")
    ?? "Sin adelanto registrado";

  return { cargandoOS, vinculandoOS, ordenVinculadaOS, saldoOrdenServicio, medioAdelantoOrden };
}
