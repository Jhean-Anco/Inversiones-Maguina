import { sql } from "drizzle-orm";
import { db } from "@magina/database";
import type { RangoFechas } from "./flujo-ingresos.consultas";

/**
 * Lo vendido en el rango (boleta, factura y nota de venta no anuladas, con IGV) y la parte que ya se cobró hasta hoy.
 * Cada venta aporta como máximo su propio total, aunque tenga más cobros registrados.
 */
export async function consultarCobranza(rango: RangoFechas) {
  const [fila] = await db.execute(sql`
    SELECT COALESCE(SUM(i.total), 0)::numeric(16,2)::text AS facturado,
      COALESCE(SUM(LEAST(i.total, COALESCE(p.cobrado, 0))), 0)::numeric(16,2)::text AS cobrado
    FROM ingresos i
    LEFT JOIN (SELECT ingreso_id, SUM(importe_aplicado) AS cobrado FROM ingresos_pagos GROUP BY ingreso_id) p ON p.ingreso_id = i.id
    WHERE i.fecha >= ${rango.desde}::date AND i.fecha <= ${rango.hasta}::date
      AND i.tipo_comprobante IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')
      AND i.estado <> 'ANULADO'
      AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
  `) as unknown as Array<{ facturado: string; cobrado: string }>;
  return { rango, facturado: fila?.facturado ?? "0.00", cobrado: fila?.cobrado ?? "0.00" };
}
