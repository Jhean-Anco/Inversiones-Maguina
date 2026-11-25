import { RefreshCw } from "lucide-react";
import { PERIODOS, type Comparacion, type Periodo } from "./dashboard-periodos";

type Props = { periodo: Periodo; comparar: Comparacion; actualizando: boolean; onPeriodo: (periodo: Periodo) => void; onComparar: (comparar: Comparacion) => void; onActualizar: () => void };

/** Elige el periodo que se muestra y con qué se compara. */
export function SelectorPeriodo({ periodo, comparar, actualizando, onPeriodo, onComparar, onActualizar }: Props) {
  return (
    <div className="col-span-full flex flex-wrap items-center justify-end gap-3">
      <button type="button" className="inline-flex min-h-[38px] items-center gap-2 rounded-xl border border-[#d8e3ee] bg-white px-3 text-xs font-bold text-[#335571] shadow-[0_1px_2px_#18365308] transition-colors hover:border-[#a5bacb] hover:bg-[#f5f8fa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83acd0] disabled:cursor-wait disabled:opacity-60" onClick={onActualizar} disabled={actualizando} aria-busy={actualizando}>
        <RefreshCw aria-hidden="true" size={15} className={actualizando ? "animate-spin" : undefined} />
        {actualizando ? "Actualizando…" : "Actualizar resumen"}
      </button>
      <div className="inicio-sales-view-toggle" role="group" aria-label="Periodo">
        {PERIODOS.map((opcion) => <button key={opcion.clave} type="button" className={periodo === opcion.clave ? "is-active" : ""} aria-pressed={periodo === opcion.clave} onClick={() => onPeriodo(opcion.clave)}>{opcion.nombre}</button>)}
      </div>
      <div className="inicio-sales-view-toggle" role="group" aria-label="Comparar con">
        <button type="button" className={comparar === "ANTERIOR" ? "is-active" : ""} aria-pressed={comparar === "ANTERIOR"} onClick={() => onComparar("ANTERIOR")}>Periodo anterior</button>
        <button type="button" className={comparar === "ANIO_PASADO" ? "is-active" : ""} aria-pressed={comparar === "ANIO_PASADO"} onClick={() => onComparar("ANIO_PASADO")}>Año pasado</button>
      </div>
    </div>
  );
}
