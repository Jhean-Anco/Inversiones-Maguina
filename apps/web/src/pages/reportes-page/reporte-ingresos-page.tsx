import { ChevronDown } from "lucide-react";
import { BotonDescargarPdf } from "./boton-descargar-pdf";
import { useEffect, useMemo, useState } from "react";
import { ErrorApi } from "../../services/api-cliente";
import { servicioReportes, type ReporteIngresos } from "../../services/reportes.service";
import { hoy, numero, primerDiaMes, soles } from "./reportes-formatters";
import "./reporte-ingresos-page.css";
import { ventasClasses as v } from "../ventas-page/ventas-classes";
import { reportesClasses as r } from "./reportes-classes";
import { useViewportProfile } from "../../utilidades/use-viewport-profile";

type Linea = "TODAS" | "PRODUCTO" | "MOTOTAXI" | "SERVICIO";
const NOMBRES_MES = new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" });
const mostrarMes = (mes: string) => {
  const [anio, numeroMes] = mes.split("-").map(Number);
  return NOMBRES_MES.format(new Date(Date.UTC(anio, numeroMes - 1, 1))).replace(".", "");
};

function GraficoIngresos({ filas }: { filas: ReporteIngresos["porMes"] }) {
  const maximo = Math.max(1, ...filas.map((fila) => Number(fila.total)));
  const barras = filas;
  const etiquetaMes = (mes: string) => barras.length > 12 ? `${mostrarMes(mes)} ${mes.slice(2, 4)}` : mostrarMes(mes);
  return <section className="reporte-ingresos-panel" aria-labelledby="reporte-ingresos-chart-title">
    <div className="reporte-ingresos-panel-heading"><div><h2 id="reporte-ingresos-chart-title">Ingresos por mes</h2><p>Miles de soles, comprobantes aceptados.</p></div><span aria-hidden="true" className="reporte-ingresos-legend"><i />Ingresos</span></div>
    {barras.length ? <div className="reporte-ingresos-chart" role="img" aria-label={`Ingresos netos mensuales: ${barras.map((fila) => `${etiquetaMes(fila.mes)} ${soles(fila.total)}`).join(", ")}`}>
      {barras.map((fila) => <div className="reporte-ingresos-column" key={fila.mes} title={`${etiquetaMes(fila.mes)} ${soles(fila.total)}`}>
        <span className="reporte-ingresos-bar-value">{numero(Number(fila.total) / 1000)} mil</span>
        <div className="reporte-ingresos-bar-track"><i style={{ height: `${Math.max(2, Number(fila.total) / maximo * 100)}%` }} /></div>
        <span className="reporte-ingresos-month">{etiquetaMes(fila.mes)}</span>
      </div>)}
    </div> : <p className="reporte-ingresos-empty">No hay comprobantes para mostrar en este periodo.</p>}
  </section>;
}

export function ReporteIngresosPage() {
  const perfilViewport = useViewportProfile();
  const esMovil = perfilViewport === "mobile-portrait" || perfilViewport === "mobile-landscape";
  const [desde, setDesde] = useState(primerDiaMes);
  const [hasta, setHasta] = useState(hoy);
  const [linea, setLinea] = useState<Linea>("TODAS");
  const [datos, setDatos] = useState<ReporteIngresos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const filtroValido = desde && hasta && desde <= hasta;

  useEffect(() => {
    if (!filtroValido) { setDatos(null); setCargando(false); setError("El periodo seleccionado no es válido."); return; }
    let vigente = true;
    setCargando(true); setError("");
    void servicioReportes.reporteIngresos({ desde, hasta, linea }).then((resultado) => {
      if (vigente) setDatos(resultado);
    }).catch((problema: unknown) => {
      if (!vigente) return;
      setDatos(null);
      setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar este reporte."
        : problema instanceof Error ? problema.message : "No se pudo cargar el reporte de ingresos.");
    }).finally(() => { if (vigente) setCargando(false); });
    return () => { vigente = false; };
  }, [desde, hasta, linea, filtroValido]);

  const indicadores = useMemo(() => datos ? [
    { etiqueta: "Ingresos del periodo", valor: soles(datos.resumen.totalNeto), detalle: "Neto de notas de crédito y débito" },
    { etiqueta: "Comprobantes", valor: numero(datos.resumen.documentosNetos), detalle: "Emitidos y aceptados" },
    { etiqueta: "Ticket promedio", valor: soles(datos.resumen.ticketPromedio), detalle: "Por comprobante neto" },
  ] : [], [datos]);

  return <section className={`${v.page} reporte-ingresos-page`}>
    <div className={`${v.toolbar} reporte-ingresos-toolbar`}>
      <label className={`${v.selectField} reporte-ingresos-fecha`}><span>Desde</span><input aria-label="Desde" type="date" value={desde} max={hasta} onChange={(evento) => setDesde(evento.target.value)} /></label>
      <label className={`${v.selectField} reporte-ingresos-fecha`}><span>Hasta</span><input aria-label="Hasta" type="date" value={hasta} min={desde} onChange={(evento) => setHasta(evento.target.value)} /></label>
      <label className={v.selectField}><select aria-label="Línea" value={linea} onChange={(evento) => setLinea(evento.target.value as Linea)}>
        <option value="TODAS">Todas las líneas</option><option value="PRODUCTO">Repuestos</option><option value="MOTOTAXI">Mototaxis</option><option value="SERVICIO">Servicios</option>
      </select><ChevronDown aria-hidden="true" /></label>
      <BotonDescargarPdf onClick={() => window.print()} disabled={!datos || cargando} />
    </div>
    {cargando && <p className={r.mensaje} role="status">Cargando reporte…</p>}
    {!cargando && error && <p className={`${r.mensaje} ${r.mensajeError}`} role="alert">{error}</p>}
    {!cargando && datos && <div className="reporte-ingresos-content">
      <dl className={`${r.kpis} reporte-ingresos-kpis`}>{indicadores.map((item) => <div key={item.etiqueta}><dt>{item.etiqueta}</dt><dd>{item.valor}</dd><small>{item.detalle}</small></div>)}</dl>
      <GraficoIngresos filas={datos.porMes} />
      <section className="reporte-ingresos-panel reporte-ingresos-documentos" aria-label="Tipo de documento">
        <div className="reporte-ingresos-panel-heading reporte-ingresos-documentos-heading"><h2 id="reporte-ingresos-doc-title">Tipo de documento</h2><span>Importes en soles</span></div>
        {esMovil
          ? <div className="reporte-ingresos-doc-cards">{datos.porDocumento.map((fila) => <article className="reporte-ingresos-doc-card" key={fila.tipo}>
            <h3>{fila.etiqueta}</h3><div><span>Cantidad</span><strong>{numero(fila.documentos)}</strong></div><div><span>Importe</span><strong className={fila.documentos < 0 ? "is-credit" : ""}>{soles(fila.total)}</strong></div>
          </article>)}</div>
          : <div className={v.tableScroll}><table className={`${v.table} reporte-ingresos-table`}><thead><tr><th>Tipo de documento</th><th>Cantidad</th><th>Importe</th></tr></thead>
            <tbody>{datos.porDocumento.map((fila) => <tr key={fila.tipo}><th scope="row">{fila.etiqueta}</th><td>{numero(fila.documentos)}</td><td className={fila.documentos < 0 ? "is-credit" : v.total}>{soles(fila.total)}</td></tr>)}</tbody>
          </table></div>}
      </section>
    </div>}
  </section>;
}
