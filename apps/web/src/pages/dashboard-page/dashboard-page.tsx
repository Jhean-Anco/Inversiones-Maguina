import "./dashboard-page.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type FiltroReporte, type ReporteIngresos } from "../../services/reportes.service";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const fechaCorta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
const fechaCompleta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const coloresGraficos = ["#d62f4f", "#347caf", "#27a383", "#e2a541", "#8069bd", "#65a4b8"];
const circunferenciaDonut = 326.73;
const isoLocal = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
type ModoComparacion = "mensual" | "semanal" | "semestral" | "anual";
type RangosComparacion = { a: FiltroReporte; b: FiltroReporte };
const mesAnterior = (year: number, month: number): FiltroReporte => ({ desde: isoLocal(new Date(year, month - 1, 1)), hasta: isoLocal(new Date(year, month, 0)) });
function calcularRangos(modo: ModoComparacion, referencia: string, year: number, semestre: "1" | "2"): RangosComparacion {
  if (modo === "mensual") {
    const [yearMes, month] = referencia.split("-").map(Number);
    return { a: mesAnterior(yearMes, month), b: mesAnterior(yearMes, month - 1) };
  }
  if (modo === "semanal") {
    const fecha = new Date(`${referencia}T00:00:00`);
    const lunes = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() - (fecha.getDay() + 6) % 7);
    const crearSemana = (inicio: Date): FiltroReporte => ({ desde: isoLocal(inicio), hasta: isoLocal(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 6)) });
    return { a: crearSemana(lunes), b: crearSemana(new Date(lunes.getFullYear(), lunes.getMonth(), lunes.getDate() - 7)) };
  }
  const mesInicio = modo === "anual" ? 0 : semestre === "1" ? 0 : 6;
  const cantidadMeses = modo === "anual" ? 12 : 6;
  const crearPeriodo = (anio: number): FiltroReporte => ({ desde: isoLocal(new Date(anio, mesInicio, 1)), hasta: isoLocal(new Date(anio, mesInicio + cantidadMeses, 0)) });
  return { a: crearPeriodo(year), b: crearPeriodo(year - 1) };
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
  const [mesSeleccionado, setMesSeleccionado] = useState(() => isoLocal(new Date()).slice(0, 7));
  const [semanaSeleccionada, setSemanaSeleccionada] = useState(() => isoLocal(new Date()));
  const [anioSeleccionado, setAnioSeleccionado] = useState(() => new Date().getFullYear());
  const [semestreSeleccionado, setSemestreSeleccionado] = useState<"1" | "2">(() => new Date().getMonth() < 6 ? "1" : "2");
  const aplicados = calcularRangos(modo, modo === "semanal" ? semanaSeleccionada : mesSeleccionado, anioSeleccionado, semestreSeleccionado);
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
      .catch((problema: unknown) => { if (vigente) setErrorComparacion(problema instanceof Error ? problema.message : "No se pudieron comparar los periodos seleccionados."); })
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
  const mediosComparados = [...new Set([...(reporteA?.porMedioPago.map((pago) => pago.medioPago) ?? []), ...(reporteB?.porMedioPago.map((pago) => pago.medioPago) ?? [])])]
    .map((medioPago) => ({ medioPago, totalA: Number(reporteA?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0), totalB: Number(reporteB?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0) }));
  const pagosTotalA = mediosComparados.reduce((total, pago) => total + pago.totalA, 0);
  const pagosTotalB = mediosComparados.reduce((total, pago) => total + pago.totalB, 0);
  const segmentosDonut = (periodo: "a" | "b") => {
    const totalPeriodo = periodo === "a" ? pagosTotalA : pagosTotalB;
    let recorrido = 0;
    return mediosComparados.map((pago, indice) => {
      const importe = periodo === "a" ? pago.totalA : pago.totalB;
      const longitud = totalPeriodo > 0 ? importe / totalPeriodo * circunferenciaDonut : 0;
      const segmento = { ...pago, importe, color: coloresGraficos[indice % coloresGraficos.length], longitud, desplazamiento: recorrido };
      recorrido += longitud;
      return segmento;
    });
  };
  const segmentosDonutA = segmentosDonut("a");
  const segmentosDonutB = segmentosDonut("b");
  const articulosComparados = [...new Map([...(reporteA?.productosMasVendidos ?? []), ...(reporteB?.productosMasVendidos ?? [])].map((articulo) => [`${articulo.tipo}:${articulo.descripcion}`, articulo])).values()]
    .map((articulo) => ({ ...articulo, totalA: Number(reporteA?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0), totalB: Number(reporteB?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0) }))
    .sort((a, b) => Math.max(b.totalA, b.totalB) - Math.max(a.totalA, a.totalB)).slice(0, 6);
  const maximoArticuloComparado = Math.max(1, ...articulosComparados.flatMap((articulo) => [articulo.totalA, articulo.totalB]));
  const granuloMensual = modo === "semestral" || modo === "anual";
  const diasPeriodoA = serieIngresos(reporteA, aplicados.a, granuloMensual ? "mes" : "dia", modo === "anual" ? 12 : 6);
  const diasPeriodoB = serieIngresos(reporteB, aplicados.b, granuloMensual ? "mes" : "dia", modo === "anual" ? 12 : 6);
  const maximoDia = Math.max(1, ...diasPeriodoA.map((dia) => Number(dia.total)), ...diasPeriodoB.map((dia) => Number(dia.total)));
  const crearPuntos = (dias: PuntoIngresos[]) => dias.map((dia, indice) => ({
    ...dia,
    x: dias.length < 2 ? 350 : 42 + indice * (620 / (dias.length - 1)),
    y: 176 - Number(dia.total) / maximoDia * 136,
  }));
  const puntosPeriodoA = crearPuntos(diasPeriodoA);
  const puntosPeriodoB = crearPuntos(diasPeriodoB);
  const trazoPeriodoA = puntosPeriodoA.map((punto, indice) => `${indice ? "L" : "M"}${punto.x},${punto.y}`).join(" ");
  const trazoPeriodoB = puntosPeriodoB.map((punto, indice) => `${indice ? "L" : "M"}${punto.x},${punto.y}`).join(" ");
  const cantidadTramos = modo === "anual" ? 12 : modo === "semestral" ? 6 : modo === "semanal" ? 7 : 5;
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
  const maximoTramo = Math.max(1, ...tramosA.map((tramo) => tramo.cantidad), ...tramosB.map((tramo) => tramo.cantidad));
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "IM";
  const aniosDisponibles = Array.from({ length: 12 }, (_, indice) => new Date().getFullYear() - indice);
  const descripcionModo: Record<ModoComparacion, string> = {
    mensual: "Compara el mes elegido con el mes anterior.",
    semanal: "Revisa cada día de la semana elegida frente a la semana anterior.",
    semestral: "Compara las ventas mes a mes con el mismo semestre del año anterior.",
    anual: "Compara las ventas mes a mes con el año anterior.",
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
        <article className="inicio-kpi is-sales"><span className="inicio-kpi-icon" aria-hidden="true">↗</span><small>VENTAS DE HOY</small><strong>{soles(resumen.ventasHoy.total)}</strong><span>{resumen.ventasHoy.operaciones} operaciones registradas</span><i className="inicio-kpi-spark" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((n) => <b key={n} />)}</i></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">▤</span><small>VENTAS DEL MES</small><strong>{soles(resumen.ventasMes.total)}</strong><span>{resumen.ventasMes.operaciones} operaciones este mes</span><i className="inicio-kpi-spark is-blue" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((n) => <b key={n} />)}</i></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">♙</span><small>CLIENTES ACTIVOS</small><strong>{resumen.clientesActivos}</strong><span>Clientes registrados</span><i className="inicio-kpi-spark is-green" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((n) => <b key={n} />)}</i></article>
        <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">▦</span><small>PRODUCTOS SIN STOCK</small><strong className={resumen.inventario.productosSinStock ? "inicio-stock-alert" : ""}>{resumen.inventario.productosSinStock}</strong><span>{resumen.inventario.productosActivos} productos activos</span><i className="inicio-kpi-spark is-gold" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 7].map((n) => <b key={n} />)}</i></article>
      </div>

      <section className="inicio-period-filter" aria-labelledby="inicio-comparacion-titulo">
        <div className="inicio-period-filter-heading"><div><span className="inicio-panel-kicker">ANÁLISIS DE VENTAS</span><h2 id="inicio-comparacion-titulo">Comparar periodos</h2><p>{descripcionModo[modo]}</p></div>{cargandoComparacion && <span className="inicio-comparison-refresh" role="status">Actualizando gráficos…</span>}</div>
        <div className="inicio-mode-tabs" role="tablist" aria-label="Tipo de comparación">
          {([{ id: "mensual", label: "Mensual", icon: "◷" }, { id: "semanal", label: "Diaria · semana", icon: "▦" }, { id: "semestral", label: "Mensual · semestre", icon: "▤" }, { id: "anual", label: "Anual", icon: "↗" }] as const).map((opcion) => <button key={opcion.id} type="button" role="tab" aria-selected={modo === opcion.id} className={modo === opcion.id ? "is-active" : ""} onClick={() => cambiarModo(opcion.id)} disabled={!puedeVerIngresos}><span aria-hidden="true">{opcion.icon}</span>{opcion.label}</button>)}
        </div>
        <div className="inicio-mode-controls">
          {modo === "mensual" && <label><span>Mes para comparar</span><input type="month" value={mesSeleccionado} onChange={(evento) => setMesSeleccionado(evento.target.value)} /></label>}
          {modo === "semanal" && <label><span>Elige un día de esa semana</span><input type="date" value={semanaSeleccionada} onChange={(evento) => setSemanaSeleccionada(evento.target.value)} /></label>}
          {modo === "semestral" && <><label><span>Semestre</span><select value={semestreSeleccionado} onChange={(evento) => setSemestreSeleccionado(evento.target.value as "1" | "2")}><option value="1">Primer semestre · ene–jun</option><option value="2">Segundo semestre · jul–dic</option></select></label><label><span>Año</span><select value={anioSeleccionado} onChange={(evento) => setAnioSeleccionado(Number(evento.target.value))}>{aniosDisponibles.map((anio) => <option key={anio} value={anio}>{anio}</option>)}</select></label></>}
          {modo === "anual" && <label><span>Año para comparar</span><select value={anioSeleccionado} onChange={(evento) => setAnioSeleccionado(Number(evento.target.value))}>{aniosDisponibles.map((anio) => <option key={anio} value={anio}>{anio}</option>)}</select></label>}
        </div>
        <div className="inicio-period-hints"><span className="is-a">A · {etiquetaRango(aplicados.a)}</span><span className="is-b">B · {etiquetaRango(aplicados.b)}</span><small>{modo === "mensual" ? "Mes elegido frente al anterior" : modo === "semanal" ? "Semana elegida frente a la anterior" : modo === "semestral" ? "Semestre seleccionado frente al mismo semestre del año anterior" : "Año seleccionado frente al anterior"}</small></div>
      </section>
      {errorComparacion && <div className="venta-alert" role="alert">{errorComparacion}</div>}
      {!puedeVerIngresos ? <div className="inicio-chart-empty">Tu usuario no tiene permiso para consultar ingresos y comparar periodos.</div> : errorComparacion && !reporteA && !cargandoComparacion ? <div className="inicio-panel inicio-comparison-error" role="alert"><strong>No se pudo cargar esta comparación.</strong><span>{errorComparacion}</span><button type="button" onClick={() => setSolicitudComparacion((actual) => actual + 1)}>Reintentar comparación</button></div> : cargandoComparacion || !reporteA || !reporteB ? <div className="inicio-loading" role="status"><i /><span>Cargando datos de los periodos seleccionados…</span></div> : <>
        <div className="inicio-kpis inicio-comparison-kpis">
          <article className="inicio-kpi is-sales"><span className="inicio-kpi-icon" aria-hidden="true">A</span><small>VENTAS · PERIODO A</small><strong>{soles(totalPeriodoA)}</strong><span>{operacionesPeriodoA} operaciones · {etiquetaRango(aplicados.a)}</span></article>
          <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">B</span><small>VENTAS · PERIODO B</small><strong>{soles(totalPeriodoB)}</strong><span>{operacionesPeriodoB} operaciones · {etiquetaRango(aplicados.b)}</span></article>
          <article className={`inicio-kpi ${diferenciaPeriodos >= 0 ? "is-positive" : "is-negative"}`}><span className="inicio-kpi-icon" aria-hidden="true">Δ</span><small>CAMBIO EN VENTAS</small><strong>{variacionPeriodos === null ? totalPeriodoA > 0 ? "Nuevo" : "—" : `${variacionPeriodos >= 0 ? "+" : ""}${variacionPeriodos.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`}</strong><span>{diferenciaPeriodos >= 0 ? "+" : "−"}{soles(Math.abs(diferenciaPeriodos))} frente a B</span></article>
          <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">↔</span><small>OPERACIONES</small><strong>{operacionesPeriodoA} <i>vs</i> {operacionesPeriodoB}</strong><span>Periodo A frente a periodo B</span></article>
        </div>

        <div className="inicio-chart-grid">
          <article className="inicio-panel inicio-sales-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">{granuloMensual ? "EVOLUCIÓN MENSUAL" : modo === "semanal" ? "EVOLUCIÓN DIARIA · SEMANA" : "EVOLUCIÓN DIARIA · MES"}</span><h2>{granuloMensual ? "Ventas mes a mes" : modo === "semanal" ? "Ventas día a día" : "Ventas durante el mes"}</h2><p>{modo === "anual" ? "Cada punto representa un mes del año" : modo === "semestral" ? "Cada punto representa un mes del semestre" : "Selecciona un punto para ver el importe de ese día"}</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true">↗</span></button></header>
            {puntosPeriodoA.length || puntosPeriodoB.length ? <figure className="inicio-line-figure"><svg viewBox="0 0 700 205" role="img" aria-label={`Comparación de ventas ${granuloMensual ? "mensuales" : "diarias"} entre ${etiquetaRango(aplicados.a)} y ${etiquetaRango(aplicados.b)}`}><line x1="40" y1="40" x2="665" y2="40" /><line x1="40" y1="84" x2="665" y2="84" /><line x1="40" y1="128" x2="665" y2="128" /><line x1="40" y1="176" x2="665" y2="176" /><text x="4" y="43">{soles(maximoDia)}</text><text x="4" y="88">{soles(maximoDia / 2)}</text>{puntosPeriodoA.length > 1 && <path className="inicio-chart-line" d={trazoPeriodoA} />}{puntosPeriodoB.length > 1 && <path className="inicio-chart-line inicio-chart-line-b" d={trazoPeriodoB} />}{puntosPeriodoA.map((punto) => <circle key={`a-${punto.fecha}`} cx={punto.x} cy={punto.y} r="3" tabIndex={0}><title>{punto.fecha}: {soles(punto.total)} · Periodo A</title></circle>)}{puntosPeriodoB.map((punto) => <circle className="inicio-chart-dot-b" key={`b-${punto.fecha}`} cx={punto.x} cy={punto.y} r="3" tabIndex={0}><title>{punto.fecha}: {soles(punto.total)} · Periodo B</title></circle>)}<text className="inicio-chart-date" x="40" y="198">{granuloMensual ? new Date(`${diasPeriodoA[0]?.fecha}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }) : modo === "semanal" ? "Lun" : "Día 1"}</text><text className="inicio-chart-date" x="570" y="198">{granuloMensual ? new Date(`${diasPeriodoA.at(-1)?.fecha}-01T00:00:00`).toLocaleDateString("es-PE", { month: "short" }) : modo === "semanal" ? "Dom" : `Día ${diasPeriodoA.length}`}</text></svg></figure> : <div className="inicio-chart-empty">No hay ventas registradas en estos periodos.</div>}
            <div className="inicio-chart-legend"><span><i className="is-red" /> A · {etiquetaRango(aplicados.a)}</span><span><i className="is-blue" /> B · {etiquetaRango(aplicados.b)}</span></div>
          </article>

          <article className="inicio-panel inicio-payment-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">DISTRIBUCIÓN DE PAGOS</span><h2>Medios de pago</h2><p>Compara cómo se pagó en cada periodo</p></div></header>{mediosComparados.length && (pagosTotalA > 0 || pagosTotalB > 0) ? <><div className="inicio-donut-pair">{[{ id: "a", label: "Periodo A", total: pagosTotalA, segmentos: segmentosDonutA }, { id: "b", label: "Periodo B", total: pagosTotalB, segmentos: segmentosDonutB }].map((donut) => <div className={`inicio-donut-card is-${donut.id}`} key={donut.id}><div className="inicio-donut-visual"><svg viewBox="0 0 140 140" role="img" aria-label={`${donut.label}: ${soles(donut.total)} distribuidos por medio de pago`}><circle className="inicio-donut-track" cx="70" cy="70" r="52" /><g transform="rotate(-90 70 70)">{donut.segmentos.map((segmento) => segmento.longitud > 0 ? <circle key={segmento.medioPago} className="inicio-donut-segment" cx="70" cy="70" r="52" stroke={segmento.color} strokeDasharray={`${segmento.longitud} ${circunferenciaDonut - segmento.longitud}`} strokeDashoffset={-segmento.desplazamiento} tabIndex={0}><title>{nombreMedioPago(segmento.medioPago)}: {soles(segmento.importe)}</title></circle> : null)}</g><text className="inicio-donut-total" x="70" y="68">{soles(donut.total)}</text><text className="inicio-donut-caption" x="70" y="84">{donut.id.toUpperCase()}</text></svg></div><strong>{donut.label}</strong></div>)}</div><div className="inicio-donut-legend-head"><span>Medio de pago</span><span>A</span><span>B</span></div><div className="inicio-donut-legend">{mediosComparados.map((pago, indice) => <div key={pago.medioPago}><span><i style={{ background: coloresGraficos[indice % coloresGraficos.length] }} />{nombreMedioPago(pago.medioPago)}</span><b>{soles(pago.totalA)}</b><b>{soles(pago.totalB)}</b></div>)}</div></> : <div className="inicio-chart-empty">No hay pagos registrados en estos periodos.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> {etiquetaRango(aplicados.a)}</span><span><i className="is-blue" /> {etiquetaRango(aplicados.b)}</span></div></article>

          <article className="inicio-panel inicio-products-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">LO MÁS VENDIDO</span><h2>Productos y servicios</h2><p>Importes de los dos periodos</p></div></header>{articulosComparados.length ? <div className="inicio-comparison-bars inicio-items-comparison">{articulosComparados.map((articulo) => <div className="inicio-comparison-bar-row" key={`${articulo.tipo}:${articulo.descripcion}`}><strong title={articulo.descripcion}>{articulo.descripcion}</strong><div><span className="is-a"><i style={{ width: `${Math.max(articulo.totalA ? 2 : 0, articulo.totalA / maximoArticuloComparado * 100)}%` }} /></span><small>{soles(articulo.totalA)}</small></div><div><span className="is-b"><i style={{ width: `${Math.max(articulo.totalB ? 2 : 0, articulo.totalB / maximoArticuloComparado * 100)}%` }} /></span><small>{soles(articulo.totalB)}</small></div></div>)}</div> : <div className="inicio-chart-empty">No hay productos o servicios en estos periodos.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> A</span><span><i className="is-blue" /> B</span></div></article>

          <article className="inicio-panel inicio-operations-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">OPERACIONES</span><h2>{modo === "semanal" ? "Ventas por día" : modo === "mensual" ? "Ventas por semana" : "Ventas por mes"}</h2><p>Actividad comparada en los dos periodos</p></div></header>{diasPeriodoA.length || diasPeriodoB.length ? <div className="inicio-operations-chart">{tramosA.map((tramo, indice) => <div className="inicio-operation-column" key={indice}><strong>{tramo.etiqueta}</strong><span><i title={`Periodo A: ${tramo.cantidad} ventas`} style={{ height: `${tramo.cantidad ? Math.max(5, tramo.cantidad / maximoTramo * 100) : 0}%` }} /><i className="inicio-operation-bar-b" title={`Periodo B: ${tramosB[indice].cantidad} ventas`} style={{ height: `${tramosB[indice].cantidad ? Math.max(5, tramosB[indice].cantidad / maximoTramo * 100) : 0}%` }} /></span><small>{tramo.cantidad} / {tramosB[indice].cantidad}</small></div>)}</div> : <div className="inicio-chart-empty">No hay operaciones para graficar.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> A · {etiquetaRango(aplicados.a)}</span><span><i className="is-blue" /> B · {etiquetaRango(aplicados.b)}</span></div></article>
        </div>
      </>}

      <article className="inicio-panel inicio-recent-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MOVIMIENTO RECIENTE</span><h2>Últimas ventas</h2><p>Comprobantes registrados en el sistema</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver ingresos <span aria-hidden="true">↗</span></button></header>{resumen.ventasRecientes.length ? <div className="inicio-recent-list">{resumen.ventasRecientes.map((venta) => <div key={venta.id}><span className="inicio-recent-avatar" aria-hidden="true">S/</span><div><strong>{venta.cliente}</strong><small>{venta.codigo} · {fechaCorta(venta.fecha)} · {nombreMedioPago(venta.medioPago)}</small></div><b>{soles(venta.total)}</b></div>)}</div> : <div className="inicio-chart-empty">Todavía no hay ventas registradas.</div>}</article>
    </>}
  </section>;
}
