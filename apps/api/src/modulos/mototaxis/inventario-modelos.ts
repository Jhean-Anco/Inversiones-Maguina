import { BadRequestException } from "@nestjs/common";
import { db, modelosMototaxis, movimientosModelosMototaxis } from "@magina/database";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

type Transaccion = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const precioVigenteModelo = sql<string | null>`(
  select precio.precio
  from precios_modelos_mototaxis precio
  where precio.modelo_id = ${modelosMototaxis.id}
    and precio.vigente_desde <= now()
    and (precio.vigente_hasta is null or precio.vigente_hasta > now())
  order by precio.vigente_desde desc
  limit 1
)`;

export function siguientePrecioModelo(columna: "precio" | "vigente_desde") {
  return sql<string | null>`(
    select ${sql.identifier(columna)} from precios_modelos_mototaxis
    where modelo_id = ${modelosMototaxis.id} and vigente_desde > now()
    order by vigente_desde
    limit 1
  )`;
}

export function bloquearModelos(tx: Transaccion, ids: string[]) {
  return tx.select({ id: modelosMototaxis.id, saldo: modelosMototaxis.stockDisponible, activo: modelosMototaxis.activo })
    .from(modelosMototaxis).where(inArray(modelosMototaxis.id, ids)).orderBy(asc(modelosMototaxis.id)).for("update");
}

export async function moverSaldoModelo(tx: Transaccion, movimiento: {
  modeloId: string;
  tipo: "COMPRA" | "VENTA" | "AJUSTE" | "ANULACION_VENTA";
  origenId: string;
  diferencia: number;
  usuarioId: string;
}) {
  const { modeloId, tipo, origenId, diferencia, usuarioId } = movimiento;
  const cantidad = sql`${modelosMototaxis.stockDisponible}::bigint + ${diferencia}::bigint`;
  const [saldo] = await tx.update(modelosMototaxis)
    .set({ stockDisponible: sql`${cantidad}::integer` })
    .where(and(eq(modelosMototaxis.id, modeloId), sql`${cantidad} between 0 and 2147483647`))
    .returning({ cantidadFinal: modelosMototaxis.stockDisponible });
  if (!saldo) throw new BadRequestException("El ajuste o la operación excede las existencias disponibles del modelo.");
  await tx.insert(movimientosModelosMototaxis).values({
    modeloId, tipo, origenId, cantidadAnterior: saldo.cantidadFinal - diferencia, cantidadFinal: saldo.cantidadFinal, usuarioId,
  });
}
