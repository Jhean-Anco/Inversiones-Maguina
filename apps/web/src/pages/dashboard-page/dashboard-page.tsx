import "./dashboard-page.css";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ErrorApi } from "../../services/api-cliente";
import { servicioDashboard, type ResumenGerencial } from "../../services/dashboard.service";
import { servicioReportes, type FiltroReporte, type ReporteIngresos } from "../../services/reportes.service";

const soles = (valor: string | number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN", maximumFractionDigits: 2 }).format(Number(valor) || 0);
const fechaCorta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
const fechaCompleta = (valor: string) => new Date(valor + "T00:00:00").toLocaleDateString("es-PE", { weekday: "long", day: "numeric", month: "long" });
const nombreMedioPago = (valor: string) => valor.toLocaleLowerCase("es-PE").replaceAll("_", " ").replace(/\b\p{L}/gu, (letra) => letra.toLocaleUpperCase("es-PE"));
const isoLocal = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
function rangosIniciales(): { a: FiltroReporte; b: FiltroReporte } {
  const hoy = new Date();
  const hastaA = isoLocal(hoy);
  const desdeA = `${hastaA.slice(0, 7)}-01`;
  const desdeAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const maximoDiaAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0).getDate();
  const hastaAnterior = new Date(hoy.getFullYear(), hoy.getMonth() - 1, Math.min(hoy.getDate(), maximoDiaAnterior));
  return { a: { desde: desdeA, hasta: hastaA }, b: { desde: isoLocal(desdeAnterior), hasta: isoLocal(hastaAnterior) } };
}
const etiquetaRango = ({ desde, hasta }: FiltroReporte) => `${new Date(desde + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })} – ${new Date(hasta + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" })}`;

