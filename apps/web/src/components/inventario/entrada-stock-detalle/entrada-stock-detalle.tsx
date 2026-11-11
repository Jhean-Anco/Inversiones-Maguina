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
  const total = Number(entrada.totalDocumento ?? entrada.total ?? 0);
  const pagado = entrada.montoPagado == null ? null : Number(entrada.montoPagado);
  const saldo = pagado == null ? null : Math.max(0, total - pagado);
  const fecha = new Date(`${entrada.fecha}T00:00:00`).toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return <div className="catalog-modal-backdrop" onMouseDown={(evento) => {
    if (evento.target === evento.currentTarget) alCerrar();
  }}>
    <section className="catalog-modal stock-detail-modal" role="dialog" aria-modal="true" aria-labelledby="stock-detail-title">
      <header className="stock-detail-heading">
        <span className="stock-entry-icon" aria-hidden="true">↓</span>
        <div className="stock-detail-heading-copy"><span className="stock-entry-kicker">COMPRA DE REPUESTOS</span><h2 id="stock-detail-title">{entrada.codigo}</h2><p>{fecha}</p></div>
        <button className="catalog-modal-close" type="button" aria-label="Cerrar detalle" onClick={alCerrar}>×</button>
      </header>
      <div className="stock-detail-content">
        <div className="stock-detail-summary">
          <div className="stock-detail-summary-provider"><span>Proveedor</span><strong>{entrada.proveedor || "No especificado"}</strong><small>{entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento ? `${entrada.proveedorTipoDocumento}: ${entrada.proveedorNumeroDocumento}` : "Sin identificación registrada"}</small>{entrada.proveedorDireccion && <small>{entrada.proveedorDireccion}</small>}</div>
          <div><span>Documento</span><strong>{nombresDocumentos[entrada.tipoDocumento] ?? entrada.tipoDocumento}</strong><small>{entrada.numeroDocumento || "Sin número registrado"}</small></div>
          <div><span>Forma de pago</span><strong>{entrada.medioPago || "Sin registrar"}</strong><small>{pagado == null ? "Pago no registrado" : `Pagado S/ ${pagado.toFixed(2)}`}</small></div>
          <div className="stock-detail-summary-total"><span>Total de la compra</span><strong>S/ {total.toFixed(2)}</strong><small>{saldo == null ? "Saldo no registrado" : saldo > 0 ? `Saldo pendiente S/ ${saldo.toFixed(2)}` : "Compra pagada"}</small></div>
        </div>
        {entrada.evidenciaNombre && <a className="stock-evidence-name stock-detail-evidence" href={srcImagen(`/inventario/entradas-stock/${entrada.id}/evidencia`)} target="_blank" rel="noreferrer">Ver evidencia: {entrada.evidenciaNombre}</a>}
        {entrada.observacion && <p className="stock-detail-note">{entrada.observacion}</p>}
        <div className="stock-detail-lines-heading"><div><span>DETALLE</span><h3 className="stock-detail-lines-title">Productos de la compra</h3></div><strong>{entrada.detalles?.length ?? 0} {(entrada.detalles?.length ?? 0) === 1 ? "artículo" : "artículos"}</strong></div>
        <div className="stock-detail-lines">{entrada.detalles?.map((detalle) => <article className="stock-detail-line" key={detalle.id}>
          <span className="stock-detail-line-mark" aria-hidden="true">{detalle.nombreProducto.slice(0, 1).toUpperCase()}</span>
          <div className="stock-detail-line-product"><strong>{detalle.nombreProducto}</strong><small>{detalle.codigoProducto} <span>·</span> {detalle.presentacion} ({detalle.unidadMedidaCodigo})</small><small>{detalle.cantidad} × S/ {Number(detalle.costoUnitario).toFixed(4)} <span>·</span> {Number(detalle.cantidadBase).toFixed(3)} unidades base</small></div>
          <div className="stock-detail-line-total"><small>Subtotal</small><strong>S/ {Number(detalle.subtotal).toFixed(2)}</strong></div>
        </article>)}</div>
        <footer className="stock-detail-footer"><span>El stock se actualizó al registrar esta compra.</span><div><strong>Total registrado</strong><b>S/ {total.toFixed(2)}</b></div></footer>
      </div>
    </section>
  </div>;
}
