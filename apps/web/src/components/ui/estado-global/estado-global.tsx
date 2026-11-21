import type { ReactNode } from "react";

type EstadoGlobalProps =
  | { tipo: "cargando" }
  | { tipo: "vacio"; children?: ReactNode };

export function EstadoGlobal(props: EstadoGlobalProps) {
  return <div className="grid min-h-40 place-items-center p-6 text-center text-[var(--erp-ink-muted,#52697d)]" data-state={props.tipo} role={props.tipo === "cargando" ? "status" : undefined} aria-live="polite">
    {props.tipo === "cargando" ? "Cargando…" : props.children}
  </div>;
}
