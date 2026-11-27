import { documentoInterno, emisorParaImpresion } from "../../impresion/documentos-internos";
import type { DocumentoImprimible } from "../../impresion/tipos";
import type { CompraMototaxi } from "../../services/mototaxis.service";

/** Constancia imprimible (A4 o ticket) de una compra de mototaxis, con el resumen que muestra el listado. */
export async function documentoDeCompraMototaxi(compra: CompraMototaxi): Promise<DocumentoImprimible> {
  const total = Number(compra.total);
  return documentoInterno({
    tipo: "COMPRA", titulo: "COMPRA DE MOTOTAXIS", codigo: compra.codigo, fecha: compra.fecha,
    contraparte: compra.proveedor, etiquetaContraparte: "Proveedor",
    datosExtra: [
      { etiqueta: "Documento", valor: `${compra.documentoTipo.replaceAll("_", " ")}${compra.documentoNumero ? ` ${compra.documentoNumero}` : ""}` },
      { etiqueta: "Pagado", valor: `S/ ${Number(compra.pagado).toFixed(2)}` },
      { etiqueta: "Saldo", valor: `S/ ${Number(compra.saldo).toFixed(2)}` },
    ],
    lineas: [{ descripcion: compra.unidades === 1 ? "Mototaxi" : "Mototaxis", cantidad: compra.unidades, total }],
    importes: { total }, observacion: compra.observacion,
    leyenda: "Constancia interna de compra de mototaxis. Documento sin valor tributario.",
    advertencias: compra.estado === "ANULADA" ? ["COMPRA ANULADA"] : [],
    emisor: await emisorParaImpresion(),
  });
}
