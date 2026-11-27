import type { HTMLAttributes, ReactNode } from "react";

export type TonoEtiqueta = "neutral" | "informativa" | "positiva" | "advertencia" | "peligro" | "marca";
type PropiedadesEtiqueta = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tono?: TonoEtiqueta;
  compacta?: boolean;
  bloque?: boolean;
};

const tonos: Record<TonoEtiqueta, string> = {
  neutral: "border-[var(--erp-neutral-border)] bg-[var(--erp-neutral-bg)] text-[var(--erp-neutral)]",
  informativa: "border-[var(--erp-info-border)] bg-[var(--erp-info-bg)] text-[var(--erp-info)]",
  positiva: "border-[var(--erp-positive-border)] bg-[var(--erp-positive-bg)] text-[var(--erp-positive)]",
  advertencia: "border-[var(--erp-warning-border)] bg-[var(--erp-warning-bg)] text-[var(--erp-warning)]",
  peligro: "border-[var(--erp-danger-border)] bg-[var(--erp-danger-bg)] text-[var(--erp-danger)]",
  marca: "border-[var(--erp-brand-muted)] bg-[var(--erp-brand-soft)] text-[var(--erp-brand)]",
};

export function Etiqueta({ children, tono = "neutral", compacta = false, bloque = false, className = "", ...props }: PropiedadesEtiqueta) {
  const claseBase = bloque
    ? "flex w-full flex-col items-start justify-start gap-2 whitespace-normal rounded-[var(--erp-radius-md)] border px-3 py-[10px] text-left text-xs font-medium leading-relaxed"
    : `inline-flex min-h-[22px] items-center justify-center whitespace-nowrap rounded-full border px-[9px] py-[3px] text-[11px] font-semibold leading-none ${compacta ? "min-h-[20px] px-[7px] text-[10px]" : ""}`;
  const clases = `${claseBase} ${tonos[tono]} ${className}`;
  return bloque
    ? <div {...props} className={clases}>{children}</div>
    : <span {...props} className={clases}>{children}</span>;
}
