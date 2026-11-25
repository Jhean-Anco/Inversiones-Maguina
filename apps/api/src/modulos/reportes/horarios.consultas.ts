import { sql } from "drizzle-orm";
import { db } from "@magina/database";
import type { RangoFechas } from "./flujo-ingresos.consultas";

export type CeldaHorario = { dia: number; hora: number; operaciones: number; total: string };

/**
 * Ventas vigentes (boleta, factura y nota de venta) por día de la semana (1 = lunes … 7 = domingo) y hora, en hora de Perú.
 * Solo cuentan las ventas registradas el mismo día de su emisión: las cargadas después (importaciones, correcciones) llevan
 * la hora de la carga, no la de la venta, y distorsionarían el patrón.
 */
export async function consultarHorarios(rango: RangoFechas) {
  const filas = await db.execute(sql`
    SELECT EXTRACT(ISODOW FROM i.creado_en AT TIME ZONE 'America/Lima')::int AS dia,
      EXTRACT(HOUR FROM i.creado_en AT TIME ZONE 'America/Lima')::int AS hora,
      count(*)::int AS operaciones,
      COALESCE(SUM(i.total), 0)::numeric(16,2)::text AS total
    FROM ingresos i
    WHERE i.fecha >= ${rango.desde}::date AND i.fecha <= ${rango.hasta}::date
      AND i.tipo_comprobante IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')
      AND i.estado <> 'ANULADO'
      AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
      AND (i.creado_en AT TIME ZONE 'America/Lima')::date = i.fecha
    GROUP BY 1, 2
    ORDER BY 1, 2
  `) as unknown as CeldaHorario[];
  const [vigentes] = await db.execute(sql`
    SELECT count(*)::int AS total FROM ingresos i
    WHERE i.fecha >= ${rango.desde}::date AND i.fecha <= ${rango.hasta}::date
      AND i.tipo_comprobante IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')
      AND i.estado <> 'ANULADO'
      AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
  `) as unknown as Array<{ total: number }>;
  return {
    rango,
    ventasVigentes: vigentes?.total ?? 0,
    ventasConsideradas: filas.reduce((suma, fila) => suma + fila.operaciones, 0),
    celdas: filas.map((fila) => ({ dia: fila.dia, hora: fila.hora, operaciones: fila.operaciones, total: fila.total })),
  };
}
