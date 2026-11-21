export const clasesTopbarResponsive = [
  "row-start-1 flex items-center justify-between laptop:h-[76px] tablet-landscape:h-[76px]",
  "laptop:gap-5 laptop:px-[clamp(18px,2vw,32px)] tablet-landscape:gap-[14px] tablet-landscape:px-[18px]",
  "tablet-landscape:grid tablet-landscape:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] laptop:grid laptop:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  "tablet-portrait:row-start-1 tablet-portrait:h-[68px] tablet-portrait:gap-3 tablet-portrait:px-4",
  "mobile-landscape:row-start-1 mobile-landscape:h-[68px] mobile-landscape:gap-2 mobile-landscape:px-3",
  "mobile-portrait:row-start-1 mobile-portrait:h-[60px] mobile-portrait:gap-[9px] mobile-portrait:px-[11px]",
].join(" ");

export const clasesMenuResponsive = [
  "erp-menu-toggle hidden tablet-portrait:grid tablet-portrait:h-9 tablet-portrait:w-9 tablet-portrait:shrink-0 tablet-portrait:place-items-center tablet-portrait:rounded-lg tablet-portrait:border tablet-portrait:border-[#e1e7ee] tablet-portrait:bg-white tablet-portrait:text-[#20456c]",
  "mobile-landscape:grid mobile-landscape:h-9 mobile-landscape:w-9 mobile-landscape:shrink-0 mobile-landscape:place-items-center mobile-landscape:rounded-lg mobile-landscape:border mobile-landscape:border-[#e1e7ee] mobile-landscape:bg-white mobile-landscape:text-[#20456c]",
  "mobile-portrait:grid mobile-portrait:h-9 mobile-portrait:w-9 mobile-portrait:shrink-0 mobile-portrait:place-items-center mobile-portrait:rounded-lg mobile-portrait:border mobile-portrait:border-[#e1e7ee] mobile-portrait:bg-white mobile-portrait:text-[#20456c]",
  "[&_.erp-icon]:h-[19px] [&_.erp-icon]:w-[19px]",
].join(" ");

