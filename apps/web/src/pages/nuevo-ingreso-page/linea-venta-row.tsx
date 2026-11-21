import { precioRepuestoEnLinea } from "../../domain/ingresos/importes-venta";
import type { AfectacionIgv, LineaCarrito } from "../../types/nuevo-ingreso";
import { lineaVentaClasses } from "./linea-venta-classes";

type LineaVentaRowProps = {
  linea: LineaCarrito;
  esFactura: boolean;
  separadorTipo: boolean;
  precio: number;
  importe: number;
  nombreLinea: string;
  totalLinea: number;
  formatearSoles: (monto: number) => string;
  onActualizar: (cambios: Partial<LineaCarrito>) => void;
  onQuitar: () => void;
};

export function LineaVentaRow({ linea, esFactura, separadorTipo, precio, importe, nombreLinea, totalLinea, formatearSoles, onActualizar, onQuitar }: LineaVentaRowProps) {
  const listas = linea.tipo === "PRODUCTO" && linea.listaPrecioCodigo
    ? [...new Map(linea.producto.tramos?.map((tramo) => [tramo.listaCodigo, tramo.listaNombre])).entries()] : [];
  const precioPendiente = linea.tipo === "PRODUCTO" && precioRepuestoEnLinea(linea) == null;
  return (
    <div className={`venta-line ${lineaVentaClasses.row} ${esFactura ? "is-factura" : "is-boleta"}${separadorTipo ? " has-type-separator" : ""}`}>
      <div className="venta-line-name"><strong>{linea.tipo === "PRODUCTO" ? linea.producto.nombre : linea.tipo === "MOTOTAXI" ? `${linea.mototaxi.marca} ${linea.mototaxi.modelo}${linea.mototaxi.version ? ` ${linea.mototaxi.version}` : ""}` : <input className={lineaVentaClasses.serviceDescription} aria-label="Descripción del servicio" placeholder="Descripción del servicio" value={linea.descripcion.toLocaleUpperCase("es-PE")} onChange={(e) => onActualizar({ descripcion: e.target.value.toLocaleUpperCase("es-PE") })} />}</strong>{linea.tipo === "PRODUCTO" ? <small>{`${linea.producto.codigo} · Stock ${Number(linea.producto.stockBase).toLocaleString("es-PE")}`}</small> : linea.tipo === "MOTOTAXI" ? <small>{`${linea.mototaxi.codigo} · Disponibles ${linea.mototaxi.stockDisponible}`}</small> : null}</div>
      <input className={`venta-qty ${lineaVentaClasses.quantity}`} aria-label="Cantidad" type="number" min={linea.tipo === "MOTOTAXI" ? 1 : 0.001} max={linea.tipo === "MOTOTAXI" ? linea.mototaxi.stockDisponible : undefined} step={linea.tipo === "MOTOTAXI" ? 1 : 0.001} value={linea.cantidad} onChange={(e) => onActualizar({ cantidad: e.target.value })} />
      {linea.tipo !== "SERVICIO" ? <div className={`venta-line-price ${lineaVentaClasses.productPrice}`}><strong>{precioPendiente ? "Sin precio para esta cantidad" : formatearSoles(precio)}</strong>
        {linea.tipo === "PRODUCTO" && listas.length > 1 && <select aria-label={`Lista de precios para ${nombreLinea}`} value={linea.listaPrecioCodigo} onChange={(e) => onActualizar({ listaPrecioCodigo: e.target.value })} className="w-full min-w-0 rounded border border-[var(--erp-border)] px-1 text-xs">
          {listas.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
        </select>}
      </div> : <input className={`venta-service-price ${lineaVentaClasses.servicePrice}`} aria-label={`Precio unitario de ${nombreLinea}`} title={`Precio unitario de ${nombreLinea}`} type="number" min="0" step="0.01" value={linea.precio} onChange={(e) => onActualizar({ precio: e.target.value })} />}
      <input className={`venta-discount ${lineaVentaClasses.discount}`} aria-label={`Descuento total de ${nombreLinea}`} title="Descuento en soles" type="number" min="0" max={importe.toFixed(2)} step="0.01" value={linea.descuento} onChange={(e) => onActualizar({ descuento: e.target.value })} />
      {esFactura && <label className={`venta-line-affectation grid w-[min(190px,100%)] gap-[3px] mt-[7px] text-[10px] text-[#71849b] [.venta-page.is-data-step_&]:block [.venta-page.is-data-step_&]:w-full [.venta-page.is-data-step_&]:mt-0 ${lineaVentaClasses.affectationLabel}`}><select className={`w-full min-h-[30px] px-[7px] rounded-md border border-[#d5e0ec] bg-white font-[inherit] text-[11px] text-[#173b65] [.venta-page.is-data-step_&]:h-10 [.venta-page.is-data-step_&]:min-h-10 [.venta-page.is-data-step_&]:rounded-lg ${lineaVentaClasses.affectationSelect}`} aria-label={`Tipo de operación de ${nombreLinea}`} value={linea.afectacionIgv} onChange={(e) => onActualizar({ afectacionIgv: e.target.value as AfectacionIgv })}><option value="GRAVADO">Gravada</option><option value="EXONERADO">Exonerada</option><option value="INAFECTO">Inafecta</option></select></label>}
      <strong>{formatearSoles(totalLinea)}</strong><button type="button" aria-label={`Quitar ${nombreLinea}`} onClick={onQuitar}>×</button>
    </div>
  );
}
