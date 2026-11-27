export const stockDetailModalClasses = [
  "entrada-stock-detalle-panel relative z-[13001] flex max-h-[min(720px,calc(100dvh-36px))]",
  "w-[min(1024px,calc(100vw-48px))] flex-col overflow-hidden overscroll-contain",
  "rounded-3xl border border-[#d9e4ee] bg-white text-[#173752]",
  "shadow-[0_30px_90px_#0c213747] [scrollbar-gutter:stable]",
  "focus-visible:outline-[3px] focus-visible:outline-[#3784bd66] focus-visible:outline-offset-2",
  "mobile-landscape:max-h-[calc(100dvh-24px)] mobile-landscape:w-[calc(100vw-24px)] mobile-landscape:rounded-[18px]",
  "mobile-portrait:max-h-[calc(100dvh-16px)] mobile-portrait:w-[calc(100vw-16px)] mobile-portrait:rounded-[18px]",
].join(" ");

export const stockDetailHeadingClasses = [
  "relative flex min-h-[156px] shrink-0 items-center gap-5 border-b-4 border-[#e52b3b]",
  "bg-[linear-gradient(112deg,#082744_0%,#10436e_57%,#176094_100%)] p-[20px_28px_20px_152px]",
  "before:absolute before:left-7 before:top-1/2 before:h-[106px] before:w-[106px] before:-translate-y-1/2",
  "before:rounded-2xl before:bg-transparent before:content-['']",
  "mobile-landscape:min-h-28 mobile-landscape:gap-[13px] mobile-landscape:p-[14px_16px_14px_112px]",
  "mobile-landscape:before:left-[14px] mobile-landscape:before:h-[78px] mobile-landscape:before:w-[78px] mobile-landscape:before:rounded-[13px]",
  "mobile-portrait:min-h-28 mobile-portrait:gap-[13px] mobile-portrait:p-[14px_14px_14px_96px]",
  "mobile-portrait:before:left-3 mobile-portrait:before:h-[70px] mobile-portrait:before:w-[70px] mobile-portrait:before:rounded-[13px]",
].join(" ");

export const stockDetailCloseClasses = [
  "z-[1] ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl border",
  "border-[#ffffff55] bg-[#ffffff14] text-[22px] leading-none text-white",
  "hover:bg-[#ffffff24] focus-visible:outline-[3px] focus-visible:outline-[#3784bd66]",
  "focus-visible:outline-offset-2 mobile-landscape:h-[38px] mobile-landscape:w-[38px]",
  "mobile-portrait:h-[38px] mobile-portrait:w-[38px]",
].join(" ");

export const stockDetailHeadingCopyClasses = [
  "ml-[128px] min-w-0 mobile-landscape:ml-[88px] mobile-portrait:ml-[72px]",
].join(" ");
export const stockDetailKickerClasses = [
  "mb-[3px] inline-flex w-fit rounded-[4px] border-l-[3px] border-[#ef343b]",
  "bg-[#ffffff18] px-[9px] py-[5px] text-[10px] font-extrabold tracking-[0.12em] text-[#d9ebf8]",
].join(" ");

export const stockDetailTitleClasses = [
  "my-[3px] text-[clamp(25px,3vw,32px)] font-[500] tracking-[-0.04em] text-white",
  "mobile-landscape:text-[clamp(21px,5vw,27px)] mobile-landscape:[overflow-wrap:anywhere]",
  "mobile-portrait:text-[clamp(21px,5vw,27px)] mobile-portrait:[overflow-wrap:anywhere]",
].join(" ");
export const stockDetailDateClasses = "m-0 text-sm text-[#d2e2f0]";

export const stockDetailContentClasses = [
  "min-h-0 flex-1 overflow-auto overscroll-contain bg-[#f5f8fb] px-9 pb-6 pt-7",
  "mobile-landscape:p-[18px] mobile-portrait:p-[14px]",
].join(" ");

export const stockDetailSummaryClasses = [
  "mb-7 grid grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,1fr))] gap-3",
  "mobile-landscape:mb-[22px] mobile-landscape:grid-cols-2 mobile-landscape:gap-[9px]",
  "mobile-portrait:mb-[22px] mobile-portrait:grid-cols-2 mobile-portrait:gap-[9px]",
].join(" ");

