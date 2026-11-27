import { sql } from "drizzle-orm";
import { db } from "@magina/database";
import type { RangoFechas } from "./flujo-ingresos.consultas";
import { consultarAjustesPorLinea } from "./ajustes-notas.consultas";
import { sumarImportes } from "./reportes.util";

export type FilaRentabilidad = {
  tipo: "PRODUCTO" | "SERVICIO" | "MOTOTAXI";
  /** Categoría del repuesto; null para servicios y mototaxis. */
  categoria: string | null;
  /** Venta sin IGV. */
  venta: string;
  /** Parte de la venta cuyo costo se conoce (repuestos con costo de compra y mototaxis con costo de adquisición). */
  ventaConCosto: string;
  costo: string;
};

/**
 * Ventas vigentes (boleta, factura y nota de venta no anuladas) por tipo de línea y categoría, con su costo.
 * Repuestos: costo promedio registrado al momento de la salida de stock. Mototaxis: costo de adquisición de la unidad vendida.
 * Los servicios no tienen costo registrado, por eso nunca entran en `ventaConCosto`.
 */
export async function consultarRentabilidad(rango: RangoFechas): Promise<FilaRentabilidad[]> {
  const ajustes = await consultarAjustesPorLinea(rango, "VENTA");
  const filas = await db.execute(sql`
    SELECT d.tipo AS tipo,
      array_agg(d.id::text) AS detalles,
      array_agg(d.id::text) FILTER (WHERE (m.id IS NOT NULL AND m.costo_unitario_base > 0) OR (u.id IS NOT NULL AND u.costo_adquisicion > 0)) AS detalles_con_costo,
      cat.nombre AS categoria,
      COALESCE(SUM(d.subtotal), 0)::numeric(16,2)::text AS venta,
      COALESCE(SUM(d.subtotal) FILTER (WHERE (m.id IS NOT NULL AND m.costo_unitario_base > 0) OR (u.id IS NOT NULL AND u.costo_adquisicion > 0)), 0)::numeric(16,2)::text AS venta_con_costo,
      COALESCE(SUM(CASE
        WHEN m.id IS NOT NULL AND m.costo_unitario_base > 0 THEN m.cantidad_base * m.costo_unitario_base
        WHEN u.id IS NOT NULL AND u.costo_adquisicion > 0 THEN u.costo_adquisicion
        ELSE 0 END), 0)::numeric(16,2)::text AS costo
    FROM ingresos_detalle d
    INNER JOIN ingresos i ON i.id = d.ingreso_id
    LEFT JOIN productos p ON p.id = d.producto_id
    LEFT JOIN categorias_productos cat ON cat.id = p.categoria_id
    LEFT JOIN movimientos_stock m ON m.origen_detalle_id = d.id AND m.tipo = 'SALIDA' AND m.origen_tipo = 'INGRESO'
    LEFT JOIN unidades_mototaxis u ON u.id = d.mototaxi_unidad_id
    WHERE i.fecha >= ${rango.desde}::date AND i.fecha <= ${rango.hasta}::date
      AND i.tipo_comprobante IN ('BOLETA', 'FACTURA', 'NOTA_VENTA')
      AND i.estado <> 'ANULADO'
      AND COALESCE(i.datos_nubefact->'anulacion'->>'estado', '') <> 'ANULADO'
    GROUP BY d.tipo, cat.nombre
    ORDER BY SUM(d.subtotal) DESC
  `) as unknown as Array<{ tipo: FilaRentabilidad["tipo"]; categoria: string | null; venta: string; venta_con_costo: string; costo: string; detalles: string[]; detalles_con_costo: string[] | null }>;
  // Las notas vigentes cambian la venta sin IGV, no el costo (son ajustes de valor, sin devolución de mercadería).
  const neto = (importe: string, detalles: string[] | null) => sumarImportes(importe, ...ajustes.filter((ajuste) => detalles?.includes(ajuste.detalle_id)).map((ajuste) => ajuste.subtotal));
  return filas.map((fila) => ({ tipo: fila.tipo, categoria: fila.categoria, venta: neto(fila.venta, fila.detalles), ventaConCosto: neto(fila.venta_con_costo, fila.detalles_con_costo), costo: fila.costo }));
}
