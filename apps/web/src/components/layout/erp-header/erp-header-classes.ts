export const clasesTopbarResponsive = [
  "row-start-1 flex items-center justify-between laptop:h-16 tablet-landscape:h-16",
  "laptop:gap-5 laptop:px-[clamp(18px,2vw,32px)] tablet-landscape:gap-[14px] tablet-landscape:px-[18px]",
  "tablet-landscape:grid tablet-landscape:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] laptop:grid laptop:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  "tablet-portrait:row-start-1 tablet-portrait:h-16 tablet-portrait:gap-3 tablet-portrait:px-4",
  "mobile-landscape:row-start-1 mobile-landscape:h-14 mobile-landscape:gap-2 mobile-landscape:px-3",
  "mobile-portrait:row-start-1 mobile-portrait:h-14 mobile-portrait:gap-[9px] mobile-portrait:px-[11px]",
].join(" ");

export const clasesMenuResponsive = [
  "erp-menu-toggle hidden tablet-portrait:grid tablet-portrait:h-9 tablet-portrait:w-9 tablet-portrait:shrink-0 tablet-portrait:place-items-center tablet-portrait:rounded-[var(--erp-radius-sm)] tablet-portrait:border tablet-portrait:border-[var(--erp-border)] tablet-portrait:bg-[var(--erp-surface)] tablet-portrait:text-[var(--erp-brand)] tablet-portrait:shadow-[var(--erp-shadow-xs)]",
  "mobile-landscape:grid mobile-landscape:h-9 mobile-landscape:w-9 mobile-landscape:shrink-0 mobile-landscape:place-items-center mobile-landscape:rounded-[var(--erp-radius-sm)] mobile-landscape:border mobile-landscape:border-[var(--erp-border)] mobile-landscape:bg-[var(--erp-surface)] mobile-landscape:text-[var(--erp-brand)] mobile-landscape:shadow-[var(--erp-shadow-xs)]",
  "mobile-portrait:grid mobile-portrait:h-9 mobile-portrait:w-9 mobile-portrait:shrink-0 mobile-portrait:place-items-center mobile-portrait:rounded-[var(--erp-radius-sm)] mobile-portrait:border mobile-portrait:border-[var(--erp-border)] mobile-portrait:bg-[var(--erp-surface)] mobile-portrait:text-[var(--erp-brand)] mobile-portrait:shadow-[var(--erp-shadow-xs)]",
  "[&_.erp-icon]:h-[19px] [&_.erp-icon]:w-[19px]",
].join(" ");

