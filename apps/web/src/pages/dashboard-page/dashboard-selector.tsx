import { PERIODOS, type Comparacion, type Periodo } from "./dashboard-periodos";

type Props = { periodo: Periodo; comparar: Comparacion; onPeriodo: (periodo: Periodo) => void; onComparar: (comparar: Comparacion) => void };

/** Elige el periodo que se muestra y con qué se compara. */
export function SelectorPeriodo({ periodo, comparar, onPeriodo, onComparar }: Props) {
  return (
    <div className="col-span-full flex flex-wrap items-center justify-end gap-3">
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
