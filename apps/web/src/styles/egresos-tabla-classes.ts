export const egresosTableScrollClasses =
  "w-full overflow-auto overscroll-x-contain rounded-xl border border-[#e3eaf2] bg-white";

export const egresosTableClasses = [
  "egresos-table w-full min-w-[880px] border-separate border-spacing-0 text-[13px] text-[#183451]",
  "[&.egresos-table_th]:sticky [&.egresos-table_th]:top-0 [&.egresos-table_th]:z-[1] [&.egresos-table_th]:whitespace-nowrap",
  "[&.egresos-table_th]:border-b [&.egresos-table_th]:border-[#e3eaf2] [&.egresos-table_th]:bg-[#f7f9fb]",
  "[&.egresos-table_th]:px-[14px] [&.egresos-table_th]:py-3 [&.egresos-table_th]:text-left",
  "[&.egresos-table_th]:text-[10px] [&.egresos-table_th]:font-[750] [&.egresos-table_th]:tracking-[0.08em]",
  "[&.egresos-table_th]:text-[#52697d] [&.egresos-table_th]:uppercase",
  "[&.egresos-table_td]:border-b [&.egresos-table_td]:border-[#edf1f5] [&.egresos-table_td]:px-[14px]",
  "[&.egresos-table_td]:py-3 [&.egresos-table_td]:align-middle [&.egresos-table_td]:text-[12px] [&.egresos-table_td]:leading-[1.45]",
  "[&.egresos-table_td]:text-[#52697d]",
  "[&.egresos-table_tbody_tr:last-child_td]:border-b-0",
  "[&.egresos-table_tbody_tr:hover]:bg-[color-mix(in_srgb,var(--erp-focus)_6%,var(--erp-surface))]",
  "[&.egresos-table.is-centered-cells_td]:text-center",
  "[&.egresos-table_td_strong]:font-[750] [&.egresos-table_td_small]:mt-1 [&.egresos-table_td_small]:block",
  "[&.egresos-table_td_small]:text-[11px] [&.egresos-table_td_small]:leading-[1.35] [&.egresos-table_td_small]:text-[#71839a]",
  "[&.egresos-table_.is-number]:text-right [&.egresos-table_.is-number]:whitespace-nowrap",
  "[&.egresos-table_.is-number]:[font-variant-numeric:tabular-nums]",
  "[&.egresos-table]:min-w-[880px] mobile-portrait:[&.egresos-table]:min-w-[840px]",
  "mobile-portrait:[&.egresos-table_th]:px-[11px] mobile-portrait:[&.egresos-table_td]:px-[11px]",
  "mobile-portrait:[&.egresos-table_th]:py-[10px] mobile-portrait:[&.egresos-table_td]:py-[10px]",
].join(" ");

export const egresosTableNumberClasses =
  "text-right whitespace-nowrap [font-variant-numeric:tabular-nums]";

export const egresosRowButtonClasses =
  "min-h-[34px] cursor-pointer whitespace-nowrap rounded-lg border border-[#cbd9e7] bg-white px-[11px] text-xs font-[750] text-[#164d7d] hover:border-[#8eacc9] hover:bg-[#f3f8fd]";

export const egresosPrimaryRowButtonClasses = [
  "inline-flex min-h-10 items-center justify-center gap-[7px] rounded-[10px] border",
  "border-[var(--action-primary-border)] bg-[var(--action-primary-surface)] px-3 font-[750] text-[var(--action-primary)]",
  "hover:border-[var(--action-primary-border)] hover:bg-[var(--action-primary-hover-surface)]",
  "hover:text-[var(--action-primary-hover)]",
].join(" ");

export const egresosRowCompleteClasses = "text-xs font-bold text-[#187451]";
