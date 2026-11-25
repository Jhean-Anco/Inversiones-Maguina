import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type ArticulosMasVendidos, type CobranzaPeriodo, type FlujoIngresosDashboard, type HorariosVentas, type MetasDashboard, type Rentabilidad, type ResumenIngresosDashboard } from "../../services/reportes.service";
import { servicioFinanzas, type ComposicionCaja, type FlujoFinanciero } from "../../services/finanzas.service";
import {
  calcularMargen, construirAvanceMetas, construirCascadaCaja, construirMapaVentas, construirPareto, ingresosEgresosPorMes, mesAnteriorCompleto,
  porcentajeCobrado, saldoNetoDeCaja, serieDiariaIngresos, ventasMensualesPorConcepto,
} from "./dashboard-calculos";
import { compararAcumulado, compararTicketPromedio, construirRitmo, rangosDelPeriodo, tramoComparado, variacionPorConcepto, type Comparacion, type Periodo } from "./dashboard-periodos";
import { isoLocal } from "./dashboard-fechas";
import type { CambioMeta } from "./dashboard-metas";

const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const mensajeError = (problema: unknown, respaldo: string) => problema instanceof ErrorApi && problema.estado === 401 ? "La sesión venció. Inicia sesión nuevamente." : problema instanceof Error ? problema.message : respaldo;
const monedaPrincipal = (monedas: string[]) => monedas.includes("PEN") ? "PEN" : monedas[0] ?? "PEN";

/**
 * Ventana de datos diarios que cubre cualquier periodo y su comparación con el año pasado: desde el 1 de enero del año
 * anterior, con dos semanas de margen para las semanas que cruzan de año.
 */
function ventanaDiaria(hoy: string) {
  const inicio = new Date(`${Number(hoy.slice(0, 4)) - 1}-01-01T00:00:00.000Z`);
  inicio.setUTCDate(inicio.getUTCDate() - 14);
  return { desde: inicio.toISOString().slice(0, 10), hasta: hoy };
}

