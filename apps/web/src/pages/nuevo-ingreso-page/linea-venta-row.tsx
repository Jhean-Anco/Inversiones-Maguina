import { formularioDocumentoClases as clases } from "../../components/documentos/formulario-documento-clases";
import { precioRepuestoEnLinea } from "../../domain/ingresos/importes-venta";
import type { AfectacionIgv, LineaCarrito } from "../../types/nuevo-ingreso";

type LineaVentaRowProps = {
  linea: LineaCarrito;
  esFactura: boolean;
  cuadricula: string;
  precio: number;
  importe: number;
  nombreLinea: string;
  totalLinea: number;
  formatearSoles: (monto: number) => string;
  onActualizar: (cambios: Partial<LineaCarrito>) => void;
  onQuitar: () => void;
};

export function LineaVentaRow({ linea, esFactura, cuadricula, precio, importe, nombreLinea, totalLinea, formatearSoles, onActualizar, onQuitar }: LineaVentaRowProps) {
  const listas = linea.tipo === "PRODUCTO" && linea.listaPrecioCodigo
    ? [...new Map(linea.producto.tramos?.map((tramo) => [tramo.listaCodigo, tramo.listaNombre])).entries()] : [];
  const precioPendiente = linea.tipo === "PRODUCTO" && precioRepuestoEnLinea(linea) == null;
  const detalle = linea.tipo === "PRODUCTO" ? `${linea.producto.codigo} · Stock ${Number(linea.producto.stockBase).toLocaleString("es-PE")}`
    : linea.tipo === "MOTOTAXI" ? `${linea.mototaxi.codigo} · Disponibles ${linea.mototaxi.stockDisponible}` : null;

  return (
    <div className={`${cuadricula} border-b border-[#edf1f5] px-4 py-2.5`}>
      <div className="min-w-0">
        {linea.tipo === "SERVICIO"
          ? <input className={`${clases.campoLinea} font-semibold uppercase`} aria-label="Descripción del servicio" placeholder="Descripción del servicio" value={linea.descripcion.toLocaleUpperCase("es-PE")} onChange={(e) => onActualizar({ descripcion: e.target.value.toLocaleUpperCase("es-PE") })} />
          : <strong className="block truncate text-sm font-semibold text-[#142b42]" title={nombreLinea}>{linea.tipo === "PRODUCTO" ? linea.producto.nombre : `${linea.mototaxi.marca} ${linea.mototaxi.modelo}${linea.mototaxi.version ? ` ${linea.mototaxi.version}` : ""}`}</strong>}
        {detalle && <small className="block truncate text-[11px] text-[#5b7083]">{detalle}</small>}
      </div>
      <input className={`${clases.campoLinea} text-center`} aria-label="Cantidad" type="number" min={linea.tipo === "MOTOTAXI" ? 1 : 0.001} max={linea.tipo === "MOTOTAXI" ? linea.mototaxi.stockDisponible : undefined} step={linea.tipo === "MOTOTAXI" ? 1 : 0.001} value={linea.cantidad} onChange={(e) => onActualizar({ cantidad: e.target.value })} />
      {linea.tipo === "SERVICIO"
        ? <input className={`${clases.campoLinea} text-right`} aria-label={`Precio unitario de ${nombreLinea}`} title={`Precio unitario de ${nombreLinea}`} type="number" min="0" step="0.01" placeholder="0.00" value={linea.precio} onChange={(e) => onActualizar({ precio: e.target.value })} />
        : <div className="grid min-w-0 gap-1 text-right">
          <span className="text-sm tabular-nums text-[#142b42]">{precioPendiente ? "Sin precio para esta cantidad" : formatearSoles(precio)}</span>
          {linea.tipo === "PRODUCTO" && listas.length > 1 && <select aria-label={`Lista de precios para ${nombreLinea}`} value={linea.listaPrecioCodigo} onChange={(e) => onActualizar({ listaPrecioCodigo: e.target.value })} className="w-full min-w-0 rounded-md border border-[#c5d1db] bg-white px-1 py-0.5 text-xs text-[#142b42]">
            {listas.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
          </select>}
        </div>}
      <input className={`${clases.campoLinea} text-right`} aria-label={`Descuento total de ${nombreLinea}`} title="Descuento en soles" type="number" min="0" max={importe.toFixed(2)} step="0.01" value={linea.descuento} onChange={(e) => onActualizar({ descuento: e.target.value })} />
      {esFactura && <select className={`${clases.campoLinea} !px-1.5 text-[13px]`} aria-label={`Tipo de operación de ${nombreLinea}`} value={linea.afectacionIgv} onChange={(e) => onActualizar({ afectacionIgv: e.target.value as AfectacionIgv })}><option value="GRAVADO">Gravada</option><option value="EXONERADO">Exonerada</option><option value="INAFECTO">Inafecta</option></select>}
      <strong className="text-right text-sm font-bold tabular-nums text-[#0b2545]">{formatearSoles(totalLinea)}</strong>
      <button type="button" className="grid h-8 w-8 place-items-center justify-self-end rounded-lg text-[#7a8da0] hover:bg-[#fff1f2] hover:text-[#b42335]" aria-label={`Quitar ${nombreLinea}`} onClick={onQuitar}>×</button>
    </div>
  );
}
