import type { KeyboardEvent, ReactNode } from "react";

export const claseCampoGuia = "grid min-w-0 content-start gap-1.5 text-[13px] font-semibold text-foreground";
export const claseControlGuia = "min-h-10 w-full min-w-0 rounded-md border border-input bg-surface px-3 py-2 text-sm font-normal text-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:opacity-60";
export const claseOpcionGuia = "flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 border-b border-border px-3 py-2.5 text-left last:border-b-0 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60";
export const claseResultadosGuia = "max-h-44 overflow-y-auto rounded-md border border-border bg-surface";

export function SeccionGuia({ titulo, icono, children }: { titulo: string; icono: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 border-0 px-0 max-md:pb-0">
      <legend className="mb-3 w-full px-0">
        <span className="flex items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[#eaf2f9] text-primary [&>svg]:size-[17px]" aria-hidden="true">{icono}</span>
          <span className="text-base font-bold tracking-[-.015em] text-foreground">{titulo}</span>
          <span aria-hidden="true" className="min-w-3 flex-1 border-t border-dashed border-input" />
        </span>
      </legend>
      {children}
    </fieldset>
  );
}

export function evitarEnvioBusqueda(evento: KeyboardEvent<HTMLInputElement>) {
  if (evento.key === "Enter") evento.preventDefault();
}
