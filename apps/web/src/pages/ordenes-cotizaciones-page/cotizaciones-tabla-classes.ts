import { nombreRelacionListadoClasses } from "../../components/ui/listado-maestro/nombre-relacion-clases";

/** Clases del listado de cotizaciones; mismos tokens visuales que Órdenes de servicio. */
export const cotizacionesListadoClasses = {
  page: "flex min-h-0 w-full min-w-0 flex-[1_1_auto] flex-col box-border gap-5 text-[#142b42] [&>.listado-maestro]:flex-1",
  toolbar: "flex flex-wrap items-center gap-x-4 gap-y-3",
  header: "!hidden",
  search: "flex h-[46px] w-[min(100%,400px)] min-w-0 items-center gap-2.5 rounded-xl border border-[#c5d1db] bg-white px-3.5 text-[#52697d] transition-[border-color,box-shadow] duration-150 focus-within:border-[#2878b9] focus-within:shadow-[0_0_0_3px_#2878b933] mobile-portrait:w-full [&_svg]:h-[18px] [&_svg]:w-[18px] [&_svg]:shrink-0 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-2 [&_svg]:[stroke-linecap:round] [&_input]:h-full [&_input]:w-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-sm [&_input]:text-[#142b42] [&_input]:outline-none [&_input]:shadow-none",
  dateField: "flex h-[46px] min-w-0 items-center gap-2 rounded-[10px] border border-[#c5d1db] bg-white px-3 text-[11px] font-semibold text-[#52697d] transition-[border-color,box-shadow] duration-150 focus-within:border-[#2878b9] focus-within:shadow-[0_0_0_3px_#2878b933] mobile-portrait:w-full [&_input]:h-full [&_input]:min-w-0 [&_input]:border-0 [&_input]:bg-transparent [&_input]:p-0 [&_input]:text-sm [&_input]:text-[#142b42] [&_input]:outline-none",
  filters: "flex flex-wrap gap-2",
  chip: "inline-flex h-[38px] cursor-pointer items-center gap-2 rounded-[19px] border border-[#c5d1db] bg-white px-3.5 text-[13px] font-semibold text-[#27445f] transition-colors duration-150 hover:border-[#8eacc9] hover:bg-[#f5f9fd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878b9] aria-pressed:border-[#0b2545] aria-pressed:bg-[#0b2545] aria-pressed:text-white",
  chipCount: "inline-flex h-5 min-w-[22px] items-center justify-center rounded-[10px] bg-[#eef2f6] px-1.5 text-[11px] font-bold text-[#3d566e] [button[aria-pressed=true]_&]:bg-white/20 [button[aria-pressed=true]_&]:text-white",
  empty: "grid min-h-[220px] place-content-center justify-items-center gap-[7px] p-6 text-center text-[#52697d] [&_strong]:text-[14px] [&_strong]:text-[#284865] [&_span]:text-xs",
  table: "w-full min-w-0 border-collapse text-center text-[13px] leading-[1.45] text-[#3d566e] [html[data-responsive-profile='mobile-landscape']_&]:min-w-[900px] [&_th]:h-[46px] [&_th]:border-b [&_th]:border-[#dbe3e9] [&_th]:bg-[#f7f9fb] [&_th]:px-3 [&_th]:!text-center [&_th]:text-[11px] [&_th]:font-bold [&_th]:tracking-[.06em] [&_th]:text-[#52697d] [&_th]:uppercase [&_th]:whitespace-nowrap [&_th:first-child]:pl-5 [&_th:last-child]:pr-5 [&_td]:h-[68px] [&_td]:border-t [&_td]:border-[#edf1f5] [&_td]:px-3 [&_td]:py-2.5 [&_td]:align-middle [&_td]:!text-center [&_td:first-child]:pl-5 [&_td:last-child]:pr-5 [&_tbody_tr]:transition-colors [&_tbody_tr]:duration-[140ms] [&_tbody_tr:hover]:bg-[#f7faff]",
  tableScroll: "min-w-0 overflow-x-auto",
  number: "[font-variant-numeric:tabular-nums]",
  total: "text-sm font-extrabold text-[#0b2545]",
  documentCode: "text-[13px] tracking-[.01em] text-[#0b2545]",
  clientName: `${nombreRelacionListadoClasses} mx-auto max-w-[280px] !text-[13px] !font-semibold !text-[#142b42]`,
  minorText: "mt-[3px] text-[11px] leading-[1.35] text-[#5b7083]",
  pending: "mt-[3px] text-[11px] font-semibold leading-[1.35] text-[#9a5b00]",
  status: "mx-auto inline-flex h-[26px] w-fit items-center gap-[7px] whitespace-nowrap rounded-[13px] border px-2.5 text-xs font-semibold",
  rowActions: "mx-auto flex w-fit min-w-0 items-center justify-center gap-0.5 rounded-xl border border-[#dbe3e9] bg-white p-1 [&_.erp-icon-action]:box-border [&_.erp-icon-action]:!h-9 [&_.erp-icon-action]:!min-h-9 [&_.erp-icon-action]:!w-9 [&_.erp-icon-action]:!min-w-9 [&_.erp-icon-action]:!flex-[0_0_36px] [&_.erp-icon-action]:!p-0 [&_.erp-icon-action]:opacity-[.78] [&_.erp-icon-action]:transition-[opacity,transform,background-color] [&_.erp-icon-action]:duration-[var(--erp-button-state-duration)] [&_.erp-icon-action]:ease-[var(--erp-button-state-easing)] [&_.erp-icon-action:hover]:opacity-100 [&_.erp-icon-action:hover]:-translate-y-px [&_.erp-icon-action:focus-visible]:opacity-100 [&_.erp-icon-action:focus-visible]:-translate-y-px [&_.erp-icon-action_svg]:!h-4 [&_.erp-icon-action_svg]:!w-4 [&_.erp-icon-action_svg]:!flex-[0_0_16px] [&_.erp-icon-action_.orden-whatsapp-icon]:!h-[19px] [&_.erp-icon-action_.orden-whatsapp-icon]:!w-[19px] [&_.erp-icon-action_.orden-whatsapp-icon]:!flex-[0_0_19px]",
};
