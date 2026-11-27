/**
 * Código SQLSTATE de un error de PostgreSQL. Drizzle 0.45 envuelve el error del driver
 * y deja el código en `cause.code`, por eso se revisa la cadena de causas.
 */
export function codigoErrorPostgres(error: unknown): string | null {
  for (let actual = error, profundidad = 0; actual && typeof actual === "object" && profundidad < 5; profundidad += 1) {
    const codigo = (actual as { code?: unknown }).code;
    if (typeof codigo === "string" && /^[0-9A-Z]{5}$/.test(codigo)) return codigo;
    actual = (actual as { cause?: unknown }).cause;
  }
  return null;
}

/** Violación de unicidad (23505), venga directa o envuelta por Drizzle. */
export const esViolacionUnicidad = (error: unknown) => codigoErrorPostgres(error) === "23505";