/** Carga y deriva todo lo que muestra el panel de inicio. Cada bloque falla por separado sin tumbar a los demás. */
export function useDashboardDatos(puedeVerIngresos: boolean, permisos: string[]) {
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const [periodo, setPeriodo] = useState<Periodo>("MES");
  const [comparar, setComparar] = useState<Comparacion>("ANTERIOR");
  const hoy = isoLocal(new Date());
  const periodoActual = hoy.slice(0, 7);
  const rangos = rangosDelPeriodo(periodo, hoy);
  const comparado = tramoComparado(rangos, comparar);
  const puedeVerFinanzas = permisos.includes("FINANZAS.LEER");
  const puedeVerCostos = permisos.includes("INVENTARIO.LEER") || permisos.includes("MOTOTAXIS.LEER");

  const [solicitudReporte, setSolicitudReporte] = useState(0);
  const [solicitudFinanzas, setSolicitudFinanzas] = useState(0);
  const [reporte, setReporte] = useState<ResumenIngresosDashboard | null>(null);
  const [reporteDiario, setReporteDiario] = useState<FlujoIngresosDashboard | null>(null);
  const [cargandoReporte, setCargandoReporte] = useState(puedeVerIngresos);
  const [errorReporte, setErrorReporte] = useState("");
  const [rentabilidad, setRentabilidad] = useState<{ actual: Rentabilidad; comparada: Rentabilidad } | null>(null);
  const [articulos, setArticulos] = useState<ArticulosMasVendidos | null>(null);
  const [horarios, setHorarios] = useState<HorariosVentas | null>(null);
  const [metasDashboard, setMetasDashboard] = useState<MetasDashboard | null>(null);
  const [cobranza, setCobranza] = useState<{ actual: CobranzaPeriodo; anterior: CobranzaPeriodo } | null>(null);
  const [flujoAnual, setFlujoAnual] = useState<FlujoFinanciero | null>(null);
  const [composicion, setComposicion] = useState<{ actual: ComposicionCaja; comparada: ComposicionCaja } | null>(null);
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

  // Ventas diarias de dos años (para todas las comparaciones) y medios de pago del periodo elegido.
  useEffect(() => {
    if (!puedeVerIngresos) { setCargandoReporte(false); return; }
    let vigente = true;
    setCargandoReporte(true);
    setErrorReporte("");
    setReporte(null);
    void servicioReportes.ingresosDashboard({ mes: { desde: rangos.actual.desde, hasta: hoy }, anual: ventanaDiaria(hoy) })
      .then((resultado) => { if (vigente) { setReporte(resultado.mes); setReporteDiario(resultado.anual); } })
      .catch((problema: unknown) => { if (vigente) setErrorReporte(mensajeError(problema, "No se pudieron cargar las ventas.")); })
      .finally(() => { if (vigente) setCargandoReporte(false); });
    return () => { vigente = false; };
  }, [rangos.actual.desde, hoy, puedeVerIngresos, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("rentabilidad", false);
    setRentabilidad(null);
    void Promise.all([servicioReportes.rentabilidad({ desde: rangos.actual.desde, hasta: hoy }), servicioReportes.rentabilidad({ desde: comparado.desde, hasta: comparado.hasta })])
      .then(([actual, comparada]) => { if (vigente) setRentabilidad({ actual, comparada }); })
      .catch(() => { if (vigente) marcarFallo("rentabilidad", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, rangos.actual.desde, comparado.desde, comparado.hasta, hoy, solicitudReporte]);

  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    marcarFallo("articulos", false);
    setArticulos(null);
    void servicioReportes.articulos({ desde: rangos.actual.desde, hasta: hoy }).then((datos) => { if (vigente) setArticulos(datos); })
      .catch(() => { if (vigente) marcarFallo("articulos", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, rangos.actual.desde, hoy, solicitudReporte]);

  // Fijo: últimos 90 días, sin importar el periodo elegido.
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

  // Las metas son mensuales: solo se cargan cuando se mira el mes.
  useEffect(() => {
    if (!puedeVerIngresos || periodo !== "MES") return;
    let vigente = true;
    marcarFallo("metas", false);
    void Promise.all([servicioReportes.metas(periodoActual), servicioReportes.cobranza({ desde: `${hoy.slice(0, 8)}01`, hasta: hoy }), servicioReportes.cobranza(mesAnteriorCompleto(hoy))])
      .then(([metas, actual, anterior]) => { if (vigente) { setMetasDashboard(metas); setCobranza({ actual, anterior }); } })
      .catch(() => { if (vigente) marcarFallo("metas", true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, periodo, hoy, periodoActual, solicitudReporte]);

  // Fijo: cobros y pagos de cada mes del año en curso.
  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    marcarFallo("flujo", false);
    void servicioFinanzas.flujo("MES").then((datos) => { if (vigente) setFlujoAnual(datos); })
      .catch(() => { if (vigente) marcarFallo("flujo", true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, solicitudFinanzas]);

  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    marcarFallo("composicion", false);
    setComposicion(null);
    void Promise.all([servicioFinanzas.composicion(rangos.actual.desde, hoy), servicioFinanzas.composicion(comparado.desde, comparado.hasta)])
      .then(([actual, comparada]) => { if (vigente) setComposicion({ actual, comparada }); })
      .catch(() => { if (vigente) marcarFallo("composicion", true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, rangos.actual.desde, comparado.desde, comparado.hasta, hoy, solicitudFinanzas]);

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
  const dias = serieDiariaIngresos(reporteDiario, ventanaDiaria(hoy));
  const ingresos = reporteDiario ? compararAcumulado(dias, rangos, comparar) : null;
  const ticket = reporteDiario ? compararTicketPromedio(reporteDiario, rangos, comparar) : null;
  const monedaCaja = composicion ? monedaPrincipal([...composicion.actual.monedas, ...composicion.comparada.monedas]) : "PEN";
  const saldo = composicion ? { actual: saldoNetoDeCaja(composicion.actual.items, monedaCaja), anterior: saldoNetoDeCaja(composicion.comparada.items, monedaCaja), moneda: monedaCaja } : null;
  const margen = rentabilidad ? { actual: calcularMargen(rentabilidad.actual.filas), anterior: calcularMargen(rentabilidad.comparada.filas) } : null;
  const avancesMetas = construirAvanceMetas({
    hoy,
    metas: { VENTAS_MES: metasDashboard?.metas.VENTAS_MES?.valor ?? null, COBRANZA: metasDashboard?.metas.COBRANZA?.valor ?? null, MARGEN: metasDashboard?.metas.MARGEN?.valor ?? null },
    ingresos: ingresos ? { actual: ingresos.actual, anterior: ingresos.anterior } : null,
    cobranza: { actual: porcentajeCobrado(cobranza?.actual ?? null), anterior: porcentajeCobrado(cobranza?.anterior ?? null) },
    margen: { actual: margen?.actual?.porcentaje ?? null, anterior: margen?.anterior?.porcentaje ?? null },
  });
  const mediosPago = (reporte?.porMedioPago ?? []).map((pago) => ({ nombre: nombreMedioPago(pago.medioPago), importe: Number(pago.total) })).filter((pago) => pago.importe > 0);

  return {
    resumen, cargando, error, hoy, puedeVerFinanzas, puedeVerCostos, actualizando: cargandoReporte,
    periodo, setPeriodo, comparar, setComparar, rangos,
    reporte: { cargando: cargandoReporte && reporteDiario === null, error: errorReporte, listo: reporteDiario !== null, mediosListos: reporte !== null },
    hayFallos: Object.values(fallos).some(Boolean),
    reintentar: () => { setSolicitudReporte((actual) => actual + 1); setSolicitudFinanzas((actual) => actual + 1); },
    indicadores: { ingresos, ticket, saldo, margen, mostrarMargen: puedeVerIngresos && puedeVerCostos && !fallos.rentabilidad, mostrarSaldo: puedeVerFinanzas && !fallos.composicion },
    ritmo: reporteDiario ? construirRitmo(dias, rangos) : null,
    metas: { avances: avancesMetas, valores: metasDashboard?.metas ?? null, mostrar: periodo === "MES" && puedeVerIngresos && !fallos.metas && metasDashboard !== null && cobranza !== null && ingresos !== null, guardar: guardarMetas },
    variacionConceptos: reporteDiario ? variacionPorConcepto(dias, rangos, comparar) : [],
    mezclaVentas: reporteDiario ? ventasMensualesPorConcepto(dias, hoy) : [],
    mediosPago,
    pareto: articulos && !fallos.articulos ? construirPareto(articulos.articulos, Number(articulos.totalVentas)) : [],
    mapaVentas: rentabilidad && !fallos.rentabilidad ? construirMapaVentas(rentabilidad.actual.filas) : [],
    cascada: composicion && !fallos.composicion ? { datos: construirCascadaCaja(composicion.actual.items, monedaCaja), moneda: monedaCaja, variasMonedas: composicion.actual.monedas.length > 1 } : null,
    ingresosEgresos: flujoAnual && !fallos.flujo ? { meses: ingresosEgresosPorMes(flujoAnual, monedaPrincipal(flujoAnual.monedas) as FlujoFinanciero["monedas"][number]), moneda: monedaPrincipal(flujoAnual.monedas) } : null,
    horarios: horarios && !fallos.horarios ? horarios : null,
  };
}
