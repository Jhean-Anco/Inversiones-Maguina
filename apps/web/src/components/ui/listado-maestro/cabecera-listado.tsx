import type { ReactNode } from "react";

type CabeceraListadoProps = {
  contenido?: ReactNode;
  controles?: ReactNode;
  claseCabecera?: string;
  claseControles?: string;
};

const clases = {
  root: "flex min-w-0 flex-wrap items-center gap-3 border-b border-[var(--erp-border,#e7edf2)] bg-[var(--erp-surface,#fff)] px-4 py-3 tablet-portrait:gap-2.5 mobile-portrait:flex-col mobile-portrait:items-stretch mobile-portrait:gap-2 mobile-portrait:p-3",
  controls: "flex w-full min-w-0 flex-[1_1_28rem] flex-wrap items-end justify-start gap-3 mobile-portrait:!flex-[0_0_auto] [&::-webkit-scrollbar]:hidden [&>label:not(.listado-maestro-busqueda-icono)]:grid [&>label]:min-w-0 [&>label]:gap-1 [&>label]:text-[11px] [&>label]:font-semibold [&>label]:text-[var(--erp-ink-muted,#718797)] [&>label:has(input[type=search])]:w-auto [&>label:has(input[type=search])]:flex-[1_1_18rem] [&>.listado-maestro-busqueda]:w-auto [&>.listado-maestro-busqueda]:flex-[1_1_18rem] [&>.listado-maestro-filtro]:w-[min(190px,100%)] [&>.listado-maestro-filtro]:flex-[0_1_11rem] [&>input[type=search]]:box-border [&>input[type=search]]:w-full [&>input[type=search]]:min-w-0 [&>input[type=search]]:flex-[1_1_18rem] [&_input]:box-border [&_input]:h-[42px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[var(--erp-radius-sm,8px)] [&_input]:border [&_input]:border-[var(--erp-border-strong,#c5d1db)] [&_input]:bg-[var(--erp-surface,#fff)] [&_input]:px-3 [&_input]:text-[13px] [&_input]:font-normal [&_input]:text-[var(--erp-ink,#233d53)] [&_select]:box-border [&_select]:h-[42px] [&_select]:w-full [&_select]:min-w-0 [&_select]:rounded-[var(--erp-radius-sm,8px)] [&_select]:border [&_select]:border-[var(--erp-border-strong,#c5d1db)] [&_select]:bg-[var(--erp-surface,#fff)] [&_select]:px-3 [&_select]:text-[13px] [&_select]:font-normal [&_select]:text-[var(--erp-ink,#233d53)] [&_input:focus-visible]:outline-2 [&_input:focus-visible]:outline-[var(--erp-focus,#2878b9)] [&_select:focus-visible]:outline-2 [&_select:focus-visible]:outline-[var(--erp-focus,#2878b9)] [&_input:focus]:border-[var(--erp-focus,#2878b9)] [&_input:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--erp-focus,#2878b9)_20%,transparent)] [&_select:focus]:border-[var(--erp-focus,#2878b9)] [&_select:focus]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--erp-focus,#2878b9)_20%,transparent)]",
  directSearch: "[&>input[type=search]]:box-border [&>input[type=search]]:w-full [&>input[type=search]]:max-w-full [&>input[type=search]]:flex-[1_1_18rem]",
};

export function CabeceraListado({ contenido, controles, claseCabecera = "", claseControles = "" }: CabeceraListadoProps) {
  return <header className={`listado-maestro-cabecera ${clases.root} ${claseCabecera}`}>
    {contenido}
    <div className={`listado-maestro-controles ${clases.controls} ${clases.directSearch} ${claseControles}`}>{controles}</div>
  </header>;
}
