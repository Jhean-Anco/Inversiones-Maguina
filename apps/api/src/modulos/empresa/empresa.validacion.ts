import { BadRequestException } from "@nestjs/common";
import { rucPeruValido } from "../../utilidades/ruc-peru";

export type DatosEmpresa = {
  ruc: string;
  razonSocial: string;
  nombreComercial: string | null;
  direccion: string;
  telefono: string | null;
  correo: string | null;
  sitioWeb: string | null;
  mensajePie: string | null;
  urlConsultaComprobantes: string | null;
};

function texto(valor: unknown, etiqueta: string, maximo: number, requerido: true): string;
function texto(valor: unknown, etiqueta: string, maximo: number, requerido?: false): string | null;
function texto(valor: unknown, etiqueta: string, maximo: number, requerido = false) {
  if (valor !== undefined && valor !== null && typeof valor !== "string") throw new BadRequestException(`${etiqueta} no es válido.`);
  const limpio = (valor ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) {
    if (requerido) throw new BadRequestException(`Ingresa ${etiqueta.toLocaleLowerCase("es-PE")}.`);
    return null;
  }
  if (limpio.length > maximo) throw new BadRequestException(`${etiqueta} admite como máximo ${maximo} caracteres.`);
  return limpio;
}

function urlHttps(valor: unknown, etiqueta: string) {
  const limpio = texto(valor, etiqueta, 300);
  if (!limpio) return null;
  let url: URL;
  try { url = new URL(limpio); } catch { throw new BadRequestException(`${etiqueta} debe ser una dirección web válida.`); }
  if (url.protocol !== "https:" || url.username || url.password) throw new BadRequestException(`${etiqueta} debe usar HTTPS.`);
  return url.toString();
}

/** Valida y normaliza los datos del emisor mostrados en los comprobantes impresos. */
export function validarDatosEmpresa(entrada: unknown): DatosEmpresa {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)) throw new BadRequestException("Envía los datos de la empresa.");
  const datos = entrada as Record<string, unknown>;
  const ruc = texto(datos.ruc, "El RUC", 11, true);
  if (!rucPeruValido(ruc)) throw new BadRequestException("El RUC no es válido.");
  const correo = texto(datos.correo, "El correo", 160);
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) throw new BadRequestException("El correo no es válido.");
  const sitio = texto(datos.sitioWeb, "El sitio web", 160);
  return {
    ruc,
    razonSocial: texto(datos.razonSocial, "La razón social", 200, true).toLocaleUpperCase("es-PE"),
    nombreComercial: texto(datos.nombreComercial, "El nombre comercial", 200),
    direccion: texto(datos.direccion, "La dirección fiscal", 300, true),
    telefono: texto(datos.telefono, "El teléfono", 60),
    correo: correo?.toLocaleLowerCase("es-PE") ?? null,
    sitioWeb: sitio,
    mensajePie: texto(datos.mensajePie, "El mensaje al pie", 300),
    urlConsultaComprobantes: urlHttps(datos.urlConsultaComprobantes, "La URL de consulta"),
  };
}

/**
 * Datos del emisor definidos por variables de entorno (`EMPRESA_*`), usados cuando la tabla
 * `configuracion_empresa` está vacía. Devuelve null si no hay RUC, razón social ni dirección.
 * Lanza si lo configurado no es válido, para detectarlo al iniciar el servidor.
 */
export function datosEmpresaDesdeEntorno(entorno: Record<string, string | undefined> = process.env): DatosEmpresa | null {
  const valor = (nombre: string) => entorno[nombre]?.trim() || undefined;
  if (!valor("EMPRESA_RUC") && !valor("EMPRESA_RAZON_SOCIAL") && !valor("EMPRESA_DIRECCION")) return null;
  try {
    return validarDatosEmpresa({
      ruc: valor("EMPRESA_RUC"), razonSocial: valor("EMPRESA_RAZON_SOCIAL"), direccion: valor("EMPRESA_DIRECCION"),
      telefono: valor("EMPRESA_TELEFONO"), mensajePie: valor("EMPRESA_MENSAJE_PIE"),
    });
  } catch (error) {
    throw new Error(`Datos de empresa del entorno inválidos: ${error instanceof Error ? error.message : "revisa EMPRESA_*"} Define EMPRESA_RUC, EMPRESA_RAZON_SOCIAL y EMPRESA_DIRECCION.`);
  }
}
