import { BadRequestException, ConflictException } from "@nestjs/common";

type RespuestaComprobante = Record<string, unknown>;

export function analizarEstadoComprobante(
  estado: string,
  datos: RespuestaComprobante,
  respuesta: RespuestaComprobante,
) {
  const textoProveedor = (valor: unknown): string => typeof valor === "string" ? valor.trim()
    : Array.isArray(valor) ? valor.map(textoProveedor).filter(Boolean).join(" ")
      : valor && typeof valor === "object" ? Object.entries(valor as Record<string, unknown>).map(([campo, contenido]) => `${campo}: ${textoProveedor(contenido)}`).filter((texto) => !texto.endsWith(": ")).join("; ")
        : "";
  const errorTexto = [respuesta.errors, respuesta.error, respuesta.mensaje, respuesta.message, datos.mensaje]
    .map(textoProveedor).filter(Boolean).join(". ");
  const errorSunat = typeof respuesta.sunat_soap_error === "string" ? respuesta.sunat_soap_error.trim() : "";
  const descripcionSunat = typeof respuesta.sunat_description === "string" ? respuesta.sunat_description.trim()
    : typeof respuesta.sunat_note === "string" ? respuesta.sunat_note.trim() : "";
  const notaSunat = typeof respuesta.sunat_note === "string" ? respuesta.sunat_note.trim() : "";
  const codigoSunat = typeof respuesta.sunat_responsecode === "string" || typeof respuesta.sunat_responsecode === "number" ? String(respuesta.sunat_responsecode).trim() : "";
  const detalleRechazo = [descripcionSunat, notaSunat && notaSunat !== descripcionSunat ? notaSunat : "", codigoSunat ? `Código de respuesta SUNAT: ${codigoSunat}` : "", errorTexto]
    .filter(Boolean).join(" · ") || "SUNAT rechazó el comprobante, pero NubeFact no devolvió el motivo detallado.";
  const ticket = respuesta.sunat_ticket_numero;

  if (errorSunat) return { estadoProveedor: "ERROR_SUNAT", detalleProveedor: errorSunat };
  if (estado === "NUBEFACT_PENDIENTE") return { estadoProveedor: "PENDIENTE_CONFIRMACION", detalleProveedor: errorTexto || descripcionSunat || null };
  if (respuesta.aceptada_por_sunat === false) return { estadoProveedor: "RECHAZADO_SUNAT", detalleProveedor: detalleRechazo };
  if (errorTexto) return { estadoProveedor: "ERROR_NUBEFACT", detalleProveedor: errorTexto };
  if (respuesta.aceptada_por_sunat === true) return { estadoProveedor: "ACEPTADO_SUNAT", detalleProveedor: descripcionSunat || null };

  const estadoRemoto = [respuesta.estado, respuesta.status, respuesta.estado_comprobante].find((valor): valor is string => typeof valor === "string")?.trim().toLocaleLowerCase("es-PE") ?? "";
  if (ticket !== undefined && ticket !== null && String(ticket).trim()) return { estadoProveedor: "EN_PROCESO", detalleProveedor: descripcionSunat || "Ticket SUNAT " + String(ticket) };
  if (["en cola", "queued", "queue", "en proceso", "processing", "procesando", "pendiente"].some((texto) => estadoRemoto.includes(texto))) return { estadoProveedor: "EN_PROCESO", detalleProveedor: descripcionSunat || estadoRemoto };
  if (estado.startsWith("ERROR")) return { estadoProveedor: "ERROR_EMISION", detalleProveedor: descripcionSunat || null };
  return { estadoProveedor: "EMITIDO", detalleProveedor: descripcionSunat || null };
}

function diasEntreFechas(desde: string, hasta: string) {
  return Math.round((Date.parse(`${hasta}T00:00:00.000Z`) - Date.parse(`${desde}T00:00:00.000Z`)) / 86_400_000);
}

export function validarElegibilidadReintento(input: {
  tipoComprobante: string;
  fecha: string;
  estado: string;
  datos: RespuestaComprobante;
  respuesta: RespuestaComprobante;
  fechaHoy: string;
}) {
  if (input.tipoComprobante !== "BOLETA" && input.tipoComprobante !== "FACTURA") {
    throw new BadRequestException("Solo se puede reintentar la emisión de una boleta o factura electrónica.");
  }
  if (analizarEstadoComprobante(input.estado, input.datos, input.respuesta).estadoProveedor !== "RECHAZADO_SUNAT") {
    throw new ConflictException("Solo se puede reintentar una emisión que SUNAT haya rechazado. Si el estado está pendiente, consulta su resultado antes de enviar otra vez.");
  }
  const plazoEnvio = input.tipoComprobante === "BOLETA" ? 5 : 3;
  if (diasEntreFechas(input.fecha, input.fechaHoy) > plazoEnvio) {
    throw new BadRequestException(`El plazo de envío de esta ${input.tipoComprobante === "BOLETA" ? "boleta" : "factura"} venció. Corrige el motivo y registra un nuevo comprobante con la fecha que corresponda.`);
  }
}
