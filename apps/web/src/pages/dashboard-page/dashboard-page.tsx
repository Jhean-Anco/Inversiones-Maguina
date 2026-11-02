import "./dashboard-page.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowUpRight, CreditCard, PackageX, TrendingUp, UsersRound, Wallet } from "lucide-react";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type FiltroReporte, type ReporteIngresos } from "../../services/reportes.service";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const fechaCorta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
const fechaCompleta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
const etiquetaFechaPunto = (valor: string) => new Date(`${valor.length === 7 ? `${valor}-01` : valor}T00:00:00`).toLocaleDateString("es-PE", valor.length === 7 ? { month: "long", year: "numeric" } : { day: "numeric", month: "short" });
const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const coloresGraficos = ["#d62f4f", "#347caf", "#27a383", "#e2a541", "#8069bd", "#65a4b8"];
const isoLocal = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const rangoMesActual = (referencia: string): FiltroReporte => {
  const fecha = new Date(`${referencia}T00:00:00`);
  return { desde: isoLocal(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), hasta: referencia };
};
const rangoAnioActual = (referencia: string): FiltroReporte => ({ desde: `${referencia.slice(0, 4)}-01-01`, hasta: referencia });
type PuntoIngresos = { fecha: string; ventas: number; total: string };
function serieIngresos(reporte: ReporteIngresos | null, rango: FiltroReporte): PuntoIngresos[] {
  if (!reporte) return [];
  const ventasPorFecha = new Map(reporte.porDia.map((dia) => [dia.fecha, dia]));
  const dias: PuntoIngresos[] = [];
  const fin = new Date(`${rango.hasta}T00:00:00`);
  for (let fecha = new Date(`${rango.desde}T00:00:00`); fecha <= fin; fecha.setDate(fecha.getDate() + 1)) {
    const iso = isoLocal(fecha);
    const dia = ventasPorFecha.get(iso);
    dias.push({ fecha: iso, ventas: dia?.ventas ?? 0, total: dia?.total ?? "0" });
  }
  return dias;
}

