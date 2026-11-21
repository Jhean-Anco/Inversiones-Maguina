import type { HTMLAttributes, ReactNode } from "react";

export type TonoEtiqueta = "neutral" | "informativa" | "positiva" | "advertencia" | "peligro" | "marca";
type PropiedadesEtiqueta = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  tono?: TonoEtiqueta;
  compacta?: boolean;
  bloque?: boolean;
};

const tonos: Record<TonoEtiqueta, string> = {
  neutral: "border-[#dbe3e9] bg-[#f1f4f6] text-[#586b7b]",
  informativa: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]",
  positiva: "border-[#c9e3d4] bg-[#edf7f1] text-[#24734e]",
  advertencia: "border-[#f0dbb1] bg-[#fff7e8] text-[#946000]",
  peligro: "border-[#efc9cd] bg-[#fff1f2] text-[#b42335]",
  marca: "border-[#c7d9ea] bg-[#edf4fa] text-[#174b78]",
};

export function Etiqueta({ children, tono = "neutral", compacta = false, bloque = false, className = "", ...props }: PropiedadesEtiqueta) {
  const claseBase = bloque
    ? "flex w-full flex-col items-start justify-start gap-2 whitespace-normal rounded-[10px] border px-3 py-[10px] text-left text-xs font-semibold leading-relaxed"
    : `inline-flex min-h-[24px] items-center justify-center whitespace-nowrap rounded-md border px-[9px] py-1 text-[10px] font-bold leading-none ${compacta ? "min-h-[21px] px-[7px] text-[9px]" : ""}`;
  const clases = `${claseBase} ${tonos[tono]} ${className}`;
  return bloque
    ? <div {...props} className={clases}>{children}</div>
    : <span {...props} className={clases}>{children}</span>;
}
