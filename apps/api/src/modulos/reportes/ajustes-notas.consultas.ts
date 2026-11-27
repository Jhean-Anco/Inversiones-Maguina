import { sql } from "drizzle-orm";
import { db } from "@magina/database";
import type { RangoFechas } from "./flujo-ingresos.consultas";

/** Nota de crédito o débito que sigue ajustando su venta: emitida y sin baja aceptada. */
export const notaVigenteSql = sql`nota.estado IN ('EMITIDO', 'ANULACION_PENDIENTE') AND nota.datos_nubefact->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'`;

/** Importe de la nota con su signo: la de crédito resta la venta y la de débito la aumenta. */
export const importeConSigno = sql`CASE WHEN nota.tipo_comprobante = 'NOTA_CREDITO' THEN -nota.total ELSE nota.total END`;

export type AjusteLinea = { fecha: string; tipo: "PRODUCTO" | "MOTOTAXI" | "SERVICIO"; detalle_id: string; nota_tipo: "NOTA_CREDITO" | "NOTA_DEBITO"; comprobante: "BOLETA" | "FACTURA"; descripcion: string; categoria: string | null; total: string; subtotal: string };

/**
 * Ajustes de las notas vigentes repartidos por línea de la venta de origen, con signo y fechados según `por`:
 * la emisión de la nota (flujo de ingresos) o la fecha de la venta (análisis de lo vendido en el rango).
 */
export async function consultarAjustesPorLinea(rango: RangoFechas, por: "NOTA" | "VENTA" = "NOTA") {
  const fecha = por === "NOTA" ? sql`nota.fecha` : sql`i.fecha`;
  return await db.execute(sql`
    SELECT ${fecha}::text AS fecha, d.tipo AS tipo, d.id::text AS detalle_id, nota.tipo_comprobante AS nota_tipo, i.tipo_comprobante AS comprobante, d.descripcion AS descripcion, cat.nombre AS categoria,
      (CASE WHEN nota.tipo_comprobante = 'NOTA_CREDITO' THEN -1 ELSE 1 END * (linea.valor->>'montoAjuste')::numeric)::numeric(16,2)::text AS total,
      (CASE WHEN nota.tipo_comprobante = 'NOTA_CREDITO' THEN -1 ELSE 1 END * (linea.valor->>'montoAjuste')::numeric * nota.subtotal / nota.total)::numeric(16,2)::text AS subtotal
    FROM comprobantes_relacionados nota
    INNER JOIN ingresos i ON i.id = nota.ingreso_origen_id
    CROSS JOIN LATERAL jsonb_array_elements(coalesce(nota.datos_nubefact->'lineasOrigen', '[]'::jsonb)) AS linea(valor)
    INNER JOIN ingresos_detalle d ON d.id::text = linea.valor->>'ingresoDetalleId'
    LEFT JOIN productos p ON p.id = d.producto_id
    LEFT JOIN categorias_productos cat ON cat.id = p.categoria_id
    WHERE ${notaVigenteSql} AND i.estado <> 'ANULADO' AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
      AND ${fecha} >= ${rango.desde}::date AND ${fecha} <= ${rango.hasta}::date
  `) as unknown as AjusteLinea[];
}

/** Ajuste neto (débitos menos créditos) por fecha de emisión de las notas vigentes. */
export async function consultarAjusteNetoPorDia(rango: RangoFechas) {
  return await db.execute(sql`
    SELECT nota.fecha::text AS fecha, SUM(${importeConSigno})::numeric(16,2)::text AS total
    FROM comprobantes_relacionados nota
    WHERE ${notaVigenteSql} AND nota.fecha >= ${rango.desde}::date AND nota.fecha <= ${rango.hasta}::date
    GROUP BY nota.fecha ORDER BY nota.fecha
  `) as unknown as Array<{ fecha: string; total: string }>;
}
