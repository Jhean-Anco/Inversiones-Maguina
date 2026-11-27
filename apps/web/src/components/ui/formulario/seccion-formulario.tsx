import { useId, type ReactNode } from "react";
import { cn } from "../../../lib/utils";

type Props = {
  titulo: string;
  descripcion?: string;
  /** Número de columnas de la rejilla en pantallas anchas. En móvil siempre es una. */
  columnas?: 1 | 2 | 3;
  children: ReactNode;
};

const columnasClase = { 1: "", 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3" } as const;

/** Bloque de un formulario con título, descripción breve y rejilla responsive de campos. */
export function SeccionFormulario({ titulo, descripcion, columnas = 2, children }: Props) {
  const idTitulo = useId();
  return (
    <section aria-labelledby={idTitulo} className="min-w-0 rounded-[var(--erp-radius-lg)] border border-[var(--erp-border)] bg-[var(--erp-surface-muted)] p-5 max-sm:p-4">
      <header className="mb-4 border-b border-[var(--erp-border-subtle)] pb-3">
        <h3 id={idTitulo} className="m-0 text-[length:var(--erp-text-md)] font-bold tracking-[var(--erp-tracking-tight)] text-[var(--erp-ink)]">{titulo}</h3>
        {descripcion && <p className="m-0 mt-0.5 text-[length:var(--erp-text-sm)] text-[var(--erp-ink-soft)]">{descripcion}</p>}
      </header>
      <div className={cn("grid grid-cols-1 gap-x-4 gap-y-4", columnasClase[columnas])}>{children}</div>
    </section>
  );
}
