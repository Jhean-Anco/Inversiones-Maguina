export const catalogAdminClasses = {
  shell: "catalog-admin-shell block min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain p-0",
  transition: "block h-auto min-h-full w-full overflow-visible",
  manager:
    "m-0 box-border flex min-h-0 w-full min-w-0 flex-col px-[clamp(17px,2.2vw,32px)] pt-3 pb-4 text-[#183958] mobile-landscape:px-[14px] mobile-portrait:px-[10px]",
  search:
    "relative col-span-1 flex w-full min-w-0 max-w-none items-center",
  searchInput:
    "box-border h-[46px] w-full rounded-[10px] border border-[#dce5ef] bg-white py-0 pr-3 pl-10 text-sm text-[#193957] outline-none focus:border-[#3984c4] focus:shadow-[0_0_0_3px_#3984c41a]",
  searchIcon:
    "pointer-events-none absolute left-3 h-[17px] w-[17px] fill-none stroke-[#8194a8] stroke-[1.7]",
  statusFilter:
    "grid min-w-0 content-end gap-1.5 text-[11px] font-[750] tracking-[0.035em] text-[#5e748b] mobile-landscape:ml-auto mobile-portrait:w-full mobile-portrait:justify-between mobile-portrait:m-0 mobile-portrait:[&>select]:max-w-[180px]",
  filterLabel: "leading-[1.2]",
  filterSelect:
    "box-border h-[46px] w-full rounded-[10px] border border-[#dce5ef] bg-white px-3 pr-8 text-sm font-[650] text-[#264662] focus:border-[#3984c4] focus:outline-3 focus:outline-[#3984c41a]",
  header:
    "items-center border-b border-[#e5edf5] bg-[linear-gradient(115deg,#f8fafc_0%,#fff_58%,#f6f9fc_100%)] px-[22px] py-[18px]",
  controls:
    "grid w-full max-w-none flex-[1_1_35rem] grid-cols-[minmax(0,1fr)_190px] items-end justify-start gap-[14px]",
  brandControls: "grid-cols-[minmax(0,1fr)_180px_180px]",
  searchControl:
    "flex w-full min-w-0 max-w-none [&>label]:min-w-0 [&>label]:w-full",
  landscapeHeader: "mobile-landscape:px-4 mobile-landscape:py-[15px]",
  landscapeControls:
    "mobile-landscape:max-w-none mobile-landscape:flex-[1_1_100%] mobile-landscape:grid-cols-[minmax(0,1fr)_170px]",
  landscapeBrandControls: "mobile-landscape:grid-cols-[minmax(0,1fr)_150px_150px]",
  portraitHeader: "mobile-portrait:px-4 mobile-portrait:py-[15px]",
  portraitControls: [
    "mobile-portrait:max-w-none mobile-portrait:flex-[1_1_100%] mobile-portrait:grid-cols-[minmax(0,1fr)_minmax(120px,.7fr)]",
    "mobile-portrait:gap-[10px] mobile-portrait:overflow-x-auto mobile-portrait:flex-nowrap mobile-portrait:[scrollbar-width:none]",
    "mobile-portrait:[&::-webkit-scrollbar]:hidden",
  ].join(" "),
  portraitBrandControls: "mobile-portrait:grid-cols-[minmax(0,1fr)_minmax(120px,.7fr)]",
  portraitSearch: "mobile-portrait:col-span-full",
  portraitCategoryFilter: "mobile-portrait:col-span-full",
  grid: [
    "grid grid-cols-[repeat(auto-fill,minmax(min(100%,265px),1fr))] gap-[9px] p-3",
    "tablet-landscape:gap-2 tablet-landscape:p-2.5 tablet-portrait:gap-2 tablet-portrait:p-2.5",
    "mobile-landscape:grid-cols-[repeat(auto-fill,minmax(min(100%,245px),1fr))] mobile-landscape:gap-2 mobile-landscape:p-2.5 mobile-portrait:gap-[7px] mobile-portrait:p-2",
  ].join(" "),
  card: [
    "grid min-h-[120px] min-w-0 grid-cols-[minmax(0,1fr)_auto] grid-rows-[minmax(52px,auto)_auto]",
    "items-center gap-[6px_10px] rounded-[11px] border border-[#e1e8ef] bg-white px-3 py-[10px]",
    "transition-[border-color,box-shadow,transform] duration-[140ms] hover:-translate-y-px hover:border-[#cddce8]",
    "hover:shadow-[0_5px_15px_#193b570d]",
    "tablet-landscape:min-h-[104px] tablet-landscape:grid-rows-[minmax(44px,auto)_auto] tablet-landscape:gap-[4px_8px] tablet-landscape:px-[9px] tablet-landscape:py-2",
    "tablet-portrait:min-h-[108px] tablet-portrait:grid-rows-[minmax(46px,auto)_auto] tablet-portrait:gap-[5px_8px] tablet-portrait:p-[9px]",
    "mobile-landscape:min-h-[108px] mobile-landscape:grid-rows-[minmax(46px,auto)_auto] mobile-landscape:gap-[5px_8px] mobile-landscape:p-[9px]",
    "mobile-portrait:min-h-24 mobile-portrait:grid-rows-[minmax(42px,auto)_auto] mobile-portrait:gap-[4px_8px] mobile-portrait:p-2",
  ].join(" "),
  cardMain: "grid min-w-0 content-center gap-1",
  name: [
    "overflow-hidden text-ellipsis whitespace-nowrap text-base font-[780] text-[#1a3a57]",
    "tablet-landscape:text-sm tablet-portrait:text-sm mobile-landscape:text-sm mobile-portrait:text-[13px]",
  ].join(" "),
  usage: "flex flex-wrap gap-[5px]",
  rowActions: "col-start-2 row-start-2 flex justify-end gap-1",
  empty: "grid min-h-[220px] content-center justify-items-center gap-[9px] text-center text-[#74889d]",
  emptyHeading: "text-[13px] text-[#264662]",
  emptyIcon:
    "grid size-[46px] place-items-center rounded-[13px] border border-[#e1e9f1] bg-[#f8fafc] text-[#28648e] [&_svg]:size-[22px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]",
  emptyText: "m-0 max-w-[330px] text-[11px] leading-[1.5] text-[#8192a4]",
  backdrop:
    "fixed inset-0 z-[180] grid place-items-center overflow-auto bg-[#081a2db8] p-5 backdrop-blur-[5px]",
  dialog: "relative w-full max-w-[520px]",
  dialogSymbol:
    "grid size-[39px] shrink-0 place-items-center rounded-[11px] border border-[#d8e8f2] bg-[#edf6fb] text-[#1c618a] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.6]",
  brandSymbol: "border-[#dce2f2] bg-[#f1f3fb] text-[#4e5898]",
  confirmDialog:
    "box-border w-full max-w-[460px] rounded-2xl border border-[#dce5ee] bg-white p-6 shadow-[0_26px_78px_#071a2f45]",
  confirmIcon: "grid size-12 place-items-center rounded-[13px] [&_svg]:size-6 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]",
  confirmDisable: "bg-[#fff1f2] text-[#c83a48]",
  confirmEnable: "bg-[#eaf8f0] text-[#16845a]",
  confirmTitle: "mt-4 mb-2 text-[22px] tracking-[-0.025em] text-[#173653]",
  confirmText: "m-0 text-[15px] leading-[1.55] text-[#5d7388] [&_strong]:text-[#1b3d5a]",
  confirmActions:
    "mt-[22px] flex justify-end gap-[9px] border-t border-[#e9eef3] pt-[15px]",
  cancelButton:
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] border border-[#dfe6ed] bg-white px-[14px] text-xs font-[750] text-[#5b7187] disabled:cursor-wait disabled:opacity-[.55]",
  saveButton: [
    "inline-flex min-h-10 cursor-pointer items-center justify-center rounded-[10px] border border-[var(--action-primary-border)]",
    "bg-[var(--action-primary-surface)] px-[14px] text-xs font-[750] text-[var(--action-primary)] shadow-[0_3px_8px_#a51f3210]",
    "hover:border-[var(--action-primary-border)] hover:bg-[var(--action-primary-hover-surface)] hover:text-[var(--action-primary-hover)]",
    "disabled:cursor-wait disabled:opacity-[.55]",
  ].join(" "),
  destructiveButton:
    "border-[#e7aeb4] bg-[#fff3f4] text-[#b42335] shadow-none hover:border-[#d98b94] hover:bg-[#ffe8ea] hover:text-[#941b2a]",
  dialogError:
    "my-[13px] mx-[19px] flex items-center justify-between gap-3 rounded-[9px] border border-[#f0c3c7] border-l-4 border-l-[#db3443] bg-[#fff5f5] px-[11px] py-[9px] text-[11px] text-[#a72f3d]",
  form: "grid gap-4 px-[19px] pt-[18px] pb-5",
  formBody: "grid gap-4",
  nameField: "grid gap-[7px] text-sm font-[750] text-[#294762] [&>span]:flex [&>span]:items-center [&>span]:gap-1 [&_b]:text-[#d93443]",
  nameInput:
    "box-border h-11 w-full rounded-[9px] border border-[#dce5ed] bg-[#fbfcfe] px-3 text-sm text-[#193957] outline-none focus:border-[#3984c4] focus:bg-white focus:shadow-[0_0_0_3px_#3984c41a]",
  nameSelect: "w-full",
  formActions:
    "flex justify-end gap-2 border-t border-[#e9eef3] pt-[13px]",
  closeButton:
    "grid size-[31px] cursor-pointer place-items-center rounded-[9px] border border-[#e2e8ef] bg-white text-[#75879a] hover:border-[#efc7cb] hover:bg-[#fff5f5] hover:text-[#c43d4b] [&_svg]:size-[15px] [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.8]",
};
