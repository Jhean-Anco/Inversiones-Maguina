/** Lógica pura del seguimiento automático de documentos pendientes en NubeFact/SUNAT (sin base de datos ni red). */

export const ESPERAS_SEGUIMIENTO_SEGUNDOS = [15, 30, 60, 120, 300, 600] as const;

/** Segundos de espera antes del siguiente intento, dado el número de intentos ya realizados. El último valor actúa de tope. */
export function esperaSiguienteIntentoSegundos(intentosRealizados: number, esperas: readonly number[] = ESPERAS_SEGUIMIENTO_SEGUNDOS) {
  if (!esperas.length) throw new Error("Define al menos una espera de seguimiento.");
  const indice = Math.min(Math.max(0, Math.trunc(intentosRealizados)), esperas.length - 1);
  return esperas[indice];
}

export function calcularProximoIntento(ahora: Date, intentosRealizados: number, esperas?: readonly number[]) {
  return new Date(ahora.getTime() + esperaSiguienteIntentoSegundos(intentosRealizados, esperas) * 1000);
}

/** Retardo del primer intento: un documento que sigue "en vuelo" (NUBEFACT_PENDIENTE) no se consulta antes de que venza el tiempo límite de su emisión. */
export function retardoInicialSegundos(enVuelo: boolean, timeoutNubefactMs: number, esperas?: readonly number[]) {
  const base = esperaSiguienteIntentoSegundos(0, esperas);
  return enVuelo ? Math.max(base, Math.ceil(timeoutNubefactMs / 1000) + 15) : base;
}

export function horizonteAgotado(creadoEn: Date, ahora: Date, horizonteHoras: number) {
  return ahora.getTime() - creadoEn.getTime() >= horizonteHoras * 3_600_000;
}

export type ResultadoSeguimiento =
  | { tipo: "RESUELTO" }
  | { tipo: "PENDIENTE"; detalle?: string | null };

export type TransicionSeguimiento = {
  estado: "ACTIVO" | "RESUELTO" | "AGOTADO";
  intentos: number;
  proximoIntento: Date | null;
  ultimoError: string | null;
  resueltoEn: Date | null;
};

/** Decide el nuevo estado de una fila de seguimiento tras un intento (resultado o fallo). */
export function transicionarSeguimiento(entrada: {
  intentos: number; creadoEn: Date; ahora: Date; horizonteHoras: number; esperas?: readonly number[];
  resultado: ResultadoSeguimiento | { tipo: "FALLO"; mensaje: string };
}): TransicionSeguimiento {
  const intentos = entrada.intentos + 1;
  if (entrada.resultado.tipo === "RESUELTO") return { estado: "RESUELTO", intentos, proximoIntento: null, ultimoError: null, resueltoEn: entrada.ahora };
  const ultimoError = (entrada.resultado.tipo === "FALLO" ? entrada.resultado.mensaje : entrada.resultado.detalle ?? null)?.slice(0, 500) ?? null;
  if (horizonteAgotado(entrada.creadoEn, entrada.ahora, entrada.horizonteHoras)) {
    return { estado: "AGOTADO", intentos, proximoIntento: null, ultimoError, resueltoEn: null };
  }
  return { estado: "ACTIVO", intentos, proximoIntento: calcularProximoIntento(entrada.ahora, intentos, entrada.esperas), ultimoError, resueltoEn: null };
}
