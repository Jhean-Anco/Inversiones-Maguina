import { documentoInterno, emisorParaImpresion } from "../../impresion/documentos-internos";
import type { DocumentoImprimible } from "../../impresion/tipos";
import { type GuiaRemision, servicioIngresos } from "../../services/ingresos.service";

/**
 * Representación propia de una guía de remisión (se usa en Ticket, o en A4 cuando aún no hay PDF de NubeFact).
 * Los bienes se toman del comprobante de origen; si no se pueden consultar, se imprime sin detalle.
 */
export async function documentoDeGuia(guia: GuiaRemision): Promise<DocumentoImprimible> {
  const origen = guia.ingresoId ? await servicioIngresos.obtenerDocumentoParaGuia(guia.ingresoId).catch(() => null) : null;
  return documentoInterno({
    tipo: "GUIA_REMISION", titulo: `GUÍA DE REMISIÓN ${guia.tipo === "REMITENTE" ? "REMITENTE" : "TRANSPORTISTA"}`, codigo: guia.codigo, fecha: guia.fecha,
    contraparte: guia.clienteNombre ?? origen?.clienteNombreCompleto ?? "Sin destinatario",
    documentoContraparte: origen ? { tipo: origen.clienteTipoDocumento, numero: origen.clienteNumeroDocumento } : null,
    direccion: origen?.clienteDireccion,
    datosExtra: [
      ...(guia.comprobanteOrigen ? [{ etiqueta: "Comprobante origen", valor: guia.comprobanteOrigen.codigo }] : []),
      { etiqueta: "Estado", valor: guia.estado.replaceAll("_", " ") },
    ],
    lineas: (origen?.detalles ?? []).map((detalle) => ({ descripcion: detalle.descripcion, cantidad: Number(detalle.cantidad) || detalle.cantidad })),
    leyenda: guia.enlacePdf ? "Representación de referencia de la guía de remisión electrónica." : "Representación interna de referencia; el documento oficial es el emitido por SUNAT.",
    electronico: true, enlacePdf: guia.enlacePdf, emisor: await emisorParaImpresion(),
    advertencias: guia.estado === "EMITIDO" ? [] : ["La guía aún no está aceptada por SUNAT."],
  });
}
