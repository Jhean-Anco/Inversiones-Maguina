export const ordenServicioDetalleClasses = {
  heading:
    "flex items-center justify-between gap-3 mobile-portrait:items-start mobile-portrait:flex-col",
  headingTitle: "m-0 text-base",
  productTools: "flex flex-wrap items-center gap-[7px]",
  productCount: "px-2 text-xs text-[#657b95]",
  inlineSearch:
    "hidden mobile-landscape:grid mobile-landscape:gap-[9px] mobile-landscape:mb-[14px] mobile-portrait:grid mobile-portrait:gap-[9px] mobile-portrait:mb-[14px]",
  inlineInput:
    "flex min-h-11 items-center gap-2.5 rounded-[10px] border border-[#d2dfed] bg-white px-3 text-[#315a88] mobile-landscape:min-h-11 mobile-portrait:min-h-11",
  searchIcon: "text-xl leading-none",
  searchField:
    "h-[42px] w-full min-w-0 border-0 bg-transparent font-[inherit] text-[#153b65] outline-none placeholder:text-[#7e90a5]",
  productList:
    "grid gap-[7px] overflow-visible",
  productRow:
    "flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[10px] border border-[#dce6f1] bg-white px-[11px] py-[9px] text-left text-[#173b65]",
  productDetails: "grid min-w-0 gap-1",
  productName:
    "overflow-hidden text-ellipsis whitespace-nowrap text-[13px]",
  productMetadata: "text-[11px] text-[#71859d]",
  productPrice: "shrink-0 text-[13px]",
  lineGroup: "grid min-w-0 gap-0",
  lineGroupHeading: "flex items-center gap-2 px-1 pb-2 pt-3 text-[11px] font-extrabold text-[#315879] first:pt-1 [&_h4]:m-0 [&_h4]:text-[11px] [&_h4]:font-extrabold",
  lineGroupCount: "rounded-full border border-[#dbe6ee] bg-[#f6f9fb] px-2 py-0.5 text-[10px] font-semibold text-[#70849a]",
  lineGroupDivider: "my-[18px] border-t-[3px] border-double border-[#d7e2eb]",
  productDescription: "[.venta-page.is-data-step_.venta-lines_.venta-line_&]:font-semibold [.venta-page.is-data-step_.venta-lines_.venta-line_&]:text-left [.venta-page.is-data-step_.venta-lines_.venta-line_&]:!text-[13px]",
  catalogPrice: "cursor-default bg-[#f7f9fb] text-[#385b78] font-semibold",
} as const;
