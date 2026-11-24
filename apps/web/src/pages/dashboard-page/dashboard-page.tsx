import { NotificacionFlotante } from "../../components/ui/notificacion-flotante/notificacion-flotante";
import { estilosDashboard } from "./dashboard-classes";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CreditCard } from "lucide-react";
import { FlujoChart, FlujoFinancieroChart, VentasMensualesChart } from "./dashboard-charts";
import type { ImportesGrafico, ModoDesgloseGrafico, PuntoIngresos } from "./dashboard-chart-types";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type CobranzaPeriodo, type ComparativoIngresos, type FiltroReporte, type FlujoIngresosDashboard, type HorariosVentas, type MetasDashboard, type Rentabilidad, type ResumenIngresosDashboard } from "../../services/reportes.service";
import { servicioFinanzas, type ComposicionCaja, type FlujoFinanciero, type PeriodoFlujoFinanciero } from "../../services/finanzas.service";
import { calcularMargen, compararHoyConAyer, compararMesAcumulado, compararSaldoNetoMensual, compararTicketPromedio, construirAvanceMetas, construirCascadaCaja, construirMapaVentas, construirPareto, construirRitmoDelMes, mesAnteriorCompleto, porcentajeCobrado, tramoMesAnterior, variacionPorConcepto } from "./dashboard-calculos";
import { IndicadoresClave } from "./dashboard-indicadores";
import { ParetoArticulosChart, RitmoDelMesChart, VariacionPorTipoChart } from "./dashboard-comparativas";
import { CascadaCajaChart, MapaVentasChart } from "./dashboard-composicion";
import { AvanceMetasPanel, type CambioMeta } from "./dashboard-metas";
import { MapaCalorHorarios } from "./dashboard-horarios";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const etiquetaFechaPunto = (valor: string) => new Date(`${valor.length === 7 ? `${valor}-01` : valor}T00:00:00`).toLocaleDateString("es-PE", valor.length === 7 ? { month: "long", year: "numeric" } : { day: "numeric", month: "short" });
const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const coloresGraficos = ["#d62f4f", "#347caf", "#27a383", "#e2a541", "#8069bd", "#65a4b8"];
const tiposImporteGrafico = ["BOLETA", "FACTURA", "NOTA_VENTA", "NOTA_DEBITO", "ADELANTO", "PRODUCTO", "SERVICIO", "MOTOTAXI"] as const;
const origenesIngresoGrafico = ["BOLETA", "FACTURA", "NOTA_VENTA", "NOTA_DEBITO", "ADELANTO"] as const;
const isoLocal = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const rangoMesActual = (referencia: string): FiltroReporte => {
  const fecha = new Date(`${referencia}T00:00:00`);
  return { desde: isoLocal(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), hasta: referencia };
};
const rangoUltimosSieteDias = (referencia: string): FiltroReporte => {
  const inicio = new Date(`${referencia}T00:00:00`);
  inicio.setDate(inicio.getDate() - 6);
  return { desde: isoLocal(inicio), hasta: referencia };
};
const rangoUltimosDoceMeses = (referencia: string): FiltroReporte => {
  const inicio = new Date(`${referencia}T00:00:00`);
  inicio.setDate(1);
  inicio.setMonth(inicio.getMonth() - 11);
  return { desde: isoLocal(inicio), hasta: referencia };
};

function LeyendaFlujo({ modo }: { modo: ModoDesgloseGrafico }) {
  if (modo === "TOTAL") return null;

  const series = modo === "ORIGEN"
    ? [
      { nombre: "Boletas", color: "#cc3450" },
      { nombre: "Facturas", color: "#347caf" },
      { nombre: "Notas de venta", color: "#27a383" },
      { nombre: "Notas de débito", color: "#e2a541" },
      { nombre: "Adelantos", color: "#8069bd" },
    ]
    : [
      { nombre: "Repuestos", color: "#cc3450" },
      { nombre: "Servicios", color: "#347caf" },
      { nombre: "Mototaxis", color: "#27a383" },
    ];

  return (
    <div className="inicio-chart-legend" role="list" aria-label="Leyenda del gráfico">
      {series.map((serie) => (
        <span key={serie.nombre} role="listitem">
          <i aria-hidden="true" style={{ backgroundColor: serie.color }} />
          {serie.nombre}
        </span>
      ))}
    </div>
  );
}

