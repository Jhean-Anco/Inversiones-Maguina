export const clasesLayoutResponsive = [
  "grid-cols-[72px_minmax(0,1fr)] grid-rows-[minmax(0,1fr)]",
  "laptop:grid-cols-[72px_minmax(0,1fr)]",
  "tablet-landscape:grid-cols-[72px_minmax(0,1fr)]",
  "tablet-portrait:grid-cols-[minmax(0,1fr)] tablet-portrait:grid-rows-[68px_minmax(0,1fr)]",
  "mobile-landscape:grid-cols-[minmax(0,1fr)] mobile-landscape:grid-rows-[56px_minmax(0,1fr)]",
  "mobile-portrait:grid-cols-[minmax(0,1fr)] mobile-portrait:grid-rows-[60px_minmax(0,1fr)]",
].join(" ");

export const clasesMainResponsive = [
  "col-start-2 row-start-1 laptop:grid-rows-[76px_minmax(0,1fr)] tablet-landscape:grid-rows-[76px_minmax(0,1fr)]",
  "tablet-portrait:col-start-1 tablet-portrait:row-[1_/_3] tablet-portrait:grid-rows-[68px_minmax(0,1fr)]",
  "mobile-landscape:col-start-1 mobile-landscape:row-[1_/_3] mobile-landscape:grid-rows-[56px_minmax(0,1fr)]",
  "mobile-portrait:col-start-1 mobile-portrait:row-[1_/_3] mobile-portrait:grid-rows-[60px_minmax(0,1fr)]",
].join(" ");

export const clasesContenidoResponsive = [
  "row-start-2",
].join(" ");

export const inicioClasses = {
  shellContent: "box-border m-2.5 min-w-0 max-w-none p-2.5",
  logoutBackdrop: "fixed inset-0 z-[3000] grid place-items-center bg-[rgba(8,24,42,.54)] p-5 backdrop-blur-[5px] animate-[erp-logout-fade-in_.16s_ease-out] mobile-portrait:items-end mobile-portrait:p-3 motion-reduce:animate-none",
  logoutDialog: "grid w-[min(100%,460px)] grid-cols-[54px_minmax(0,1fr)] items-center gap-x-4 gap-y-0 rounded-[20px] border border-[#dce5ee] bg-white p-[26px] shadow-[0_26px_80px_#071b2e40,0_4px_14px_#071b2e12] animate-[erp-logout-dialog-in_.2s_cubic-bezier(.2,.8,.2,1)] mobile-portrait:grid-cols-[46px_minmax(0,1fr)] mobile-portrait:gap-x-3 mobile-portrait:p-[21px_18px_calc(18px+env(safe-area-inset-bottom))] mobile-portrait:rounded-[20px_20px_14px_14px] motion-reduce:animate-none",
  logoutSymbol: "grid h-[52px] w-[52px] place-items-center rounded-2xl border border-[#f3cbd0] bg-[#fff3f4] text-[#ca3345] [&_.erp-icon]:h-[22px] [&_.erp-icon]:w-[22px] mobile-portrait:h-11 mobile-portrait:w-11 mobile-portrait:rounded-[13px]",
  logoutCopy: "min-w-0 [&>span]:text-[10px] [&>span]:font-extrabold [&>span]:tracking-[.15em] [&>span]:text-[#8c9bad] [&>h2]:my-[5px] [&>h2]:mb-[6px] [&>h2]:text-[22px] [&>h2]:font-extrabold [&>h2]:tracking-[-.035em] [&>h2]:text-[#153451] [&>p]:m-0 [&>p]:text-sm [&>p]:leading-[1.5] [&>p]:text-[#687f94] mobile-portrait:[&>h2]:text-xl mobile-portrait:[&>p]:text-[13px]",
  logoutFooter: "col-span-full mt-6 flex justify-end gap-[9px] border-t border-[#edf1f4] pt-4 [&>button]:inline-flex [&>button]:min-h-[42px] [&>button]:items-center [&>button]:justify-center [&>button]:gap-2 [&>button]:rounded-[10px] [&>button]:border [&>button]:border-[#d7e2ec] [&>button]:bg-white [&>button]:px-4 [&>button]:text-[13px] [&>button]:font-bold [&>button]:text-[#35536e] [&>button]:transition-[background,border-color,transform,box-shadow] [&>button]:duration-150 [&>button]:ease-[ease] [&>button]:hover:-translate-y-px [&>button]:hover:bg-[#f6f9fc] [&>button]:focus-visible:outline-[3px] [&>button]:focus-visible:outline-[#3784bd55] [&>button]:focus-visible:outline-offset-2 mobile-portrait:mt-5 mobile-portrait:gap-2 mobile-portrait:pt-[14px] mobile-portrait:[&>button]:min-h-11 mobile-portrait:[&>button]:flex-1 mobile-portrait:[&>button]:px-2.5 motion-reduce:[&>button]:transition-none [&_.erp-logout-confirm]:border-[#d82f42] [&_.erp-logout-confirm]:bg-[#df3342] [&_.erp-logout-confirm]:text-white [&_.erp-logout-confirm]:shadow-[0_5px_13px_#df334224] [&_.erp-logout-confirm]:hover:border-[#c92737] [&_.erp-logout-confirm]:hover:bg-[#c92737] [&_.erp-logout-confirm]:hover:shadow-[0_7px_17px_#df334238] [&_.erp-logout-confirm_.erp-icon]:h-4 [&_.erp-logout-confirm_.erp-icon]:w-4",
  moduleLoading: "mx-auto min-h-full w-full max-w-[1120px] px-0 pb-10 pt-1 text-[#1c2735] mobile-portrait:pt-2",
  moduleLoadingMessage: "mb-6 mt-1 flex items-center gap-2.5 text-[13px] font-bold text-[#637b96] mobile-portrait:mb-[22px]",
  moduleLoadingHeading: "mb-7 flex items-center justify-between gap-5 [&>div]:grid [&>div]:w-[min(440px,60%)] [&>div]:gap-[11px] [&>div>i:first-child]:h-[10px] [&>div>i:first-child]:w-[45%] [&>div>i:first-child]:rounded-lg [&>div>i:last-child]:h-[30px] [&>div>i:last-child]:w-[82%] [&>div>i:last-child]:rounded-lg [&>i]:h-10 [&>i]:w-[138px] [&>i]:rounded-[9px] mobile-portrait:items-start mobile-portrait:[&>i]:h-9 mobile-portrait:[&>i]:w-[94px]",
  moduleLoadingCards: "mb-5 grid grid-cols-3 gap-4 [&>i]:h-[106px] [&>i]:rounded-[14px] [&>i]:border [&>i]:border-[#e7edf3] mobile-portrait:grid-cols-1 mobile-portrait:gap-2.5 mobile-portrait:[&>i]:h-[76px]",
  moduleLoadingPanel: "grid grid-cols-1 gap-0 overflow-hidden rounded-[14px] border border-[#e7edf3] bg-white [&>i]:h-12 [&>i]:border-b [&>i]:border-[#edf1f5] [&>i:first-child]:h-14 [&>i:first-child]:bg-[#f8fafc]",
  loadingShimmer: "block animate-[catalog-loading-shimmer_1.4s_ease-in-out_infinite] bg-[linear-gradient(100deg,#edf2f7_25%,#f7f9fc_40%,#edf2f7_60%)] [background-size:220%_100%]",
};
