import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type TonoAccion = "principal" | "neutral" | "informativa" | "positiva" | "advertencia" | "peligro";
export type DimensionAccion = "compacta" | "normal" | "amplia";

type PropiedadesBase = {
  etiqueta: string;
  icono: ReactNode;
  tono?: TonoAccion;
  dimension?: DimensionAccion;
  className?: string;
};

type PropiedadesBoton = PropiedadesBase & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title" | "className" | "children"> & { href?: never };
type PropiedadesEnlace = PropiedadesBase & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-label" | "title" | "className" | "children"> & { href: string };
type Propiedades = PropiedadesBoton | PropiedadesEnlace;

const tonoClases: Record<TonoAccion, string> = {
  principal: "border-[#c8d8e7] bg-[#f5f9fd] text-[#174b78] hover:border-[#8eacc9] hover:bg-[#eaf2f9]",
  neutral: "border-[#dce5ec] bg-white text-[#52697d] hover:border-[#b7c7d5] hover:bg-[#f5f8fa]",
  informativa: "border-[#c9deed] bg-[#eff7fc] text-[#17628b] hover:border-[#8bb9d4] hover:bg-[#e3f1f9]",
  positiva: "border-[#c6e2d3] bg-[#eff8f3] text-[#24734e] hover:border-[#8fc6a9] hover:bg-[#e4f3eb]",
  advertencia: "border-[#f0dbb1] bg-[#fff7e8] text-[#946000] hover:border-[#dfc17e] hover:bg-[#fff1d6]",
  peligro: "border-[#efc9cd] bg-[#fff5f5] text-[#b42335] hover:border-[#dc9ca4] hover:bg-[#ffebed]",
};

const dimensionClases: Record<DimensionAccion, string> = {
  compacta: "h-[30px] w-[30px] flex-[0_0_30px] rounded-[8px] [&_svg]:h-[14px] [&_svg]:w-[14px]",
  normal: "h-[34px] w-[34px] flex-[0_0_34px] rounded-[9px] [&_svg]:h-4 [&_svg]:w-4",
  amplia: "h-10 w-10 flex-[0_0_40px] rounded-[10px] [&_svg]:h-[18px] [&_svg]:w-[18px]",
};

export function clasesBotonAccion(tono: TonoAccion = "principal", dimension: DimensionAccion = "normal") {
  return `erp-icon-action inline-flex shrink-0 cursor-pointer items-center justify-center border p-0 shadow-[0_1px_2px_#18365308] transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#83acd0] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${dimensionClases[dimension]} ${tonoClases[tono]}`;
}

export function BotonAccion(props: Propiedades) {
  const { etiqueta, icono, tono = "principal", dimension = "normal", className = "", ...atributos } = props;
  const classNames = `${clasesBotonAccion(tono, dimension)} ${className}`;

  if ("href" in atributos && atributos.href) {
    const { href, ...propiedadesEnlace } = atributos;
    return <a {...propiedadesEnlace as AnchorHTMLAttributes<HTMLAnchorElement>} href={href} className={`${classNames} no-underline`} aria-label={etiqueta} title={etiqueta}>{icono}</a>;
  }

  const { href: _href, ...propiedadesBoton } = atributos as PropiedadesBoton;
  return <button {...propiedadesBoton} type={propiedadesBoton.type ?? "button"} className={classNames} aria-label={etiqueta} title={etiqueta}>{icono}</button>;
}

type PropiedadesEnlaceAccion = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "aria-label" | "title" | "className" | "children"> & {
  href: string;
  etiqueta: string;
  icono: ReactNode;
  tono?: TonoAccion;
  dimension?: DimensionAccion;
  className?: string;
};

export function EnlaceAccion({ href, etiqueta, icono, tono = "principal", dimension = "normal", className = "", ...props }: PropiedadesEnlaceAccion) {
  return <a {...props} href={href} className={`${clasesBotonAccion(tono, dimension)} no-underline ${className}`} aria-label={etiqueta} title={etiqueta}>{icono}</a>;
}
