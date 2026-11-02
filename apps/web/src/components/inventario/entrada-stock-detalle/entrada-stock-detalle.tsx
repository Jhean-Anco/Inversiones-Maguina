import "./entrada-stock-detalle.css";
import type { EntradaStock } from "../../../services/inventario/entradas-stock.service";
import { srcImagen } from "../../../services/api-cliente";

const nombresDocumentos: Record<string, string> = {
  FACTURA: "Factura",
  BOLETA: "Boleta",
  GUIA_REMISION: "Guía de remisión",
  NOTA: "Nota",
  SIN_DOCUMENTO: "Sin documento",
  OTRO: "Otro",
};

export function EntradaStockDetalle({ entrada, alCerrar }: { entrada: EntradaStock; alCerrar: () => void }) {
  const fecha = new Date(`${entrada.fecha}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return <div className="catalog-modal-backdrop" onMouseDown={(evento) => {
    if (evento.target === evento.currentTarget) alCerrar();
  }}>
    <section className="catalog-modal stock-detail-modal" role="dialog" aria-modal="true" aria-labelledby="stock-detail-title">
      <button className="catalog-modal-close" type="button" aria-label="Cerrar detalle" onClick={alCerrar}>×</button>
      <div className="stock-detail-content">
        <div className="stock-detail-heading">
          <span className="stock-entry-icon" aria-hidden="true">↓</span>
          <div><span className="stock-entry-kicker">COMPRA REGISTRADA</span><h2 id="stock-detail-title">{entrada.codigo}</h2><p>{fecha}</p></div>
        </div>
        <div className="stock-detail-summary">
          <div><span>Documento</span><strong>{nombresDocumentos[entrada.tipoDocumento] ?? entrada.tipoDocumento} {entrada.numeroDocumento || ""}</strong></div>
          <div><span>Proveedor</span><strong>{entrada.proveedor || "No especificado"}</strong><small>{entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento ? `${entrada.proveedorTipoDocumento}: ${entrada.proveedorNumeroDocumento}` : "Sin identificación registrada"}</small>{entrada.proveedorDireccion && <small>{entrada.proveedorDireccion}</small>}</div>
          <div><span>Productos recibidos</span><strong>{entrada.detalles?.length ?? 0}</strong></div>
          <div><span>Total del documento</span><strong>S/ {Number(entrada.totalDocumento ?? entrada.total).toFixed(2)}</strong></div>
          <div><span>Total recibido en inventario</span><strong>S/ {Number(entrada.total).toFixed(2)}</strong></div>
        </div>
        {entrada.evidenciaNombre && <a className="stock-evidence-name stock-detail-evidence" href={srcImagen(`/inventario/entradas-stock/${entrada.id}/evidencia`)} target="_blank" rel="noreferrer">Ver evidencia: {entrada.evidenciaNombre}</a>}
        {entrada.observacion && <p className="stock-detail-note">{entrada.observacion}</p>}
        {entrada.detallesDocumento?.length ? <>
          <h3 className="stock-detail-lines-title">Según el documento</h3>
          <div className="stock-detail-lines stock-detail-document-lines">{entrada.detallesDocumento.map((linea) => <article className="stock-detail-line" key={linea.id}>
            <div><strong>{linea.descripcion}</strong><small>{linea.codigo || "Sin código"}{linea.unidad ? ` · ${linea.unidad}` : ""}</small><small>{linea.cantidad} × S/ {Number(linea.costoUnitario).toFixed(4)}</small></div>
            <strong>S/ {Number(linea.total).toFixed(2)}</strong>
          </article>)}</div>
        </> : null}
        <h3 className="stock-detail-lines-title">Recepción de inventario</h3>
        <div className="stock-detail-lines">{entrada.detalles?.map((detalle) => <article className="stock-detail-line" key={detalle.id}>
          <div><strong>{detalle.nombreProducto}</strong><small>{detalle.codigoProducto} · {detalle.presentacion} ({detalle.unidadMedidaCodigo})</small><small>{detalle.cantidad} × S/ {Number(detalle.costoUnitario).toFixed(4)} · {Number(detalle.cantidadBase).toFixed(3)} unidades</small></div>
          <strong>S/ {Number(detalle.subtotal).toFixed(2)}</strong>
        </article>)}</div>
        <div className="stock-detail-footer"><span>{entrada.detalles?.length ? "El stock se actualizó al registrar esta compra." : "Aún no se recibieron productos."}</span><button className="catalog-cancel" type="button" onClick={alCerrar}>Cerrar</button></div>
      </div>
    </section>
  </div>;
}