export const stockDetailSummaryItemClasses = [
  "grid min-h-[120px] min-w-0 content-start gap-[9px] rounded-[15px] border border-[#e2eaf1]",
  "bg-[#fbfdff] p-4 px-[17px]",
  "mobile-landscape:min-h-24 mobile-landscape:p-3 mobile-portrait:min-h-[88px] mobile-portrait:p-[10px]",
].join(" ");
export const stockDetailSummaryLabelClasses =
  "text-xs font-bold text-[#7b8ea1] mobile-landscape:text-[11px] mobile-portrait:text-[11px]";
export const stockDetailSummaryValueClasses = [
  "overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-bold text-[#23445f]",
  "mobile-landscape:text-[13px] mobile-portrait:text-[13px]",
  "mobile-portrait:whitespace-normal",
].join(" ");
export const stockDetailSummaryNoteClasses = [
  "[overflow-wrap:anywhere] text-xs leading-[1.35] text-[#7a8da0]",
  "mobile-landscape:text-[10px] mobile-portrait:text-[10px]",
].join(" ");

export const stockDetailTotalClasses =
  "border-[#cfe2f1] bg-[#f0f7fc]";
export const stockDetailTotalValueClasses =
  "text-xl font-bold tabular-nums text-[#155283] mobile-landscape:text-[17px] mobile-portrait:text-[17px]";

export const stockDetailLinesHeadingClasses = "mb-3 flex items-end justify-between gap-3";
export const stockDetailLinesKickerClasses = "text-[10px] font-extrabold tracking-[0.12em] text-[#8194a7] mobile-landscape:text-[11px] mobile-portrait:text-[11px]";
export const stockDetailLinesTitleClasses = "mb-0 mt-[3px] text-xl font-[500] tracking-[-0.02em] text-[#193b58]";
export const stockDetailCountClasses = "whitespace-nowrap rounded-full bg-[#eef4f8] px-3 py-[7px] text-xs font-bold text-[#5b758b]";
export const stockDetailLinesClasses = "grid max-h-[min(300px,38dvh)] gap-2 overflow-auto border-0 bg-transparent [scrollbar-gutter:stable] mobile-portrait:max-h-[34dvh]";
export const stockDetailLineClasses = [
  "grid min-h-[76px] grid-cols-[minmax(0,1fr)_auto] items-center gap-[14px] rounded-[15px]",
  "border border-[#e0e9f1] bg-white px-[18px] py-[15px] shadow-[0_5px_16px_#17354b09]",
  "mobile-landscape:gap-[10px] mobile-landscape:p-3 mobile-portrait:gap-[10px] mobile-portrait:p-3",
].join(" ");
export const stockDetailProductClasses = "grid min-w-0 gap-[5px]";
export const stockDetailProductNameClasses = "overflow-hidden text-ellipsis text-sm font-bold text-[#23445f] mobile-landscape:text-[13px] mobile-portrait:text-[13px]";
export const stockDetailProductMetaClasses = "text-xs leading-[1.4] text-[#7b8ea0] mobile-landscape:text-[10px] mobile-portrait:text-[10px]";
export const stockDetailLineTotalClasses = [
  "grid justify-items-end gap-1 mobile-landscape:col-start-2 mobile-landscape:justify-items-start",
  "mobile-portrait:col-start-2 mobile-portrait:justify-items-start",
].join(" ");
export const stockDetailLineTotalValueClasses = "whitespace-nowrap text-[15px] font-bold tabular-nums text-[#194f78]";

export const stockDetailFooterClasses = [
  "sticky bottom-[-24px] z-[2] -mb-6 mt-[18px] flex items-center justify-between",
  "border-t border-[#e8eef3] bg-white px-0 pb-6 pt-[18px]",
  "mobile-landscape:bottom-[-18px] mobile-landscape:-mb-[18px] mobile-landscape:flex-col mobile-landscape:items-start mobile-landscape:gap-2 mobile-landscape:pb-[18px] mobile-landscape:pt-[14px]",
  "mobile-portrait:bottom-[-18px] mobile-portrait:-mb-[18px] mobile-portrait:flex-col mobile-portrait:items-start mobile-portrait:gap-2 mobile-portrait:pb-[18px] mobile-portrait:pt-[14px]",
].join(" ");
export const stockDetailFooterTextClasses = "text-xs text-[#71869a]";
export const stockDetailFooterTotalsClasses = "flex w-full items-center justify-between gap-[15px]";
export const stockDetailFooterLabelClasses = "text-[13px] font-bold text-[#6d8296]";
export const stockDetailFooterValueClasses = "text-xl font-bold tabular-nums text-[#174d77]";
