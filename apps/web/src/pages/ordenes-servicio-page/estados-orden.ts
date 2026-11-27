import type { OrdenServicio } from "../../services/ingresos.service";

export type EstadoOrden = OrdenServicio["estado"];

export const etiquetasEstadoOrden: Record<EstadoOrden, string> = {
  ABIERTA: "Abierta",
  EN_PROCESO: "Abierta",
  ESPERANDO_REPUESTOS: "Abierta",
  COMPLETADA: "Abierta",
  EMITIENDO: "Cerrada",
  FACTURADA: "Cerrada",
  ANULADA: "Anulada",
};

type TonoEstadoOrden = { caja: string; punto: string };

/** Para el usuario solo hay dos estados: Abierta (en curso) y Cerrada (con boleta o factura emitida). */
export const tonosEstadoOrden: Record<EstadoOrden, TonoEstadoOrden> = {
  ABIERTA: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  EN_PROCESO: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  ESPERANDO_REPUESTOS: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  COMPLETADA: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  EMITIENDO: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  FACTURADA: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
  ANULADA: { caja: "border-[#efc9cd] bg-[#fff1f2] text-[#b42335]", punto: "bg-[#c91f32]" },
};
