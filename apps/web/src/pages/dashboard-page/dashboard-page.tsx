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
import { servicioReportes, type FiltroReporte, type ReporteIngresos } from "../../services/reportes.service";
import { servicioFinanzas, type FlujoFinanciero, type PeriodoFlujoFinanciero } from "../../services/finanzas.service";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const etiquetaFechaPunto = (valor: string) => new Date(`${valor.length === 7 ? `${valor}-01` : valor}T00:00:00`).toLocaleDateString("es-PE", valor.length === 7 ? { month: "long", year: "numeric" } : { day: "numeric", month: "short" });
const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const coloresGraficos = ["#d62f4f", "#347caf", "#27a383", "#e2a541", "#8069bd", "#65a4b8"];
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

  const series = modo === "COMPROBANTE"
    ? [
      { nombre: "Boletas", color: "#cc3450" },
      { nombre: "Facturas", color: "#347caf" },
      { nombre: "Notas de venta", color: "#27a383" },
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

function serieIngresos(reporte: Pick<ReporteIngresos, "flujoPorComprobante" | "flujoPorConcepto"> | null, rango: FiltroReporte): PuntoIngresos[] {
  if (!reporte) return [];
  const importesPorFecha = new Map<string, ImportesGrafico>();
  for (const fila of reporte.flujoPorComprobante) {
    const importes = importesPorFecha.get(fila.fecha) ?? { BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0 };
    importes[fila.tipoComprobante] += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  for (const fila of reporte.flujoPorConcepto) {
    const importes = importesPorFecha.get(fila.fecha) ?? { BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0 };
    importes[fila.tipo] += Number(fila.total);
    importesPorFecha.set(fila.fecha, importes);
  }
  const dias: PuntoIngresos[] = [];
  const fin = new Date(`${rango.hasta}T00:00:00`);
  for (let fecha = new Date(`${rango.desde}T00:00:00`); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
    const iso = isoLocal(fecha);
    const importes = importesPorFecha.get(iso) ?? { BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0 };
    dias.push({ fecha: iso, ...importes, total: importes.BOLETA + importes.FACTURA + importes.NOTA_VENTA });
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
  const [reporte, setReporte] = useState<Pick<ReporteIngresos, "porMedioPago"> | null>(null);
  const [reporteAnual, setReporteAnual] = useState<Pick<ReporteIngresos, "rango" | "flujoPorComprobante" | "flujoPorConcepto"> | null>(null);
  const [modoFlujoDiario, setModoFlujoDiario] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [modoVentasMensuales, setModoVentasMensuales] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [modoVentasSemanales, setModoVentasSemanales] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [cargandoReporte, setCargandoReporte] = useState(puedeVerIngresos);
  const [errorReporte, setErrorReporte] = useState("");
  const [solicitudReporte, setSolicitudReporte] = useState(0);
  const puedeVerFinanzas = permisos.includes("FINANZAS.LEER");
  const [flujoFinanciero, setFlujoFinanciero] = useState<FlujoFinanciero | null>(null);
  const [cargandoFinanzas, setCargandoFinanzas] = useState(puedeVerFinanzas);
  const [errorFinanzas, setErrorFinanzas] = useState("");
  const [solicitudFinanzas, setSolicitudFinanzas] = useState(0);
  const [periodoFlujo, setPeriodoFlujo] = useState<PeriodoFlujoFinanciero>("MES");

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
  const totalesFinancieros = (flujoFinanciero?.items ?? []).reduce<Record<MonedaFinanciera, { ingresos: number; egresos: number; neto: number }>>((totales, item) => {
    const total = totales[item.moneda] ?? { ingresos: 0, egresos: 0, neto: 0 };
    total.ingresos += Number(item.ingresos);
    total.egresos += Number(item.egresos);
    total.neto += Number(item.neto);
    totales[item.moneda] = total;
    return totales;
  }, {} as Record<MonedaFinanciera, { ingresos: number; egresos: number; neto: number }>);
  const monedasFinancieras: MonedaFinanciera[] = flujoFinanciero?.monedas.length ? flujoFinanciero.monedas : ["PEN"];
  const metricasFinancieras = [{ clave: "ingresos", titulo: "Ingresos" }, { clave: "egresos", titulo: "Egresos" }, { clave: "neto", titulo: "Ingreso neto" }] as const;
  const simboloMoneda = (moneda: MonedaFinanciera) => moneda === "PEN" ? "S/" : moneda === "USD" ? "US$" : "€";
  const datosDonut = sinVentasEsteMes ? datosInventario : datosMedios;
  const totalDonut = sinVentasEsteMes ? datosInventario.reduce((total, item) => total + item.importe, 0) : pagosTotal;

  const diasMes = serieIngresos(reporteAnual, rangoActual);
  const datosTendencia = diasMes.map((dia, indice) => ({ etiqueta: `Día ${indice + 1}`, fecha: dia.fecha, total: dia.total, BOLETA: dia.BOLETA, FACTURA: dia.FACTURA, NOTA_VENTA: dia.NOTA_VENTA, PRODUCTO: dia.PRODUCTO, SERVICIO: dia.SERVICIO, MOTOTAXI: dia.MOTOTAXI }));
  const diasAnuales = serieIngresos(reporteAnual, rangoAnual);
  const mesReferencia = new Date(`${rangoAnual.desde}T00:00:00`);
  const datosMeses = Array.from({ length: 12 }, (_, indice) => {
    const fechaMes = new Date(mesReferencia);
    fechaMes.setMonth(fechaMes.getMonth() + indice);
    const mes = isoLocal(fechaMes).slice(0, 7);
    const dias = diasAnuales.filter((dia) => dia.fecha.startsWith(mes));
    const importes = dias.reduce<ImportesGrafico>((acumulado, dia) => {
      for (const tipo of ["BOLETA", "FACTURA", "NOTA_VENTA", "PRODUCTO", "SERVICIO", "MOTOTAXI"] as const) acumulado[tipo] += dia[tipo];
      return acumulado;
    }, { BOLETA: 0, FACTURA: 0, NOTA_VENTA: 0, PRODUCTO: 0, SERVICIO: 0, MOTOTAXI: 0 });
    return { etiqueta: new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }).replace(".", ""), ...importes, total: importes.BOLETA + importes.FACTURA + importes.NOTA_VENTA };
  });
  const datosSemana = serieIngresos(reporteAnual, rangoSemana).map((dia) => ({ ...dia, etiqueta: new Date(`${dia.fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "") }));


  return <section className={`${estilosDashboard.root} ${estilosDashboard.extra} inicio-dashboard`}>


    {error && <NotificacionFlotante mensaje={error} />}
    {cargando ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Preparando el panel del negocio...</span></div> : resumen && <>
      {puedeVerFinanzas && <article className={`${estilosDashboard.panel} inicio-panel inicio-finance-summary col-span-full before:bg-[linear-gradient(90deg,#258a79,#0b376a)]`}>
        <header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>FLUJO FINANCIERO</span><h2>Entradas, egresos e ingreso neto</h2><p>{periodoFlujo === "DIA" ? "Movimientos diarios de los últimos siete días." : periodoFlujo === "SEMANA" ? "Movimientos semanales de las últimas ocho semanas." : "Movimientos mensuales de los últimos doce meses."} Los importes se presentan por moneda.</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Periodo del flujo financiero">
          <button type="button" className={periodoFlujo === "DIA" ? "is-active" : ""} aria-pressed={periodoFlujo === "DIA"} onClick={() => setPeriodoFlujo("DIA")}>Diaria</button>
          <button type="button" className={periodoFlujo === "SEMANA" ? "is-active" : ""} aria-pressed={periodoFlujo === "SEMANA"} onClick={() => setPeriodoFlujo("SEMANA")}>Semanal</button>
          <button type="button" className={periodoFlujo === "MES" ? "is-active" : ""} aria-pressed={periodoFlujo === "MES"} onClick={() => setPeriodoFlujo("MES")}>Mensual</button>
        </div></div></header>
        {errorFinanzas ? <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}><span>{errorFinanzas}</span><button type="button" onClick={() => setSolicitudFinanzas((actual) => actual + 1)}>Actualizar flujo financiero</button></div> : cargandoFinanzas || !flujoFinanciero ? <div className={`${estilosDashboard.loading} inicio-loading`} role="status"><i /><span>Cargando movimientos de las cuentas...</span></div> : <div className="grid gap-4">
          <div className="grid grid-cols-3 gap-3 mobile-portrait:grid-cols-1">
            {metricasFinancieras.map(({ clave, titulo }) => <div key={clave} className="grid min-h-[94px] content-center gap-2 rounded-[13px] border border-[#e1eaf0] bg-[linear-gradient(150deg,#fff,#f7fafc)] px-4 py-3">
              <span className="text-[11px] font-bold text-[#60778e]">{titulo}</span>
              {monedasFinancieras.map((moneda) => <strong key={moneda} className={`text-[19px] font-extrabold tabular-nums ${clave === "neto" && (totalesFinancieros[moneda]?.neto ?? 0) < 0 ? "text-[#b83b4b]" : "text-[#153b60]"}`}>
                {simboloMoneda(moneda)} {(totalesFinancieros[moneda]?.[clave] ?? 0).toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<small className="ml-1 text-[10px] font-bold text-[#8293a5]">{moneda}</small>
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
          <article className={`${estilosDashboard.panel} inicio-panel inicio-sales-chart col-span-full before:bg-[linear-gradient(90deg,#ed2535_0_48%,#0b376a_48%_100%)]`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>EVOLUCIÓN DEL MES</span><h2>Ventas durante el mes</h2><p>{modoFlujoDiario === "TOTAL" ? "Importe total por día durante el mes" : modoFlujoDiario === "COMPROBANTE" ? "Importe diario por tipo de comprobante" : "Importe diario por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista del gráfico"><button type="button" className={modoFlujoDiario === "TOTAL" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "TOTAL"} onClick={() => setModoFlujoDiario("TOTAL")}>Total diario</button><button type="button" className={modoFlujoDiario === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "COMPROBANTE"} onClick={() => setModoFlujoDiario("COMPROBANTE")}>Comprobante</button><button type="button" className={modoFlujoDiario === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "CONCEPTO"} onClick={() => setModoFlujoDiario("CONCEPTO")}>Tipo de venta</button></div></div></header>
            {datosTendencia.some((dia) => dia.total > 0) ? <FlujoChart datos={datosTendencia} modo={modoFlujoDiario} mensajeVacio="Aún no hay ventas registradas este mes." soles={soles} etiquetaFecha={etiquetaFechaPunto} className="h-[350px] mobile-portrait:h-[245px]" /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>Aún no hay ventas registradas este mes.</div>}
            <LeyendaFlujo modo={modoFlujoDiario} /></article>

          <article className={`${estilosDashboard.panel} inicio-panel inicio-payment-panel col-span-6 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}><CreditCard size={11} aria-hidden="true" /> {sinVentasEsteMes ? "INVENTARIO" : "DISTRIBUCI\u00d3N DE PAGOS"}</span><h2>{sinVentasEsteMes ? "Disponibilidad de repuestos" : "Medios de pago"}</h2><p>{sinVentasEsteMes ? "Resumen de existencias de repuestos mientras no haya ventas." : "Participaci\u00f3n en las ventas de este mes"}</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card mobile-landscape:w-[min(100%,260px)] mobile-portrait:w-[min(100%,260px)]"><div className={`inicio-donut-visual${datosDonut.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosDonut.length > 0 && <Pie isAnimationActive={false} data={datosDonut} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosDonut.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor, nombre) => [sinVentasEsteMes ? `${Number(valor)} ${Number(valor) === 1 ? "repuesto" : "repuestos"}` : soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{sinVentasEsteMes ? puedeVerInventario ? totalDonut : "—" : soles(pagosTotal)}</strong><small>{sinVentasEsteMes ? puedeVerInventario ? "REPUESTOS ACTIVOS" : "SIN ACCESO" : "MES ACTUAL"}</small></div></div><strong>{datosDonut.length ? (sinVentasEsteMes ? "Estado del inventario" : "Ventas cobradas") : sinVentasEsteMes && !puedeVerInventario ? "Inventario restringido" : "Cat\u00e1logo sin repuestos"}</strong></div></div><div className="inicio-donut-legend">{datosDonut.length ? datosDonut.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{sinVentasEsteMes ? `${item.importe} ${item.importe === 1 ? "repuesto" : "repuestos"}` : soles(item.importe)}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />{sinVentasEsteMes && !puedeVerInventario ? "Inventario restringido" : "No hay repuestos activos"}</span><b>{sinVentasEsteMes && !puedeVerInventario ? "Sin acceso" : "0 repuestos"}</b></div>}</div></article>

          {puedeVerMototaxis && resumen?.inventarioMototaxis && <article className={`${estilosDashboard.panel} inicio-panel inicio-payment-panel inicio-mototaxi-panel col-span-6 before:bg-[#258a79] mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>INVENTARIO · MOTOTAXIS</span><h2>Disponibilidad de mototaxis</h2><p>Existencias disponibles por modelo.</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card mobile-landscape:w-[min(100%,260px)] mobile-portrait:w-[min(100%,260px)]"><div className={`inicio-donut-visual${datosInventarioMototaxis.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosInventarioMototaxis.length > 0 && <Pie isAnimationActive={false} data={datosInventarioMototaxis} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosInventarioMototaxis.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor) => [`${Number(valor)} ${Number(valor) === 1 ? "mototaxi" : "mototaxis"}`, "Unidades"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{totalMototaxis}</strong><small>UNIDADES</small></div></div><strong>{totalMototaxis ? "Mototaxis disponibles" : "Sin mototaxis registradas"}</strong></div></div><div className="inicio-donut-legend">{datosInventarioMototaxis.length ? datosInventarioMototaxis.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{item.importe} {item.importe === 1 ? "unidad" : "unidades"}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />Sin unidades en inventario</span><b>0 unidades</b></div>}</div></article>}

          <article className={`${estilosDashboard.panel} inicio-panel inicio-months-panel col-span-6 mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>&Uacute;LTIMOS DOCE MESES</span><h2>Ventas por mes</h2><p>{modoVentasMensuales === "TOTAL" ? "Importe total vendido en cada mes" : modoVentasMensuales === "COMPROBANTE" ? "Desglose mensual por comprobante" : "Ventas mensuales por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista de ventas mensuales"><button type="button" className={modoVentasMensuales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "TOTAL"} onClick={() => setModoVentasMensuales("TOTAL")}>Total mensual</button><button type="button" className={modoVentasMensuales === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "COMPROBANTE"} onClick={() => setModoVentasMensuales("COMPROBANTE")}>Comprobante</button><button type="button" className={modoVentasMensuales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "CONCEPTO"} onClick={() => setModoVentasMensuales("CONCEPTO")}>Tipo de venta</button></div></div></header>{datosMeses.some((mes) => mes.total > 0) ? <VentasMensualesChart datos={datosMeses} modo={modoVentasMensuales} mensajeVacio="No hay ventas registradas en los últimos doce meses." soles={soles} /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>No hay ventas registradas en los últimos doce meses.</div>}<LeyendaFlujo modo={modoVentasMensuales} /></article>
          <article className={`${estilosDashboard.panel} inicio-panel inicio-weekly-chart col-span-6 before:bg-[linear-gradient(90deg,#ed2535_0_48%,#0b376a_48%_100%)] mobile-landscape:col-span-1 mobile-portrait:col-span-1`}><header className={`${estilosDashboard.heading} inicio-panel-heading`}><div><span className={`${estilosDashboard.kicker} inicio-panel-kicker`}>ÚLTIMOS SIETE DÍAS</span><h2>Ingresos día a día</h2><p>{modoVentasSemanales === "TOTAL" ? "Ingreso total registrado por día" : modoVentasSemanales === "COMPROBANTE" ? "Ingreso diario por tipo de comprobante" : "Ingreso diario por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Desglose diario de ingresos"><button type="button" className={modoVentasSemanales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "TOTAL"} onClick={() => setModoVentasSemanales("TOTAL")}>Total diario</button><button type="button" className={modoVentasSemanales === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "COMPROBANTE"} onClick={() => setModoVentasSemanales("COMPROBANTE")}>Comprobante</button><button type="button" className={modoVentasSemanales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "CONCEPTO"} onClick={() => setModoVentasSemanales("CONCEPTO")}>Motivo de ingreso</button></div></div></header>{datosSemana.some((dia) => dia.total > 0) ? <FlujoChart datos={datosSemana} modo={modoVentasSemanales} mensajeVacio="No hay ingresos registrados en los últimos siete días." soles={soles} etiquetaFecha={etiquetaFechaPunto}  /> : <div className={`${estilosDashboard.chartEmpty} inicio-chart-empty`}>No hay ingresos registrados en los últimos siete días.</div>}<LeyendaFlujo modo={modoVentasSemanales} /></article>


        </div>
      </>}
    </>}
  </section>;
}
