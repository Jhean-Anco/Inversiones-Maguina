import type { OrdenServicio } from "../../services/ingresos.service";

export type EstadoOrden = OrdenServicio["estado"];

export const etiquetasEstadoOrden: Record<EstadoOrden, string> = {
  ABIERTA: "Abierta",
  EN_PROCESO: "En proceso",
  ESPERANDO_REPUESTOS: "Esperando repuestos",
  COMPLETADA: "Completada",
  EMITIENDO: "Emitiendo",
  FACTURADA: "Facturada",
  ANULADA: "Anulada",
};

type TonoEstadoOrden = { caja: string; punto: string };

/** Cada estado tiene su propio color; el punto y el texto lo distinguen también sin depender del color. */
export const tonosEstadoOrden: Record<EstadoOrden, TonoEstadoOrden> = {
  ABIERTA: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  EN_PROCESO: { caja: "border-[#c7d9ea] bg-[#edf4fa] text-[#174b78]", punto: "bg-[#174b78]" },
  ESPERANDO_REPUESTOS: { caja: "border-[#f0dbb1] bg-[#fff7e8] text-[#8a5a00]", punto: "bg-[#d99a1b]" },
  COMPLETADA: { caja: "border-[#c9e3d4] bg-[#edf7f1] text-[#24734e]", punto: "bg-[#2e9467]" },
  EMITIENDO: { caja: "border-[#dbe3e9] bg-[#f1f4f6] text-[#586b7b]", punto: "bg-[#8497a8]" },
  FACTURADA: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  ANULADA: { caja: "border-[#efc9cd] bg-[#fff1f2] text-[#b42335]", punto: "bg-[#c91f32]" },
};
