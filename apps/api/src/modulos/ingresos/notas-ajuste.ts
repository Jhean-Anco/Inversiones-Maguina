import { BadRequestException, ConflictException } from "@nestjs/common";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, comprobantesRelacionados, comprobantesRelacionadosDetalle, ingresos, ingresosPagos } from "@magina/database";
import { analizarEstadoComprobante } from "./comprobante-emision.util";
import { enviarANubefact, solicitudConsultaComprobante } from "./nubefact-cliente";
import { bajaPendiente, CODIGO_MOTIVO_NOTA_LIBERADA, constaQueNoSeEmitio, notaSinResultado } from "./saldos-venta";

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;
const estadosOcupados = ["EMITIDO", "ANULACION_PENDIENTE", "NUBEFACT_PENDIENTE"];

function esDuplicado(error: unknown) {
  let causa: unknown = error;
  while (typeof causa === "object" && causa !== null) {
    if ("code" in causa && causa.code === "23505") return true;
    causa = "cause" in causa ? causa.cause : undefined;
  }
  return false;
}

/** Falla con 409 si el comprobante ya tiene una nota vigente (o en curso) del mismo tipo y motivo: el índice único de motivos la rechazaría. */
export async function validarNotaDisponible(ventaId: string, tipo: "NOTA_CREDITO" | "NOTA_DEBITO", codigoMotivo: number) {
  const [existente] = await db.select({ serie: comprobantesRelacionados.serie, numero: comprobantesRelacionados.numero, estado: comprobantesRelacionados.estado })
    .from(comprobantesRelacionados).where(and(eq(comprobantesRelacionados.ingresoOrigenId, ventaId), eq(comprobantesRelacionados.tipoComprobante, tipo),
      eq(comprobantesRelacionados.codigoMotivo, codigoMotivo), inArray(comprobantesRelacionados.estado, estadosOcupados))).limit(1);
  if (existente) {
    throw new ConflictException(`Este comprobante ya tiene la ${tipo === "NOTA_CREDITO" ? "nota de crédito" : "nota de débito"} ${existente.serie}-${String(existente.numero).padStart(6, "0")} (${existente.estado}) por el mismo motivo. Comunica su baja o espera su confirmación antes de emitir otra.`);
  }
}

/**
 * Antes de reintentar una nota que quedó sin respuesta del proveedor se pregunta a NubeFact qué pasó con ella: si SUNAT la
 * aceptó se marca emitida (emitir otra duplicaría el ajuste); solo si consta que no se emitió se permite una nueva.
 */
export async function resolverNotasSinResultado(ventaId: string) {
  const dudosas = await db.select().from(comprobantesRelacionados)
    .where(and(eq(comprobantesRelacionados.ingresoOrigenId, ventaId), notaSinResultado));
  for (const nota of dudosas) {
    const codigo = `${nota.serie}-${String(nota.numero).padStart(6, "0")}`;
    const consultar = "Consulta su estado en unos minutos antes de continuar.";
    if (nota.estado === "NUBEFACT_PENDIENTE" && Date.now() - nota.creadoEn.getTime() < 120_000) throw new ConflictException(`La nota ${codigo} todavía se está enviando. ${consultar}`);
    const tipo = nota.tipoComprobante as "NOTA_CREDITO" | "NOTA_DEBITO";
    const solicitud = solicitudConsultaComprobante(tipo, nota.serie, nota.numero);
    const respuesta = await enviarANubefact(solicitud).catch(() => null);
    const cuerpo = respuesta?.cuerpo;
    if (!respuesta || !cuerpo) throw new ConflictException(`No se sabe si NubeFact emitió la nota ${codigo}. ${consultar}`);
    const consultaComprobante = { solicitud, respuesta: cuerpo, respuestaHttp: respuesta.status, consultadoEn: new Date().toISOString() };
    const datos = { ...(nota.datosNubefact ?? {}), consultaComprobante };
    const aceptada = respuesta.ok && cuerpo.aceptada_por_sunat === true;
    const noEmitida = analizarEstadoComprobante(nota.estado, {}, cuerpo).estadoProveedor === "RECHAZADO_SUNAT" || constaQueNoSeEmitio.test(JSON.stringify(cuerpo));
    if (!aceptada && !noEmitida) throw new ConflictException(`La nota ${codigo} sigue pendiente en SUNAT o NubeFact no confirma su resultado. ${consultar}`);
    await db.update(comprobantesRelacionados).set({ estado: aceptada ? "EMITIDO" : "ERROR_NUBEFACT", datosNubefact: aceptada ? { ...datos, respuesta: cuerpo } : datos })
      .where(eq(comprobantesRelacionados.id, nota.id));
    if (aceptada) throw new ConflictException(`La nota ${codigo} sí fue aceptada por SUNAT y ya quedó registrada. Actualiza el listado de notas.`);
  }
}

