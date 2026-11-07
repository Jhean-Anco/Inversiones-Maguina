import "./dashboard-page.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, CreditCard } from "lucide-react";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type FiltroReporte, type ReporteIngresos } from "../../services/reportes.service";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const fechaCorta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
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
type TipoComprobanteGrafico = "BOLETA" | "FACTURA" | "NOTA_VENTA";
type TipoConceptoGrafico = "PRODUCTO" | "SERVICIO" | "MOTOTAXI";
type ModoDesgloseGrafico = "TOTAL" | "COMPROBANTE" | "CONCEPTO";
type ImportesGrafico = Record<TipoComprobanteGrafico | TipoConceptoGrafico, number>;
type PuntoIngresos = { fecha: string; total: number } & ImportesGrafico;

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

function serieIngresos(reporte: ReporteIngresos | null, rango: FiltroReporte): PuntoIngresos[] {
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

export function DashboardPage({ puedeVerIngresos = true }: { nombre: string; rol: string; puedeVerIngresos?: boolean }) {
  const navegar = useNavigate();
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
  const [reporte, setReporte] = useState<ReporteIngresos | null>(null);
  const [reporteSemanal, setReporteSemanal] = useState<ReporteIngresos | null>(null);
  const [reporteAnual, setReporteAnual] = useState<ReporteIngresos | null>(null);
  const [modoFlujoDiario, setModoFlujoDiario] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [modoVentasMensuales, setModoVentasMensuales] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [modoVentasSemanales, setModoVentasSemanales] = useState<"TOTAL" | "COMPROBANTE" | "CONCEPTO">("TOTAL");
  const [cargandoReporte, setCargandoReporte] = useState(puedeVerIngresos);
  const [errorReporte, setErrorReporte] = useState("");
  const [solicitudReporte, setSolicitudReporte] = useState(0);

  useEffect(() => {
    if (datosInicioValidos) return;
    let vigente = true;
    void servicioDashboard.resumen().then((datos) => { if (vigente) { setResumen(datos); setError(""); } })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof ErrorApi && problema.estado === 401 ? "La sesión venció. Inicia sesión nuevamente." : problema instanceof Error ? problema.message : "No se pudo cargar el resumen del negocio."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [datosInicioValidos]);

  useEffect(() => {
    if (!puedeVerIngresos) { setCargandoReporte(false); return; }
    let vigente = true;
    setCargandoReporte(true);
    setErrorReporte("");
    setReporte(null);
    setReporteSemanal(null);
    setReporteAnual(null);
    void Promise.all([servicioReportes.ingresos(rangoActual), servicioReportes.ingresos(rangoSemana), servicioReportes.ingresos(rangoAnual)])
      .then(([resultadoMes, resultadoSemana, resultadoAnual]) => { if (vigente) { setReporte(resultadoMes); setReporteSemanal(resultadoSemana); setReporteAnual(resultadoAnual); } })
      .catch((problema: unknown) => { if (vigente) setErrorReporte(problema instanceof Error ? problema.message : "No se pudieron cargar las ventas de este mes."); })
      .finally(() => { if (vigente) setCargandoReporte(false); });
    return () => { vigente = false; };
  }, [rangoActual.desde, rangoActual.hasta, rangoSemana.desde, rangoSemana.hasta, rangoAnual.desde, rangoAnual.hasta, puedeVerIngresos, solicitudReporte]);


  const mediosPago = reporte?.porMedioPago ?? [];
  const pagosTotal = mediosPago.reduce((total, pago) => total + Number(pago.total), 0);
  const datosMedios = mediosPago.map((pago, indice) => ({ nombre: nombreMedioPago(pago.medioPago), importe: Number(pago.total), color: coloresGraficos[indice % coloresGraficos.length] })).filter((pago) => pago.importe > 0);
  const disponiblesEnStock = Math.max((resumen?.inventario.productosActivos ?? 0) - (resumen?.inventario.productosSinStock ?? 0), 0);
  const datosInventario = [
    { nombre: "Con stock", importe: disponiblesEnStock, color: "#1769aa" },
    { nombre: "Sin stock", importe: resumen?.inventario.productosSinStock ?? 0, color: "#d98200" },
  ].filter((item) => item.importe > 0);
  const estadosMototaxi: Record<string, { nombre: string; color: string }> = {
    DISPONIBLE: { nombre: "Disponibles", color: "#1769aa" },
    RESERVADA: { nombre: "Reservadas", color: "#d98200" },
    VENDIDA: { nombre: "Vendidas", color: "#27a383" },
  };
  const cantidadesMototaxis = new Map<string, number>();
  for (const fila of resumen?.inventarioMototaxis.porEstado ?? []) {
    const configuracion = estadosMototaxi[fila.estado] ?? { nombre: "Otros estados", color: "#8069bd" };
    cantidadesMototaxis.set(configuracion.nombre, (cantidadesMototaxis.get(configuracion.nombre) ?? 0) + Number(fila.unidades));
  }
  const coloresMototaxi = Object.fromEntries(Object.values(estadosMototaxi).map(({ nombre, color }) => [nombre, color]));
  coloresMototaxi["Otros estados"] = "#8069bd";
  const datosInventarioMototaxis = [...cantidadesMototaxis.entries()]
    .map(([nombre, importe]) => ({ nombre, importe, color: coloresMototaxi[nombre] ?? "#8069bd" }))
    .filter((item) => item.importe > 0);
  const totalMototaxis = resumen?.inventarioMototaxis.unidades ?? 0;
  const sinVentasEsteMes = datosMedios.length === 0;
  const datosDonut = sinVentasEsteMes ? datosInventario : datosMedios;
  const totalDonut = sinVentasEsteMes ? datosInventario.reduce((total, item) => total + item.importe, 0) : pagosTotal;

  const diasMes = serieIngresos(reporte, rangoActual);
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
  const datosSemana = serieIngresos(reporteSemanal, rangoSemana).map((dia) => ({ ...dia, etiqueta: new Date(`${dia.fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }).replace(".", "") }));


  return <section className="dashboard-page inicio-dashboard">


    {error && <div className="venta-alert" role="alert">{error}</div>}
    {cargando ? <div className="inicio-loading" role="status"><i /><span>Preparando el panel del negocio...</span></div> : resumen && <>
      {!puedeVerIngresos ? <div className="inicio-chart-empty">Tu usuario no tiene permiso para consultar los reportes de ventas.</div> : errorReporte ? <div className="inicio-panel inicio-comparison-error" role="alert"><strong>No se pudo cargar la actividad del mes.</strong><span>{errorReporte}</span><button type="button" onClick={() => setSolicitudReporte((actual) => actual + 1)}>Actualizar resumen</button></div> : cargandoReporte || !reporte ? <div className="inicio-loading" role="status"><i /><span>Cargando actividad de ventas...</span></div> : <>
        <div className="inicio-chart-grid">
          <article className="inicio-panel inicio-sales-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">EVOLUCIÓN DEL MES</span><h2>Ventas durante el mes</h2><p>{modoFlujoDiario === "TOTAL" ? "Importe total por día durante el mes" : modoFlujoDiario === "COMPROBANTE" ? "Importe diario por tipo de comprobante" : "Importe diario por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista del gráfico"><button type="button" className={modoFlujoDiario === "TOTAL" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "TOTAL"} onClick={() => setModoFlujoDiario("TOTAL")}>Total diario</button><button type="button" className={modoFlujoDiario === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "COMPROBANTE"} onClick={() => setModoFlujoDiario("COMPROBANTE")}>Comprobante</button><button type="button" className={modoFlujoDiario === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoFlujoDiario === "CONCEPTO"} onClick={() => setModoFlujoDiario("CONCEPTO")}>Tipo de venta</button></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true"><ArrowUpRight size={13} /></span></button></div></header>
            {datosTendencia.length ? <div className="inicio-recharts inicio-recharts-line"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={datosTendencia} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} interval="preserveStartEnd" /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => "S/ " + Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)} width={58} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaFechaPunto(String(payload[0].payload.fecha)) : ""} formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 12, boxShadow: "0 12px 28px #18395018", fontSize: 11 }} labelStyle={{ marginBottom: 6, color: "#526d80", fontWeight: 800 }} />{modoFlujoDiario === "TOTAL" ? <Line type="monotone" dataKey="total" name="Total" stroke="#cc3450" strokeWidth={2.8} dot={{ r: 2.5, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /> : modoFlujoDiario === "COMPROBANTE" ? <><Line type="monotone" dataKey="BOLETA" name="Boletas" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="FACTURA" name="Facturas" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="NOTA_VENTA" name="Notas de venta" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /></> : <><Line type="monotone" dataKey="PRODUCTO" name="Repuestos" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="SERVICIO" name="Servicios" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="MOTOTAXI" name="Mototaxis" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /></>}</LineChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">Aún no hay ventas registradas este mes.</div>}
          <LeyendaFlujo modo={modoFlujoDiario} /></article>

          <article className="inicio-panel inicio-payment-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker"><CreditCard size={11} aria-hidden="true" /> {sinVentasEsteMes ? "INVENTARIO" : "DISTRIBUCI\u00d3N DE PAGOS"}</span><h2>{sinVentasEsteMes ? "Disponibilidad de repuestos" : "Medios de pago"}</h2><p>{sinVentasEsteMes ? "Resumen de existencias de repuestos mientras no haya ventas." : "Participaci\u00f3n en las ventas de este mes"}</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card"><div className={`inicio-donut-visual${datosDonut.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosDonut.length > 0 && <Pie data={datosDonut} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosDonut.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor, nombre) => [sinVentasEsteMes ? `${Number(valor)} ${Number(valor) === 1 ? "repuesto" : "repuestos"}` : soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{sinVentasEsteMes ? totalDonut : soles(pagosTotal)}</strong><small>{sinVentasEsteMes ? "REPUESTOS ACTIVOS" : "MES ACTUAL"}</small></div></div><strong>{datosDonut.length ? (sinVentasEsteMes ? "Estado del inventario" : "Ventas cobradas") : "Cat\u00e1logo sin repuestos"}</strong></div></div><div className="inicio-donut-legend">{datosDonut.length ? datosDonut.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{sinVentasEsteMes ? `${item.importe} ${item.importe === 1 ? "repuesto" : "repuestos"}` : soles(item.importe)}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />No hay repuestos activos</span><b>0 repuestos</b></div>}</div></article>

                    <article className="inicio-panel inicio-payment-panel inicio-mototaxi-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">INVENTARIO · MOTOTAXIS</span><h2>Disponibilidad de mototaxis</h2><p>Unidades registradas por estado actual.</p></div></header><div className="inicio-donut-pair is-single"><div className="inicio-donut-card"><div className={`inicio-donut-visual${datosInventarioMototaxis.length ? "" : " is-empty"}`}><ResponsiveContainer width="100%" height="100%"><PieChart>{datosInventarioMototaxis.length > 0 && <Pie data={datosInventarioMototaxis} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosInventarioMototaxis.map((item) => <Cell key={item.nombre} fill={item.color} />)}</Pie>}<Tooltip formatter={(valor) => [`${Number(valor)} ${Number(valor) === 1 ? "mototaxi" : "mototaxis"}`, "Unidades"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{totalMototaxis}</strong><small>UNIDADES</small></div></div><strong>{totalMototaxis ? "Estado de las mototaxis" : "Sin mototaxis registradas"}</strong></div></div><div className="inicio-donut-legend">{datosInventarioMototaxis.length ? datosInventarioMototaxis.map((item) => <div key={item.nombre}><span><i style={{ background: item.color }} />{item.nombre}</span><b>{item.importe} {item.importe === 1 ? "unidad" : "unidades"}</b></div>) : <div><span><i style={{ background: "#cbd5dc" }} />Sin unidades en inventario</span><b>0 unidades</b></div>}</div></article>

          <article className="inicio-panel inicio-months-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">&Uacute;LTIMOS DOCE MESES</span><h2>Ventas por mes</h2><p>{modoVentasMensuales === "TOTAL" ? "Importe total vendido en cada mes" : modoVentasMensuales === "COMPROBANTE" ? "Desglose mensual por comprobante" : "Ventas mensuales por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Vista de ventas mensuales"><button type="button" className={modoVentasMensuales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "TOTAL"} onClick={() => setModoVentasMensuales("TOTAL")}>Total mensual</button><button type="button" className={modoVentasMensuales === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "COMPROBANTE"} onClick={() => setModoVentasMensuales("COMPROBANTE")}>Comprobante</button><button type="button" className={modoVentasMensuales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasMensuales === "CONCEPTO"} onClick={() => setModoVentasMensuales("CONCEPTO")}>Tipo de venta</button></div></div></header><div className="inicio-recharts inicio-recharts-months"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={datosMeses} margin={{ top: 12, right: 8, bottom: 0, left: -14 }} barCategoryGap="32%"><CartesianGrid vertical={false} stroke="#edf1f4" strokeDasharray="3 5" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 9 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={48} /><Tooltip formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} />{modoVentasMensuales === "TOTAL" ? <Bar dataKey="total" name="Total mensual" fill="#347caf" radius={[5, 5, 0, 0]} barSize={22} /> : modoVentasMensuales === "COMPROBANTE" ? <><Bar dataKey="BOLETA" name="Boletas" stackId="documentos" fill="#cc3450" barSize={22} /><Bar dataKey="FACTURA" name="Facturas" stackId="documentos" fill="#347caf" barSize={22} /><Bar dataKey="NOTA_VENTA" name="Notas de venta" stackId="documentos" fill="#27a383" radius={[5, 5, 0, 0]} barSize={22} /></> : <><Bar dataKey="PRODUCTO" name="Repuestos" stackId="conceptos" fill="#cc3450" barSize={22} /><Bar dataKey="SERVICIO" name="Servicios" stackId="conceptos" fill="#347caf" barSize={22} /><Bar dataKey="MOTOTAXI" name="Mototaxis" stackId="conceptos" fill="#27a383" radius={[5, 5, 0, 0]} barSize={22} /></>}</BarChart></ResponsiveContainer></div><LeyendaFlujo modo={modoVentasMensuales} /></article>
          <article className="inicio-panel inicio-weekly-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">ÚLTIMOS SIETE DÍAS</span><h2>Ingresos día a día</h2><p>{modoVentasSemanales === "TOTAL" ? "Ingreso total registrado por día" : modoVentasSemanales === "COMPROBANTE" ? "Ingreso diario por tipo de comprobante" : "Ingreso diario por repuestos, servicios y mototaxis"}</p></div><div className="inicio-sales-chart-tools"><div className="inicio-sales-view-toggle" role="group" aria-label="Desglose diario de ingresos"><button type="button" className={modoVentasSemanales === "TOTAL" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "TOTAL"} onClick={() => setModoVentasSemanales("TOTAL")}>Total diario</button><button type="button" className={modoVentasSemanales === "COMPROBANTE" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "COMPROBANTE"} onClick={() => setModoVentasSemanales("COMPROBANTE")}>Comprobante</button><button type="button" className={modoVentasSemanales === "CONCEPTO" ? "is-active" : ""} aria-pressed={modoVentasSemanales === "CONCEPTO"} onClick={() => setModoVentasSemanales("CONCEPTO")}>Motivo de ingreso</button></div></div></header>{datosSemana.length ? <div className="inicio-recharts inicio-recharts-line"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={datosSemana} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={58} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaFechaPunto(String(payload[0].payload.fecha)) : ""} formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 12, boxShadow: "0 12px 28px #18395018", fontSize: 11 }} />{modoVentasSemanales === "TOTAL" ? <Line type="monotone" dataKey="total" name="Total" stroke="#cc3450" strokeWidth={2.8} dot={{ r: 2.5, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /> : modoVentasSemanales === "COMPROBANTE" ? <><Line type="monotone" dataKey="BOLETA" name="Boletas" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="FACTURA" name="Facturas" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="NOTA_VENTA" name="Notas de venta" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /></> : <><Line type="monotone" dataKey="PRODUCTO" name="Repuestos" stroke="#cc3450" strokeWidth={2.6} dot={{ r: 2.2, fill: "#cc3450", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="SERVICIO" name="Servicios" stroke="#347caf" strokeWidth={2.6} dot={{ r: 2.2, fill: "#347caf", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /><Line type="monotone" dataKey="MOTOTAXI" name="Mototaxis" stroke="#27a383" strokeWidth={2.6} dot={{ r: 2.2, fill: "#27a383", strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} /></>}</LineChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">No hay ingresos registrados en los últimos siete días.</div>}<LeyendaFlujo modo={modoVentasSemanales} /></article>


        </div>
      </>}
    </>}
    {resumen && resumen.notasInternas.recientes.length > 0 && <article className="inicio-panel inicio-recent-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">SALIDAS INTERNAS</span><h2>Notas de venta</h2><p>Control interno de productos y servicios, separado de las boletas.</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true"><ArrowUpRight size={13} /></span></button></header><div className="inicio-recent-list">{resumen.notasInternas.recientes.map((nota) => <div key={nota.id}><span className="inicio-recent-avatar" aria-hidden="true">NV</span><div><strong>{nota.cliente}</strong><small>{nota.codigo} · {fechaCorta(nota.fecha)} · Nota interna</small></div><b>{soles(nota.total)}</b></div>)}</div></article>}
  </section>;
}
