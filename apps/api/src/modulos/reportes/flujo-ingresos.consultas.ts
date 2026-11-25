import { and, asc, eq, gt, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";
import { db, comprobantesRelacionados, ingresos, ordenesServicio } from "@magina/database";

export type RangoFechas = { desde: string; hasta: string };

/** Venta vigente: ni anulada ni con la anulación ya aceptada por SUNAT. Una anulación todavía pendiente sigue contando. */
export const ventaVigente = and(ne(ingresos.estado, "ANULADO"), sql`coalesce(${ingresos.datosNubefact}->'anulacion'->>'estado', '') <> 'ANULADO'`);

/** Boletas, facturas y notas de venta agrupadas por día y tipo. */
export function consultarFlujoPorComprobante(rango: RangoFechas) {
  return db.select({ fecha: ingresos.fecha, tipoComprobante: ingresos.tipoComprobante, ventas: sql<number>`count(*)::int`, total: sql<string>`sum(${ingresos.total})::numeric(16,2)` })
    .from(ingresos)
    .where(and(gte(ingresos.fecha, rango.desde), lte(ingresos.fecha, rango.hasta), inArray(ingresos.tipoComprobante, ["BOLETA", "FACTURA", "NOTA_VENTA"]), ventaVigente))
    .groupBy(ingresos.fecha, ingresos.tipoComprobante).orderBy(asc(ingresos.fecha), asc(ingresos.tipoComprobante));
}

/** Notas de débito vigentes: una anulada o en anulación confirmada ya no suma ingreso. */
export function consultarFlujoNotasDebito(rango: RangoFechas) {
  return db.select({ fecha: comprobantesRelacionados.fecha, total: sql<string>`sum(${comprobantesRelacionados.total})::numeric(16,2)` })
    .from(comprobantesRelacionados)
    .where(and(gte(comprobantesRelacionados.fecha, rango.desde), lte(comprobantesRelacionados.fecha, rango.hasta), eq(comprobantesRelacionados.tipoComprobante, "NOTA_DEBITO"),
      inArray(comprobantesRelacionados.estado, ["EMITIDO", "ANULACION_PENDIENTE"]), sql`${comprobantesRelacionados.datosNubefact}->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'`))
    .groupBy(comprobantesRelacionados.fecha).orderBy(asc(comprobantesRelacionados.fecha));
}

/** Adelantos de órdenes de servicio. Solo cuentan mientras la orden no se factura; luego los reemplaza el importe de la venta. */
export function consultarFlujoAdelantos(rango: RangoFechas) {
  return db.select({ fecha: ordenesServicio.fechaRecepcion, total: sql<string>`sum(${ordenesServicio.adelanto})::numeric(16,2)` })
    .from(ordenesServicio)
    .where(and(gte(ordenesServicio.fechaRecepcion, rango.desde), lte(ordenesServicio.fechaRecepcion, rango.hasta), gt(ordenesServicio.adelanto, "0"),
      isNull(ordenesServicio.ingresoId), inArray(ordenesServicio.estado, ["ABIERTA", "EN_PROCESO", "ESPERANDO_REPUESTOS", "COMPLETADA"])))
    .groupBy(ordenesServicio.fechaRecepcion).orderBy(asc(ordenesServicio.fechaRecepcion));
}