/**
 * Registra la nota en estado pendiente dentro de una transacción que bloquea la venta:
 * - aparta las notas fallidas (ERROR_NUBEFACT) del mismo motivo para permitir el reintento;
 * - recalcula el crédito acumulado con la venta bloqueada (dos notas simultáneas no pueden superar el total);
 * - en una nota de crédito reparte el importe entre saldo por cobrar (se reduce la deuda) y reembolso en cuenta
 *   (solo lo ya cobrado de más), que es lo único que sale de caja. Devuelve el importe reembolsado.
 */
export async function registrarNotaAjuste(nota: {
  id: string; ventaId: string; tipo: "NOTA_CREDITO" | "NOTA_DEBITO"; codigoMotivo: number; motivo: string; fecha: string; serie: string; numero: number;
  subtotal: number; igv: number; total: number; cuentaFinancieraId: string | null; datosNubefact: Record<string, unknown>; usuarioId: string;
  detalles: { ingresoDetalleId: string; cantidad: string }[];
}) {
  try {
    return await db.transaction(async (tx) => {
      const [venta] = await tx.select({ total: ingresos.total, estado: ingresos.estado, datos: ingresos.datosNubefact }).from(ingresos).where(eq(ingresos.id, nota.ventaId)).for("update");
      if (!venta || venta.estado !== "EMITIDO" || bajaPendiente(venta.datos)) throw new BadRequestException("Solo puedes emitir notas sobre boletas o facturas emitidas correctamente por NubeFact.");
      await tx.update(comprobantesRelacionados).set({ codigoMotivo: CODIGO_MOTIVO_NOTA_LIBERADA })
        .where(and(eq(comprobantesRelacionados.ingresoOrigenId, nota.ventaId), eq(comprobantesRelacionados.tipoComprobante, nota.tipo),
          eq(comprobantesRelacionados.codigoMotivo, nota.codigoMotivo), eq(comprobantesRelacionados.estado, "ERROR_NUBEFACT")));
      let reembolso: number | null = null;
      if (nota.tipo === "NOTA_CREDITO") {
        const [previas] = await tx.select({
          total: sql<string>`coalesce(sum(${comprobantesRelacionados.total}), 0)::numeric(14,2)`,
          reembolsado: sql<string>`coalesce(sum(coalesce(${comprobantesRelacionados.importeReembolsado}, ${comprobantesRelacionados.total})), 0)::numeric(14,2)`,
        }).from(comprobantesRelacionados).where(and(eq(comprobantesRelacionados.ingresoOrigenId, nota.ventaId), eq(comprobantesRelacionados.tipoComprobante, "NOTA_CREDITO"),
          inArray(comprobantesRelacionados.estado, ["EMITIDO", "ANULACION_PENDIENTE", "NUBEFACT_PENDIENTE"]),
          sql`${comprobantesRelacionados.datosNubefact}->'anulacion'->>'estado' IS DISTINCT FROM 'ANULADO'`));
        const totalPrevio = Number(previas?.total ?? 0);
        if (nota.total > redondear(Number(venta.total) - totalPrevio) + 0.001) throw new BadRequestException("La nota de crédito supera el saldo del comprobante original.");
        const [cobros] = await tx.select({ total: sql<string>`coalesce(sum(${ingresosPagos.importeAplicado}), 0)::numeric(14,2)` }).from(ingresosPagos).where(eq(ingresosPagos.ingresoId, nota.ventaId));
        const aplicadoPrevio = redondear(totalPrevio - Number(previas?.reembolsado ?? 0));
        const saldoAntes = Math.max(0, redondear(Number(venta.total) - aplicadoPrevio - Number(cobros?.total ?? 0)));
        reembolso = redondear(nota.total - Math.min(nota.total, saldoAntes));
      }
      await tx.insert(comprobantesRelacionados).values({ id: nota.id, ingresoOrigenId: nota.ventaId, tipoComprobante: nota.tipo, codigoMotivo: nota.codigoMotivo, motivo: nota.motivo,
        fecha: nota.fecha, serie: nota.serie, numero: nota.numero, subtotal: nota.subtotal.toFixed(2), igv: nota.igv.toFixed(2), total: nota.total.toFixed(2),
        importeReembolsado: reembolso === null ? null : reembolso.toFixed(2), cuentaFinancieraId: nota.cuentaFinancieraId, estado: "NUBEFACT_PENDIENTE", datosNubefact: nota.datosNubefact, usuarioId: nota.usuarioId });
      await tx.insert(comprobantesRelacionadosDetalle).values(nota.detalles.map((detalle) => ({ comprobanteRelacionadoId: nota.id, ingresoDetalleId: detalle.ingresoDetalleId, cantidad: detalle.cantidad })));
      return reembolso;
    });
  } catch (error) {
    if (esDuplicado(error)) throw new ConflictException("Otra solicitud acaba de emitir una nota igual sobre este comprobante. Actualiza el listado de notas antes de volver a intentarlo.");
    throw error;
  }
}
