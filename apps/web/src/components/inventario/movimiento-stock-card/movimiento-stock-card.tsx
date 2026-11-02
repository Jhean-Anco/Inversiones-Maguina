import "./movimiento-stock-card.css";
import type { MovimientoStock } from "../../../services/inventario/movimientos-stock.service";
import { motivoVisible } from "../../../hooks/use-movimientos-stock";

const numero = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 0, maximumFractionDigits: 3 });
const fechaHora = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short" });

export function MovimientoStockCard({ movimiento }: { movimiento: MovimientoStock }) {
  const aumento = movimiento.tipo === "ENTRADA" || (movimiento.tipo === "AJUSTE" && movimiento.sentido === "INGRESO");
  const tipoVisible = movimiento.tipo === "AJUSTE" ? `Ajuste · ${aumento ? "aumento" : "disminución"}` : movimiento.tipo === "ENTRADA" ? "Entrada" : "Salida";
  const fuente = movimiento.origenTipo === "ENTRADA_STOCK" ? movimiento.documentoOrigen ? `Entrada ${movimiento.documentoOrigen}` : "Entrada de stock" : movimiento.origenTipo === "AJUSTE_STOCK" ? "Ajuste manual" : movimiento.origenTipo;
  return <article className="stock-movement-card">
    <div className="stock-movement-card-top"><span className={`stock-movement-badge${aumento ? " is-increase" : " is-decrease"}`}>{tipoVisible}</span><time dateTime={movimiento.creadoEn}>{fechaHora.format(new Date(movimiento.creadoEn))}</time></div>
    <div className="stock-movement-product"><span className="stock-movement-code">{movimiento.codigo}</span><strong>{movimiento.producto}</strong></div>
    <div className="stock-movement-card-bottom"><div><span>Variación</span><strong className={aumento ? "is-increase" : "is-decrease"}>{aumento ? "+" : "−"}{numero.format(Number(movimiento.cantidadBase))} {movimiento.unidad}</strong></div><div><span>{movimiento.motivo ? "Motivo" : "Origen"}</span><strong>{movimiento.motivo ? motivoVisible(movimiento.motivo) : fuente}</strong></div></div>
    {movimiento.observacion && <p className="stock-movement-observation">{movimiento.observacion}</p>}
  </article>;
}
