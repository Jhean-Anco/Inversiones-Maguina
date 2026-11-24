import { BadRequestException } from "@nestjs/common";

export const INDICADORES_META = ["VENTAS_MES", "COBRANZA", "MARGEN"] as const;
export type IndicadorMeta = typeof INDICADORES_META[number];
export type OrigenMeta = "MES" | "PREDETERMINADA";
export type MetaResuelta = { valor: number; origen: OrigenMeta } | null;

const PATRON_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAXIMO_VENTAS_MES = 1_000_000_000;

export function validarPeriodoMeta(periodo: unknown): string {
  if (typeof periodo !== "string" || !PATRON_PERIODO.test(periodo)) throw new BadRequestException("El periodo de la meta debe tener el formato AAAA-MM.");
  return periodo;
}

/** Valida una meta a guardar. `valor: null` significa quitar la meta; `periodo: null`, que es la predeterminada de todos los meses. */
export function validarGuardarMeta(entrada: unknown): { indicador: IndicadorMeta; periodo: string | null; valor: number | null } {
  if (typeof entrada !== "object" || entrada === null || Array.isArray(entrada)) throw new BadRequestException("Los datos de la meta no son válidos.");
  const datos = entrada as Record<string, unknown>;
  const indicador = (INDICADORES_META as readonly unknown[]).includes(datos.indicador) ? (datos.indicador as IndicadorMeta) : null;
  if (!indicador) throw new BadRequestException("Selecciona un indicador de meta válido.");
  const periodo = datos.periodo === null || datos.periodo === undefined ? null : validarPeriodoMeta(datos.periodo);
  if (datos.valor === null || datos.valor === undefined) return { indicador, periodo, valor: null };
  if (typeof datos.valor !== "number" || !Number.isFinite(datos.valor) || datos.valor <= 0) throw new BadRequestException("La meta debe ser un número mayor que cero.");
  const maximo = indicador === "VENTAS_MES" ? MAXIMO_VENTAS_MES : 100;
  if (datos.valor > maximo) throw new BadRequestException(indicador === "VENTAS_MES" ? "La meta de ingresos es demasiado alta." : "La meta en porcentaje no puede superar 100.");
  return { indicador, periodo, valor: Math.round(datos.valor * 100) / 100 };
}

/** Para cada indicador, la meta del mes si existe y, si no, la predeterminada; null si no hay ninguna. */
export function resolverMetas(filas: ReadonlyArray<{ indicador: string; periodo: string | null; valor: string }>, periodo: string): Record<IndicadorMeta, MetaResuelta> {
  const resultado = { VENTAS_MES: null, COBRANZA: null, MARGEN: null } as Record<IndicadorMeta, MetaResuelta>;
  for (const indicador of INDICADORES_META) {
    const delMes = filas.find((fila) => fila.indicador === indicador && fila.periodo === periodo);
    const general = filas.find((fila) => fila.indicador === indicador && fila.periodo === null);
    if (delMes) resultado[indicador] = { valor: Number(delMes.valor), origen: "MES" };
    else if (general) resultado[indicador] = { valor: Number(general.valor), origen: "PREDETERMINADA" };
  }
  return resultado;
}
