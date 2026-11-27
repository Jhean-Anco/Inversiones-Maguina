import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { and, asc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db, garantiasVentasMototaxis, ingresos, ingresosDetalle, movimientosStock, reclamosGarantiaMototaxis, saldosStock } from "@magina/database";
import { bloquearModelos, moverSaldoModelo } from "../mototaxis/inventario-modelos";

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Origen del movimiento de stock que devuelve a existencias lo vendido cuando se anula una venta. */
export const ORIGEN_ANULACION_VENTA = "ANULACION_INGRESO";

/**
 * Una venta con reclamos de garantía registrados ya entregó el equipo: no se puede anular sin resolver antes esos reclamos.
 * Se valida antes de comunicar la baja a SUNAT para no dejar un comprobante dado de baja con una garantía en curso.
 */
export async function validarVentaAnulable(ventaId: string) {
  const [reclamo] = await db.select({ id: reclamosGarantiaMototaxis.id }).from(reclamosGarantiaMototaxis)
    .innerJoin(ingresosDetalle, eq(ingresosDetalle.id, reclamosGarantiaMototaxis.ingresoDetalleId))
    .where(eq(ingresosDetalle.ingresoId, ventaId)).limit(1);
  if (reclamo) throw new ConflictException("La venta tiene reclamos de garantía registrados. Resuélvelos antes de anularla.");
}

/**
 * Deshace el efecto de inventario de una venta que se anula, dentro de la transacción del llamador:
 * devuelve los repuestos a `saldos_stock` (con su movimiento de entrada), repone el stock de los modelos de mototaxi y
 * libera las garantías aplicadas a las líneas. El dinero no se toca aquí: los cobros de una venta anulada dejan de contar
 * en cuentas, cobranza y reportes porque todas las consultas excluyen las ventas en estado ANULADO.
 * Es idempotente: cada línea solo se revierte una vez (índice único de movimientos y búsqueda de reversiones previas).
 */
export async function revertirEfectosVenta(tx: Transaccion, ventaId: string, usuarioId: string) {
  // Se devuelve la cantidad vigente de cada línea (la edición de una nota de venta la cambia con movimientos de origen propio).
  // Solo vuelven las líneas que descontaron stock: tienen su salida registrada o la venta fue editada.
  const lineasModelo = await tx.select({ id: ingresosDetalle.id, modeloId: ingresosDetalle.mototaxiModeloId, cantidad: ingresosDetalle.cantidad })
    .from(ingresosDetalle).where(and(eq(ingresosDetalle.ingresoId, ventaId), isNotNull(ingresosDetalle.mototaxiModeloId),
      sql`(exists (select 1 from movimientos_modelos_mototaxis salida where salida.origen_id = ${ingresosDetalle.id} and salida.tipo = 'VENTA')
        or exists (select 1 from ingresos_ediciones edicion where edicion.ingreso_id = ${ingresosDetalle.ingresoId}))`,
      sql`not exists (select 1 from movimientos_modelos_mototaxis reversion where reversion.origen_id = ${ingresosDetalle.id} and reversion.tipo = 'ANULACION_VENTA')`))
    .orderBy(asc(ingresosDetalle.mototaxiModeloId), asc(ingresosDetalle.id));
  if (lineasModelo.length) await bloquearModelos(tx, [...new Set(lineasModelo.map((item) => item.modeloId!))]);
  for (const item of lineasModelo) {
    await moverSaldoModelo(tx, { modeloId: item.modeloId!, tipo: "ANULACION_VENTA", origenId: item.id, diferencia: Number(item.cantidad), usuarioId });
  }

  const salidas = await tx.select({
    productoId: movimientosStock.productoId, detalleId: movimientosStock.origenDetalleId,
    cantidadBase: movimientosStock.cantidadBase, costo: movimientosStock.costoUnitarioBase,
  }).from(movimientosStock).where(and(eq(movimientosStock.origenTipo, "INGRESO"), eq(movimientosStock.origenId, ventaId), eq(movimientosStock.tipo, "SALIDA")))
    .orderBy(asc(movimientosStock.productoId), asc(movimientosStock.origenDetalleId));
  for (const salida of salidas) {
    const [yaDevuelta] = await tx.select({ id: movimientosStock.id }).from(movimientosStock)
      .where(and(eq(movimientosStock.origenTipo, ORIGEN_ANULACION_VENTA), eq(movimientosStock.origenDetalleId, salida.detalleId))).limit(1);
    if (yaDevuelta) continue;
    await tx.insert(saldosStock).values({ productoId: salida.productoId, cantidad: "0" }).onConflictDoNothing();
    const [anterior] = await tx.select({ cantidad: saldosStock.cantidad }).from(saldosStock).where(eq(saldosStock.productoId, salida.productoId)).for("update");
    const [saldo] = await tx.update(saldosStock).set({ cantidad: sql`${saldosStock.cantidad} + ${salida.cantidadBase}::numeric`, actualizadoEn: new Date() })
      .where(eq(saldosStock.productoId, salida.productoId)).returning({ cantidad: saldosStock.cantidad });
    await tx.insert(movimientosStock).values({
      productoId: salida.productoId, tipo: "ENTRADA", origenTipo: ORIGEN_ANULACION_VENTA, origenId: ventaId, origenDetalleId: salida.detalleId,
      cantidadBase: salida.cantidadBase, costoUnitarioBase: salida.costo, saldoAnterior: anterior?.cantidad ?? "0", saldoFinal: saldo.cantidad, usuarioId,
    });
  }

  const detalles = await tx.select({ id: ingresosDetalle.id }).from(ingresosDetalle).where(eq(ingresosDetalle.ingresoId, ventaId));
  if (detalles.length) await tx.delete(garantiasVentasMototaxis).where(inArray(garantiasVentasMototaxis.ingresoDetalleId, detalles.map((detalle) => detalle.id)));
}

