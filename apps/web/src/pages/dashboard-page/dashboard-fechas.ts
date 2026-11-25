import type { FiltroReporte } from "../../services/reportes.service";

/** Fecha local del navegador en formato AAAA-MM-DD. */
export const isoLocal = (fecha: Date) => new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function rangoMesActual(referencia: string): FiltroReporte {
  const fecha = new Date(`${referencia}T00:00:00`);
  return { desde: isoLocal(new Date(fecha.getFullYear(), fecha.getMonth(), 1)), hasta: referencia };
}

/** Desde el primer día del mes de hace 11 meses hasta la referencia. */
export function rangoUltimosDoceMeses(referencia: string): FiltroReporte {
  const inicio = new Date(`${referencia}T00:00:00`);
  inicio.setDate(1);
  inicio.setMonth(inicio.getMonth() - 11);
  return { desde: isoLocal(inicio), hasta: referencia };
}
