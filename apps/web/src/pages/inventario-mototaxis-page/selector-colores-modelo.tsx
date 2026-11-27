import { useState } from "react";
import { cn } from "../../lib/utils";
import { COLORES_ADICIONALES_MOTOTAXI, COLORES_RAPIDOS_MOTOTAXI, etiquetaColorMototaxi, hexColorMototaxi } from "../../services/mototaxis.service";

const LIMITE_COLORES = 24;
const normalizar = (color: string) => etiquetaColorMototaxi(color).toLocaleLowerCase("es-PE");
const esColorRapido = (color: string) => COLORES_RAPIDOS_MOTOTAXI.some((rapido) => rapido.toLocaleLowerCase("es-PE") === normalizar(color));

/** Paleta de colores del modelo: chips activables con un máximo de 24 tonos. */
export function SelectorColoresModelo({ seleccionados, alAlternar }: { seleccionados: string[]; alAlternar: (color: string) => void }) {
  const [mostrarMas, setMostrarMas] = useState(false);
  const adicionalesActivos = seleccionados.filter((color) => !esColorRapido(color)).length;
  const candidatos = mostrarMas
    ? [...seleccionados, ...COLORES_RAPIDOS_MOTOTAXI, ...COLORES_ADICIONALES_MOTOTAXI]
    : [...seleccionados.filter(esColorRapido), ...COLORES_RAPIDOS_MOTOTAXI];
  const paleta = candidatos.filter((color, indice, lista) => lista.findIndex((otro) => normalizar(otro) === normalizar(color)) === indice);
  const limite = seleccionados.length >= LIMITE_COLORES;

  return (
    <div className="col-span-full grid gap-3">
      <div role="group" aria-label="Colores disponibles" className="flex flex-wrap gap-2">
        {paleta.map((color) => {
          const activo = seleccionados.some((actual) => actual.toLocaleLowerCase("es-PE") === color.toLocaleLowerCase("es-PE"));
          return (
            <button
              key={color}
              type="button"
              disabled={limite && !activo}
              aria-pressed={activo}
              onClick={() => alAlternar(color)}
              className={cn(
                "inline-flex min-h-9 items-center gap-2 rounded-full border bg-[var(--erp-surface)] pl-2.5 pr-3 text-[length:var(--erp-text-sm)] font-semibold text-[var(--erp-ink-muted)] transition-[border-color,background-color,color,box-shadow] duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:shadow-[var(--erp-focus-ring)] disabled:cursor-not-allowed disabled:opacity-50",
                activo ? "border-[var(--erp-brand)] bg-[var(--erp-brand-soft)] text-[var(--erp-brand)] shadow-[inset_0_0_0_1px_var(--erp-brand)]" : "border-[var(--erp-border-strong)] hover:border-[var(--erp-brand-strong)] hover:bg-[var(--erp-surface-hover)]",
              )}
            >
              <span aria-hidden="true" className="size-4 shrink-0 rounded-full border border-black/15" style={{ backgroundColor: hexColorMototaxi(color) }} />
              {etiquetaColorMototaxi(color)}
              {activo && <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="m-0 text-[length:var(--erp-text-sm)] text-[var(--erp-ink-soft)]">
          <strong className="font-bold text-[var(--erp-ink)]">{seleccionados.length} de {LIMITE_COLORES}</strong> tonos seleccionados. Pulsa un tono para activarlo o quitarlo.
          {limite && <span className="ml-1 font-bold text-[var(--erp-warning)]">Límite alcanzado. Desactiva un tono para elegir otro.</span>}
        </p>
        <button type="button" aria-expanded={mostrarMas} onClick={() => setMostrarMas((actual) => !actual)} className="rounded-[var(--erp-radius-xs)] border-0 bg-transparent px-1 py-1 text-[length:var(--erp-text-sm)] font-bold text-[var(--erp-brand-strong)] hover:underline focus-visible:outline-none focus-visible:shadow-[var(--erp-focus-ring)]">
          {mostrarMas ? "Ver menos" : `Ver más${adicionalesActivos ? ` · ${adicionalesActivos} activos` : ""}`}
        </button>
      </div>
    </div>
  );
}