export const headerClasses = {
  shellTopbar: "relative z-20 min-w-0 overflow-visible laptop:grid laptop:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tablet-landscape:grid tablet-landscape:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  topbarActions: "flex flex-[0_0_auto] items-center !gap-[15px] laptop:col-start-3 laptop:justify-self-end tablet-landscape:col-start-3 tablet-landscape:justify-self-end",
  notificationWrap: "relative",
  notificationButton: "relative grid h-10 w-10 min-w-10 place-items-center rounded-lg border border-transparent bg-transparent p-0 text-[#355b7e] transition-colors duration-150 hover:bg-[#e8f0f8] hover:text-[#173f67] aria-expanded:bg-[#e8f0f8] aria-expanded:text-[#173f67] focus-visible:outline-[3px] focus-visible:outline-[#2d75bf55] focus-visible:outline-offset-2 mobile-portrait:h-[38px] mobile-portrait:w-[38px]",
  notificationBadge: "absolute -right-[3px] -top-[3px] grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-white bg-[#c72f43] px-[4px] text-[9px] font-extrabold leading-none text-white shadow-[0_1px_4px_#17345130]",
  popover: "absolute right-0 top-[calc(100%+10px)] z-50 w-[min(400px,calc(100vw-24px))] overflow-hidden rounded-[13px] border border-[#e2e8f0] bg-white text-[#233750] shadow-[0_16px_40px_#17345124] animate-[topbar-popover-enter_.14s_ease-out_both] mobile-portrait:top-[calc(100%+7px)] motion-reduce:animate-none",
  popoverHeading: "flex items-center justify-between border-b border-[#edf1f5] px-[17px] py-[15px] [&>strong]:text-[13px] [&>span]:text-[10px] [&>span]:text-[#8a98a8]",
  emptyNotifications: "grid justify-items-center gap-[7px] px-[18px] pb-[29px] pt-[26px] text-center [&>span]:mb-[3px] [&>span]:grid [&>span]:h-10 [&>span]:w-10 [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[#f1f5f9] [&>span]:text-[#607991] [&_.erp-icon]:h-[18px] [&_.erp-icon]:w-[18px] [&>strong]:text-xs [&>small]:text-[11px] [&>small]:text-[#8592a2]",
  alertList: "max-h-[min(58vh,390px)] overflow-auto overscroll-contain [scrollbar-color:#c7d3de_transparent] [scrollbar-width:thin]",
  stockAlert: "flex w-full min-w-0 items-start gap-[11px] border-0 border-b border-[#edf1f5] bg-white px-[15px] py-[13px] text-left text-[#34495f] transition-colors duration-150 hover:bg-[#f7f9fc]",
  alertIcon: "grid h-8 w-8 flex-[0_0_32px] place-items-center rounded-[10px] bg-[#fff2f3] text-base font-[850] text-[#d6293e]",
  salesAlertIcon: "bg-[#edf5fb] text-[9px] tracking-[-.04em] text-[#1d6694]",
  alertCopy: "grid min-w-0 flex-1 gap-1 [&>strong]:line-clamp-2 [&>strong]:overflow-hidden [&>strong]:text-[11px] [&>strong]:leading-[1.35] [&>strong]:text-[#213b56] [&>small]:block [&>small]:text-[10px] [&>small]:leading-[1.4] [&>small]:text-[#7d8c9e] [&>small]:[overflow-wrap:anywhere]",
  alertTag: "mt-px flex-[0_0_auto] rounded-full bg-[#fff2f3] px-2 py-1 text-[9px] font-bold leading-[1.2] text-[#bd2739]",
  warningTag: "bg-[#fff7e7] text-[#9a6400]",
  dangerTag: "bg-[#fff0f0] text-[#bd2739]",
  notificationError: "grid gap-2.5 p-[17px] text-[11px] text-[#a43c45] [&>button]:justify-self-start [&>button]:rounded-[7px] [&>button]:border [&>button]:border-[#e5aeb4] [&>button]:bg-white [&>button]:px-2.5 [&>button]:py-1.5 [&>button]:text-[10px] [&>button]:font-bold [&>button]:text-[#9f2f3b]",
  pageTitle: [
    "relative flex min-w-0 flex-[1_1_auto] flex-col items-center justify-center gap-[7px] overflow-hidden text-center laptop:col-start-2 laptop:w-max laptop:max-w-[min(100%,58vw)] laptop:flex-none laptop:overflow-visible tablet-landscape:col-start-2 tablet-landscape:w-max tablet-landscape:max-w-[min(100%,58vw)] tablet-landscape:flex-none tablet-landscape:overflow-visible",
    "[&>strong]:max-w-full [&>strong]:overflow-hidden [&>strong]:text-[clamp(25px,2.2vw,32px)] [&>strong]:font-black [&>strong]:leading-[1.05] [&>strong]:tracking-[-.045em] [&>strong]:text-[#102d50] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap laptop:[&>strong]:text-[clamp(22px,1.75vw,29px)] laptop:[&>strong]:tracking-[-.04em] tablet-landscape:[&>strong]:text-[clamp(22px,1.75vw,29px)] tablet-landscape:[&>strong]:tracking-[-.04em]",
    "tablet-portrait:flex-row tablet-portrait:gap-[9px] mobile-landscape:flex-row mobile-landscape:gap-[9px] mobile-portrait:flex-row mobile-portrait:gap-[5px] mobile-portrait:[&>strong]:!text-[clamp(20px,5.4vw,25px)]",
  ].join(" "),
  logoutButton: [
    "inline-flex h-[42px] min-h-[42px] w-max max-w-[42px] items-center justify-start gap-0 overflow-hidden rounded-full border border-[#b91e30] bg-[linear-gradient(145deg,#d92c40,#bb1d30)] px-3 py-0 text-[13px] font-bold text-white shadow-[0_7px_20px_#8c1a2b35,inset_0_1px_0_#ffffff30] hover:max-w-[calc(100vw-36px)] hover:gap-[10px] hover:rounded-[18px] hover:pr-5 hover:shadow-[0_10px_26px_#8c1a2b40,inset_0_1px_0_#ffffff38] hover:saturate-[1.04] focus-visible:max-w-[calc(100vw-36px)] focus-visible:gap-[10px] focus-visible:rounded-[18px] focus-visible:pr-5 focus-visible:shadow-[0_10px_26px_#8c1a2b40,inset_0_1px_0_#ffffff38] focus-visible:saturate-[1.04] focus-visible:outline-[3px] focus-visible:outline-[var(--action-primary-focus)] focus-visible:outline-offset-4",
    "[&>span]:block [&>span]:max-w-0 [&>span]:overflow-hidden [&>span]:whitespace-nowrap [&>span]:opacity-0 hover:[&>span]:max-w-[min(220px,calc(100vw-100px))] hover:[&>span]:opacity-100 focus-visible:[&>span]:max-w-[min(220px,calc(100vw-100px))] focus-visible:[&>span]:opacity-100",
  ].join(" "),
  topbarUnderline: "pointer-events-none absolute -bottom-px left-0 right-0 z-[2] h-[3px] w-auto bg-[linear-gradient(90deg,#16436e_0%,#2877a5_48%,#74a5bd_100%)] tablet-portrait:h-0.5 mobile-landscape:h-0.5 mobile-portrait:h-0.5",
};