function serieIngresos(reporte: FlujoIngresosDashboard | null, rango: FiltroReporte): PuntoIngresos[] {
  if (!reporte) return [];
  const importesPorFecha = new Map<string, ImportesGrafico>();
  for (const fila of reporte.flujoPorComprobante) {
    const importes = importesPorFecha.get(fila.fecha) ?? Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico;
    importes[fila.tipoComprobante] += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  for (const fila of reporte.flujoPorNotaDebito) {
    const importes = importesPorFecha.get(fila.fecha) ?? Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico;
    importes.NOTA_DEBITO += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  for (const fila of reporte.flujoPorAdelanto) {
    const importes = importesPorFecha.get(fila.fecha) ?? Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico;
    importes.ADELANTO += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  for (const fila of reporte.flujoPorConcepto) {
    const importes = importesPorFecha.get(fila.fecha) ?? Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico;
    importes[fila.tipo] += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  const dias: PuntoIngresos[] = [];
  const fin = new Date(`${rango.hasta}T00:00:00`);
  for (let fecha = new Date(`${rango.desde}T00:00:00`); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
    const iso = isoLocal(fecha);
    const importes = importesPorFecha.get(iso) ?? Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico;
    const total = origenesIngresoGrafico.reduce((suma, tipo) => suma + importes[tipo], 0);
    dias.push({ fecha: iso, ...importes, total });
  }
  return dias;
}

export function DashboardPage({ puedeVerIngresos = true, permisos = [] }: { nombre: string; rol: string; puedeVerIngresos?: boolean; permisos?: string[] }) {
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const fechaReferencia = isoLocal(new Date());
  const rangoActual = rangoMesActual(fechaReferencia);
  const rangoSemana = rangoUltimosSieteDias(fechaReferencia);
  const rangoAnual = rangoUltimosDoceMeses(fechaReferencia);
  const [reporte, setReporte] = useState<ResumenIngresosDashboard | null>(null);
  const [reporteAnual, setReporteAnual] = useState<FlujoIngresosDashboard | null>(null);
  const [modoFlujoDiario, setModoFlujoDiario] = useState<"TOTAL" | "ORIGEN" | "CONCEPTO">("TOTAL");
  const [modoVentasMensuales, setModoVentasMensuales] = useState<"TOTAL" | "ORIGEN" | "CONCEPTO">("TOTAL");
  const [modoVentasSemanales, setModoVentasSemanales] = useState<"TOTAL" | "ORIGEN" | "CONCEPTO">("TOTAL");
  const [cargandoReporte, setCargandoReporte] = useState(puedeVerIngresos);
  const [errorReporte, setErrorReporte] = useState("");
  const [solicitudReporte, setSolicitudReporte] = useState(0);
  const puedeVerFinanzas = permisos.includes("FINANZAS.LEER");
  const [flujoFinanciero, setFlujoFinanciero] = useState<FlujoFinanciero | null>(null);
  const [cargandoFinanzas, setCargandoFinanzas] = useState(puedeVerFinanzas);
  const [errorFinanzas, setErrorFinanzas] = useState("");
  const [solicitudFinanzas, setSolicitudFinanzas] = useState(0);
  const [periodoFlujo, setPeriodoFlujo] = useState<PeriodoFlujoFinanciero>("MES");
  const [flujoMensual, setFlujoMensual] = useState<FlujoFinanciero | null>(null);
  const [errorFlujoMensual, setErrorFlujoMensual] = useState(false);

  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    setErrorFlujoMensual(false);
    void servicioFinanzas.flujo("MES").then((datos) => { if (vigente) setFlujoMensual(datos); })
      .catch(() => { if (vigente) setErrorFlujoMensual(true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, solicitudFinanzas]);

  const [comparativo, setComparativo] = useState<ComparativoIngresos | null>(null);
  const [errorComparativo, setErrorComparativo] = useState(false);
  const desdeComparativo = `${Number(fechaReferencia.slice(0, 4)) - 1}-${fechaReferencia.slice(5, 7)}-01`;
  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    setErrorComparativo(false);
    void servicioReportes.ingresosComparativo({ desde: desdeComparativo, hasta: fechaReferencia }).then((datos) => { if (vigente) setComparativo(datos); })
      .catch(() => { if (vigente) setErrorComparativo(true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, desdeComparativo, fechaReferencia, solicitudReporte]);

  const [rentabilidad, setRentabilidad] = useState<{ actual: Rentabilidad; anterior: Rentabilidad } | null>(null);
  const [errorRentabilidad, setErrorRentabilidad] = useState(false);
  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    setErrorRentabilidad(false);
    const anterior = tramoMesAnterior(fechaReferencia);
    void Promise.all([
      servicioReportes.rentabilidad({ desde: `${fechaReferencia.slice(0, 8)}01`, hasta: fechaReferencia }),
      servicioReportes.rentabilidad({ desde: anterior.desde, hasta: anterior.hasta }),
    ]).then(([actual, previo]) => { if (vigente) setRentabilidad({ actual, anterior: previo }); })
      .catch(() => { if (vigente) setErrorRentabilidad(true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, fechaReferencia, solicitudReporte]);

  const [horarios, setHorarios] = useState<HorariosVentas | null>(null);
  const [errorHorarios, setErrorHorarios] = useState(false);
  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    setErrorHorarios(false);
    const inicio = new Date(`${fechaReferencia}T00:00:00`);
    inicio.setDate(inicio.getDate() - 89);
    void servicioReportes.horarios({ desde: isoLocal(inicio), hasta: fechaReferencia }).then((datos) => { if (vigente) setHorarios(datos); })
      .catch(() => { if (vigente) setErrorHorarios(true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, fechaReferencia, solicitudReporte]);

  const periodoMetas = fechaReferencia.slice(0, 7);
  const [metasDashboard, setMetasDashboard] = useState<MetasDashboard | null>(null);
  const [errorMetas, setErrorMetas] = useState(false);
  const [cobranza, setCobranza] = useState<{ actual: CobranzaPeriodo; anterior: CobranzaPeriodo } | null>(null);
  useEffect(() => {
    if (!puedeVerIngresos) return;
    let vigente = true;
    setErrorMetas(false);
    const previo = mesAnteriorCompleto(fechaReferencia);
    void Promise.all([
      servicioReportes.metas(periodoMetas),
      servicioReportes.cobranza({ desde: `${fechaReferencia.slice(0, 8)}01`, hasta: fechaReferencia }),
      servicioReportes.cobranza(previo),
    ]).then(([metas, actual, anterior]) => { if (vigente) { setMetasDashboard(metas); setCobranza({ actual, anterior }); } })
      .catch(() => { if (vigente) setErrorMetas(true); });
    return () => { vigente = false; };
  }, [puedeVerIngresos, fechaReferencia, periodoMetas, solicitudReporte]);
  const guardarMetas = async (cambios: CambioMeta[], alcance: "MES" | "TODOS") => {
    let vigentes: MetasDashboard | null = null;
    try {
      for (const cambio of cambios) vigentes = await servicioReportes.guardarMeta({ indicador: cambio.indicador, periodo: alcance === "MES" ? periodoMetas : null, valor: cambio.valor }, periodoMetas);
    } finally {
      // Si un guardado intermedio falla, los anteriores ya quedaron en el servidor: la pantalla debe reflejarlos.
      if (vigentes) setMetasDashboard(vigentes);
    }
  };

  const [composicion, setComposicion] = useState<ComposicionCaja | null>(null);
  const [errorComposicion, setErrorComposicion] = useState(false);
  useEffect(() => {
    if (!puedeVerFinanzas) return;
    let vigente = true;
    setErrorComposicion(false);
    void servicioFinanzas.composicion(`${fechaReferencia.slice(0, 8)}01`, fechaReferencia).then((datos) => { if (vigente) setComposicion(datos); })
      .catch(() => { if (vigente) setErrorComposicion(true); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, fechaReferencia, solicitudFinanzas]);

  useEffect(() => {
    if (datosInicioValidos) return;
    let vigente = true;
    void servicioDashboard.resumen().then((datos) => { if (vigente) { setResumen(datos); setError(""); } })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof ErrorApi && problema.estado === 401 ? "La sesión venció. Inicia sesión nuevamente." : problema instanceof Error ? problema.message : "No se pudo cargar el resumen del negocio."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [datosInicioValidos]);

  useEffect(() => {
    if (!puedeVerFinanzas) { setCargandoFinanzas(false); return; }
    let vigente = true;
    setCargandoFinanzas(true);
    setErrorFinanzas("");
    setFlujoFinanciero(null);
    void servicioFinanzas.flujo(periodoFlujo).then((datos) => { if (vigente) setFlujoFinanciero(datos); })
      .catch((problema: unknown) => { if (vigente) setErrorFinanzas(problema instanceof Error ? problema.message : "No se pudo cargar el flujo financiero del mes."); })
      .finally(() => { if (vigente) setCargandoFinanzas(false); });
    return () => { vigente = false; };
  }, [puedeVerFinanzas, solicitudFinanzas, periodoFlujo]);

  useEffect(() => {
    if (!puedeVerIngresos) { setCargandoReporte(false); return; }
    let vigente = true;
    setCargandoReporte(true);
    setErrorReporte("");
    setReporte(null);
    setReporteAnual(null);
    void servicioReportes.ingresosDashboard({ mes: rangoActual, anual: rangoAnual })
      .then((resultado) => { if (vigente) { setReporte(resultado.mes); setReporteAnual(resultado.anual); } })
      .catch((problema: unknown) => { if (vigente) setErrorReporte(problema instanceof Error ? problema.message : "No se pudieron cargar las ventas de este mes."); })
      .finally(() => { if (vigente) setCargandoReporte(false); });
    return () => { vigente = false; };
  }, [rangoActual.desde, rangoActual.hasta, rangoSemana.desde, rangoSemana.hasta, rangoAnual.desde, rangoAnual.hasta, puedeVerIngresos, solicitudReporte]);


  const mediosPago = reporte?.porMedioPago ?? [];
  const pagosTotal = mediosPago.reduce((total, pago) => total + Number(pago.total), 0);
  const datosMedios = mediosPago.map((pago, indice) => ({ nombre: nombreMedioPago(pago.medioPago), importe: Number(pago.total), color: coloresGraficos[indice % coloresGraficos.length] })).filter((pago) => pago.importe > 0);
  const puedeVerInventario = permisos.includes("INVENTARIO.LEER");
  const puedeVerMototaxis = permisos.includes("MOTOTAXIS.LEER");
  const disponiblesEnStock = Math.max((resumen?.inventario?.productosActivos ?? 0) - (resumen?.inventario?.productosSinStock ?? 0), 0);
  const datosInventario = puedeVerInventario ? [
    { nombre: "Con stock", importe: disponiblesEnStock, color: "#1769aa" },
    { nombre: "Sin stock", importe: resumen?.inventario?.productosSinStock ?? 0, color: "#d98200" },
  ].filter((item) => item.importe > 0) : [];
  const existenciasMototaxis = resumen?.inventarioMototaxis?.porModelo ?? [];
  const datosInventarioMototaxis = existenciasMototaxis.slice(0, 5).map((fila, indice) => ({
    nombre: [fila.marca, fila.modelo, fila.version].filter(Boolean).join(" "), importe: fila.unidades, color: coloresGraficos[indice],
  }));
  const otrasMototaxis = existenciasMototaxis.slice(5).reduce((total, fila) => total + fila.unidades, 0);
  if (otrasMototaxis) datosInventarioMototaxis.push({ nombre: "Otros modelos", importe: otrasMototaxis, color: "#8069bd" });
  const totalMototaxis = resumen?.inventarioMototaxis?.unidades ?? 0;
  const sinVentasEsteMes = datosMedios.length === 0;
  type MonedaFinanciera = FlujoFinanciero["monedas"][number];
  const fechaCorteFinanzas = flujoFinanciero?.hasta ?? isoLocal(new Date());
  const inicioPeriodoTarjetas = (() => {
    const fecha = new Date(`${fechaCorteFinanzas}T00:00:00.000Z`);
    if (periodoFlujo === "DIA") return fechaCorteFinanzas;
    if (periodoFlujo === "SEMANA") {
      fecha.setUTCDate(fecha.getUTCDate() - ((fecha.getUTCDay() + 6) % 7));
      return fecha.toISOString().slice(0, 10);
    }
    fecha.setUTCDate(1);
    return fecha.toISOString().slice(0, 10);
  })();
  const itemsPeriodoTarjetas = (flujoFinanciero?.items ?? []).filter((item) => item.fecha >= inicioPeriodoTarjetas && item.fecha <= fechaCorteFinanzas);
  const totalesFinancieros = itemsPeriodoTarjetas.reduce<Record<MonedaFinanciera, { ingresos: number; egresos: number; neto: number }>>((totales, item) => {
    const total = totales[item.moneda] ?? { ingresos: 0, egresos: 0, neto: 0 };
    total.ingresos += Number(item.ingresos);
    total.egresos += Number(item.egresos);
    total.neto += Number(item.neto);
    totales[item.moneda] = total;
    return totales;
  }, {} as Record<MonedaFinanciera, { ingresos: number; egresos: number; neto: number }>);
  const monedasFinancieras: MonedaFinanciera[] = flujoFinanciero?.monedas.length ? flujoFinanciero.monedas : ["PEN"];
  const sufijoPeriodo = periodoFlujo === "DIA" ? "del día" : periodoFlujo === "SEMANA" ? "de la semana" : "del mes";
  const metricasFinancieras = [{ clave: "ingresos", titulo: `Ingresos ${sufijoPeriodo}` }, { clave: "egresos", titulo: `Egresos ${sufijoPeriodo}` }, { clave: "neto", titulo: `Saldo neto ${sufijoPeriodo}` }] as const;
  const simboloMoneda = (moneda: MonedaFinanciera) => moneda === "PEN" ? "S/" : moneda === "USD" ? "US$" : "€";
  const datosDonut = sinVentasEsteMes ? datosInventario : datosMedios;
  const totalDonut = sinVentasEsteMes ? datosInventario.reduce((total, item) => total + item.importe, 0) : pagosTotal;

  const diasMes = serieIngresos(reporteAnual, rangoActual);
  const datosTendencia = diasMes.map((dia, indice) => ({ etiqueta: `Día ${indice + 1}`, fecha: dia.fecha, total: dia.total, BOLETA: dia.BOLETA, FACTURA: dia.FACTURA, NOTA_VENTA: dia.NOTA_VENTA, NOTA_DEBITO: dia.NOTA_DEBITO, ADELANTO: dia.ADELANTO, PRODUCTO: dia.PRODUCTO, SERVICIO: dia.SERVICIO, MOTOTAXI: dia.MOTOTAXI }));
  const diasAnuales = serieIngresos(reporteAnual, rangoAnual);
  const mesReferencia = new Date(`${rangoAnual.desde}T00:00:00`);
  const datosMeses = Array.from({ length: 12 }, (_, indice) => {
    const fechaMes = new Date(mesReferencia);
    fechaMes.setMonth(fechaMes.getMonth() + indice);
    const mes = isoLocal(fechaMes).slice(0, 7);
    const dias = diasAnuales.filter((dia) => dia.fecha.startsWith(mes));
    const importes = dias.reduce<ImportesGrafico>((acumulado, dia) => {
      for (const tipo of tiposImporteGrafico) acumulado[tipo] += dia[tipo];
      return acumulado;
    }, Object.fromEntries(tiposImporteGrafico.map((tipo) => [tipo, 0])) as ImportesGrafico);
    const total = origenesIngresoGrafico.reduce((suma, tipo) => suma + importes[tipo], 0);
    return { etiqueta: new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }).replace(".", ""), ...importes, total };
  });
  const datosSemana = serieIngresos(reporteAnual, rangoSemana).map((dia) => ({ ...dia, etiqueta: new Date(`${dia.fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "") }));

  const ingresosMesComparado = reporteAnual ? compararMesAcumulado(diasAnuales, fechaReferencia) : null;
  const ventasHoyComparado = reporteAnual ? compararHoyConAyer(diasAnuales, fechaReferencia) : null;
  const ticketComparado = reporteAnual ? compararTicketPromedio(reporteAnual, fechaReferencia) : null;
  const monedaIndicador = flujoMensual?.monedas.includes("PEN") ? "PEN" : flujoMensual?.monedas[0] ?? "PEN";
  const saldoComparado = flujoMensual ? compararSaldoNetoMensual(flujoMensual, fechaReferencia, monedaIndicador) : null;
  const variacionConceptos = reporteAnual ? variacionPorConcepto(diasAnuales, fechaReferencia) : [];
  const ritmoDelMes = comparativo ? construirRitmoDelMes(comparativo.dias, fechaReferencia) : null;
  const margenComparado = rentabilidad ? { actual: calcularMargen(rentabilidad.actual.filas), anterior: calcularMargen(rentabilidad.anterior.filas) } : null;
  const mapaVentas = rentabilidad ? construirMapaVentas(rentabilidad.actual.filas) : [];
  const monedaCascada = composicion?.monedas.includes("PEN") ? "PEN" : composicion?.monedas[0] ?? "PEN";
  const cascadaCaja = composicion ? construirCascadaCaja(composicion.items, monedaCascada) : null;
  const avancesMetas = construirAvanceMetas({
    hoy: fechaReferencia,
    metas: { VENTAS_MES: metasDashboard?.metas.VENTAS_MES?.valor ?? null, COBRANZA: metasDashboard?.metas.COBRANZA?.valor ?? null, MARGEN: metasDashboard?.metas.MARGEN?.valor ?? null },
    ingresos: ingresosMesComparado ? { actual: ingresosMesComparado.actual, anterior: ingresosMesComparado.anterior } : null,
    cobranza: { actual: porcentajeCobrado(cobranza?.actual ?? null), anterior: porcentajeCobrado(cobranza?.anterior ?? null) },
    margen: { actual: margenComparado?.actual?.porcentaje ?? null, anterior: margenComparado?.anterior?.porcentaje ?? null },
  });
  const mostrarRitmo = ritmoDelMes !== null && !errorComparativo;
  const mostrarMetas = puedeVerIngresos && !errorMetas && metasDashboard !== null && cobranza !== null && ingresosMesComparado !== null;
  const paretoArticulos = construirPareto(resumen?.principalesArticulos ?? [], Number(resumen?.ventasMes?.total ?? 0));


  return <section className={`${estilosDashboard.root} ${estilosDashboard.extra} inicio-dashboard`}>


    {error && <NotificacionFlotante mensaje={error} />}
    {cargando ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Preparando el panel del negocio...</span></div> : resumen && <>
      <IndicadoresClave soles={soles} ingresosMes={ingresosMesComparado} ventasHoy={ventasHoyComparado} ticket={ticketComparado} saldo={saldoComparado} margen={margenComparado} mostrarMargen={puedeVerIngresos && (permisos.includes("INVENTARIO.LEER") || permisos.includes("MOTOTAXIS.LEER")) && !errorRentabilidad} mostrarIngresos={puedeVerIngresos && !errorReporte} mostrarFinanzas={puedeVerFinanzas && !errorFlujoMensual} />
      {puedeVerFinanzas && <article className={`${estilosDashboard.panel} inicio-panel inicio-finance-summary col-span-full before:bg-[linear-gradient(90deg,#258a79,#0b376a)]`}>
        <header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>FLUJO FINANCIERO</span><h2>Movimiento financiero</h2><p>{periodoFlujo === "DIA" ? "Movimientos diarios de todo el mes actual." : periodoFlujo === "SEMANA" ? "Resumen semanal de las últimas 12 semanas." : "Movimientos mensuales de los 12 meses del año actual."} Las tarjetas resumen el periodo actual por moneda. En la vista mensual, compara con la barra del mes actual, no con la suma de los 12 meses. El saldo neto es ingreso menos egreso registrado; no equivale a utilidad contable.</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Periodo del flujo financiero">
          <button type="button" className={periodoFlujo === "DIA" ? "is-active" : ""} aria-pressed={periodoFlujo === "DIA"} onClick={() => setPeriodoFlujo("DIA")}>Diario</button>
          <button type="button" className={periodoFlujo === "SEMANA" ? "is-active" : ""} aria-pressed={periodoFlujo === "SEMANA"} onClick={() => setPeriodoFlujo("SEMANA")}>Semanal</button>
          <button type="button" className={periodoFlujo === "MES" ? "is-active" : ""} aria-pressed={periodoFlujo === "MES"} onClick={() => setPeriodoFlujo("MES")}>Mensual</button>
        </div></div></header>
        {errorFinanzas ? <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}><span>{errorFinanzas}</span><button type="button" onClick={() => setSolicitudFinanzas((actual) => actual + 1)}>Actualizar flujo financiero</button></div> : cargandoFinanzas || !flujoFinanciero ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Cargando movimientos de las cuentas...</span></div> : <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3 mobile-portrait:gap-1.5">
            {metricasFinancieras.map(({ clave, titulo }) => <div key={clave} className="grid min-h-[94px] min-w-0 content-center gap-2 rounded-[13px] border border-[#e1eaf0] bg-[linear-gradient(150deg,#fff,#f7fafc)] px-4 py-3 mobile-portrait:min-h-[84px] mobile-portrait:px-1.5 mobile-portrait:py-2 mobile-portrait:gap-1">
              <span className="text-[11px] font-bold text-[#60778e] mobile-portrait:text-[9px]">{titulo}</span>
              {monedasFinancieras.map((moneda) => <strong key={moneda} className={`text-[19px] font-extrabold tabular-nums mobile-portrait:text-[clamp(9px,3vw,12px)] ${clave === "neto" && (totalesFinancieros[moneda]?.neto ?? 0) < 0 ? "text-[#b83b4b]" : "text-[#153b60]"}`}>
                {simboloMoneda(moneda)} {(totalesFinancieros[moneda]?.[clave] ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{moneda !== "PEN" && <small className="ml-1 text-[10px] font-bold text-[#8293a5]">{moneda}</small>}
              </strong>)}
            </div>)}
          </div>
          <FlujoFinancieroChart datos={flujoFinanciero} />
        </div>}
      </article>}
      {!puedeVerIngresos ? <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>Tu usuario no tiene permiso para consultar los reportes de ventas.</div> : errorReporte ? <>
        <NotificacionFlotante mensaje={errorReporte} titulo="No se pudo cargar la actividad del mes" accion={{ etiqueta: "Actualizar resumen", ejecutar: () => setSolicitudReporte((actual) => actual + 1) }} />
        <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}><button type="button" onClick={() => setSolicitudReporte((actual) => actual + 1)}>Actualizar resumen</button></div>
      </> : cargandoReporte || !reporte ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Cargando actividad de ventas...</span></div> : <>
        <div className={`${estilosDashboard.grid} inicio-chart-grid`}>
          {mostrarRitmo && <article className={`${estilosDashboard.panel} inicio-panel ${mostrarMetas ? "col-span-8" : "col-span-full"} mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>RITMO DEL MES</span><h2>Ingresos acumulados frente a otros periodos</h2><p>Cómo va este mes día a día, comparado con el mes anterior y con el mismo mes del año pasado. La proyección es lineal: asume que el ritmo actual se mantiene.</p></div></header><RitmoDelMesChart ritmo={ritmoDelMes!} soles={soles} /></article>}

          {mostrarMetas && <article className={`${estilosDashboard.panel} inicio-panel ${mostrarRitmo ? "col-span-4" : "col-span-6"} mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>METAS</span><h2>Avance contra objetivo</h2><p>Cómo vas este mes frente a lo que te propusiste.</p></div></header><AvanceMetasPanel avances={avancesMetas} soles={soles} metas={metasDashboard?.metas ?? null} puedeConfigurar={permisos.includes("FINANZAS.ADMINISTRAR")} onGuardar={guardarMetas} /></article>}

          <article className={`${estilosDashboard.panel} inicio-panel inicio-sales-chart col-span-full before:bg-[linear-gradient(90deg,#ed2535_0_48%,#0b376a_48%_100%)]`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>EVOLUCIÓN DEL MES</span><h2>Ingresos durante el mes</h2><p>{modoFlujoDiario === "TOTAL" ? "Importe total de ingresos por día durante el mes" : modoFlujoDiario === "ORIGEN" ? "Desglose diario por boletas, facturas, notas de venta, notas de débito y adelantos" : "Desglose diario de las ventas por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista de ingresos diarios"><button type="button" className={modoFlujoDiario === "TOTAL" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "TOTAL"} onClick={() => setModoFlujoDiario("TOTAL")}>Total diario</button><button type="button" className={modoFlujoDiario === "ORIGEN" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "ORIGEN"} onClick={() => setModoFlujoDiario("ORIGEN")}>Origen del ingreso</button><button type="button" className={modoFlujoDiario === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "CONCEPTO"} onClick={() => setModoFlujoDiario("CONCEPTO")}>Tipo de venta</button></div></div></header>
            {datosTendencia.some((dia) => dia.total > 0) ? <FlujoChart datos={datosTendencia} modo={modoFlujoDiario} mensajeVacio="Aún no hay ingresos registrados este mes." soles={soles} etiquetaFecha={etiquetaFechaPunto} className="h-[350px] mobile-portrait:h-[245px]" /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>Aún no hay ingresos registrados este mes.</div>}
            <LeyendaFlujo modo={modoFlujoDiario} /></article>

          <article className={`${estilosDashboard.panel} inicio-panel inicio-payment-panel col-span-6 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}><CreditCard size={11} aria-hidden="true" /> {sinVentasEsteMes ? "INVENTARIO" : "DISTRIBUCI\u00d3N DE PAGOS"}</span><h2>{sinVentasEsteMes ? "Disponibilidad de repuestos" : "Medios de pago"}</h2><p>{sinVentasEsteMes ? "Resumen de existencias de repuestos mientras no haya ventas." : "Participaci\u00f3n en las ventas de este mes"}</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card mobile-landscape:w-[min(100%,260px)] mobile-portrait:w-[min(100%,260px)]"><div className={`inicio-donut-visual${datosDonut.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosDonut.length > 0 && <Pie isAnimationActive={false} data={datosDonut} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosDonut.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor, nombre) => [sinVentasEsteMes ? `${Number(valor)} ${Number(valor) === 1 ? "repuesto" : "repuestos"}` : soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{sinVentasEsteMes ? puedeVerInventario ? totalDonut : "—" : soles(pagosTotal)}</strong><small>{sinVentasEsteMes ? puedeVerInventario ? "REPUESTOS ACTIVOS" : "SIN ACCESO" : "MES ACTUAL"}</small></div></div><strong>{datosDonut.length ? (sinVentasEsteMes ? "Estado del inventario" : "Ventas cobradas") : sinVentasEsteMes && !puedeVerInventario ? "Inventario restringido" : "Cat\u00e1logo sin repuestos"}</strong></div></div><div className="inicio-donut-legend">{datosDonut.length ? datosDonut.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{sinVentasEsteMes ? `${item.importe} ${item.importe === 1 ? "repuesto" : "repuestos"}` : soles(item.importe)}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />{sinVentasEsteMes && !puedeVerInventario ? "Inventario restringido" : "No hay repuestos activos"}</span><b>{sinVentasEsteMes && !puedeVerInventario ? "Sin acceso" : "0 repuestos"}</b></div>}</div></article>

          {puedeVerMototaxis && resumen?.inventarioMototaxis && <article className={`${estilosDashboard.panel} inicio-panel inicio-payment-panel inicio-mototaxi-panel col-span-6 before:bg-[#258a79] mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>INVENTARIO · MOTOTAXIS</span><h2>Disponibilidad de mototaxis</h2><p>Existencias disponibles por modelo.</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card mobile-landscape:w-[min(100%,260px)] mobile-portrait:w-[min(100%,260px)]"><div className={`inicio-donut-visual${datosInventarioMototaxis.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosInventarioMototaxis.length > 0 && <Pie isAnimationActive={false} data={datosInventarioMototaxis} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosInventarioMototaxis.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor) => [`${Number(valor)} ${Number(valor) === 1 ? "mototaxi" : "mototaxis"}`, "Unidades"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{totalMototaxis}</strong><small>UNIDADES</small></div></div><strong>{totalMototaxis ? "Mototaxis disponibles" : "Sin mototaxis registradas"}</strong></div></div><div className="inicio-donut-legend">{datosInventarioMototaxis.length ? datosInventarioMototaxis.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{item.importe} {item.importe === 1 ? "unidad" : "unidades"}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />Sin unidades en inventario</span><b>0 unidades</b></div>}</div></article>}

          <article className={`${estilosDashboard.panel} inicio-panel inicio-months-panel col-span-6 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>&Uacute;LTIMOS DOCE MESES</span><h2>Ingresos por mes</h2><p>{modoVentasMensuales === "TOTAL" ? "Importe total de ingresos en cada mes" : modoVentasMensuales === "ORIGEN" ? "Desglose mensual por boletas, facturas, notas de venta, notas de débito y adelantos" : "Desglose mensual de ventas por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista de ingresos mensuales"><button type="button" className={modoVentasMensuales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "TOTAL"} onClick={() => setModoVentasMensuales("TOTAL")}>Total mensual</button><button type="button" className={modoVentasMensuales === "ORIGEN" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "ORIGEN"} onClick={() => setModoVentasMensuales("ORIGEN")}>Origen del ingreso</button><button type="button" className={modoVentasMensuales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "CONCEPTO"} onClick={() => setModoVentasMensuales("CONCEPTO")}>Tipo de venta</button></div></div></header>{datosMeses.some((mes) => mes.total > 0) ? <VentasMensualesChart datos={datosMeses} modo={modoVentasMensuales} mensajeVacio="No hay ingresos registrados en los últimos doce meses." soles={soles} /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>No hay ingresos registrados en los últimos doce meses.</div>}<LeyendaFlujo modo={modoVentasMensuales} /></article>
          <article className={`${estilosDashboard.panel} inicio-panel inicio-weekly-chart col-span-6 before:bg-[linear-gradient(90deg,#ed2535_0_48%,#0b376a_48%_100%)] mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>ÚLTIMOS SIETE DÍAS</span><h2>Ingresos día a día</h2><p>{modoVentasSemanales === "TOTAL" ? "Ingreso total registrado por día" : modoVentasSemanales === "ORIGEN" ? "Ingreso diario por origen" : "Ingreso diario por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Desglose diario de ingresos"><button type="button" className={modoVentasSemanales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "TOTAL"} onClick={() => setModoVentasSemanales("TOTAL")}>Total diario</button><button type="button" className={modoVentasSemanales === "ORIGEN" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "ORIGEN"} onClick={() => setModoVentasSemanales("ORIGEN")}>Origen del ingreso</button><button type="button" className={modoVentasSemanales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "CONCEPTO"} onClick={() => setModoVentasSemanales("CONCEPTO")}>Tipo de venta</button></div></div></header>{datosSemana.some((dia) => dia.total > 0) ? <FlujoChart datos={datosSemana} modo={modoVentasSemanales} mensajeVacio="No hay ingresos registrados en los últimos siete días." soles={soles} etiquetaFecha={etiquetaFechaPunto}  /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>No hay ingresos registrados en los últimos siete días.</div>}<LeyendaFlujo modo={modoVentasSemanales} /></article>

          <article className={`${estilosDashboard.panel} inicio-panel col-span-5 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>QUÉ CAMBIÓ</span><h2>Variación por tipo de venta</h2><p>Lo acumulado este mes frente al mismo tramo de días del mes anterior. Considera boletas, facturas y notas de venta.</p></div></header><VariacionPorTipoChart datos={variacionConceptos} soles={soles} /></article>

          {cascadaCaja && !errorComposicion && <article className={`${estilosDashboard.panel} inicio-panel col-span-7 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>DEL COBRO AL SALDO</span><h2>Cascada de caja del mes</h2><p>Lo cobrado, menos lo pagado en compras, gastos y notas de crédito, más las notas de débito. El saldo coincide con el "Saldo neto del mes".</p></div></header><CascadaCajaChart cascada={cascadaCaja} soles={soles} nota={(composicion?.monedas.length ?? 0) > 1 ? `Se muestra la moneda ${monedaCascada}.` : undefined} /></article>}

          {mapaVentas.length > 0 && !errorRentabilidad && <article className={`${estilosDashboard.panel} inicio-panel col-span-5 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>QUÉ CATEGORÍAS PESAN</span><h2>Composición de las ventas</h2><p>Ventas sin IGV del mes por categoría de repuesto, servicios y mototaxis.</p></div></header><MapaVentasChart teselas={mapaVentas} soles={soles} /></article>}

          {paretoArticulos.length > 0 && <article className={`${estilosDashboard.panel} inicio-panel col-span-7 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>QUÉ PRODUCTOS MANDAN</span><h2>Artículos más vendidos del mes</h2><p>Importe por artículo y porcentaje acumulado sobre las ventas del mes. La línea punteada marca el 80%.</p></div></header><ParetoArticulosChart datos={paretoArticulos} soles={soles} /></article>}

          {horarios && !errorHorarios && <article className={`${estilosDashboard.panel} inicio-panel col-span-full`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>CUÁNDO VENDES</span><h2>Ventas por día y hora</h2><p>Últimos 90 días, en hora de Perú. Sirve para decidir turnos y cuándo reforzar la atención.</p></div></header><MapaCalorHorarios horarios={horarios} soles={soles} /></article>}


        </div>
      </>}
    </>}
  </section>;
}
