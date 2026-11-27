import type { EstadoVisibleCotizacion } from "./use-gestion-listado";

export type GrupoEstadoCotizacion = "ABIERTA" | "CERRADA";

/** Mismos colores que Órdenes de servicio. El usuario solo ve dos grupos: abiertas (vigentes) y cerradas (emitidas, vencidas o anuladas). */
export const grupoEstado = (estado: EstadoVisibleCotizacion): GrupoEstadoCotizacion => estado === "ACTIVA" ? "ABIERTA" : "CERRADA";

export const etiquetasEstadoCotizacion: Record<GrupoEstadoCotizacion, string> = { ABIERTA: "Abierta", CERRADA: "Cerrada" };

export const tonosEstadoCotizacion: Record<GrupoEstadoCotizacion, { caja: string; punto: string }> = {
  ABIERTA: { caja: "border-[#c8deed] bg-[#eef6fb] text-[#17628b]", punto: "bg-[#2a8bbd]" },
  CERRADA: { caja: "border-[#b3d8c4] bg-[#e4f3ec] text-[#1b5e40]", punto: "bg-[#1b5e40]" },
};
