import { ConflictException } from "@nestjs/common";
import { analizarEstadoComprobante } from "../ingresos/comprobante-emision.util";
import { respuestaVigente } from "./representacion-impresa";

const ESTADOS_SIN_VALIDEZ = ["RECHAZADO_SUNAT", "ERROR_SUNAT", "ERROR_NUBEFACT", "ERROR_EMISION"];

/**
 * Decide si un comprobante electrónico puede imprimirse y con qué advertencias.
 * Un comprobante rechazado o con error de emisión no tiene validez y no se imprime.
 */
export function evaluarImpresionElectronica(estado: string, datosNubefact: unknown): string[] {
  const datos = datosNubefact && typeof datosNubefact === "object" ? datosNubefact as Record<string, unknown> : {};
  if (!datos.solicitud || typeof datos.solicitud !== "object") throw new ConflictException("El comprobante aún no tiene datos de emisión para imprimir.");
  const { estadoProveedor } = analizarEstadoComprobante(estado, datos, respuestaVigente(datos));
  if (ESTADOS_SIN_VALIDEZ.includes(estadoProveedor)) {
    throw new ConflictException("El comprobante fue rechazado o tuvo un error de emisión; no puede imprimirse como comprobante válido.");
  }
  if (estado === "ANULADO") return ["COMPROBANTE ANULADO: no tiene validez tributaria."];
  if (estado === "ANULACION_PENDIENTE") return ["Comprobante con anulación en trámite ante SUNAT."];
  if (estadoProveedor === "PENDIENTE_CONFIRMACION" || estadoProveedor === "EN_PROCESO") return ["SUNAT aún no confirma la aceptación de este comprobante."];
  return [];
}