export function DashboardPage({ nombre, rol, puedeVerIngresos = true }: { nombre: string; rol: string; puedeVerIngresos?: boolean }) {
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const datosInicio = (ubicacion.state as { datosInicio?: { resumen?: ResumenGerencial | null; errorResumen?: string } } | null)?.datosInicio;
  const [datosInicioValidos] = useState(() => Boolean(datosInicio));
  const [resumen, setResumen] = useState<ResumenGerencial | null>(() => datosInicio?.resumen ?? null);
  const [cargando, setCargando] = useState(() => !datosInicioValidos);
  const [error, setError] = useState(() => datosInicio?.errorResumen ?? "");
  const [periodosIniciales] = useState(rangosIniciales);
  const [rangos, setRangos] = useState(periodosIniciales);
  const [aplicados, setAplicados] = useState(periodosIniciales);
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

  function aplicarPeriodos(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (rangos.a.desde > rangos.a.hasta || rangos.b.desde > rangos.b.hasta) {
      setErrorComparacion("En cada periodo, la fecha inicial debe ser anterior o igual a la final.");
      return;
    }
    setErrorComparacion("");
    setAplicados({ a: { ...rangos.a }, b: { ...rangos.b } });
    setSolicitudComparacion((actual) => actual + 1);
  }

  function actualizarRango(periodo: "a" | "b", campo: keyof FiltroReporte, valor: string) {
    setRangos((actual) => ({ ...actual, [periodo]: { ...actual[periodo], [campo]: valor } }));
  }

  const totalPeriodoA = Number(reporteA?.resumen.total ?? 0);
  const totalPeriodoB = Number(reporteB?.resumen.total ?? 0);
  const diferenciaPeriodos = totalPeriodoA - totalPeriodoB;
  const variacionPeriodos = totalPeriodoB > 0 ? diferenciaPeriodos / totalPeriodoB * 100 : null;
  const operacionesPeriodoA = reporteA?.resumen.ventas ?? 0;
  const operacionesPeriodoB = reporteB?.resumen.ventas ?? 0;
  const mediosComparados = [...new Set([...(reporteA?.porMedioPago.map((pago) => pago.medioPago) ?? []), ...(reporteB?.porMedioPago.map((pago) => pago.medioPago) ?? [])])]
    .map((medioPago) => ({ medioPago, totalA: Number(reporteA?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0), totalB: Number(reporteB?.porMedioPago.find((pago) => pago.medioPago === medioPago)?.total ?? 0) }));
  const maximoMedioPago = Math.max(1, ...mediosComparados.flatMap((pago) => [pago.totalA, pago.totalB]));
  const articulosComparados = [...new Map([...(reporteA?.productosMasVendidos ?? []), ...(reporteB?.productosMasVendidos ?? [])].map((articulo) => [`${articulo.tipo}:${articulo.descripcion}`, articulo])).values()]
    .map((articulo) => ({ ...articulo, totalA: Number(reporteA?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0), totalB: Number(reporteB?.productosMasVendidos.find((item) => item.tipo === articulo.tipo && item.descripcion === articulo.descripcion)?.total ?? 0) }))
    .sort((a, b) => Math.max(b.totalA, b.totalB) - Math.max(a.totalA, a.totalB)).slice(0, 6);
  const maximoArticuloComparado = Math.max(1, ...articulosComparados.flatMap((articulo) => [articulo.totalA, articulo.totalB]));
  const diasPeriodoA = reporteA?.porDia ?? [];
  const diasPeriodoB = reporteB?.porDia ?? [];
  const maximoDia = Math.max(1, ...diasPeriodoA.map((dia) => Number(dia.total)), ...diasPeriodoB.map((dia) => Number(dia.total)));
  const crearPuntos = (dias: typeof diasPeriodoA) => dias.map((dia, indice) => ({
    ...dia,
    x: dias.length < 2 ? 350 : 42 + indice * (620 / (dias.length - 1)),
    y: 176 - Number(dia.total) / maximoDia * 136,
  }));
  const puntosPeriodoA = crearPuntos(diasPeriodoA);
  const puntosPeriodoB = crearPuntos(diasPeriodoB);
  const trazoPeriodoA = puntosPeriodoA.map((punto, indice) => `${indice ? "L" : "M"}${punto.x},${punto.y}`).join(" ");
  const trazoPeriodoB = puntosPeriodoB.map((punto, indice) => `${indice ? "L" : "M"}${punto.x},${punto.y}`).join(" ");
  const maximoOperacionesPeriodo = Math.max(1, ...diasPeriodoA.map((dia) => dia.ventas), ...diasPeriodoB.map((dia) => dia.ventas));
  const iniciales = nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("es-PE") || "IM";

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

      <form className="inicio-period-filter" onSubmit={aplicarPeriodos}>
        <div className="inicio-period-filter-heading"><div><span className="inicio-panel-kicker">COMPARACIÓN DINÁMICA</span><h2>Elige los periodos que quieres comparar</h2></div><button type="submit" disabled={!puedeVerIngresos || cargandoComparacion}>{cargandoComparacion ? "Actualizando…" : "Aplicar"}<span aria-hidden="true">↗</span></button></div>
        <div className="inicio-period-pickers">
          {(["a", "b"] as const).map((periodo) => <fieldset className={`inicio-period-picker is-${periodo}`} key={periodo}><legend><i />Periodo {periodo.toUpperCase()}</legend><label>Desde<input type="date" value={rangos[periodo].desde} onChange={(evento) => actualizarRango(periodo, "desde", evento.target.value)} required /></label><label>Hasta<input type="date" value={rangos[periodo].hasta} onChange={(evento) => actualizarRango(periodo, "hasta", evento.target.value)} required /></label></fieldset>)}
        </div>
        <div className="inicio-period-hints"><span>A · {etiquetaRango(aplicados.a)}</span><span>B · {etiquetaRango(aplicados.b)}</span><small>Selecciona ambos rangos y aplica para actualizar los gráficos.</small></div>
      </form>
      {errorComparacion && <div className="venta-alert" role="alert">{errorComparacion}</div>}
      {!puedeVerIngresos ? <div className="inicio-chart-empty">Tu usuario no tiene permiso para consultar ingresos y comparar periodos.</div> : errorComparacion && !reporteA && !cargandoComparacion ? <div className="inicio-panel inicio-comparison-error" role="alert"><strong>No se pudo cargar esta comparación.</strong><span>{errorComparacion}</span><button type="button" onClick={() => setSolicitudComparacion((actual) => actual + 1)}>Reintentar comparación</button></div> : cargandoComparacion || !reporteA || !reporteB ? <div className="inicio-loading" role="status"><i /><span>Cargando datos de los periodos seleccionados…</span></div> : <>
        <div className="inicio-kpis inicio-comparison-kpis">
          <article className="inicio-kpi is-sales"><span className="inicio-kpi-icon" aria-hidden="true">A</span><small>VENTAS · PERIODO A</small><strong>{soles(totalPeriodoA)}</strong><span>{operacionesPeriodoA} operaciones · {etiquetaRango(aplicados.a)}</span></article>
          <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">B</span><small>VENTAS · PERIODO B</small><strong>{soles(totalPeriodoB)}</strong><span>{operacionesPeriodoB} operaciones · {etiquetaRango(aplicados.b)}</span></article>
          <article className={`inicio-kpi ${diferenciaPeriodos >= 0 ? "is-positive" : "is-negative"}`}><span className="inicio-kpi-icon" aria-hidden="true">Δ</span><small>CAMBIO EN VENTAS</small><strong>{variacionPeriodos === null ? totalPeriodoA > 0 ? "Nuevo" : "—" : `${variacionPeriodos >= 0 ? "+" : ""}${variacionPeriodos.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`}</strong><span>{diferenciaPeriodos >= 0 ? "+" : "−"}{soles(Math.abs(diferenciaPeriodos))} frente a B</span></article>
          <article className="inicio-kpi"><span className="inicio-kpi-icon" aria-hidden="true">↔</span><small>OPERACIONES</small><strong>{operacionesPeriodoA} <i>vs</i> {operacionesPeriodoB}</strong><span>Periodo A frente a periodo B</span></article>
        </div>

        <div className="inicio-chart-grid">
          <article className="inicio-panel inicio-sales-chart"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">TENDENCIA DE VENTAS</span><h2>Movimiento diario por periodo</h2><p>Los rangos elegidos actualizan esta comparación</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver reporte <span aria-hidden="true">↗</span></button></header>
            {puntosPeriodoA.length || puntosPeriodoB.length ? <figure className="inicio-line-figure"><svg viewBox="0 0 700 205" role="img" aria-label={`Tendencia diaria para ${etiquetaRango(aplicados.a)} y ${etiquetaRango(aplicados.b)}`}><line x1="40" y1="40" x2="665" y2="40" /><line x1="40" y1="84" x2="665" y2="84" /><line x1="40" y1="128" x2="665" y2="128" /><line x1="40" y1="176" x2="665" y2="176" /><text x="4" y="43">{soles(maximoDia)}</text><text x="4" y="88">{soles(maximoDia / 2)}</text>{puntosPeriodoA.length > 1 && <path className="inicio-chart-line" d={trazoPeriodoA} />}{puntosPeriodoB.length > 1 && <path className="inicio-chart-line inicio-chart-line-b" d={trazoPeriodoB} />}{puntosPeriodoA.map((punto) => <circle key={`a-${punto.fecha}`} cx={punto.x} cy={punto.y} r="3" />)}{puntosPeriodoB.map((punto) => <circle className="inicio-chart-dot-b" key={`b-${punto.fecha}`} cx={punto.x} cy={punto.y} r="3" />)}<text className="inicio-chart-date" x="40" y="198">{fechaCorta(aplicados.a.desde)}</text><text className="inicio-chart-date" x="570" y="198">{fechaCorta(aplicados.a.hasta)}</text></svg></figure> : <div className="inicio-chart-empty">No hay ventas registradas en estos rangos.</div>}
            <div className="inicio-chart-legend"><span><i className="is-red" /> A · {etiquetaRango(aplicados.a)}</span><span><i className="is-blue" /> B · {etiquetaRango(aplicados.b)}</span></div>
          </article>

          <article className="inicio-panel inicio-payment-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MEDIOS DE PAGO</span><h2>¿Cómo se pagó?</h2><p>Importes de cada periodo</p></div></header>{mediosComparados.length ? <div className="inicio-comparison-bars">{mediosComparados.map((pago) => <div className="inicio-comparison-bar-row" key={pago.medioPago}><strong>{nombreMedioPago(pago.medioPago)}</strong><div><span className="is-a"><i style={{ width: `${Math.max(pago.totalA ? 2 : 0, pago.totalA / maximoMedioPago * 100)}%` }} /></span><small>{soles(pago.totalA)}</small></div><div><span className="is-b"><i style={{ width: `${Math.max(pago.totalB ? 2 : 0, pago.totalB / maximoMedioPago * 100)}%` }} /></span><small>{soles(pago.totalB)}</small></div></div>)}</div> : <div className="inicio-chart-empty">No hay pagos registrados en estos periodos.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> A</span><span><i className="is-blue" /> B</span></div></article>

          <article className="inicio-panel inicio-products-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">LO MÁS VENDIDO</span><h2>Productos y servicios</h2><p>Importes de los dos periodos</p></div></header>{articulosComparados.length ? <div className="inicio-comparison-bars inicio-items-comparison">{articulosComparados.map((articulo) => <div className="inicio-comparison-bar-row" key={`${articulo.tipo}:${articulo.descripcion}`}><strong title={articulo.descripcion}>{articulo.descripcion}</strong><div><span className="is-a"><i style={{ width: `${Math.max(articulo.totalA ? 2 : 0, articulo.totalA / maximoArticuloComparado * 100)}%` }} /></span><small>{soles(articulo.totalA)}</small></div><div><span className="is-b"><i style={{ width: `${Math.max(articulo.totalB ? 2 : 0, articulo.totalB / maximoArticuloComparado * 100)}%` }} /></span><small>{soles(articulo.totalB)}</small></div></div>)}</div> : <div className="inicio-chart-empty">No hay productos o servicios en estos periodos.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> A</span><span><i className="is-blue" /> B</span></div></article>

          <article className="inicio-panel inicio-operations-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">OPERACIONES POR DÍA</span><h2>Actividad de las ventas</h2><p>Comparación diaria · A y B</p></div></header>{diasPeriodoA.length || diasPeriodoB.length ? <div className="inicio-operations-chart">{Array.from({ length: Math.min(14, Math.max(diasPeriodoA.length, diasPeriodoB.length)) }, (_, indice) => { const diaA = diasPeriodoA[indice]; const diaB = diasPeriodoB[indice]; return <div className="inicio-operation-column" key={indice}><strong>{(diaA ?? diaB)?.fecha.slice(-2)}</strong><span><i style={{ height: `${Math.max(diaA?.ventas ? 4 : 0, (diaA?.ventas ?? 0) / maximoOperacionesPeriodo * 100)}%` }} /><i className="inicio-operation-bar-b" style={{ height: `${Math.max(diaB?.ventas ? 4 : 0, (diaB?.ventas ?? 0) / maximoOperacionesPeriodo * 100)}%` }} /></span><small>{diaA?.ventas ?? 0} / {diaB?.ventas ?? 0}</small></div>; })}</div> : <div className="inicio-chart-empty">No hay operaciones para graficar.</div>}<div className="inicio-chart-legend"><span><i className="is-red" /> A</span><span><i className="is-blue" /> B</span></div></article>
        </div>
      </>}

      <article className="inicio-panel inicio-recent-panel"><header className="inicio-panel-heading"><div><span className="inicio-panel-kicker">MOVIMIENTO RECIENTE</span><h2>Últimas ventas</h2><p>Comprobantes registrados en el sistema</p></div><button type="button" onClick={() => navegar("/reportes/ingresos")}>Ver ingresos <span aria-hidden="true">↗</span></button></header>{resumen.ventasRecientes.length ? <div className="inicio-recent-list">{resumen.ventasRecientes.map((venta) => <div key={venta.id}><span className="inicio-recent-avatar" aria-hidden="true">S/</span><div><strong>{venta.cliente}</strong><small>{venta.codigo} · {fechaCorta(venta.fecha)} · {nombreMedioPago(venta.medioPago)}</small></div><b>{soles(venta.total)}</b></div>)}</div> : <div className="inicio-chart-empty">Todavía no hay ventas registradas.</div>}</article>
    </>}
  </section>;
}
