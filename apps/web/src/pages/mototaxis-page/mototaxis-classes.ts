export const mototaxisClasses = {
  page:
    "mx-auto grid w-full max-w-[1500px] gap-[18px] px-0 pb-3 pt-1 text-[#102b4d] [--moto-ink:#102b4d] [--moto-muted:#71839a] [--moto-border:#e2e8f0] [--moto-surface:#fff] [--moto-soft:#f7f9fc] [--moto-primary:#15569a]",
  colorStock:
    "grid gap-4 rounded-[14px] border border-[#dbe5ed] bg-[linear-gradient(120deg,#f8fbfd,#fff_65%,#f8fbfd)] px-[21px] py-[19px] shadow-[0_4px_18px_#12304a0a] mobile-portrait:p-[15px]",
  colorStockHeading:
    "flex items-center justify-between gap-4",
  colorStockLabel:
    "text-[10px] font-extrabold tracking-[.12em] text-[#1d5d8e]",
  colorStockTitle:
    "mb-[3px] mt-[5px] text-[18px] text-[#123b60]",
  colorStockDescription:
    "m-0 text-xs text-[#708397]",
  colorStockCount:
    "grid min-h-[62px] min-w-[76px] place-content-center rounded-xl border border-[#cfe0ec] bg-[#edf5fa] text-center text-[23px] text-[#174e79] mobile-portrait:min-h-[54px] mobile-portrait:min-w-[62px] mobile-portrait:text-[19px]",
  colorStockCountLabel:
    "text-[10px] font-semibold text-[#6b8498]",
  colorStockGrid:
    "grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[9px] mobile-portrait:grid-cols-1 [&>article]:grid [&>article]:grid-cols-[minmax(0,1fr)_auto] [&>article]:gap-x-[10px] [&>article]:gap-y-1 [&>article]:rounded-[10px] [&>article]:border [&>article]:border-[#e0e8ef] [&>article]:bg-white [&>article]:px-[13px] [&>article]:py-[11px] [&>article>span]:col-span-2 [&>article>span]:text-[10px] [&>article>span]:text-[#75889a] [&>article>strong]:flex [&>article>strong]:items-center [&>article>strong]:gap-[7px] [&>article>strong]:self-center [&>article>strong]:text-xs [&>article>strong]:text-[#284a67] [&>article>b]:min-w-[34px] [&>article>b]:rounded-full [&>article>b]:bg-[#e8f2f8] [&>article>b]:px-[7px] [&>article>b]:py-1 [&>article>b]:text-center [&>article>b]:text-xs [&>article>b]:text-[#165485]",
  colorSwatch:
    "h-3 w-3 flex-[0_0_12px] rounded-full border border-[#aebdca]",
  colorStockEmpty:
    "m-0 rounded-[10px] border border-dashed border-[#cfdae3] p-[14px] text-center text-xs text-[#71839a]",
  guarantee:
    "flex items-center justify-between gap-3 border-t border-[var(--moto-border)] py-[13px] [&_strong]:block [&_small]:mt-1 [&_small]:block [&_small]:text-xs [&_small]:text-[var(--moto-muted)] [&_time]:whitespace-nowrap [&_time]:text-xs [&_time]:text-[var(--moto-muted)] [.listado-maestro-tarjetas_&]:min-h-[84px] [.listado-maestro-tarjetas_&]:rounded-xl [.listado-maestro-tarjetas_&]:border [.listado-maestro-tarjetas_&]:p-[14px_16px] [.listado-maestro-tarjetas_&]:bg-white",
  claimCard:
    "grid grid-cols-[minmax(200px,1.5fr)_auto_repeat(3,minmax(95px,.7fr))] items-center gap-[14px] rounded-[10px] border border-[var(--moto-border)] bg-white px-4 py-[14px] mobile-landscape:grid-cols-2 mobile-portrait:grid-cols-2 [&>div:not(.moto-claim-main)_small]:block [&>div:not(.moto-claim-main)_small]:text-[11px] [&>div:not(.moto-claim-main)_small]:text-[var(--moto-muted)] [&>div:not(.moto-claim-main)_strong]:mt-1 [&>div:not(.moto-claim-main)_strong]:block [&>div:not(.moto-claim-main)_strong]:text-[13px]",
  claimMain:
    "min-w-0 mobile-landscape:col-span-full mobile-portrait:col-span-full [&_strong]:block [&_small]:mt-[5px] [&_small]:block [&_small]:[overflow-wrap:anywhere] [&_small]:text-xs [&_small]:text-[var(--moto-muted)]",
  claimStatus:
    "w-max justify-self-start rounded-md bg-[#fff4df] px-2 py-[5px] text-[10px] font-extrabold uppercase text-[#98640c]",
  claimResolution:
    "col-span-full m-0 [overflow-wrap:anywhere] text-xs text-[var(--moto-muted)]",
} as const;
