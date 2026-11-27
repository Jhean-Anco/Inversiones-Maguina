import { solicitarApi, urlApi } from "../services/api-cliente";
import { guardarDirecto, guardarFormato, leerDirecto } from "./memoria-impresion";
import { imprimirHtml, imprimirPdf } from "./imprimir-navegador";
import { a4Html, ANCHO_TICKET_MM, ticketHtml } from "./ticket-html";
import { ticketEscPos } from "./ticket-escpos";
import type { DocumentoImprimible, FormatoImpresion } from "./tipos";
import { bluetoothDisponible, type DispositivoBluetooth, elegirImpresoraBluetooth, enviarBluetooth, recuperarImpresoraBluetooth } from "./transporte-bluetooth";
import { elegirPuertoSerial, enviarSerial, type PuertoSerial, puertoAutorizado, serialDisponible } from "./transporte-serial";

export type OrigenImpresion = { ingresoId: string; notaId?: string };
/** Obtiene el documento a imprimir (API para comprobantes; datos ya cargados para órdenes, guías, etc.). */
export type ObtenerDocumento = () => Promise<DocumentoImprimible>;
/** Cómo sale el ticket: impresora conectada (autorizada antes por el navegador) o diálogo del sistema. */
export type DestinoTicket = { tipo: "sistema" } | { tipo: "bluetooth"; dispositivo: DispositivoBluetooth } | { tipo: "serial"; puerto: PuertoSerial };
export type ImpresionPreparada = { formato: FormatoImpresion; destino: DestinoTicket | null };
export type ResultadoImpresion = { modo: "dialogo" | "directo" | "pestana"; documento: DocumentoImprimible; errorDirecto?: unknown };

const BAUDIOS_SERIAL = 9600;
const SISTEMA: DestinoTicket = { tipo: "sistema" };
/** Impresora Bluetooth usada en esta sesión: no todos los navegadores permiten recuperarla tras recargar. */
let bluetoothEnSesion: DispositivoBluetooth | null = null;

export function obtenerDocumentoImprimible(origen: OrigenImpresion) {
  const base = `/impresion/ingresos/${encodeURIComponent(origen.ingresoId)}`;
  return solicitarApi<DocumentoImprimible>(origen.notaId ? `${base}/notas/${encodeURIComponent(origen.notaId)}` : base);
}

export const documentoDeIngreso = (origen: OrigenImpresion): ObtenerDocumento => () => obtenerDocumentoImprimible(origen);

/**
 * Decide, sin configuración del usuario, por dónde sale un ticket:
 * 1. una impresora USB/serie o Bluetooth ya autorizada por el navegador, directo en ESC/POS;
 * 2. la primera vez, el selector del propio navegador (una sola vez; la elección queda recordada);
 * 3. si no hay API disponible o el usuario cierra el selector, el diálogo de impresión del sistema.
 * Debe llamarse dentro del clic: el navegador exige un gesto para pedir permiso a la impresora.
 */
export async function resolverDestinoTicket(): Promise<DestinoTicket> {
  const memoria = leerDirecto();
  if (memoria?.tipo === "sistema") return SISTEMA;
  try {
    if (serialDisponible()) {
      const puerto = await puertoAutorizado();
      if (puerto) return { tipo: "serial", puerto };
    }
    if (memoria?.tipo === "bluetooth" && bluetoothDisponible()) {
      const dispositivo = bluetoothEnSesion?.id === memoria.id ? bluetoothEnSesion : await recuperarImpresoraBluetooth(memoria.id);
      if (dispositivo) return { tipo: "bluetooth", dispositivo };
    }
    if (serialDisponible() && memoria?.tipo !== "bluetooth") {
      const puerto = await elegirPuertoSerial();
      guardarDirecto({ tipo: "serial" });
      return { tipo: "serial", puerto };
    }
    if (bluetoothDisponible()) {
      const dispositivo = await elegirImpresoraBluetooth();
      guardarDirecto({ tipo: "bluetooth", id: dispositivo.id, nombre: dispositivo.name || "Impresora Bluetooth" });
      bluetoothEnSesion = dispositivo;
      return { tipo: "bluetooth", dispositivo };
    }
  } catch (error) {
    // Cerrar el selector equivale a "usar el diálogo del sistema": no se vuelve a preguntar.
    if (error instanceof DOMException && error.name === "NotFoundError") guardarDirecto({ tipo: "sistema" });
  }
  return SISTEMA;
}

/** Recuerda el tamaño elegido y, para ticket, resuelve la impresora dentro del gesto del usuario. */
export async function prepararImpresion(formato: FormatoImpresion): Promise<ImpresionPreparada> {
  guardarFormato(formato);
  return { formato, destino: formato === "TICKET" ? await resolverDestinoTicket() : null };
}

/** Envía un documento ya obtenido: A4 → PDF archivado de NubeFact (o A4 propio); Ticket → ESC/POS directo o diálogo del sistema. */
export async function imprimirDocumento(documento: DocumentoImprimible, preparada: ImpresionPreparada): Promise<Pick<ResultadoImpresion, "modo" | "errorDirecto">> {
  if (preparada.formato === "A4") {
    if (documento.electronico && documento.enlacePdf) {
      const propio = documento.enlacePdf.startsWith("/");
      const resultado = await imprimirPdf(propio ? urlApi(documento.enlacePdf) : documento.enlacePdf, propio);
      return { modo: resultado === "impreso" ? "dialogo" : "pestana" };
    }
    await imprimirHtml(a4Html(documento));
    return { modo: "dialogo" };
  }
  const destino = preparada.destino ?? SISTEMA;
  if (destino.tipo !== "sistema") {
    try {
      const bytes = ticketEscPos(documento);
      if (destino.tipo === "bluetooth") await enviarBluetooth(destino.dispositivo, bytes);
      else await enviarSerial(destino.puerto, bytes, BAUDIOS_SERIAL);
      return { modo: "directo" };
    } catch (errorDirecto) {
      // Impresora apagada o sin conexión: se ofrece el diálogo del sistema en vez de perder la impresión.
      await imprimirHtml(ticketHtml(documento), { anchoMm: ANCHO_TICKET_MM });
      return { modo: "dialogo", errorDirecto };
    }
  }
  await imprimirHtml(ticketHtml(documento), { anchoMm: ANCHO_TICKET_MM });
  return { modo: "dialogo" };
}

export async function ejecutarImpresion(obtener: ObtenerDocumento, preparada: ImpresionPreparada): Promise<ResultadoImpresion> {
  const documento = await obtener();
  return { ...(await imprimirDocumento(documento, preparada)), documento };
}
