import "./dashboard-page.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, Calendar, CalendarDays, CalendarRange, CreditCard, PackageX, Sparkles, TrendingUp, UsersRound, Wallet } from "lucide-react";
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
type ModoComparacion = "mensual" | "semanal" | "semestral" | "anual";
type RangosComparacion = { a: FiltroReporte; b: FiltroReporte };
function fechaEnAnio(year: number, month: number, day: number): Date {
  const ultimoDia = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, ultimoDia));
}
const crearRango = (desde: Date, hasta: Date): FiltroReporte => ({ desde: isoLocal(desde), hasta: isoLocal(hasta) });
function calcularRangos(modo: ModoComparacion, referencia: string, year: number, semestre: "1" | "2"): RangosComparacion {
  const fecha = new Date(`${referencia}T00:00:00`);
  if (modo === "mensual") {
    const inicioActual = new Date(fecha.getFullYear(), fecha.getMonth(), 1);
    const inicioAnterior = new Date(fecha.getFullYear(), fecha.getMonth() - 1, 1);
    const finAnterior = fechaEnAnio(inicioAnterior.getFullYear(), inicioAnterior.getMonth(), fecha.getDate());
    return { a: crearRango(inicioActual, fecha), b: crearRango(inicioAnterior, finAnterior) };
  }
  if (modo === "semanal") {
    const lunesActual = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - (fecha.getDay() + 6) % 7);
    const lunesAnterior = new Date(lunesActual.getFullYear(), lunesActual.getMonth(), lunesActual.getDate() - 7);
    return { a: crearRango(lunesActual, fecha), b: crearRango(lunesAnterior, new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - 7)) };
  }
  const mesInicio = modo === "anual" ? 0 : semestre === "1" ? 0 : 6;
  const inicioActual = new Date(year, mesInicio, 1);
  const inicioAnterior = new Date(year - 1, mesInicio, 1);
  const finAnterior = fechaEnAnio(year - 1, fecha.getMonth(), fecha.getDate());
  return { a: crearRango(inicioActual, fecha), b: crearRango(inicioAnterior, finAnterior) };
}
const etiquetaRango = ({ desde, hasta }: FiltroReporte) => `${new Date(desde + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} – ${new Date(hasta + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}`;
type PuntoIngresos = { fecha: string; ventas: number; total: string };
function serieIngresos(reporte: ReporteIngresos | null, rango: FiltroReporte, granularidad: "dia" | "mes", cantidadMeses = 6): PuntoIngresos[] {
  if (!reporte) return [];
  if (granularidad === "dia") {
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
  const inicio = new Date(`${rango.desde}T00:00:00`);
  return Array.from({ length: cantidadMeses }, (_, indice) => {
    const mes = new Date(inicio.getFullYear(), inicio.getMonth() + indice, 1);
    const fecha = isoLocal(mes).slice(0, 7);
    const datosMes = reporte.porDia.filter((dia) => dia.fecha.startsWith(fecha));
    return { fecha, ventas: datosMes.reduce((suma, dia) => suma + dia.ventas, 0), total: String(datosMes.reduce((suma, dia) => suma + Number(dia.total), 0)) };
  });
}

export function DashboardPage({ nombre, rol, puedeVerIngresos = true }: { nombre: string; rol: string; puedeVerIngresos?: boolean }) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const [modo, setModo] = useState<ModoComparacion>("mensual");
  const fechaReferencia = isoLocal(new Date());
  const fechaCalendario = new Date(`${fechaReferencia}T00:00:00`);
  const semestreActual = fechaCalendario.getMonth() < 6 ? "1" : "2";
  const aplicados = calcularRangos(modo, fechaReferencia, fechaCalendario.getFullYear(), semestreActual);
  const [reporteA, setReporteA] = useState<ReporteIngresos | null>(null);
  const [reporteB, setReporteB] = useState<ReporteIngresos | null>(null);
  const [cargandoComparacion, setCargandoComparacion] = useState(puedeVerIngresos);
  const [errorComparacion, setErrorComparacion] = useState("");
  const [solicitudComparacion, setSolicitudComparacion] = useState(0);

  useEffect(() => {
    if (datosInicioValidos) return;
    let vigente = true;
    void servicioDashboard.resumen().then((datos) => { if (vigente) { setResumen(datos); setError(""); } })
      .catch((problema: unknown) => { if (vigente) setError(problema instanceof ErrorApi && problema.estado === 401 ? "La sesión venció. Inicia sesión nuevamente." : problema instanceof Error ? problema.message : "No se pudo cargar el resumen del negocio."); })
      .finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [datosInicioValidos]);

  useEffect(() => {
    if (!puedeVerIngresos) { setCargandoComparacion(false); return; }
    let vigente = true;
    setCargandoComparacion(true);
    setErrorComparacion("");
    setReporteA(null);
    setReporteB(null);
    Promise.all([servicioReportes.ingresos(aplicados.a), servicioReportes.ingresos(aplicados.b)])
      .then(([resultadoA, resultadoB]) => { if (vigente) { setReporteA(resultadoA); setReporteB(resultadoB); } })
      .catch((problema: unknown) => { if (vigente) setErrorComparacion(problema instanceof Error ? problema.message : "No se pudieron comparar los periodos actuales."); })
      .finally(() => { if (vigente) setCargandoComparacion(false); });
    return () => { vigente = false; };
  }, [aplicados.a.desde, aplicados.a.hasta, aplicados.b.desde, aplicados.b.hasta, puedeVerIngresos, solicitudComparacion]);

  function cambiarModo(nuevoModo: ModoComparacion) {
    setModo(nuevoModo);
    setErrorComparacion("");
  }

  const totalPeriodoA = Number(reporteA?.resumen.total ?? 0);
  const totalPeriodoB = Number(reporteB?.resumen.total ?? 0);
  const diferenciaPeriodos = totalPeriodoA - totalPeriodoB;
  const variacionPeriodos = totalPeriodoB > 0 ? diferenciaPeriodos / totalPeriodoB * 100 : null;
  const operacionesPeriodoA = reporteA?.resumen.ventas ?? 0;
  const operacionesPeriodoB = reporteB?.resumen.ventas ?? 0;
  const ticketPromedioA = operacionesPeriodoA ? totalPeriodoA / operacionesPeriodoA : 0;
  const ticketPromedioB = operacionesPeriodoB ? totalPeriodoB / operacionesPeriodoB : 0;
  const mediosComparados = [...new Set([...(reporteA?.porMedioPago.map((pago) => pago.medioPago) ?? []), ...(reporteB?.porMedioPago.map((pago) => pago.medioPago) ?? [])])]
    .map((medioPago) => ({ medioPago, totalA: Number(reporteA?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0), totalB: Number(reporteB?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0) }));
  const pagosTotalA = mediosComparados.reduce((total, pago) => total + pago.totalA, 0);
  const pagosTotalB = mediosComparados.reduce((total, pago) => total + pago.totalB, 0);
  const datosMedios = (periodo: "totalA" | "totalB") => mediosComparados.map((pago, indice) => ({ nombre: nombreMedioPago(pago.medioPago), importe: pago[periodo], color: coloresGraficos[indice % coloresGraficos.length] })).filter((pago) => pago.importe > 0);
  const datosMediosA = datosMedios("totalA");
  const datosMediosB = datosMedios("totalB");
  const datosDonutVacios = [{ nombre: "Sin pagos", importe: 1, color: "#e8eef2" }];
  const articulosComparados = [...new Map([...(reporteA?.productosMasVendidos ?? []), ...(reporteB?.productosMasVendidos ?? [])].map((articulo) => [`${articulo.tipo}:${articulo.descripcion}`, articulo])).values()]
    .map((articulo) => ({ ...articulo, totalA: Number(reporteA?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0), totalB: Number(reporteB?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0) }))
    .sort((a, b) => Math.max(b.totalA, b.totalB) - Math.max(a.totalA, a.totalB)).slice(0, 6);
  const granuloMensual = modo === "semestral" || modo === "anual";
  const mesInicioActual = modo === "semestral" && semestreActual === "2" ? 6 : 0;
  const cantidadMesesVisibles = modo === "anual" ? fechaCalendario.getMonth() + 1 : modo === "semestral" ? fechaCalendario.getMonth() - mesInicioActual + 1 : 6;
  const diasPeriodoA = serieIngresos(reporteA, aplicados.a, granuloMensual ? "mes" : "dia", modo === "anual" || modo === "semestral" ? cantidadMesesVisibles : 6);
  const diasPeriodoB = serieIngresos(reporteB, aplicados.b, granuloMensual ? "mes" : "dia", modo === "anual" || modo === "semestral" ? cantidadMesesVisibles : 6);
  const cantidadTramos = modo === "anual" ? cantidadMesesVisibles : modo === "semestral" ? cantidadMesesVisibles : modo === "semanal" ? (fechaCalendario.getDay() + 6) % 7 + 1 : Math.ceil(fechaCalendario.getDate() / 7);
  const operacionesPorTramo = (dias: PuntoIngresos[]) => {
    const grupos = Array.from({ length: cantidadTramos }, () => [] as PuntoIngresos[]);
    dias.forEach((dia, indice) => {
      const semana = modo === "mensual" ? Math.min(cantidadTramos - 1, Math.floor((Number(dia.fecha.slice(8, 10)) - 1) / 7)) : Math.min(cantidadTramos - 1, indice);
      grupos[semana].push(dia);
    });
    return grupos.map((grupo, indice) => ({
      cantidad: grupo.reduce((total, dia) => total + dia.ventas, 0),
      etiqueta: modo === "mensual" ? `Sem. ${indice + 1}` : modo === "semanal" ? grupo[0] ? new Date(`${grupo[0].fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }) : "—" : grupo[0] ? new Date(`${grupo[0].fecha.slice(0, 7)}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }) : "—",
    }));
  };
  const tramosA = operacionesPorTramo(diasPeriodoA);
  const tramosB = operacionesPorTramo(diasPeriodoB);
  const datosTendencia = Array.from({ length: Math.max(diasPeriodoA.length, diasPeriodoB.length) }, (_, indice) => {
    const puntoA = diasPeriodoA[indice];
    const puntoB = diasPeriodoB[indice];
    const fecha = puntoA?.fecha ?? puntoB?.fecha ?? "";
    const etiqueta = granuloMensual ? new Date(`${fecha}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }) : modo === "semanal" ? new Date(`${fecha}T00:00:00`).toLocaleDateString("es-PE", { weekday: "short" }) : `Día ${indice + 1}`;
    return { etiqueta, fechaA: puntoA?.fecha ?? "", fechaB: puntoB?.fecha ?? "", totalA: Number(puntoA?.total ?? 0), totalB: Number(puntoB?.total ?? 0) };
  });
  const datosProductos = articulosComparados.map((articulo) => ({ descripcion: articulo.descripcion, totalA: articulo.totalA, totalB: articulo.totalB }));
  const datosOperaciones = tramosA.map((tramo, indice) => ({ etiqueta: tramo.etiqueta, totalA: tramo.cantidad, totalB: tramosB[indice]?.cantidad ?? 0 }));
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "IM";
  const descripcionModo: Record<ModoComparacion, string> = {
    mensual: "Mes en curso frente al mismo avance del mes anterior.",
    semanal: "Semana actual, día a día, frente al mismo avance de la semana pasada.",
    semestral: "Meses transcurridos del semestre frente al mismo avance del año pasado.",
    anual: "Año en curso, mes a mes, frente al mismo avance del año pasado.",
  };

  return <section className="dashboard-page inicio-dashboard">
    <header className="inicio-hero">
      <div className="inicio-hero-copy">
        <span className="inicio-eyebrow">INVERSIONES MAGUIÑA <i /> PANEL DE CONTROL</span>
        <h1>Hola, {nombre.split(" ")[0] || "equipo"}</h1>
        <p>Este es el movimiento de tu negocio.</p>
      </div>
      <div className="inicio-hero-meta"><span className="inicio-avatar">{iniciales}</span><div><strong>{fechaCompleta(resumen?.generadoPara ?? new Date().toISOString().slice(0, 10))}</strong><small>{rol}</small></div></div>
      <div className="inicio-hero-orb inicio-hero-orb-one" aria-hidden="true" /><div className="inicio-hero-orb inicio-hero-orb-two" aria-hidden="true" />
    </header>

    {error && <div className="venta-alert" role="alert">{error}</div>}
    {cargando ? <div className="inicio-loading" role="status"><i /><span>Preparando los gráficos del negocio…</span></div> : resumen && <>
      <div className="inicio-kpis">
        <article className="inicio-kpi is-sales"><span className="inicio-kpi-icon" aria-hidden="true"><Wallet /></span><small>VENTAS DE HOY</small><strong>{soles(resumen.ventasHoy.total)}</strong><span>{resumen.ventasHoy.operaciones} operaciones registradas</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><TrendingUp /></span><small>VENTAS DEL MES</small><strong>{soles(resumen.ventasMes.total)}</strong><span>{resumen.ventasMes.operaciones} operaciones este mes</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><UsersRound /></span><small>CLIENTES ACTIVOS</small><strong>{resumen.clientesActivos}</strong><span>Clientes registrados</span></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true"><PackageX /></span><small>PRODUCTOS SIN STOCK</small><strong className={resumen.inventario.productosSinStock ? "inicio-stock-alert" : ""}>{resumen.inventario.productosSinStock}</strong><span>{resumen.inventario.productosActivos} productos activos</span></article>
      </div>

      <section className="inicio-analysis-nav" aria-labelledby="inicio-comparacion-titulo">
        <div className="inicio-analysis-heading"><div><span className="inicio-panel-kicker">ANÁLISIS DEL NEGOCIO</span><h2 id="inicio-comparacion-titulo">Rendimiento por periodos</h2><p>{descripcionModo[modo]}</p></div>{cargandoComparacion && <span className="inicio-comparison-refresh" role="status">Actualizando gráficos...</span>}</div>
        <div className="inicio-period-views" role="group" aria-label="Vistas de comparación">
          {([{ id: "mensual", label: "Mes", detail: "Mes a mes", icon: <Calendar /> }, { id: "semanal", label: "Semana", detail: "Día a día", icon: <CalendarDays /> }, { id: "semestral", label: "Semestre", detail: "Mes a mes", icon: <CalendarRange /> }, { id: "anual", label: "Año", detail: "Mes a mes", icon: <TrendingUp /> }] as const).map((opcion) => <button key={opcion.id} type="button" aria-pressed={modo === opcion.id} className={modo === opcion.id ? "is-active" : ""} onClick={() => cambiarModo(opcion.id)} disabled={!puedeVerIngresos}><span className="inicio-period-view-icon" aria-hidden="true">{opcion.icon}</span><span className="inicio-period-view-copy"><strong>{opcion.label}</strong><small>{opcion.detail}</small></span><span className="inicio-period-view-arrow" aria-hidden="true">{modo === opcion.id ? <ArrowUpRight size={15} /> : null}</span></button>)}
        </div>
        <div className="inicio-period-hints"><span className="is-a"><i />En curso <strong>{etiquetaRango(aplicados.a)}</strong></span><span className="is-b"><i />Periodo comparable <strong>{etiquetaRango(aplicados.b)}</strong></span><small>Comparación automática con el mismo avance del periodo anterior</small></div>
      </section>
      {errorComparacion && <div className="venta-alert" role="alert">{errorComparacion}</div>}
      {!puedeVerIngresos ? <div className="inicio-chart-empty">Tu usuario no tiene permiso para consultar ingresos y comparar periodos.</div> : errorComparacion && !reporteA && !cargandoComparacion ? <div className="inicio-panel inicio-comparison-error" role="alert"><strong>No se pudo cargar esta comparación.</strong><span>{errorComparacion}</span><button type="button" onClick={() => setSolicitudComparacion((actual) => actual + 1)}>Reintentar comparación</button></div> : cargandoComparacion || !reporteA || !reporteB ? <div className="inicio-loading" role="status"><i /><span>Cargando datos de los periodos actuales…</span></div> : <>
        <section className="inicio-comparison-band" aria-label="Resumen de la comparación"><article className="inicio-comparison-period is-a"><span><i />Periodo A</span><strong>{soles(totalPeriodoA)}</strong><small>{operacionesPeriodoA} operaciones · {etiquetaRango(aplicados.a)}</small></article><div className={`inicio-comparison-delta ${diferenciaPeriodos >= 0 ? "is-positive" : "is-negative"}`}><span><Sparkles size={12} aria-hidden="true" /> Variación</span><strong>{variacionPeriodos === null ? totalPeriodoA > 0 ? "Nuevo" : "—" : `${variacionPeriodos >= 0 ? "+" : ""}${variacionPeriodos.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`}</strong><small>{diferenciaPeriodos >= 0 ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}{soles(Math.abs(diferenciaPeriodos))}</small></div><article className="inicio-comparison-period is-b"><span><i />Periodo B</span><strong>{soles(totalPeriodoB)}</strong><small>{operacionesPeriodoB} operaciones · {etiquetaRango(aplicados.b)}</small></article></section>
        <section className="inicio-insight-strip" aria-label="Indicadores complementarios"><div><span>Operaciones</span><strong>{operacionesPeriodoA}<i>vs.</i>{operacionesPeriodoB}</strong><small>{operacionesPeriodoA - operacionesPeriodoB >= 0 ? "+" : "−"}{Math.abs(operacionesPeriodoA - operacionesPeriodoB)} entre periodos</small></div><div><span>Ticket promedio</span><strong>{soles(ticketPromedioA)}<i>vs.</i>{soles(ticketPromedioB)}</strong><small>Importe promedio por venta</small></div></section>

        <div className="inicio-chart-grid">
          <article className="inicio-panel inicio-sales-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">{granuloMensual ? "EVOLUCIÓN MENSUAL" : modo === "semanal" ? "EVOLUCIÓN DIARIA · SEMANA" : "EVOLUCIÓN DIARIA · MES"}</span><h2>{granuloMensual ? "Ventas mes a mes" : modo === "semanal" ? "Ventas día a día" : "Ventas durante el mes"}</h2><p>{modo === "anual" ? "Cada punto representa un mes del año" : modo === "semestral" ? "Cada punto representa un mes del semestre" : "Compara la evolución de ambos periodos"}</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true">↗</span></button></header>
            {datosTendencia.length ? <div className="inicio-recharts inicio-recharts-line"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={datosTendencia} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}><defs><linearGradient id="inicio-area-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#cc3450" stopOpacity={0.22} /><stop offset="95%" stopColor="#cc3450" stopOpacity={0} /></linearGradient><linearGradient id="inicio-area-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#347895" stopOpacity={0.16} /><stop offset="95%" stopColor="#347895" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#e9eef2" strokeDasharray="3 6" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 10 }} interval="preserveStartEnd" /><YAxis tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} width={58} /><Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.fechaA ? etiquetaFechaPunto(String(payload[0].payload.fechaA)) : ""} formatter={(valor, nombre) => [soles(Number(valor)), nombre === "Periodo A" ? `A · ${etiquetaRango(aplicados.a)}` : `B · ${etiquetaRango(aplicados.b)}`]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 12, boxShadow: "0 12px 28px #18395018", fontSize: 11 }} labelStyle={{ marginBottom: 6, color: "#526d80", fontWeight: 800 }} /><Legend verticalAlign="top" align="right" height={30} iconType="circle" wrapperStyle={{ fontSize: 10, color: "#6c8294" }} /><Area type="monotone" dataKey="totalA" name="Periodo A" stroke="#cc3450" strokeWidth={2.6} fill="url(#inicio-area-a)" activeDot={{ r: 5, strokeWidth: 0 }} connectNulls /><Area type="monotone" dataKey="totalB" name="Periodo B" stroke="#347895" strokeWidth={2.6} fill="url(#inicio-area-b)" activeDot={{ r: 5, strokeWidth: 0 }} connectNulls /></AreaChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">No hay ventas registradas en estos periodos.</div>}
          </article>

          <article className="inicio-panel inicio-payment-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker"><CreditCard size={11} aria-hidden="true" /> DISTRIBUCIÓN DE PAGOS</span><h2>Medios de pago</h2><p>Compara la mezcla de pagos en ambos periodos</p></div></header>{mediosComparados.length && (pagosTotalA > 0 || pagosTotalB > 0) ? <><div className="inicio-donut-pair">{[{ id: "a", label: "Periodo A", total: pagosTotalA, data: datosMediosA.length ? datosMediosA : datosDonutVacios }, { id: "b", label: "Periodo B", total: pagosTotalB, data: datosMediosB.length ? datosMediosB : datosDonutVacios }].map((donut) => <div className={`inicio-donut-card is-${donut.id}`} key={donut.id}><div className="inicio-donut-visual"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={donut.data} dataKey="importe" nameKey="nombre" innerRadius="67%" outerRadius="92%" paddingAngle={3} stroke="none">{donut.data.map((pago) => <Cell key={pago.nombre} fill={pago.color} />)}</Pie><Tooltip formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /></PieChart></ResponsiveContainer><div className="inicio-donut-center"><strong>{soles(donut.total)}</strong><small>{donut.id.toUpperCase()}</small></div></div><strong>{donut.label}</strong></div>)}</div><div className="inicio-donut-legend-head"><span>Medio de pago</span><span>A</span><span>B</span></div><div className="inicio-donut-legend">{mediosComparados.map((pago, indice) => <div key={pago.medioPago}><span><i style={{ background: coloresGraficos[indice % coloresGraficos.length] }} />{nombreMedioPago(pago.medioPago)}</span><b>{soles(pago.totalA)}</b><b>{soles(pago.totalB)}</b></div>)}</div></> : <div className="inicio-chart-empty">No hay pagos registrados en estos periodos.</div>}</article>

          <article className="inicio-panel inicio-products-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">LO MÁS VENDIDO</span><h2>Productos y servicios</h2><p>Importes comparados en los dos periodos</p></div></header>{datosProductos.length ? <div className="inicio-recharts inicio-recharts-products"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer layout="vertical" data={datosProductos} margin={{ top: 2, right: 12, bottom: 2, left: 4 }} barCategoryGap="24%"><CartesianGrid horizontal={false} stroke="#edf1f4" /><XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} tickFormatter={(valor: number) => `S/ ${Intl.NumberFormat("es-PE", { notation: "compact", maximumFractionDigits: 1 }).format(valor)}`} /><YAxis type="category" dataKey="descripcion" width={132} tickLine={false} axisLine={false} tick={{ fill: "#506a7e", fontSize: 9 }} /><Tooltip labelFormatter={(label) => String(label)} formatter={(valor, nombre) => [soles(Number(valor)), String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /><Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 9, color: "#6c8294" }} /><Bar dataKey="totalA" name="Periodo A" fill="#cc3450" radius={[0, 6, 6, 0]} barSize={9} /><Bar dataKey="totalB" name="Periodo B" fill="#347895" radius={[0, 6, 6, 0]} barSize={9} /></BarChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">No hay productos o servicios en estos periodos.</div>}</article>

          <article className="inicio-panel inicio-operations-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">OPERACIONES</span><h2>{modo === "semanal" ? "Ventas por día" : modo === "mensual" ? "Ventas por semana" : "Ventas por mes"}</h2><p>Cantidad de ventas, agrupada para cada vista</p></div></header>{datosOperaciones.length ? <div className="inicio-recharts inicio-recharts-operations"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={datosOperaciones} margin={{ top: 12, right: 8, bottom: 0, left: -14 }} barCategoryGap="26%"><CartesianGrid vertical={false} stroke="#edf1f4" strokeDasharray="3 5" /><XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={{ fill: "#718797", fontSize: 9 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#8192a0", fontSize: 9 }} width={32} /><Tooltip labelFormatter={(label) => String(label)} formatter={(valor, nombre) => [`${Number(valor)} ventas`, String(nombre)]} contentStyle={{ border: "1px solid #dce6ec", borderRadius: 11, boxShadow: "0 10px 24px #18395018", fontSize: 10 }} /><Legend verticalAlign="top" align="right" height={28} iconType="circle" wrapperStyle={{ fontSize: 9, color: "#6c8294" }} /><Bar dataKey="totalA" name="Periodo A" fill="#cc3450" radius={[5, 5, 0, 0]} barSize={13} /><Bar dataKey="totalB" name="Periodo B" fill="#347895" radius={[5, 5, 0, 0]} barSize={13} /></BarChart></ResponsiveContainer></div> : <div className="inicio-chart-empty">No hay operaciones para graficar.</div>}</article>
        </div>
      </>}

      <article className="inicio-panel inicio-recent-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MOVIMIENTO RECIENTE</span><h2>Últimas ventas</h2><p>Comprobantes registrados en el sistema</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver ingresos <span aria-hidden="true">↗</span></button></header>{resumen.ventasRecientes.length ? <div className="inicio-recent-list">{resumen.ventasRecientes.map((venta) => <div key={venta.id}><span className="inicio-recent-avatar" aria-hidden="true">S/</span><div><strong>{venta.cliente}</strong><small>{venta.codigo} · {fechaCorta(venta.fecha)} · {nombreMedioPago(venta.medioPago)}</small></div><b>{soles(venta.total)}</b></div>)}</div> : <div className="inicio-chart-empty">Todavía no hay ventas registradas.</div>}</article>
    </>}
  </section>;
}
