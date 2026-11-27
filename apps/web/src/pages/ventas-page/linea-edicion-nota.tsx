import { Trash2 } from "lucide-react";
import { importeLineaEdicion, type LineaEdicion } from "../../domain/ingresos/edicion-nota-venta";
import { BotonAccion } from "../../components/ui/boton-accion";
import { soles } from "./ventas-formatters";

const campo = "h-11 w-full min-w-0 rounded-xl border border-[#c5d1db] px-3 text-sm font-medium text-[#142b42] disabled:bg-[#f2f5f8]";
const rotulo = "grid min-w-0 gap-1 text-[11px] font-bold text-[#52697d]";

export function LineaEdicionNota({ linea, numero, onCambiar, onQuitar }: { linea: LineaEdicion; numero: number; onCambiar: (cambios: Partial<LineaEdicion>) => void; onQuitar: () => void }) {
  return <fieldset className="m-0 grid min-w-0 gap-2 rounded-xl border border-[#e1e8ef] p-3">
    <legend className="sr-only">Línea {numero}: {linea.descripcion || "servicio nuevo"}</legend>
    <div className="flex items-start justify-between gap-2">
      {linea.tipo === "SERVICIO"
        ? <label className={`${rotulo} flex-1`}>Servicio<input className={campo} maxLength={240} value={linea.descripcion} onChange={(evento) => onCambiar({ descripcion: evento.target.value })} /></label>
        : <p className="m-0 min-w-0 text-sm text-[#173554]"><strong className="block">{linea.descripcion}</strong>{linea.detalle && <small className="text-[#52697d]">{linea.detalle}</small>}</p>}
      {!linea.bloqueo && <BotonAccion tono="peligro" etiqueta={`Quitar línea ${numero}`} onClick={onQuitar} icono={<Trash2 aria-hidden="true" size={16} />} />}
    </div>
    {linea.bloqueo && <p className="m-0 text-xs text-[#80551b]">{linea.bloqueo} No se puede cambiar su cantidad ni quitarla.</p>}
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label className={rotulo}>Cantidad<input className={campo} type="number" inputMode="decimal" min={linea.tipo === "MOTOTAXI" ? 1 : 0.001} step={linea.tipo === "MOTOTAXI" ? 1 : 0.001} disabled={Boolean(linea.bloqueo)} value={linea.cantidad} onChange={(evento) => onCambiar({ cantidad: evento.target.value })} /></label>
      <label className={rotulo}>Precio unitario<input className={campo} type="number" inputMode="decimal" min={0} step="any" disabled={linea.tipo === "MOTOTAXI"} value={linea.precio} onChange={(evento) => onCambiar({ precio: evento.target.value })} /></label>
      <label className={rotulo}>Descuento<input className={campo} type="number" inputMode="decimal" min={0} step={0.01} value={linea.descuento} onChange={(evento) => onCambiar({ descuento: evento.target.value })} /></label>
      <p className={`${rotulo} m-0`}>Importe<strong className="flex h-11 items-center justify-end text-sm tabular-nums text-[#0b2545]">{soles(String(importeLineaEdicion(linea)))}</strong></p>
    </div>
  </fieldset>;
}