export function DashboardPage({ nombre, rol, puedeVerIngresos = true }: { nombre: string; rol: string; puedeVerIngresos?: boolean }) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const fechaReferencia = isoLocal(new Date());
  const fechaCalendario = new Date(`${fechaReferencia}T00:00:00`);
  const rangoActual = rangoMesActual(fechaReferencia);
  const rangoAnual = rangoAnioActual(fechaReferencia);
  const [reporte, setReporte] = useState<ReporteIngresos | null>(null);
  const [reporteAnual, setReporteAnual] = useState<ReporteIngresos | null>(null);
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
    setReporteAnual(null);
    void Promise.all([servicioReportes.ingresos(rangoActual), servicioReportes.ingresos(rangoAnual)])
      .then(([resultadoMes, resultadoAnual]) => { if (vigente) { setReporte(resultadoMes); setReporteAnual(resultadoAnual); } })
      .catch((problema: unknown) => { if (vigente) setErrorReporte(problema instanceof Error ? problema.message : "No se pudieron cargar las ventas de este mes."); })
      .finally(() => { if (vigente) setCargandoReporte(false); });
    return () => { vigente = false; };
  }, [rangoActual.desde, rangoActual.hasta, rangoAnual.desde, rangoAnual.hasta, puedeVerIngresos, solicitudReporte]);


  const totalMes = Number(reporte?.resumen.total ?? 0);
  const operacionesMes = reporte?.resumen.ventas ?? 0;
  const ticketPromedio = operacionesMes ? totalMes / operacionesMes : 0;
  const mediosPago = reporte?.porMedioPago ?? [];
  const pagosTotal = mediosPago.reduce((total, pago) => total + Number(pago.total), 0);
  const datosMedios = mediosPago.map((pago, indice) => ({ nombre: nombreMedioPago(pago.medioPago), importe: Number(pago.total), color: coloresGraficos[indice % coloresGraficos.length] })).filter((pago) => pago.importe > 0);
  const articulosMes = [...(reporte?.productosMasVendidos ?? [])].sort((a, b) => Number(b.total) - Number(a.total)).slice(0, 6);
  const datosProductos = articulosMes.map((articulo) => ({ descripcion: articulo.descripcion, total: Number(articulo.total) }));
  const diasMes = serieIngresos(reporte, rangoActual);
  const datosTendencia = diasMes.map((dia, indice) => ({ etiqueta: `Día ${indice + 1}`, fecha: dia.fecha, total: Number(dia.total) }));
  const datosMeses = Array.from({ length: fechaCalendario.getMonth() + 1 }, (_, indice) => {
    const mes = `${fechaReferencia.slice(0, 4)}-${String(indice + 1).padStart(2, "0")}`;
    const datos = (reporteAnual?.porDia ?? []).filter((dia) => dia.fecha.startsWith(mes));
    return { etiqueta: new Date(`${mes}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }).replace(".", ""), total: datos.reduce((total, dia) => total + Number(dia.total), 0), ventas: datos.reduce((total, dia) => total + dia.ventas, 0) };
  });
  const diasSemana = (resumen?.ventasUltimosSieteDias ?? []).map((dia) => ({ etiqueta: new Date(`${dia.fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }).replace(".", ""), fecha: dia.fecha, total: Number(dia.total), operaciones: dia.operaciones }));
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "IM";


  return <section className="dashboard-page inicio-dashboard">
    <header className="inicio-hero">
      <div className="inicio-hero-copy">
        <span className="inicio-eyebrow">INVERSIONES MAGUIÑA <i /> PANEL DE CONTROL</span>
        <h1>Hola, {nombre.split(" ")[0] || "equipo"}</h1>
        <p>Resumen de la actividad de tu negocio.</p>
      </div>
      <div className="inicio-hero-meta"><span className="inicio-avatar">{iniciales}</span><div><strong>{fechaCompleta(fechaReferencia)}</strong><small>{rol}</small></div></div>
      <div className="inicio-hero-orb inicio-hero-orb-one" aria-hidden="true" /><div className="inicio-hero-orb inicio-hero-orb-two" aria-hidden="true" />
    </header>

    {error && <div className="venta-alert" role="alert">{error}</div>}
    {cargando ? <div className="inicio-loading" role="status"><i /><span>Preparando el panel del negocio...</span></div> : resumen && <>
      <div className="inicio-kpis">
        <article className="inicio-kpi is-sales"><span className="inicio-kpi-icon" aria-hidden="true"><Wallet /></span><small>VENTAS DE HOY</small><strong>{soles(resumen.ventasHoy.total)}</strong><span>{resumen.ventasHoy.operaciones} operaciones registradas</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><TrendingUp /></span><small>VENTAS DEL MES</small><strong>{soles(resumen.ventasMes.total)}</strong><span>{resumen.ventasMes.operaciones} operaciones este mes</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><UsersRound /></span><small>CLIENTES ACTIVOS</small><strong>{resumen.clientesActivos}</strong><span>Clientes registrados</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><PackageX /></span><small>PRODUCTOS SIN STOCK</small><strong className={resumen.inventario.productosSinStock ? "inicio-stock-alert" : ""}>{resumen.inventario.productosSinStock}</strong><span>{resumen.inventario.productosActivos} productos activos</span></article>
      </div>

      {!puedeVerIngresos ? <div className="inicio-chart-empty">Tu usuario no tiene permiso para consultar los reportes de ventas.</div> : errorReporte ? <div className="inicio-panel inicio-comparison-error" role="alert"><strong>No se pudo cargar la actividad del mes.</strong><span>{errorReporte}</span><button type="button" onClick={() => setSolicitudReporte((actual) => actual + 1)}>Actualizar resumen</button></div> : cargandoReporte || !reporte ? <div className="inicio-loading" role="status"><i /><span>Cargando actividad de ventas...</span></div> : <>
        <section className="inicio-insight-strip inicio-admin-metrics" aria-label="Indicadores de ventas del mes">
          <div><span>OPERACIONES DEL MES</span><strong>{operacionesMes}</strong><small>Ventas registradas</small></div>
          <div><span>TICKET PROMEDIO</span><strong>{soles(ticketPromedio)}</strong><small>Importe promedio por venta</small></div>
          <div><span>MEDIOS DE PAGO</span><strong>{datosMedios.length}</strong><small>Medios utilizados este mes</small></div>
        </section>

        <div className="inicio-chart-grid">
          <article className="inicio-panel inicio-sales-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">EVOLUCIÓN DEL MES</span><h2>Ventas durante el mes</h2><p>Importe diario desde el inicio del mes hasta hoy</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true"><ArrowUpRight size={13} /></span></button></header>
            {datosTendencia.length ? <div className="inicio-recharts inicio-recharts-line"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={datosTendencia} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><defs><linearGradient id="inicio-area-mes" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cc3450" stopOpacity={0.2} /><stop offset="95%" stopColor="#cc3450" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} interval="preserveStartEnd" /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={58} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaFechaPunto(String(payload[0].payload.fecha)) : ""} formatter={(valor) => [soles(Number(valor)), "Ventas"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 12, boxShadow: "0 12px 28px #18395018", fontSize: 11 }} labelStyle={{ marginBottom: 6, color: "#526d80", fontWeight: 800 }} /><Area type="monotone" dataKey="total" name="Ventas" stroke="#cc3450" strokeWidth={2.8} fill="url(#inicio-area-mes)" activeDot={{ r: 5, strokeWidth: 0 }} /></AreaChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">Aún no hay ventas registradas este mes.</div>}
          </article>

          <article className="inicio-panel inicio-payment-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker"><CreditCard size={11} aria-hidden="true" /> DISTRIBUCIÓN DE PAGOS</span><h2>Medios de pago</h2><p>Participación en las ventas de este mes</p></div></header>{pagosTotal > 0 ? <><div className="inicio-donut-pair is-single"><div className="inicio-donut-card"><div className="inicio-donut-visual"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={datosMedios} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{datosMedios.map((pago) => <Cell key={pago.nombre} fill={pago.color} />)}</Pie><Tooltip formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{soles(pagosTotal)}</strong><small>MES ACTUAL</small></div></div><strong>Ventas cobradas</strong></div></div><div className="inicio-donut-legend">{datosMedios.map((pago) => <div key={pago.nombre}><span><i style={{ background: pago.color }} />{pago.nombre}</span><b>{soles(pago.importe)}</b></div>)}</div></> : <div className="inicio-chart-empty">Aún no hay pagos registrados este mes.</div>}</article>

          <article className="inicio-panel inicio-months-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">RESUMEN DEL ANO</span><h2>Ventas por mes</h2><p>Comparacion mensual desde enero hasta hoy</p></div></header>{datosMeses.length ? <div className="inicio-recharts inicio-recharts-months"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={datosMeses} margin={{ top: 12, right: 8, bottom: 0, left: -14 }} barCategoryGap="32%"><CartesianGrid vertical={false} stroke="#edf1f4" strokeDasharray="3 5" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 9 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={48} /><Tooltip formatter={(valor) => [soles(Number(valor)), "Ventas del mes"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /><Bar dataKey="total" name="Ventas del mes" radius={[5, 5, 0, 0]} barSize={22}>{datosMeses.map((mes, indice) => <Cell key={mes.etiqueta} fill={indice === datosMeses.length - 1 ? "#d43d58" : "#77a6b8"} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">Aun no hay datos mensuales para mostrar.</div>}</article>
          <article className="inicio-panel inicio-products-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MAYOR MOVIMIENTO</span><h2>Productos y servicios</h2><p>Más vendidos por importe durante el mes</p></div></header>{datosProductos.length ? <div className="inicio-recharts inicio-recharts-products"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer layout="vertical" data={datosProductos} margin={{ top: 2, right: 12, bottom: 2, left: 4 }} barCategoryGap="24%"><CartesianGrid horizontal={false} stroke="#edf1f4" /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} /><YAxis type="category" dataKey="descripcion" width={132} tickLine={false} axisLine={false} tick={{ fill: "#506a7e", fontSize: 9 }} /><Tooltip labelFormatter={(label) => String(label)} formatter={(valor) => [soles(Number(valor)), "Ventas del mes"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /><Bar dataKey="total" name="Ventas del mes" fill="#347895" radius={[0, 6, 6, 0]} barSize={13} /></BarChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">Aún no hay productos o servicios vendidos este mes.</div>}</article>

          <article className="inicio-panel inicio-operations-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">ULTIMOS SIETE DIAS</span><h2>Ventas dia a dia</h2><p>Importe vendido en cada dia hasta hoy</p></div></header>{diasSemana.length ? <div className="inicio-recharts inicio-recharts-operations"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={diasSemana} margin={{ top: 12, right: 8, bottom: 0, left: -14 }} barCategoryGap="30%"><CartesianGrid vertical={false} stroke="#edf1f4" strokeDasharray="3 5" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 9 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={48} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fecha ? etiquetaFechaPunto(String(payload[0].payload.fecha)) : ""} formatter={(valor) => [soles(Number(valor)), "Ventas del dia"]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /><Bar dataKey="total" name="Ventas" radius={[5, 5, 0, 0]} barSize={28}>{diasSemana.map((dia, indice) => <Cell key={dia.fecha} fill={indice === diasSemana.length - 1 ? "#d43d58" : "#77a6b8"} />)}</Bar></BarChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">Aun no hay operaciones para mostrar.</div>}</article>
        </div>
      </>}

      <article className="inicio-panel inicio-recent-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MOVIMIENTO RECIENTE</span><h2>Últimas ventas</h2><p>Comprobantes registrados en el sistema</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver ingresos <span aria-hidden="true"><ArrowUpRight size={13} /></span></button></header>{resumen.ventasRecientes.length ? <div className="inicio-recent-list">{resumen.ventasRecientes.map((venta) => <div key={venta.id}><span className="inicio-recent-avatar" aria-hidden="true">S/</span><div><strong>{venta.cliente}</strong><small>{venta.codigo} · {fechaCorta(venta.fecha)} ?? {nombreMedioPago(venta.medioPago)}</small></div><b>{soles(venta.total)}</b></div>)}</div> : <div className="inicio-chart-empty">Todavía no hay ventas registradas.</div>}</article>
    </>}
  </section>;
}
