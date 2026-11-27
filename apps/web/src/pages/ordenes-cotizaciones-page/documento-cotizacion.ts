import { documentoInterno, emisorParaImpresion } from "../../impresion/documentos-internos";
import type { DocumentoImprimible } from "../../impresion/tipos";
import type { Cotizacion } from "../../services/ingresos.service";
import { calcularTotalesCotizacion, importeLineaCotizacion } from "./gestion-utils";

/**
 * Documento imprimible (A4 o ticket) de una cotización, armado con los datos ya cargados.
 * `clienteNombre` permite imprimir con el cliente recién elegido antes de que el listado se actualice.
 */
export async function documentoDeCotizacion(cotizacion: Cotizacion, clienteNombre?: string | null): Promise<DocumentoImprimible> {
  const { subtotal, igv, total, tasaIgv } = calcularTotalesCotizacion(cotizacion.detalles, cotizacion.aplicaIgv);
  return documentoInterno({
    tipo: "COTIZACION", titulo: "COTIZACIÓN", codigo: cotizacion.codigo, fecha: cotizacion.fecha, vencimiento: cotizacion.vigenteHasta,
    contraparte: clienteNombre ?? cotizacion.clienteNombre ?? "Sin cliente",
    datosExtra: [{ etiqueta: "Estado", valor: cotizacion.estado }],
    lineas: cotizacion.detalles.map((linea) => {
      const cantidad = Number(linea.cantidad ?? 1);
      return { descripcion: String(linea.nombreVisible ?? linea.descripcion ?? "Repuesto"), cantidad, precioUnitario: Number(linea.precioUnitario ?? 0), descuento: Number(linea.descuento ?? 0), total: importeLineaCotizacion(linea) };
    }),
    importes: { total, subtotal: subtotal ?? undefined, igv: igv ?? undefined, tasaIgv },
    observacion: cotizacion.observacion,
    leyenda: "Cotización sujeta a vigencia y disponibilidad de stock. Documento sin valor tributario.",
    emisor: await emisorParaImpresion(),
  });
}
