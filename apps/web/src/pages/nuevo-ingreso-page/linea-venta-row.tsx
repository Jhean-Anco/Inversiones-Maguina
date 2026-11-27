import { ChevronDown, X } from "lucide-react";
import { precioRepuestoEnLinea } from "../../domain/ingresos/importes-venta";
import type { AfectacionIgv, LineaCarrito } from "../../types/nuevo-ingreso";

type LineaVentaRowProps = {
  linea: LineaCarrito;
  esFactura: boolean;
  precio: number;
  importe: number;
  nombreLinea: string;
  totalLinea: number;
  formatearSoles: (monto: number) => string;
  onActualizar: (cambios: Partial<LineaCarrito>) => void;
  onQuitar: () => void;
};

/** Línea del detalle de la venta con la misma maquetación que `os-linea` de Órdenes de servicio. */
export function LineaVentaRow({ linea, esFactura, precio, importe, nombreLinea, totalLinea, formatearSoles, onActualizar, onQuitar }: LineaVentaRowProps) {
  const esServicio = linea.tipo === "SERVICIO";
  const listas = linea.tipo === "PRODUCTO" && linea.listaPrecioCodigo
    ? [...new Map(linea.producto.tramos?.map((tramo) => [tramo.listaCodigo, tramo.listaNombre])).entries()] : [];
  const precioPendiente = linea.tipo === "PRODUCTO" && precioRepuestoEnLinea(linea) == null;

  return (
    <div className={`os-linea ${esServicio ? "es-servicio" : "es-producto"}`}>
      <div className="os-linea-descripcion">
        {esServicio
          ? <input aria-label="Descripción del servicio" placeholder="Descripción del servicio" maxLength={240} value={linea.descripcion.toLocaleUpperCase("es-PE")} onChange={(e) => onActualizar({ descripcion: e.target.value.toLocaleUpperCase("es-PE") })} />
          : <input aria-label={`Descripción de ${nombreLinea}`} title={nombreLinea} value={nombreLinea} readOnly />}
      </div>
      <label className="os-linea-campo os-linea-cantidad"><span>Cant.</span>
        <input aria-label={`Cantidad de ${nombreLinea}`} type="number" min={linea.tipo === "MOTOTAXI" ? 1 : 0.001} max={linea.tipo === "MOTOTAXI" ? linea.mototaxi.stockDisponible : undefined} step={linea.tipo === "MOTOTAXI" ? 1 : 0.001} value={linea.cantidad} onChange={(e) => onActualizar({ cantidad: e.target.value })} />
      </label>
      <label className="os-linea-campo os-linea-precio"><span>Precio</span>
        {esServicio
          ? <input aria-label={`Precio unitario de ${nombreLinea}`} type="number" min="0" step="0.01" placeholder="0.00" value={linea.precio} onChange={(e) => onActualizar({ precio: e.target.value })} />
          : <input aria-label={`Precio unitario de ${nombreLinea}`} type="text" value={precioPendiente ? "Sin precio" : formatearSoles(precio)} readOnly />}
        {linea.tipo === "PRODUCTO" && listas.length > 1 && <span className="os-select venta-linea-lista">
          <select aria-label={`Lista de precios para ${nombreLinea}`} value={linea.listaPrecioCodigo} onChange={(e) => onActualizar({ listaPrecioCodigo: e.target.value })}>
            {listas.map(([codigo, nombre]) => <option key={codigo} value={codigo}>{nombre}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={14} />
        </span>}
      </label>
      <label className="os-linea-campo os-linea-descuento"><span>Descuento</span>
        <input aria-label={`Descuento de ${nombreLinea}`} type="number" min="0" max={importe.toFixed(2)} step="0.01" value={linea.descuento} onChange={(e) => onActualizar({ descuento: e.target.value })} />
      </label>
      {esFactura && <label className="os-linea-campo venta-linea-operacion"><span>Operación</span>
        <span className="os-select">
          <select aria-label={`Tipo de operación de ${nombreLinea}`} value={linea.afectacionIgv} onChange={(e) => onActualizar({ afectacionIgv: e.target.value as AfectacionIgv })}><option value="GRAVADO">Gravada</option><option value="EXONERADO">Exonerada</option><option value="INAFECTO">Inafecta</option></select>
          <ChevronDown aria-hidden="true" size={14} />
        </span>
      </label>}
      <div className="os-linea-total"><span>Total</span><strong>{formatearSoles(totalLinea)}</strong></div>
      <button className="os-linea-quitar" type="button" aria-label={`Quitar ${nombreLinea}`} onClick={onQuitar}><X aria-hidden="true" size={16} /></button>
    </div>
  );
}
