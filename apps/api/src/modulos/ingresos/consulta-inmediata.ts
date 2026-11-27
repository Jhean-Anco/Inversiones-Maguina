import { analizarEstadoComprobante } from "./comprobante-emision.util";
import { enviarANubefact, solicitudConsultaComprobante, type CuerpoNubefact } from "./nubefact-cliente";

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

/** ¿La respuesta de emisión indica que SUNAT aún procesa el documento (sin aceptación ni rechazo)? */
export function emisionPendienteDeConfirmacion(cuerpo: CuerpoNubefact) {
  return cuerpo.aceptada_por_sunat !== true && analizarEstadoComprobante("ERROR_NUBEFACT", {}, cuerpo).estadoProveedor === "PENDIENTE_CONFIRMACION";
}

/**
 * Tras emitir, NubeFact puede responder antes de que SUNAT termine. Consulta unas pocas veces seguidas (dentro de un
 * presupuesto corto de tiempo) para resolver el caso común antes de que el usuario deje la pantalla.
 * Devuelve la respuesta definitiva (aceptada o rechazada) o `null` si sigue pendiente; el seguimiento en segundo plano continúa.
 */
export async function consultarEmisionInmediata(entrada: {
  tipoComprobante: "BOLETA" | "FACTURA"; serie: string; numero: number; esperasMs: readonly number[]; presupuestoMs?: number;
}): Promise<CuerpoNubefact | null> {
  const presupuestoMs = entrada.presupuestoMs ?? 8000;
  const inicio = Date.now();
  for (const espera of entrada.esperasMs) {
    const restante = presupuestoMs - (Date.now() - inicio);
    if (restante <= espera) break;
    await esperar(espera);
    try {
      const respuesta = await enviarANubefact(solicitudConsultaComprobante(entrada.tipoComprobante, entrada.serie, entrada.numero), { timeoutMs: Math.min(5000, Math.max(1000, restante - espera)) });
      if (!respuesta.ok || !respuesta.cuerpo) continue;
      if (respuesta.cuerpo.aceptada_por_sunat === true) return respuesta.cuerpo;
      if (analizarEstadoComprobante("ERROR_NUBEFACT", {}, respuesta.cuerpo).estadoProveedor === "RECHAZADO_SUNAT") return respuesta.cuerpo;
    } catch {
      // Un fallo de red en la consulta rápida no cambia el estado: el seguimiento de fondo la repetirá.
    }
  }
  return null;
}
