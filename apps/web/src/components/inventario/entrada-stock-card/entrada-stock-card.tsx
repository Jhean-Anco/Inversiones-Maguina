import "./entrada-stock-card.css";
import type { EntradaStock } from "../../../services/inventario/entradas-stock.service";

const nombresDocumentos: Record<string, string> = { FACTURA: "Factura", BOLETA: "Boleta", GUIA_REMISION: "Guía de remisión", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento", OTRO: "Otro" };

export function EntradaStockCard({ entrada, alAbrir }: { entrada: EntradaStock; alAbrir: () => void }) {
  const fecha = new Date(`${entrada.fecha}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
  const totalDocumento = Number(entrada.totalDocumento ?? entrada.total);
  return <article className="stock-entry-card">
    <button className="stock-entry-card-open" type="button" onClick={alAbrir} aria-label={`Ver compra ${entrada.codigo}`}>
      <div className="stock-entry-card-top"><span className="stock-entry-icon" aria-hidden="true">↓</span><span className="stock-entry-date">{fecha}</span></div>
      <div className="stock-entry-card-heading"><span className="stock-entry-kicker">COMPRA</span><strong>{entrada.codigo}</strong></div>
      <div className="stock-entry-card-doc"><span>{nombresDocumentos[entrada.tipoDocumento] ?? entrada.tipoDocumento}</span><strong>{entrada.numeroDocumento || "Registro interno"}</strong></div>
      <div className="stock-entry-card-meta"><span>Proveedor</span><strong>{entrada.proveedor || "No especificado"}</strong>{entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento && <small>{entrada.proveedorTipoDocumento}: {entrada.proveedorNumeroDocumento}</small>}</div>
      <div className="stock-entry-card-bottom"><span>{entrada.cantidadProductos ?? 0} {entrada.cantidadProductos === 1 ? "producto recibido" : "productos recibidos"}</span><div className="stock-entry-card-totals"><small>Documento S/ {Number(entrada.totalDocumento ?? entrada.total).toFixed(2)}</small><strong>Inventario S/ {Number(entrada.total).toFixed(2)}</strong></div></div>
      <div className="stock-entry-payment"><span>{entrada.montoPagado === null || entrada.montoPagado === undefined ? "Pago no registrado" : Number(entrada.montoPagado) >= totalDocumento ? "Pagada" : Number(entrada.montoPagado) > 0 ? "Abono registrado" : "Pendiente de pago"}</span><small>{entrada.montoPagado == null ? "" : `Pagado S/ ${Number(entrada.montoPagado).toFixed(2)} · saldo S/ ${Math.max(0, totalDocumento - Number(entrada.montoPagado)).toFixed(2)}`}</small></div>
    </button>
    <button className="stock-entry-details-link" type="button" onClick={alAbrir}>Ver detalle <span aria-hidden="true">→</span></button>
  </article>;
}
