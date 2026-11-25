import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioIngresos, type Cotizacion } from "../../services/ingresos.service";

export type EstadoVisibleCotizacion = "EMITIDA" | "INACTIVA" | "ACTIVA";

const hoy = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
const compararCotizaciones = (a: Cotizacion, b: Cotizacion) => {
  const fechaA = Date.parse(a.fecha);
  const fechaB = Date.parse(b.fecha);
  const tiempoA = Number.isFinite(fechaA) ? fechaA : Number.NEGATIVE_INFINITY;
  const tiempoB = Number.isFinite(fechaB) ? fechaB : Number.NEGATIVE_INFINITY;
  if (tiempoA !== tiempoB) return tiempoA > tiempoB ? -1 : 1;

  const codigoDescendente = b.codigo.localeCompare(a.codigo, "es", { numeric: true, sensitivity: "base" });
  if (codigoDescendente !== 0) return codigoDescendente;

  const vigenciaA = a.vigenteHasta ?? "";
  const vigenciaB = b.vigenteHasta ?? "";
  if (Boolean(vigenciaA) !== Boolean(vigenciaB)) return vigenciaA ? -1 : 1;
  return vigenciaA.localeCompare(vigenciaB);
};

export function useGestionListado() {
  const navegar = useNavigate();
  const [registrosCotizacion, setRegistrosCotizacion] = useState<Cotizacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroVigenciaDesde, setFiltroVigenciaDesde] = useState("");
  const [filtroVigenciaHasta, setFiltroVigenciaHasta] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      setRegistrosCotizacion(await servicioIngresos.listarCotizaciones(busqueda));
      setError("");
    } catch (problema) {
      if (problema instanceof ErrorApi && problema.estado === 401) { navegar("/login", { replace: true }); return; }
      setError(problema instanceof Error ? problema.message : "No se pudo cargar la información.");
    } finally { setCargando(false); }
  }, [busqueda, navegar]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => void cargar(), busqueda ? 220 : 0);
    return () => window.clearTimeout(temporizador);
  }, [busqueda, cargar]);

  const documentoCotizacionCompletado = useCallback((cotizacion: Cotizacion) => Boolean(cotizacion.ingresoId && (cotizacion.ingresoTipoComprobante === "NOTA_VENTA" ? cotizacion.ingresoEstado === "REGISTRADO" : cotizacion.ingresoEstado === "EMITIDO")), []);
  const estadoVisibleCotizacion = useCallback((cotizacion: Cotizacion): EstadoVisibleCotizacion => documentoCotizacionCompletado(cotizacion) ? "EMITIDA" : cotizacion.estado === "ANULADA" || cotizacion.estado === "RECHAZADA" || Boolean(cotizacion.vigenteHasta && cotizacion.vigenteHasta < hoy()) ? "INACTIVA" : "ACTIVA", [documentoCotizacionCompletado]);
  const cotizacionesFiltradas = registrosCotizacion.filter((cotizacion) => {
    const fecha = cotizacion.vigenteHasta ?? "";
    return (!filtroVigenciaDesde || fecha >= filtroVigenciaDesde)
      && (!filtroVigenciaHasta || (fecha && fecha <= filtroVigenciaHasta));
  }).sort(compararCotizaciones);

  return {
    cotizacionesFiltradas,
    busqueda,
    setBusqueda,
    filtroVigenciaDesde,
    setFiltroVigenciaDesde,
    filtroVigenciaHasta,
    setFiltroVigenciaHasta,
    cargando,
    error,
    setError,
    cargar,
    documentoCotizacionCompletado,
    estadoVisibleCotizacion,
  };
}
