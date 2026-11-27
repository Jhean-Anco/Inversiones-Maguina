import { sql } from "drizzle-orm";

/*
 * Fragmentos SQL compartidos para que cuentas, flujo y reportes midan igual el dinero de las ventas.
 */

/** Un cobro solo cuenta mientras su venta no esté anulada: al anularla el dinero sale de cuentas y flujos. */
export function cobroVigente(alias?: "pago") {
  const columna = alias ? sql.raw(`${alias}.ingreso_id`) : sql.raw("ingresos_pagos.ingreso_id");
  return sql`NOT EXISTS (SELECT 1 FROM ingresos venta_anulada WHERE venta_anulada.id = ${columna} AND venta_anulada.estado = 'ANULADO')`;
}

/**
 * Dinero que una nota mueve en su cuenta: la de débito, su importe; la de crédito, solo la parte reembolsada
 * (lo que redujo el saldo por cobrar no sale de caja). Notas anteriores sin ese dato: el importe completo.
 */
export function importeCajaNota(alias?: "nota") {
  const prefijo = alias ? `${alias}.` : "";
  return sql.raw(`COALESCE(${prefijo}importe_reembolsado, ${prefijo}total)`);
}
