import "./comprobantes-page.css";
import { useEffect, useState } from "react";
import { ErrorApi } from "../../../services/api-cliente";
import { servicioFacturacionElectronica, type ComprobanteEmitido } from "../../../services/facturacion-electronica.service";

const soles = (monto: number) => new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(monto);
const estadoLegible = (estado: string) => ({ EMITIDO: "Emitido", EMITIDO_DEMO: "Emitido en DEMO", ERROR_NUBEFACT: "Error de emisión", ERROR_NUBEFACT_DEMO: "Error DEMO", NUBEFACT_PENDIENTE: "Pendiente de revisión" }[estado] ?? estado);

export function ComprobantesPage() {
  const [items, setItems] = useState<ComprobanteEmitido[]>([]);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [total, setTotal] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let vigente = true;
    setCargando(true);
    const espera = window.setTimeout(() => {
      void servicioFacturacionElectronica.listarComprobantes(pagina, busqueda).then((resultado) => {
        if (!vigente) return;
        setItems(resultado.items); setTotal(resultado.total); setTotalPaginas(resultado.totalPaginas); setError("");
      }).catch((problema) => {
        if (vigente) setError(problema instanceof ErrorApi && problema.estado === 403 ? "Tu usuario no tiene permiso para consultar comprobantes." : problema instanceof Error ? problema.message : "No se pudo cargar el historial.");
      }).finally(() => { if (vigente) setCargando(false); });
    }, busqueda ? 200 : 0);
    return () => { vigente = false; window.clearTimeout(espera); };
  }, [pagina, busqueda]);

  return <section className="cpe-page">
    <header className="cpe-heading"><div><span className="cpe-kicker">FACTURACIÓN</span><h1>Boletas de venta</h1><p>Comprobantes y respuestas recibidas de NubeFact.</p></div><span className="cpe-count">{total} comprobante{total === 1 ? "" : "s"}</span></header>
    <label className="cpe-search"><span aria-hidden="true">⌕</span><input aria-label="Buscar comprobante" value={busqueda} onChange={(evento) => { setPagina(1); setBusqueda(evento.target.value); }} placeholder="Buscar por cliente, documento o código" /></label>
    {error && <p className="cpe-message is-error" role="alert">{error}</p>}
    {cargando ? <div className="cpe-empty" role="status">Cargando comprobantes…</div> : items.length ? <>
      <div className="cpe-list">{items.map((item) => {
        const emitido = ["EMITIDO", "EMITIDO_DEMO"].includes(item.estado);
        const estadoClase = emitido ? "is-ok" : item.estado.includes("ERROR") ? "is-error" : "is-pending";
        return <article className="cpe-card" key={item.id}>
          <header><div><span className="cpe-doc-type">{item.tipoComprobante === "FACTURA" ? "FACTURA" : item.tipoComprobante === "BOLETA" ? "BOLETA DE VENTA" : "REGISTRO ANTERIOR"}</span><strong>{item.codigoComprobante ?? item.codigoVenta}</strong><span>{new Date(item.fecha).toLocaleDateString("es-PE")} · {item.ambiente ?? "Sin ambiente"}</span></div><b className={`cpe-state ${estadoClase}`}>{estadoLegible(item.estado)}</b></header>
          <div className="cpe-card-grid"><div><small>Cliente</small><strong title={`${item.clienteNombre ?? "Cliente"}${item.clienteNumeroDocumento ? ` · ${item.clienteNumeroDocumento}` : ""}`}>{item.clienteNombre ?? "Cliente"}{item.clienteNumeroDocumento ? ` · ${item.clienteNumeroDocumento}` : ""}</strong></div><div><small>Base</small><strong>{soles(Number(item.subtotal))}</strong></div><div><small>IGV</small><strong>{soles(Number(item.igv))}</strong></div><div><small>Total</small><strong>{soles(Number(item.total))}</strong></div></div>
          {!emitido && item.mensaje && <p className="cpe-message" role="status">{item.mensaje} Verifica el estado con NubeFact antes de volver a emitir.</p>}
          {emitido && <footer>{item.enlacePdf && <a href={item.enlacePdf} target="_blank" rel="noreferrer">PDF</a>}{item.enlaceXml && <a href={item.enlaceXml} target="_blank" rel="noreferrer">XML</a>}{item.enlace && <a href={item.enlace} target="_blank" rel="noreferrer">NubeFact</a>}</footer>}
        </article>;
      })}</div>
      <nav className="cpe-pagination" aria-label="Paginación"><span>Página {pagina} de {totalPaginas}</span><div><button type="button" disabled={pagina <= 1} onClick={() => setPagina((valor) => valor - 1)}>Anterior</button><button type="button" disabled={pagina >= totalPaginas} onClick={() => setPagina((valor) => valor + 1)}>Siguiente</button></div></nav>
    </> : <div className="cpe-empty"><strong>No hay comprobantes</strong><span>Las boletas nuevas aparecerán aquí.</span></div>}
  </section>;
}