export const headerClasses = {
  shellTopbar: "relative z-20 min-w-0 overflow-visible laptop:grid laptop:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] tablet-landscape:grid tablet-landscape:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  topbarActions: "flex flex-[0_0_auto] items-center !gap-[15px] laptop:col-start-3 laptop:justify-self-end tablet-landscape:col-start-3 tablet-landscape:justify-self-end",
  notificationWrap: "relative",
  notificationButton: "relative grid h-10 w-10 min-w-10 place-items-center rounded-[var(--erp-radius-md)] border border-transparent bg-transparent p-0 text-[var(--erp-ink-muted)] transition-colors duration-150 hover:border-[var(--erp-border)] hover:bg-[var(--erp-surface)] hover:text-[var(--erp-brand)] aria-expanded:border-[var(--erp-border)] aria-expanded:bg-[var(--erp-surface)] aria-expanded:text-[var(--erp-brand)] focus-visible:outline-[3px] focus-visible:outline-[#2d75bf55] focus-visible:outline-offset-2 mobile-portrait:h-[38px] mobile-portrait:w-[38px]",
  notificationBadge: "absolute -right-[3px] -top-[3px] grid h-[19px] min-w-[19px] place-items-center rounded-full border-2 border-white bg-[var(--erp-accent)] px-[4px] text-[9px] font-bold leading-none text-white tabular-nums shadow-[var(--erp-shadow-xs)]",
  popover: "absolute right-0 top-[calc(100%+10px)] z-50 max-h-[min(78vh,calc(100dvh-90px))] w-[min(400px,calc(100vw-24px))] overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-color:#c7d3de_transparent] [scrollbar-width:thin] rounded-[var(--erp-radius-lg)] border border-[var(--erp-border)] bg-[var(--erp-surface)] text-[var(--erp-ink)] shadow-[var(--erp-shadow-md)] animate-[topbar-popover-enter_.14s_ease-out_both] mobile-portrait:top-[calc(100%+7px)] motion-reduce:animate-none",
  popoverHeading: "flex items-center justify-between border-b border-[var(--erp-border-subtle)] px-4 py-3.5 [&>strong]:text-[13px] [&>strong]:font-semibold [&>span]:text-[11px] [&>span]:text-[var(--erp-ink-soft)]",
  emptyNotifications: "grid justify-items-center gap-[7px] px-[18px] pb-[29px] pt-[26px] text-center [&>span]:mb-[3px] [&>span]:grid [&>span]:h-10 [&>span]:w-10 [&>span]:place-items-center [&>span]:rounded-full [&>span]:bg-[#f1f5f9] [&>span]:text-[#607991] [&_.erp-icon]:h-[18px] [&_.erp-icon]:w-[18px] [&>strong]:text-xs [&>small]:text-[11px] [&>small]:text-[#8592a2]",
  alertList: "grid",
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
    "[&>strong]:max-w-full [&>strong]:overflow-hidden [&>strong]:text-[clamp(19px,1.6vw,23px)] [&>strong]:font-bold [&>strong]:leading-[1.2] [&>strong]:tracking-[var(--erp-tracking-heading)] [&>strong]:text-[var(--erp-ink)] [&>strong]:text-ellipsis [&>strong]:whitespace-nowrap laptop:[&>strong]:text-[clamp(19px,1.5vw,22px)] tablet-landscape:[&>strong]:text-[clamp(19px,1.5vw,22px)]",
    "tablet-portrait:flex-row tablet-portrait:gap-[9px] mobile-landscape:flex-row mobile-landscape:gap-[9px] mobile-portrait:flex-row mobile-portrait:gap-[5px] mobile-portrait:[&>strong]:!text-[clamp(17px,4.6vw,19px)]",
  ].join(" "),
  logoutButton: [
    "inline-flex h-10 min-h-10 w-max max-w-10 items-center justify-start gap-0 overflow-hidden rounded-full border border-[#b41d2e] bg-[linear-gradient(160deg,#d42a3e,#b91c2f)] px-[11px] py-0 text-[13px] font-semibold text-white shadow-[0_1px_2px_#8c1a2b33,0_4px_12px_-2px_#8c1a2b40,inset_0_1px_0_#ffffff30] hover:max-w-[calc(100vw-36px)] hover:gap-[10px] hover:rounded-[18px] hover:pr-5 hover:shadow-[0_10px_26px_#8c1a2b40,inset_0_1px_0_#ffffff38] hover:saturate-[1.04] focus-visible:max-w-[calc(100vw-36px)] focus-visible:gap-[10px] focus-visible:rounded-[18px] focus-visible:pr-5 focus-visible:shadow-[0_10px_26px_#8c1a2b40,inset_0_1px_0_#ffffff38] focus-visible:saturate-[1.04] focus-visible:outline-[3px] focus-visible:outline-[var(--action-primary-focus)] focus-visible:outline-offset-4",
    "[&>span]:block [&>span]:max-w-0 [&>span]:overflow-hidden [&>span]:whitespace-nowrap [&>span]:opacity-0 hover:[&>span]:max-w-[min(220px,calc(100vw-100px))] hover:[&>span]:opacity-100 focus-visible:[&>span]:max-w-[min(220px,calc(100vw-100px))] focus-visible:[&>span]:opacity-100",
  ].join(" "),
  topbarUnderline: "pointer-events-none absolute -bottom-px left-0 right-0 z-[2] h-px w-auto bg-[var(--erp-border)]",
};
