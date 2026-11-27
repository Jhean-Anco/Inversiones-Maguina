import { sql } from "drizzle-orm";

/*
 * Una compra anulada conserva sus líneas como historial, pero no debe participar en costos ni promedios.
 * Los nombres de tabla van literales: Drizzle omite el prefijo de columna en consultas de una sola tabla.
 */
export const lineaRepuestoVigente = sql`exists (select 1 from entradas_stock compra_vigente where compra_vigente.id = entradas_stock_detalle.entrada_id and compra_vigente.estado = 'REGISTRADA')`;
export const lineaMototaxiVigente = sql`exists (select 1 from compras_mototaxis compra_vigente where compra_vigente.id = compras_mototaxis_detalle.compra_id and compra_vigente.estado = 'REGISTRADA')`;
