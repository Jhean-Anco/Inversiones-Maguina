import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type CobranzaPeriodo, type ComparativoIngresos, type FlujoIngresosDashboard, type HorariosVentas, type MetasDashboard, type Rentabilidad, type ResumenIngresosDashboard } from "../../services/reportes.service";
import { servicioFinanzas, type ComposicionCaja, type FlujoFinanciero } from "../../services/finanzas.service";
import {
  calcularMargen, compararMesAcumulado, compararSaldoNetoMensual, compararTicketPromedio, construirAvanceMetas, construirCascadaCaja, construirMapaVentas,
  construirPareto, construirRitmoDelMes, ingresosEgresosPorMes, mesAnteriorCompleto, porcentajeCobrado, serieDiariaIngresos, tramoMesAnterior,
  variacionPorConcepto, ventasMensualesPorConcepto,
} from "./dashboard-calculos";
import { isoLocal, rangoMesActual, rangoUltimosDoceMeses } from "./dashboard-fechas";
import type { CambioMeta } from "./dashboard-metas";

const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const mensajeError = (problema: unknown, respaldo: string) => problema instanceof ErrorApi && problema.estado === 401 ? "La sesión venció. Inicia sesión nuevamente." : problema instanceof Error ? problema.message : respaldo;

/** Carga y deriva todo lo que muestra el panel de inicio. Cada bloque falla por separado sin tumbar a los demás. */
export function useDashboardDatos(puedeVerIngresos: boolean, permisos: string[]) {
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const hoy = isoLocal(new Date());
  const periodoActual = hoy.slice(0, 7);
  const puedeVerFinanzas = permisos.includes("FINANZAS.LEER");
  const puedeVerCostos = permisos.includes("INVENTARIO.LEER") || permisos.includes("MOTOTAXIS.LEER");

  const [solicitudReporte, setSolicitudReporte] = useState(0);
  const [solicitudFinanzas, setSolicitudFinanzas] = useState(0);
  const [reporte, setReporte] = useState<ResumenIngresosDashboard | null>(null);
  const [reporteAnual, setReporteAnual] = useState<FlujoIngresosDashboard | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(puedeVerIngresos);
  const [errorReporte, setErrorReporte] = useState("");
  const [comparativo, setComparativo] = useState<ComparativoIngresos | null>(null);
  const [rentabilidad, setRentabilidad] = useState<{ actual: Rentabilidad; anterior: Rentabilidad } | null>(null);
  const [horarios, setHorarios] = useState<HorariosVentas | null>(null);
  const [metasDashboard, setMetasDashboard] = useState<MetasDashboard | null>(null);
  const [cobranza, setCobranza] = useState<{ actual: CobranzaPeriodo; anterior: CobranzaPeriodo } | null>(null);
  const [flujoMensual, setFlujoMensual] = useState<FlujoFinanciero | null>(null);
  const [composicion, setComposicion] = useState<ComposicionCaja | null>(null);
  const [fallos, setFallos] = useState<Record<string, boolean>>({});
  const marcarFallo = (clave: string, fallo: boolean) => setFallos((actuales) => actuales[clave] === fallo ? actuales : { ...actuales, [clave]: fallo });

  useEffect(() => {
    if (datosInicioValidos) return;
    let vigente = true;
    void servicioDashboard.resumen().then((datos) => { if (vigente) { setResumen(datos); setError(""); } })
      .catch((problema: unknown) => { if (vigente) setError(mensajeError(problema, "No se pudo cargar el resumen del negocio.")); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [datosInicioValidos]);

  const rangoMes = rangoMesActual(hoy);
  const rangoAnual = rangoUltimosDoceMeses(hoy);
  useEffect(() => {
    if (!puedeVerIngresos) { setCargandoReporte(false); return; }
    let vigente = true;
    setCargandoReporte(true);
    setErrorReporte("");
    setReporte(null);
    setReporteAnual(null);
    void servicioReportes.ingresosDashboard({ mes: rangoMes, anual: rangoAnual })
      .then((resultado) => { if (vigente) { setReporte(resultado.mes); setReporteAnual(resultado.anual); } })
      .catch((problema: unknown) => { if (vigente) setErrorReporte(mensajeError(problema, "No se pudieron cargar las ventas de este mes.")); })
      .finally(() => { if (vigente) setCargandoReporte(false); });
    return () => { vigente = false; };
  }, [rangoMes.desde, rangoMes.hasta, rangoAnual.desde, rangoAnual.hasta, puedeVerIngresos, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("comparativo", false);
    void servicioReportes.ingresosComparativo({ desde: `${Number(hoy.slice(0, 4)) - 1}-${hoy.slice(5, 7)}-01`, hasta: hoy }).then((datos) => { if (vigente) setComparativo(datos); })
      .catch(() => { if (vigente) marcarFallo("comparativo", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, hoy, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("rentabilidad", false);
    const anterior = tramoMesAnterior(hoy);
    void Promise.all([servicioReportes.rentabilidad({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy }), servicioReportes.rentabilidad({ desde: anterior.desde, hasta: anterior.hasta })])
      .then(([actual, previo]) => { if (vigente) setRentabilidad({ actual, anterior: previo }); })
      .catch(() => { if (vigente) marcarFallo("rentabilidad", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, hoy, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("horarios", false);
    const inicio = new Date(`${hoy}T00:00:00`);
    inicio.setDate(inicio.getDate() - 89);
    void servicioReportes.horarios({ desde: isoLocal(inicio), hasta: hoy }).then((datos) => { if (vigente) setHorarios(datos); })
      .catch(() => { if (vigente) marcarFallo("horarios", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, hoy, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("metas", false);
    void Promise.all([servicioReportes.metas(periodoActual), servicioReportes.cobranza({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy }), servicioReportes.cobranza(mesAnteriorCompleto(hoy))])
      .then(([metas, actual, anterior]) => { if (vigente) { setMetasDashboard(metas); setCobranza({ actual, anterior }); } })
      .catch(() => { if (vigente) marcarFallo("metas", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, hoy, periodoActual, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    marcarFallo("flujo", false);
    void servicioFinanzas.flujo("MES").then((datos) => { if (vigente) setFlujoMensual(datos); })
      .catch(() => { if (vigente) marcarFallo("flujo", true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, solicitudFinanzas]);

  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    marcarFallo("composicion", false);
    void servicioFinanzas.composicion(`${hoy.slice(0, 8)}01`, hoy).then((datos) => { if (vigente) setComposicion(datos); })
      .catch(() => { if (vigente) marcarFallo("composicion", true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, hoy, solicitudFinanzas]);

  const guardarMetas = async (cambios: CambioMeta[], alcance: "MES" | "TODOS") => {
    let vigentes: MetasDashboard | null = null;
    try {
      for (const cambio of cambios) vigentes = await servicioReportes.guardarMeta({ indicador: cambio.indicador, periodo: alcance === "MES" ? periodoActual : null, valor: cambio.valor }, periodoActual);
    } finally {
      // Si un guardado intermedio falla, los anteriores ya quedaron en el servidor: la pantalla debe reflejarlos.
      if (vigentes) setMetasDashboard(vigentes);
    }
  };

  // Derivados
  const diasAnuales = serieDiariaIngresos(reporteAnual, rangoAnual);
  const ingresosMes = reporteAnual ? compararMesAcumulado(diasAnuales, hoy) : null;
  const ticket = reporteAnual ? compararTicketPromedio(reporteAnual, hoy) : null;
  const moneda = (flujo: { monedas: string[] }) => flujo.monedas.includes("PEN") ? "PEN" : flujo.monedas[0] ?? "PEN";
  const monedaFlujo = flujoMensual ? moneda(flujoMensual) as FlujoFinanciero["monedas"][number] : "PEN";
  const saldo = flujoMensual ? compararSaldoNetoMensual(flujoMensual, hoy, monedaFlujo) : null;
  const margen = rentabilidad ? { actual: calcularMargen(rentabilidad.actual.filas), anterior: calcularMargen(rentabilidad.anterior.filas) } : null;
  const ritmo = comparativo && !fallos.comparativo ? construirRitmoDelMes(comparativo.dias, hoy) : null;
  const avancesMetas = construirAvanceMetas({
    hoy,
    metas: { VENTAS_MES: metasDashboard?.metas.VENTAS_MES?.valor ?? null, COBRANZA: metasDashboard?.metas.COBRANZA?.valor ?? null, MARGEN: metasDashboard?.metas.MARGEN?.valor ?? null },
    ingresos: ingresosMes ? { actual: ingresosMes.actual, anterior: ingresosMes.anterior } : null,
    cobranza: { actual: porcentajeCobrado(cobranza?.actual ?? null), anterior: porcentajeCobrado(cobranza?.anterior ?? null) },
    margen: { actual: margen?.actual?.porcentaje ?? null, anterior: margen?.anterior?.porcentaje ?? null },
  });
  const cascada = composicion && !fallos.composicion ? construirCascadaCaja(composicion.items, moneda(composicion)) : null;
  const monedaCascada = composicion ? moneda(composicion) : "PEN";
  const mediosPago = (reporte?.porMedioPago ?? []).map((pago) => ({ nombre: nombreMedioPago(pago.medioPago), importe: Number(pago.total) })).filter((pago) => pago.importe > 0);

  return {
    resumen, cargando, error, hoy, puedeVerFinanzas, puedeVerCostos,
    reporte: { cargando: cargandoReporte, error: errorReporte, listo: reporte !== null && reporteAnual !== null },
    hayFallos: Object.values(fallos).some(Boolean),
    reintentar: () => { setSolicitudReporte((actual) => actual + 1); setSolicitudFinanzas((actual) => actual + 1); },
    indicadores: { ingresosMes, ticket, saldo, margen, mostrarMargen: puedeVerIngresos && puedeVerCostos && !fallos.rentabilidad, mostrarSaldo: puedeVerFinanzas && !fallos.flujo },
    ritmo,
    metas: { avances: avancesMetas, valores: metasDashboard?.metas ?? null, mostrar: puedeVerIngresos && !fallos.metas && metasDashboard !== null && cobranza !== null && ingresosMes !== null, guardar: guardarMetas },
    variacionConceptos: reporteAnual ? variacionPorConcepto(diasAnuales, hoy) : [],
    mezclaVentas: reporteAnual ? ventasMensualesPorConcepto(diasAnuales, hoy) : [],
    mediosPago,
    pareto: construirPareto(resumen?.principalesArticulos ?? [], Number(resumen?.ventasMes?.total ?? 0)),
    mapaVentas: rentabilidad && !fallos.rentabilidad ? construirMapaVentas(rentabilidad.actual.filas) : [],
    cascada: cascada ? { datos: cascada, moneda: monedaCascada, variasMonedas: (composicion?.monedas.length ?? 0) > 1 } : null,
    ingresosEgresos: flujoMensual && !fallos.flujo ? { meses: ingresosEgresosPorMes(flujoMensual, monedaFlujo), moneda: monedaFlujo } : null,
    horarios: horarios && !fallos.horarios ? horarios : null,
  };
}
