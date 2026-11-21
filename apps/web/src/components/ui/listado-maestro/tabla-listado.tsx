import type { ReactNode } from "react";

type TablaListadoProps = {
  encabezado: ReactNode;
  filas: readonly ReactNode[];
  claseTabla?: string;
  claseContenedor?: string;
  centrarCeldas?: boolean;
};

const clases = {
  scroll: "box-border min-h-0 min-w-0 w-full flex-[1_1_auto] overflow-x-auto overflow-y-auto overscroll-contain p-0 [scrollbar-gutter:auto]",
  table: "m-0 w-full max-w-none border-collapse [&_th]:sticky [&_th]:top-0 [&_th]:z-[1] [&_th]:whitespace-nowrap [&_th]:border-b [&_th]:border-[var(--erp-border,#e5ebf2)] [&_th]:bg-[var(--erp-surface-muted,#f6f8fb)] [&_th]:px-[14px] [&_th]:py-3 [&_th]:text-left [&_th]:text-[10px] [&_th]:font-bold [&_th]:tracking-[.06em] [&_th]:text-[var(--erp-ink-muted,#71849b)] [&_th]:uppercase [&_td]:border-b [&_td]:border-[var(--erp-border,#edf1f5)] [&_td]:px-[14px] [&_td]:py-[11px] [&_td]:text-[12px] [&_td]:leading-[1.45] [&_td]:text-[#52697d] [&_td]:align-middle [&_td_small]:text-[11px] [&_td_small]:leading-[1.35] [&_td_small]:text-[#71839a] [&_tbody_tr:last-child_td]:border-b-0 [&_tbody_tr:hover]:bg-[color-mix(in_srgb,var(--erp-focus,#2878b9)_6%,var(--erp-surface,#fff))] mobile-portrait:min-w-[640px]",
};

export function TablaListado({ encabezado, filas, claseTabla = "", claseContenedor = "", centrarCeldas = true }: TablaListadoProps) {
  const egresos = /(?:^|\s)egresos-table(?:\s|$)/.test(claseTabla);

  return <div className={`listado-maestro-tabla-scroll ${clases.scroll} ${claseContenedor}`}>
    <table className={`listado-maestro-tabla w-full ${egresos ? "" : clases.table} ${centrarCeldas ? "[&_th]:!text-center [&_td]:!text-center [&_td>div]:!justify-center" : ""} ${claseTabla}`}>
      <thead>{encabezado}</thead>
      <tbody>{filas}</tbody>
    </table>
  </div>;
}
