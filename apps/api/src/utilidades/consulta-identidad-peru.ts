import { BadGatewayException, BadRequestException, NotFoundException, ServiceUnavailableException } from "@nestjs/common";
import { rucPeruValido } from "./ruc-peru";

export type TipoDocumentoIdentidad = "DNI" | "RUC";

export type IdentidadPeru = {
  tipoDocumento: TipoDocumentoIdentidad;
  numeroDocumento: string;
  tipoPersona: "NATURAL" | "JURIDICA";
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  razonSocial?: string;
  direccion?: string;
};

export async function consultarIdentidadPeru(tipoEntrada?: string, numeroEntrada?: string): Promise<IdentidadPeru> {
  const tipoDocumento = tipoEntrada?.trim().toUpperCase();
  const numeroDocumento = numeroEntrada?.trim() ?? "";
  if (tipoDocumento !== "DNI" && tipoDocumento !== "RUC") throw new BadRequestException("La consulta de identidad está disponible para DNI y RUC.");
  if (tipoDocumento === "DNI" && !/^\d{8}$/.test(numeroDocumento)) throw new BadRequestException("Ingresa los 8 dígitos del DNI.");
  if (tipoDocumento === "RUC" && !rucPeruValido(numeroDocumento)) throw new BadRequestException("Ingresa un RUC válido de 11 dígitos.");

  const token = process.env.APIS_PERU_TOKEN?.trim();
  if (!token) throw new ServiceUnavailableException("La consulta de DNI/RUC no está configurada en el servidor.");
  const ruta = tipoDocumento === "RUC" ? "ruc" : "dni";
  let respuesta: Response;
  try {
    const url = new URL(`https://dniruc.apisperu.com/api/v1/${ruta}/${encodeURIComponent(numeroDocumento)}`);
    url.searchParams.set("token", token);
    respuesta = await fetch(url, { headers: { Accept: "application/json", "User-Agent": "InversionesMagina/1.0" }, signal: AbortSignal.timeout(10000) });
  } catch {
    throw new ServiceUnavailableException("No se pudo conectar con APIS Perú. Inténtalo nuevamente.");
  }

  if (respuesta.status === 401) throw new ServiceUnavailableException("APIS Perú rechazó el token configurado en el servidor.");
  if (respuesta.status === 403) throw new ServiceUnavailableException("APIS Perú denegó la consulta. Revisa los permisos del token o el acceso de la IP del servidor.");
  if (respuesta.status === 404) throw new NotFoundException(`No se encontró información para ese ${tipoDocumento}.`);
  if (respuesta.status === 422) throw new BadRequestException(`APIS Perú rechazó el número de ${tipoDocumento}. Verifica el documento.`);
  if (respuesta.status === 429) throw new ServiceUnavailableException("APIS Perú alcanzó el límite de consultas. Espera un momento e inténtalo nuevamente.");
  if (!respuesta.ok) throw new BadGatewayException("APIS Perú no pudo completar la consulta. Inténtalo nuevamente.");

  let original: Record<string, unknown>;
  try {
    const cuerpo: unknown = await respuesta.json();
    if (typeof cuerpo !== "object" || cuerpo === null || Array.isArray(cuerpo)) throw new Error("Invalid provider response");
    original = cuerpo as Record<string, unknown>;
  } catch {
    throw new BadGatewayException("APIS Perú devolvió una respuesta que no se pudo interpretar.");
  }
  const campo = (valor: unknown) => typeof valor === "string" ? valor.trim() : "";
  if (original.success === false) throw new NotFoundException(`No se encontró información para ese ${tipoDocumento}.`);
  const nombre = campo(original.razon_social) || campo(original.razonSocial) || campo(original.full_name) || campo(original.nombre);

  if (tipoDocumento === "RUC") {
    if (!nombre) throw new BadGatewayException("APIS Perú devolvió una respuesta sin razón social o nombre.");
    if (numeroDocumento.startsWith("20")) return { tipoDocumento, numeroDocumento, tipoPersona: "JURIDICA", razonSocial: nombre, direccion: campo(original.direccion) };
    const partes = nombre.split(/\s+/).filter(Boolean);
    return { tipoDocumento, numeroDocumento, tipoPersona: "NATURAL", razonSocial: nombre, apellidoPaterno: partes[0] ?? "", apellidoMaterno: partes[1] ?? "", nombres: partes.slice(2).join(" "), direccion: campo(original.direccion) };
  }

  const partes = nombre.split(/\s+/).filter(Boolean);
  const nombres = campo(original.first_name) || campo(original.nombres) || partes.slice(2).join(" ");
  const apellidoPaterno = campo(original.first_last_name) || campo(original.apellidoPaterno) || partes[0] || "";
  const apellidoMaterno = campo(original.second_last_name) || campo(original.apellidoMaterno) || partes[1] || "";
  if (!nombres || !apellidoPaterno) throw new BadGatewayException("APIS Perú devolvió una respuesta incompleta para este DNI.");
  return { tipoDocumento, numeroDocumento, tipoPersona: "NATURAL", nombres, apellidoPaterno, apellidoMaterno, direccion: campo(original.direccion) };
}
