import { validarConfiguracionEntorno } from "../../configuracion-entorno";

export type CuerpoNubefact = Record<string, unknown>;

export type RespuestaNubefact = {
  ok: boolean;
  status: number;
  /** Objeto JSON de la respuesta; un JSON no objeto se envuelve en `{ respuesta }` y `null` indica un cuerpo ilegible. */
  cuerpo: CuerpoNubefact | null;
};

export class ErrorRedNubefact extends Error {
  constructor(readonly causa: "SIN_CONFIGURAR" | "TIEMPO_AGOTADO" | "RED", mensaje: string) {
    super(mensaje);
    this.name = "ErrorRedNubefact";
  }
}

export function nubefactConfigurado() {
  return Boolean(process.env.NUBEFACT_RUTA?.trim() && process.env.NUBEFACT_TOKEN?.trim());
}

/**
 * POST JSON a la ruta de NubeFact con tiempo límite. Nunca reintenta por sí mismo: la emisión es idempotente solo
 * gracias a `codigo_unico`, y quien repite una operación decide si es seguro (las consultas siempre lo son).
 * Lanza `ErrorRedNubefact` cuando no hay respuesta HTTP (sin configurar, tiempo agotado o fallo de red).
 */
export async function enviarANubefact(solicitud: CuerpoNubefact, opciones: { timeoutMs?: number } = {}): Promise<RespuestaNubefact> {
  const ruta = process.env.NUBEFACT_RUTA?.trim();
  const token = process.env.NUBEFACT_TOKEN?.trim();
  if (!ruta || !token) throw new ErrorRedNubefact("SIN_CONFIGURAR", "NubeFact no está configurado.");
  let respuesta: Response;
  try {
    respuesta = await fetch(ruta, {
      method: "POST",
      headers: { Authorization: token, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(solicitud),
      signal: AbortSignal.timeout(opciones.timeoutMs ?? validarConfiguracionEntorno().timeoutNubefactMs),
    });
  } catch (error) {
    const agotado = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
    throw new ErrorRedNubefact(agotado ? "TIEMPO_AGOTADO" : "RED", agotado ? "NubeFact no respondió a tiempo." : "No se pudo conectar con NubeFact.");
  }
  let cuerpo: CuerpoNubefact | null;
  try {
    const json: unknown = await respuesta.json();
    cuerpo = json && typeof json === "object" && !Array.isArray(json) ? json as CuerpoNubefact : { respuesta: json };
  } catch {
    cuerpo = null;
  }
  return { ok: respuesta.ok, status: respuesta.status, cuerpo };
}

export const tipoComprobanteNubefact = { FACTURA: 1, BOLETA: 2, NOTA_CREDITO: 3, NOTA_DEBITO: 4 } as const;

export function solicitudConsultaComprobante(tipo: keyof typeof tipoComprobanteNubefact, serie: string, numero: number) {
  return { operacion: "consultar_comprobante", tipo_de_comprobante: tipoComprobanteNubefact[tipo], serie, numero };
}

/**
 * Espera `promesa` como máximo `limiteMs`; si se agota devuelve `null` y la operación sigue en segundo plano
 * (su posible fallo se ignora aquí). Se usa para que la descarga de PDF/XML/CDR nunca retenga la venta.
 */
export async function conPresupuesto<T>(promesa: Promise<T>, limiteMs: number): Promise<T | null> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<null>((resolver) => { temporizador = setTimeout(() => resolver(null), limiteMs); });
  promesa.catch(() => undefined);
  try { return await Promise.race([promesa, limite]); }
  finally { clearTimeout(temporizador); }
}
