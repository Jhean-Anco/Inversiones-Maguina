export const movimientoTableClasses = [
  "stock-movement-table min-w-[1120px] w-full table-fixed [&_th]:h-[42px] [&_th]:px-4 [&_th]:border-b [&_th]:border-[#e2eaf2]",
  "[&_th]:bg-[#f5f8fb] [&_th]:text-[#6e8298] [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:tracking-[0.075em]",
  "[&_td]:h-[60px] [&_td]:px-4 [&_td]:py-[9px] [&_td]:border-b [&_td]:border-[#e9eff5] [&_td]:text-[#52697d] [&_td]:text-[12px] [&_td]:leading-[1.45]",
  "[&_tbody_tr:hover]:bg-[#f6f9fc] [&_td:nth-child(5)]:text-[#647a91] [&_td:nth-child(6)]:text-[#647a91]",
  "[&_th:nth-child(1)]:w-[16%] [&_th:nth-child(2)]:w-[30%] [&_th:nth-child(3)]:w-[10%]",
  "[&_th:nth-child(4)]:w-[14%] [&_th:nth-child(5)]:w-[18%] [&_th:nth-child(6)]:w-[12%]",
].join(" ");

export const movimientoTableScrollClasses =
  "stock-movement-table-wrap border-t border-[#e8eef4]";

export const movimientoHeaderClasses = [
  "stock-movements-header items-center gap-6 px-[22px] py-[18px]",
  "tablet-portrait:items-start mobile-landscape:items-start mobile-portrait:items-start",
  "tablet-portrait:[&_.listado-maestro-controles]:w-full tablet-portrait:[&_.listado-maestro-controles]:flex-[1_1_auto] tablet-portrait:[&_.listado-maestro-controles]:grid-cols-[minmax(190px,.8fr)_minmax(240px,1.2fr)]",
  "mobile-landscape:[&_.listado-maestro-controles]:w-full mobile-landscape:[&_.listado-maestro-controles]:flex-[1_1_auto] mobile-landscape:[&_.listado-maestro-controles]:grid-cols-[minmax(190px,.8fr)_minmax(240px,1.2fr)]",
  "mobile-portrait:gap-3.5 mobile-portrait:p-4 mobile-portrait:[&_.listado-maestro-controles]:w-full mobile-portrait:[&_.listado-maestro-controles]:flex-[1_1_auto] mobile-portrait:[&_.listado-maestro-controles]:grid-cols-1 mobile-portrait:[&_.listado-maestro-controles]:gap-[9px]",
].join(" ");

export const movimientoControlClasses = [
  "stock-movements-controls grid w-full max-w-none flex-[1_1_30rem] grid-cols-[minmax(0,1fr)_minmax(160px,190px)] items-end gap-3",
  "[&>select]:h-11 [&>select]:w-full [&>select]:box-border [&>select]:rounded-xl [&>select]:px-[14px] [&>select]:pr-[38px] [&>select]:border-[#d8e3ee] [&>select]:bg-white [&>select]:text-[#294765] [&>select]:text-[13px] [&>select]:font-[550]",
  "[&>input]:h-11 [&>input]:w-full [&>input]:box-border [&>input]:rounded-xl [&>input]:px-[14px] [&>input]:border-[#d8e3ee] [&>input]:bg-white [&>input]:text-[13px]",
  "tablet-portrait:w-full tablet-portrait:flex-[1_1_100%] tablet-portrait:grid-cols-[minmax(0,1fr)_minmax(150px,190px)] mobile-landscape:w-full mobile-landscape:flex-[1_1_100%] mobile-landscape:grid-cols-[minmax(0,1fr)_minmax(145px,190px)]",
  "mobile-portrait:w-full mobile-portrait:flex-[1_1_100%] mobile-portrait:grid-cols-1 mobile-portrait:gap-[9px]",
].join(" ");

export const movimientoPaginacionClasses = "stock-movements-pagination flex justify-center gap-[10px] pt-0.5";

export const movimientoTableRowClasses =
  "transition-[background-color] duration-[140ms] ease-[ease] motion-reduce:transition-none";

export const movimientoFechaClasses = "tabular-nums whitespace-nowrap text-[#59718a]";

export const movimientoProductoClasses = "stock-movement-table-product grid min-w-0 gap-1";

export const movimientoCodigoClasses =
  "w-fit tabular-nums text-[10px] font-[650] tracking-[0.025em] text-[#8293a6]";

export const movimientoNombreProductoClasses =
  "block overflow-hidden text-ellipsis whitespace-nowrap text-[12px] font-bold text-[#173b5b]";

export function movimientoCantidadClasses(aumento: boolean) {
  return `whitespace-nowrap text-[12px] font-bold tabular-nums ${aumento ? "text-[#287247]" : "text-[#a44b48]"}`;
}

export const movimientoDetalleClasses =
  "overflow-hidden text-ellipsis whitespace-nowrap text-[#647a91]";
