import type { EntradaStock } from "../../../services/inventario/entradas-stock.service";
import {
  stockDetailCloseClasses,
  stockDetailContentClasses,
  stockDetailCountClasses,
  stockDetailDateClasses,
  stockDetailFooterClasses,
  stockDetailFooterLabelClasses,
  stockDetailFooterTextClasses,
  stockDetailFooterTotalsClasses,
  stockDetailFooterValueClasses,
  stockDetailHeadingClasses,
  stockDetailHeadingCopyClasses,
  stockDetailKickerClasses,
  stockDetailLineClasses,
  stockDetailLineTotalClasses,
  stockDetailLineTotalValueClasses,
  stockDetailLinesClasses,
  stockDetailLinesHeadingClasses,
  stockDetailLinesKickerClasses,
  stockDetailLinesTitleClasses,
  stockDetailModalClasses,
  stockDetailProductClasses,
  stockDetailProductMetaClasses,
  stockDetailProductNameClasses,
  stockDetailSummaryClasses,
  stockDetailSummaryItemClasses,
  stockDetailSummaryLabelClasses,
  stockDetailSummaryNoteClasses,
  stockDetailSummaryValueClasses,
  stockDetailTitleClasses,
  stockDetailTotalClasses,
  stockDetailTotalValueClasses,
} from "./entrada-stock-detalle-classes";

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
    <section className={stockDetailModalClasses} role="dialog" aria-modal="true" aria-labelledby="stock-detail-title">
      <header className={stockDetailHeadingClasses}>
        <div className={stockDetailHeadingCopyClasses}><span className={stockDetailKickerClasses}>COMPRA DE REPUESTOS</span><h2 className={stockDetailTitleClasses} id="stock-detail-title">{entrada.codigo}</h2><p className={stockDetailDateClasses}>{fecha}</p></div>
        <button className={stockDetailCloseClasses} type="button" aria-label="Cerrar detalle" onClick={alCerrar}>×</button>
      </header>
      <div className={stockDetailContentClasses}>
        <div className={stockDetailSummaryClasses}>
          <div className={stockDetailSummaryItemClasses}><span className={stockDetailSummaryLabelClasses}>Proveedor</span><strong className={stockDetailSummaryValueClasses}>{entrada.proveedor || "No especificado"}</strong><small className={stockDetailSummaryNoteClasses}>{entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento ? `${entrada.proveedorTipoDocumento}: ${entrada.proveedorNumeroDocumento}` : "Sin identificación registrada"}</small>{entrada.proveedorDireccion && <small className={stockDetailSummaryNoteClasses}>{entrada.proveedorDireccion}</small>}</div>
          <div className={stockDetailSummaryItemClasses}><span className={stockDetailSummaryLabelClasses}>Documento</span><strong className={stockDetailSummaryValueClasses}>{nombresDocumentos[entrada.tipoDocumento] ?? entrada.tipoDocumento}</strong><small className={stockDetailSummaryNoteClasses}>{entrada.numeroDocumento || "Sin número registrado"}</small></div>
          <div className={stockDetailSummaryItemClasses}><span className={stockDetailSummaryLabelClasses}>Forma de pago</span><strong className={stockDetailSummaryValueClasses}>{entrada.medioPago || "Sin registrar"}</strong><small className={stockDetailSummaryNoteClasses}>{pagado == null ? "Pago no registrado" : `Pagado S/ ${pagado.toFixed(2)}`}</small></div>
          <div className={`${stockDetailSummaryItemClasses} ${stockDetailTotalClasses}`}><span className={stockDetailSummaryLabelClasses}>Total de la compra</span><strong className={stockDetailTotalValueClasses}>S/ {total.toFixed(2)}</strong><small className={stockDetailSummaryNoteClasses}>{saldo == null ? "Saldo no registrado" : saldo > 0 ? `Saldo pendiente S/ ${saldo.toFixed(2)}` : "Compra pagada"}</small></div>
        </div>
        <div className={stockDetailLinesHeadingClasses}><div><span className={stockDetailLinesKickerClasses}>DETALLE</span><h3 className={stockDetailLinesTitleClasses}>Repuestos de la compra</h3></div><strong className={stockDetailCountClasses}>{entrada.detalles?.length ?? 0} {(entrada.detalles?.length ?? 0) === 1 ? "artículo" : "artículos"}</strong></div>
        <div className={stockDetailLinesClasses}>{entrada.detalles?.map((detalle) => <article className={stockDetailLineClasses} key={detalle.id}>
          <div className={stockDetailProductClasses}><strong className={stockDetailProductNameClasses}>{detalle.nombreProducto}</strong><small className={stockDetailProductMetaClasses}>{detalle.codigoProducto} <span>·</span> {detalle.presentacion} ({detalle.unidadMedidaCodigo})</small><small className={stockDetailProductMetaClasses}>{detalle.cantidad} × S/ {Number(detalle.costoUnitario).toFixed(4)} <span>·</span> {Number(detalle.cantidadBase).toFixed(3)} unidades base</small></div>
          <div className={stockDetailLineTotalClasses}><small className={stockDetailProductMetaClasses}>Subtotal</small><strong className={stockDetailLineTotalValueClasses}>S/ {Number(detalle.subtotal).toFixed(2)}</strong></div>
        </article>)}</div>
        <footer className={stockDetailFooterClasses}><span className={stockDetailFooterTextClasses}>El stock se actualizó al registrar esta compra.</span><div className={stockDetailFooterTotalsClasses}><strong className={stockDetailFooterLabelClasses}>Total registrado</strong><b className={stockDetailFooterValueClasses}>S/ {total.toFixed(2)}</b></div></footer>
      </div>
    </section>
  </div>;
}
