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
  principal: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-brand)] hover:border-[var(--erp-brand-muted)] hover:bg-[var(--erp-brand-soft)]",
  neutral: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-ink-muted)] hover:border-[var(--erp-border-strong)] hover:bg-[var(--erp-surface-hover)] hover:text-[var(--erp-ink)]",
  informativa: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-info)] hover:border-[var(--erp-info-border)] hover:bg-[var(--erp-info-bg)]",
  positiva: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-positive)] hover:border-[var(--erp-positive-border)] hover:bg-[var(--erp-positive-bg)]",
  advertencia: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-warning)] hover:border-[var(--erp-warning-border)] hover:bg-[var(--erp-warning-bg)]",
  peligro: "border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-danger)] hover:border-[var(--erp-danger-border)] hover:bg-[var(--erp-danger-bg)]",
};

const dimensionClases: Record<DimensionAccion, string> = {
  compacta: "h-[30px] w-[30px] flex-[0_0_30px] rounded-[var(--erp-radius-sm)] [&_svg]:h-[14px] [&_svg]:w-[14px]",
  normal: "h-[34px] w-[34px] flex-[0_0_34px] rounded-[var(--erp-radius-sm)] [&_svg]:h-4 [&_svg]:w-4",
  amplia: "h-10 w-10 flex-[0_0_40px] rounded-[var(--erp-radius-md)] [&_svg]:h-[18px] [&_svg]:w-[18px]",
};

export function clasesBotonAccion(tono: TonoAccion = "principal", dimension: DimensionAccion = "normal") {
  return `erp-icon-action inline-flex shrink-0 cursor-pointer items-center justify-center border p-0 shadow-[var(--erp-shadow-xs)] transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:scale-[.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--erp-focus)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 ${dimensionClases[dimension]} ${tonoClases[tono]}`;
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
