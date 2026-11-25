/** Estilo común de los formularios de documentos (cotización y nueva venta). */
export const formularioDocumentoClases = {
  tarjeta: "flex flex-col gap-5 rounded-2xl border border-[#dbe3e9] bg-white p-6 shadow-[0_8px_24px_rgba(15,42,66,.06)] max-sm:p-4",
  resumen: "flex flex-col gap-5 rounded-2xl border border-[#dbe3e9] bg-white p-6 shadow-[0_8px_24px_rgba(15,42,66,.06)] max-sm:p-4 xl:sticky xl:top-6",
  paso: "grid h-7 w-7 flex-none place-items-center rounded-full bg-[#0b2545] text-[13px] font-bold text-white",
  titulo: "m-0 text-[17px] font-bold text-[#0b2545]",
  contador: "rounded-xl bg-[#eef2f6] px-2.5 py-[3px] text-xs font-semibold text-[#3d566e]",
  campo: "box-border h-[46px] w-full min-w-0 rounded-[10px] border border-[#c5d1db] bg-white px-3.5 text-sm text-[#142b42] outline-none focus:border-[#2878b9] focus:shadow-[0_0_0_3px_#2878b933] disabled:bg-[#f3f6f9]",
  campoLinea: "box-border h-10 w-full min-w-0 rounded-lg border border-[#c5d1db] bg-white px-2.5 text-sm text-[#142b42] outline-none focus:border-[#2878b9]",
  etiquetaCampo: "grid gap-1.5 text-xs font-semibold text-[#3d566e]",
  botonOscuro: "inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] bg-[#0b2545] px-[18px] text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60",
  botonIcono: "grid h-[46px] w-[46px] flex-none place-items-center rounded-[10px] border border-[#c5d1db] bg-white text-[#174b78] hover:bg-[#f5f9fd] disabled:cursor-not-allowed disabled:opacity-50",
  botonSecundario: "inline-flex h-[46px] items-center justify-center gap-2 rounded-[10px] border border-[#c5d1db] bg-white px-4 text-sm font-semibold text-[#27445f] transition-colors hover:bg-[#f5f9fd] disabled:cursor-not-allowed disabled:opacity-60",
  botonAgregarServicio: "inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#edbbc1] bg-[#fff4f5] px-4 text-[13px] font-bold text-[#a91b2b]",
  botonPrincipal: "inline-flex h-[50px] w-full items-center justify-center gap-2.5 rounded-xl border border-[#b91e30] bg-[linear-gradient(145deg,#d92c40,#bb1d30)] px-5 text-[15px] font-bold text-white shadow-[0_7px_20px_rgba(140,26,43,.25)] disabled:cursor-not-allowed disabled:opacity-60",
  buscador: "flex h-[46px] items-center gap-2.5 rounded-[10px] border border-[#c5d1db] bg-[#f7f9fb] px-3.5 text-[#52697d] focus-within:border-[#2878b9]",
  buscadorInput: "min-w-0 flex-1 border-0 bg-transparent text-sm text-[#142b42] outline-none",
  observaciones: "box-border w-full resize-y rounded-[10px] border border-[#c5d1db] bg-white px-3.5 py-3 text-sm leading-normal text-[#142b42] outline-none focus:border-[#2878b9]",
} as const;
