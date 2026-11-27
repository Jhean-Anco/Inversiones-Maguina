// Contenido de los diálogos de ficha y precios del modelo, con la paleta de Órdenes de servicio.
export const dialogosModeloClasses = {
  contenido: "grid gap-4 text-[#142b42]",
  bloqueDatos: "m-0 grid grid-cols-4 gap-x-4 gap-y-3 rounded-xl border border-[#dbe3e9] bg-[#f8fafc] p-4 max-[1100px]:grid-cols-2 max-[760px]:grid-cols-1 [&>div]:min-w-0 [&_dt]:text-[11px] [&_dt]:font-bold [&_dt]:uppercase [&_dt]:tracking-[.06em] [&_dt]:text-[#6d8093] [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:break-words [&_dd]:text-[14px] [&_dd]:font-semibold [&_dd]:text-[#142b42] [&_dd]:[font-variant-numeric:tabular-nums] [&_dd+dd]:mt-0.5 [&_dd+dd]:text-[11px] [&_dd+dd]:font-normal [&_dd+dd]:text-[#6d8093]",
  bloqueTres: "!grid-cols-3 max-[760px]:!grid-cols-1",
  opcional: "ml-1 rounded-[9px] bg-[#eef2f6] px-[7px] py-px text-[10px] font-semibold text-[#52697d]",
  nota: "m-0 text-[11px] text-[#6d8093]",
  texto: "m-0 rounded-xl border border-[#dbe3e9] bg-[#f8fafc] p-4 text-[13px] leading-[1.55] text-[#3d566e]",
  vacio: "m-0 grid min-h-[110px] place-items-center rounded-xl border border-dashed border-[#c5d1db] text-[13px] text-[#52697d]",
  titulo: "m-0 text-[15px] font-bold text-[#0b2545]",
  tituloFila: "flex flex-wrap items-center justify-between gap-2",
  tablaScroll: "min-w-0 overflow-x-auto rounded-xl border border-[#dbe3e9]",
  tabla: "w-full min-w-[560px] border-collapse text-center text-[13px] text-[#3d566e] [&_th]:h-10 [&_th]:bg-[#f7f9fb] [&_th]:px-3 [&_th]:text-center [&_th]:text-[11px] [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-[.06em] [&_th]:text-[#52697d] [&_td]:h-[52px] [&_td]:border-t [&_td]:border-[#dbe3e9] [&_td]:px-3 [&_td]:[font-variant-numeric:tabular-nums] [&_tbody_tr:hover]:bg-[#f7faff]",
  formulario: "grid gap-3 rounded-xl border border-[#dbe3e9] bg-white p-4",
  campos: "m-0 grid grid-cols-3 gap-3 border-0 p-0 max-[760px]:grid-cols-1 [&_label]:grid [&_label]:min-w-0 [&_label]:content-start [&_label]:gap-1.5 [&_label]:text-[12px] [&_label]:font-bold [&_label]:text-[#3d566e] [&_input]:box-border [&_input]:h-[46px] [&_input]:w-full [&_input]:min-w-0 [&_input]:rounded-[10px] [&_input]:border [&_input]:border-[#c5d1db] [&_input]:bg-white [&_input]:px-3 [&_input]:text-[14px] [&_input]:font-normal [&_input]:text-[#142b42] [&_input]:outline-none [&_input]:transition-[border-color,box-shadow] [&_input:focus]:border-[#2878b9] [&_input:focus]:shadow-[0_0_0_3px_#2878b933] [&_small]:text-[11px] [&_small]:font-normal [&_small]:text-[#6d8093]",
  pill: "mx-auto inline-flex h-[26px] w-fit items-center gap-[7px] whitespace-nowrap rounded-[13px] border px-2.5 text-xs font-semibold",
  punto: "h-[7px] w-[7px] rounded-full",
  botonPrincipal: "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border-0 bg-[linear-gradient(180deg,#d92c40,#bb1d30)] px-4 text-[13px] font-bold text-white shadow-[0_6px_16px_#c91f3233] hover:brightness-105 disabled:cursor-wait disabled:opacity-70",
  botonSecundario: "inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[10px] border border-[#c5d1db] bg-white px-4 text-[13px] font-semibold text-[#3d566e] hover:border-[#8eacc9] hover:bg-[#f5f9fd] disabled:opacity-60",
};

// Tonos de estado (mismos colores fijos del ERP).
export const tonosPill = {
  verde: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  azul: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  gris: { caja: "border-[#dbe3e9] bg-[#f3f6f9] text-[#52697d]", punto: "bg-[#52697d]" },
} as const;
