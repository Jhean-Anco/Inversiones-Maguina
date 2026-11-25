import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, ingresos, ingresosDetalle } from "@magina/database";
import { ventaVigente, type RangoFechas } from "./flujo-ingresos.consultas";

const documentosDeVenta = ["BOLETA", "FACTURA", "NOTA_VENTA"];

/**
 * Artículos más vendidos del rango (por importe con IGV) y el total de ventas del mismo rango, que sirve de base
 * para el porcentaje acumulado. Cuenta boletas, facturas y notas de venta que no estén anuladas.
 */
export async function consultarArticulosMasVendidos(rango: RangoFechas, limite: number) {
  const condicion = and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), inArray(ingresos.tipoComprobante, documentosDeVenta), ventaVigente);
  const [articulos, [totales]] = await Promise.all([
    db.select({ descripcion: ingresosDetalle.descripcion, tipo: ingresosDetalle.tipo, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})::numeric(16,3)`, total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)` })
      .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).where(condicion)
      .groupBy(ingresosDetalle.descripcion, ingresosDetalle.tipo).orderBy(desc(sql`sum(${ingresosDetalle.total})`)).limit(limite),
    db.select({ total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(condicion),
  ]);
  return { rango, totalVentas: totales?.total ?? "0.00", articulos };
}
