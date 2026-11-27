import { sql, type SQL } from "drizzle-orm";
import { comprobantesRelacionados } from "@magina/database";

/**
 * Código con el que se aparta una nota fallida o dada de baja: el índice único de motivos vigentes no lo incluye, así
 * puede emitirse otra del mismo tipo. El motivo real enviado a SUNAT se conserva en `datos_nubefact.solicitud`.
 * (El 13 no sirve: la restricción de importes lo reserva para notas con total cero.)
 */
export const CODIGO_MOTIVO_NOTA_LIBERADA = 7;

/**
 * Parte de las notas de crédito vigentes que redujo lo que el cliente aún debe en lugar de devolverse en dinero.
 * Las notas anteriores al registro del reembolso (`importe_reembolsado` nulo) se consideran devueltas por completo.
 * Saldo pendiente = total - crédito aplicado al saldo - cobros registrados (nunca negativo).
 */
export const creditoAplicadoASaldo = (ventaId: SQL | string = sql`"ingresos"."id"`) => sql<string>`(
  select coalesce(sum(nota.total - coalesce(nota.importe_reembolsado, nota.total)), 0)
  from comprobantes_relacionados nota
  where nota.ingreso_origen_id = ${ventaId} and nota.tipo_comprobante = 'NOTA_CREDITO'
    and nota.estado in ('EMITIDO', 'ANULACION_PENDIENTE')
    and nota.datos_nubefact->'anulacion'->>'estado' is distinct from 'ANULADO')`;

/** Textos de una consulta a NubeFact que confirman que el documento no quedó emitido. */
export const constaQueNoSeEmitio = /no existe|rechazad/i;

/** Nota enviada de la que no se sabe si el proveedor la emitió: sin respuesta y sin una consulta que descarte la emisión. */
export const notaSinResultado = sql`(${comprobantesRelacionados.estado} in ('NUBEFACT_PENDIENTE', 'ERROR_NUBEFACT')
  and ${comprobantesRelacionados.datosNubefact}->'respuesta' is null
  and coalesce(${comprobantesRelacionados.datosNubefact}->'consultaComprobante'->>'respuesta', '') !~* ${constaQueNoSeEmitio.source})`;

/** Indica si la venta tiene una comunicación de baja enviada a SUNAT sin respuesta definitiva. */
export function bajaPendiente(datosNubefact: unknown) {
  const datos = datosNubefact && typeof datosNubefact === "object" ? datosNubefact as Record<string, unknown> : {};
  const anulacion = datos.anulacion && typeof datos.anulacion === "object" ? datos.anulacion as Record<string, unknown> : null;
  return anulacion?.estado === "PENDIENTE";
}
