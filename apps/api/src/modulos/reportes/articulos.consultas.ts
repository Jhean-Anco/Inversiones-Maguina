import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db, ingresos, ingresosDetalle } from "@magina/database";
import { ventaVigente, type RangoFechas } from "./flujo-ingresos.consultas";
import { consultarAjustesPorLinea } from "./ajustes-notas.consultas";
import { sumarImportes } from "./reportes.util";

const documentosDeVenta = ["BOLETA", "FACTURA", "NOTA_VENTA"];

/**
 * Artículos más vendidos del rango (por importe con IGV) y el total de ventas del mismo rango, que sirve de base
 * para el porcentaje acumulado. Cuenta boletas, facturas y notas de venta que no estén anuladas.
 */
export async function consultarArticulosMasVendidos(rango: RangoFechas, limite: number) {
  const condicion = and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), inArray(ingresos.tipoComprobante, documentosDeVenta), ventaVigente);
  const [brutos, [totales], ajustes] = await Promise.all([
    db.select({ descripcion: ingresosDetalle.descripcion, tipo: ingresosDetalle.tipo, cantidad: sql<string>`sum(${ingresosDetalle.cantidad})::numeric(16,3)`, total: sql<string>`sum(${ingresosDetalle.total})::numeric(16,2)` })
      .from(ingresosDetalle).innerJoin(ingresos, eq(ingresosDetalle.ingresoId, ingresos.id)).where(condicion)
      .groupBy(ingresosDetalle.descripcion, ingresosDetalle.tipo).orderBy(desc(sql`sum(${ingresosDetalle.total})`)),
    db.select({ total: sql<string>`coalesce(sum(${ingresos.total}), 0)::numeric(16,2)` }).from(ingresos).where(condicion),
    consultarAjustesPorLinea(rango, "VENTA"),
  ]);
  // El importe de cada artículo y el total van netos de las notas vigentes de esas ventas.
  const articulos = brutos.map((articulo) => ({ ...articulo, total: sumarImportes(articulo.total,
    ...ajustes.filter((ajuste) => ajuste.descripcion === articulo.descripcion && ajuste.tipo === articulo.tipo).map((ajuste) => ajuste.total)) }))
    .sort((a, b) => Number(b.total) - Number(a.total)).slice(0, limite);
  return { rango, totalVentas: sumarImportes(totales?.total ?? "0.00", ...ajustes.map((ajuste) => ajuste.total)), articulos };
}
