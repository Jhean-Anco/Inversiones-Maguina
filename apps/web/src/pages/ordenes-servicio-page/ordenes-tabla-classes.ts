import { nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

export const ordenesListadoClasses = {
  page: "grid w-full min-w-0 box-border gap-[22px] text-[#173554]",
  header: "items-center gap-6 px-5 py-[18px] [html[data-responsive-profile='mobile-portrait']_&]:gap-[14px] [html[data-responsive-profile='mobile-portrait']_&]:p-[15px]",
  controls: "w-full max-w-none flex-[1_1_28rem] flex-row flex-wrap items-end gap-3",
  pagination: "flex w-full justify-center gap-[9px] text-[11px]",
  search: "flex h-11 w-full min-w-0 max-w-none flex-[1_1_18rem] items-center gap-[9px] rounded-[10px] border border-[#d8e3ee] bg-white px-3 text-[#7890a8] transition-[border-color,box-shadow] duration-150 focus-within:border-[#8eacc9] focus-within:shadow-[0_0_0_3px_#4b81b41c] [&_svg]:h-[17px] [&_svg]:w-[17px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8] [&_svg]:[stroke-linecap:round] [&_input]:h-full [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:text-[13px] [&_input]:text-[#173554] [&_input]:outline-none",
  empty: "grid min-h-[220px] place-content-center justify-items-center gap-[7px] p-6 text-center text-[#71869d] [&_strong]:text-[14px] [&_strong]:text-[#284865] [&_span]:text-xs",
  message: "mx-5 mt-[14px] mb-0 rounded-lg bg-[#fff1f0] px-3 py-[10px] text-xs text-[#9c3938]",
  table: "w-full min-w-0 border-collapse text-left text-[12px] leading-[1.45] text-[#52697d] [html[data-responsive-profile='mobile-landscape']_&]:min-w-[900px] [html[data-responsive-profile='mobile-portrait']_&]:min-w-[900px] [&_th]:h-11 [&_th]:border-y [&_th]:border-[#e8eef4] [&_th]:bg-[#f3f7fb] [&_th]:px-[14px] [&_th]:text-[10px] [&_th]:font-extrabold [&_th]:tracking-[.085em] [&_th]:text-[#687e96] [&_th]:uppercase [&_th]:whitespace-nowrap [&_td]:h-[68px] [&_td]:border-t [&_td]:border-[#e9eff5] [&_td]:px-[15px] [&_td]:py-[10px] [&_td]:align-middle [&_td]:text-[#52697d] [&_td]:whitespace-nowrap [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-[140ms] [&_tbody_tr:hover]:bg-[#f7faff] [&_td:first-child]:text-[#506b87] [&_td:first-child]:[font-variant-numeric:tabular-nums] [&_td:nth-child(2)]:min-w-[110px] [&_td:nth-child(2)]:font-[650] [&_td:nth-child(2)]:text-[#31577c] [&_td:nth-child(3)]:min-w-[110px] [&_td:nth-child(4)]:min-w-[110px]",
  tableScroll: "min-w-0 overflow-x-auto",
  number: "text-right [font-variant-numeric:tabular-nums]",
  total: "font-extrabold text-[#173b65]",
  documentCode: "text-[12px] tracking-[.01em] text-[#173d68]",
  clientName: `${nombreRelacionListadoClasses} max-w-[280px]`,
  minorText: "mt-[3px] text-[11px] leading-[1.35] text-[#71839a]",
  rowActions: "flex w-fit min-w-0 items-center gap-[5px] rounded-[13px] border border-[#dce6ee] bg-[linear-gradient(180deg,#ffffff_0%,#f7fafd_100%)] p-[5px] shadow-[inset_0_1px_0_#ffffff,0_3px_10px_#173b6509] [&>button]:!shadow-[0_2px_5px_#173b650b] [&>button:hover:not(:disabled)]:!-translate-y-[1px] [&>span>button]:!shadow-[0_2px_5px_#173b650b] [&>span>button:hover:not(:disabled)]:!-translate-y-[1px]",
};
