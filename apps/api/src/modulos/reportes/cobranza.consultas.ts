import { sql } from "drizzle-orm";
import { db } from "@magina/database";
import type { RangoFechas } from "./flujo-ingresos.consultas";
import { notaVigenteSql } from "./ajustes-notas.consultas";

/**
 * Lo vendido en el rango (boleta, factura y nota de venta no anuladas, con IGV y neto de sus notas vigentes) y la parte
 * que ya se cobró hasta hoy: cobros menos reembolsos de notas de crédito, más las notas de débito (se cobran al emitirse).
 * Cada venta aporta como máximo su propio importe neto, aunque tenga más cobros registrados.
 */
export async function consultarCobranza(rango: RangoFechas) {
  const [fila] = await db.execute(sql`
    SELECT COALESCE(SUM(i.total + COALESCE(n.debito, 0) - COALESCE(n.credito, 0)), 0)::numeric(16,2)::text AS facturado,
      COALESCE(SUM(GREATEST(0, LEAST(i.total + COALESCE(n.debito, 0) - COALESCE(n.credito, 0),
        COALESCE(p.cobrado, 0) + COALESCE(n.debito, 0) - COALESCE(n.reembolsado, 0)))), 0)::numeric(16,2)::text AS cobrado
    FROM ingresos i
    LEFT JOIN (SELECT nota.ingreso_origen_id AS ingreso_id,
        SUM(nota.total) FILTER (WHERE nota.tipo_comprobante = 'NOTA_CREDITO') AS credito,
        SUM(nota.total) FILTER (WHERE nota.tipo_comprobante = 'NOTA_DEBITO') AS debito,
        SUM(COALESCE(nota.importe_reembolsado, nota.total)) FILTER (WHERE nota.tipo_comprobante = 'NOTA_CREDITO') AS reembolsado
      FROM comprobantes_relacionados nota WHERE ${notaVigenteSql} GROUP BY nota.ingreso_origen_id) n ON n.ingreso_id = i.id
    LEFT JOIN (SELECT ingreso_id, SUM(importe_aplicado) AS cobrado FROM ingresos_pagos GROUP BY ingreso_id) p ON p.ingreso_id = i.id
    WHERE i.fecha >= ${rango.desde}::date AND i.fecha <= ${rango.hasta}::date
      AND i.tipo_comprobante IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')
      AND i.estado <> 'ANULADO'
      AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
  `) as unknown as Array<{ facturado: string; cobrado: string }>;
  return { rango, facturado: fila?.facturado ?? "0.00", cobrado: fila?.cobrado ?? "0.00" };
}
