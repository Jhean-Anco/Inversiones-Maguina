import { sql, type SQLWrapper } from "drizzle-orm";

export function normalizarTextoBusqueda(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE");
}

export function contieneSinTildes(columna: SQLWrapper, patron: string) {
  return sql`translate(lower(${columna}), 'áéíóúüñ', 'aeiouun') LIKE ${patron}`;
}
