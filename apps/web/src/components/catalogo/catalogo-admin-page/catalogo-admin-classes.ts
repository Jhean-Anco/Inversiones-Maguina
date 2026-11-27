import { ordenesListadoClasses } from "../../../pages/ordenes-servicio-page/ordenes-tabla-classes";

const campoBase = "box-border h-[46px] w-full rounded-[10px] border border-[#c5d1db] bg-white px-3.5 text-sm text-[#142b42] outline-none transition-[border-color,box-shadow] duration-150 focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933]";

export const catalogAdminClasses = {
  ...ordenesListadoClasses,
  shell: "catalog-admin-shell block min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain p-0",
  transition: "block h-auto min-h-full w-full overflow-visible",
  page: "flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 box-border text-[#142b42]",
  selectField: "relative flex h-[46px] min-w-[190px] items-center rounded-[10px] border border-[#c5d1db] bg-white text-[#52697d] transition-[border-color,box-shadow] duration-150 focus-within:border-[#2878b9] focus-within:shadow-[0_0_0_3px_#2878b933] mobile-portrait:w-full [&_select]:h-full [&_select]:w-full [&_select]:cursor-pointer [&_select]:appearance-none [&_select]:rounded-[10px] [&_select]:border-0 [&_select]:bg-transparent [&_select]:pl-3.5 [&_select]:pr-10 [&_select]:text-sm [&_select]:text-[#142b42] [&_select]:outline-none [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:right-3 [&_svg]:h-4 [&_svg]:w-4",
  name: "mx-auto block max-w-[360px] truncate text-sm font-semibold text-[#142b42]",
  usage: "mx-auto flex w-fit flex-wrap justify-center gap-[5px]",
  statusActive: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]",
  dotActive: "bg-[#1b5e40]",
  statusInactive: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]",
  dotInactive: "bg-[#52697d]",
  field: "grid gap-1.5 text-[11px] font-bold uppercase tracking-[.06em] text-[#3d566e] [&_b]:ml-0.5 [&_b]:text-[#c91f32]",
  input: campoBase,
  selectWrap: "relative flex items-center text-[#52697d] [&_svg]:pointer-events-none [&_svg]:absolute [&_svg]:right-3 [&_svg]:h-4 [&_svg]:w-4",
  select: `${campoBase} cursor-pointer appearance-none pr-10`,
  hint: "text-right text-[11px] font-normal normal-case tracking-normal text-[#6d8093]",
  dialogIcon: "grid size-11 place-items-center rounded-xl bg-[#eef4fa] text-[#0b2545] [&_svg]:size-5 [&_svg]:fill-none [&_svg]:stroke-current [&_svg]:stroke-[1.7]",
};