/**
 * Anulación interna de una nota de venta (no hay comunicación a SUNAT): al instante pasa a ANULADO,
 * regresa el stock y las garantías y sus cobros dejan de contar. Una segunda anulación es rechazada.
 */
export async function anularNotaVentaInterna(ventaId: string, entrada: unknown, usuarioId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ventaId)) throw new BadRequestException("La nota de venta no es válida.");
  const motivo = entrada && typeof entrada === "object" && !Array.isArray(entrada) && typeof (entrada as Record<string, unknown>).motivo === "string" ? ((entrada as Record<string, unknown>).motivo as string).trim() : "";
  if (!motivo || motivo.length > 100) throw new BadRequestException("El motivo de anulación es obligatorio y admite hasta 100 caracteres.");
  const [previa] = await db.select({ tipo: ingresos.tipoComprobante }).from(ingresos).where(eq(ingresos.id, ventaId)).limit(1);
  if (!previa) throw new NotFoundException("No se encontró la venta.");
  if (previa.tipo !== "NOTA_VENTA") throw new BadRequestException("Solo una nota de venta interna se anula sin comunicar la baja a SUNAT.");
  await validarVentaAnulable(ventaId);
  return db.transaction(async (tx) => {
    const [venta] = await tx.select().from(ingresos).where(eq(ingresos.id, ventaId)).for("update");
    if (!venta) throw new NotFoundException("No se encontró la venta.");
    if (venta.estado === "ANULADO") throw new ConflictException("La nota de venta ya figura anulada.");
    if (venta.estado !== "REGISTRADO") throw new BadRequestException("Solo se puede anular una nota de venta registrada.");
    await revertirEfectosVenta(tx, venta.id, usuarioId);
    const datos = venta.datosNubefact && typeof venta.datosNubefact === "object" ? venta.datosNubefact : {};
    await tx.update(ingresos).set({ estado: "ANULADO", datosNubefact: { ...datos, anulacion: { estado: "ANULADO", interna: true, motivo, usuarioId, anuladoEn: new Date().toISOString() } } }).where(eq(ingresos.id, venta.id));
    return { estado: "ANULADO", motivo };
  });
}
