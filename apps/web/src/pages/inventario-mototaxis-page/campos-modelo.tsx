import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

// Piezas de formulario con la paleta de Órdenes de servicio (inputs de 46px, foco azul, tarjetas numeradas).
export const claseControl = "box-border h-[46px] w-full min-w-0 rounded-[10px] border border-[#c5d1db] bg-white px-3 text-[14px] text-[#142b42] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#8a9aab] focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933] disabled:cursor-not-allowed disabled:bg-[#f3f6f9] aria-[invalid=true]:border-[#c91f32]";
const claseArea = "box-border min-h-[96px] w-full resize-y rounded-[10px] border border-[#c5d1db] bg-white p-3 text-[14px] leading-[1.5] text-[#142b42] outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-[#8a9aab] focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933] disabled:cursor-not-allowed disabled:bg-[#f3f6f9] aria-[invalid=true]:border-[#c91f32]";

export const clasesBoton = {
  principal: "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border-0 bg-[linear-gradient(180deg,#d92c40,#bb1d30)] px-5 text-[14px] font-bold text-white shadow-[0_6px_16px_#c91f3233] hover:brightness-105 disabled:cursor-wait disabled:opacity-70 max-sm:w-full",
  secundario: "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border border-[#c5d1db] bg-white px-5 text-[14px] font-semibold text-[#3d566e] hover:border-[#8eacc9] hover:bg-[#f5f9fd] disabled:opacity-60 max-sm:w-full",
};

export const Opcional = () => <span className="ml-1 rounded-[9px] bg-[#eef2f6] px-[7px] py-px text-[10px] font-semibold text-[#52697d]">Opcional</span>;

/** Tarjeta numerada (equivale a `os-tarjeta` + `os-paso`). */
export function TarjetaFormulario({ paso, titulo, descripcion, columnas = 3, children }: { paso: number; titulo: string; descripcion?: string; columnas?: 1 | 2 | 3 | 4; children: ReactNode }) {
  const rejilla = { 1: "grid-cols-1", 2: "grid-cols-2 max-[760px]:grid-cols-1", 3: "grid-cols-3 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-1", 4: "grid-cols-4 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-1" }[columnas];
  return (
    <section className="grid gap-4 rounded-2xl border border-[#dbe3e9] bg-white p-5 max-sm:p-4">
      <header className="flex items-start gap-3">
        <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full bg-[#0b2545] text-[13px] font-bold text-white">{paso}</span>
        <div className="grid gap-0.5"><h3 className="m-0 text-[15px] font-bold text-[#0b2545]">{titulo}</h3>{descripcion && <p className="m-0 text-[11px] text-[#6d8093]">{descripcion}</p>}</div>
      </header>
      <div className={cn("grid gap-x-4 gap-y-3.5", rejilla)}>{children}</div>
    </section>
  );
}

type PropsControl = { id: string; className: string; "aria-describedby"?: string; "aria-invalid"?: true };

/** Rótulo + control + error/ayuda. `requerido` agrega `*`; `opcional` agrega la píldora gris. */
export function Campo({ id, etiqueta, requerido, opcional, ayuda, error, unidad, completo, tipo = "input", children }: {
  id: string; etiqueta: ReactNode; requerido?: boolean; opcional?: boolean; ayuda?: ReactNode; error?: string; unidad?: string; completo?: boolean;
  tipo?: "input" | "select" | "area";
  children: (control: PropsControl) => ReactNode;
}) {
  const describedBy = [error ? `${id}-error` : null, ayuda ? `${id}-ayuda` : null].filter(Boolean).join(" ") || undefined;
  const clase = tipo === "area" ? claseArea : cn(claseControl, tipo === "select" && "cursor-pointer appearance-none pr-9", unidad && "pr-12");
  const control = children({ id, className: clase, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined });
  return (
    <div className={cn("grid min-w-0 content-start gap-1.5", completo && "col-span-full")}>
      <label htmlFor={id} className="text-[12px] font-bold text-[#3d566e]">{etiqueta}{requerido && <span className="ml-0.5 text-[#c91f32]">*</span>}{opcional && <Opcional />}</label>
      {tipo === "select" || unidad ? (
        <div className="relative">
          {control}
          {tipo === "select" && <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-[#52697d]" />}
          {unidad && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-[#52697d]">{unidad}</span>}
        </div>
      ) : control}
      {error && <p id={`${id}-error`} className="m-0 text-[11px] font-semibold text-[#c91f32]">{error}</p>}
      {ayuda && <p id={`${id}-ayuda`} className="m-0 text-[11px] leading-snug text-[#6d8093]">{ayuda}</p>}
    </div>
  );
}

/** Contador `n/max` para textos largos. */
export const Contador = ({ valor, maximo }: { valor: string; maximo: number }) => <span className="justify-self-end text-[11px] tabular-nums text-[#6d8093]">{valor.length}/{maximo}</span>;
