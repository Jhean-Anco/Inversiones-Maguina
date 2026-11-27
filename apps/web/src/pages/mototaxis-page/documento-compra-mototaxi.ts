import { documentoInterno, emisorParaImpresion } from "../../impresion/documentos-internos";
import type { DocumentoImprimible } from "../../impresion/tipos";
import type { CompraMototaxi } from "../../services/mototaxis.service";

const documentos: Record<string, string> = { FACTURA: "Factura", BOLETA: "Boleta", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento" };

/** Línea conocida al registrar la compra; el listado solo trae el total de unidades. */
export type LineaImprimibleCompraMototaxi = { descripcion: string; cantidad: number; costoUnitario: number };

/** Ticket de una compra de mototaxis: sin leyenda; si queda saldo, lo pagado va como adelanto. */
export async function documentoDeCompraMototaxi(compra: CompraMototaxi, lineas?: LineaImprimibleCompraMototaxi[]): Promise<DocumentoImprimible> {
  const total = Number(compra.total);
  const pagado = Number(compra.pagado);
  return documentoInterno({
    tipo: "COMPRA", titulo: "COMPRA DE MOTOTAXIS", codigo: compra.codigo, fecha: compra.fecha,
    contraparte: compra.proveedor?.trim() || "No especificado", etiquetaContraparte: "Proveedor",
    datosExtra: [
      { etiqueta: "Documento", valor: `${documentos[compra.documentoTipo] ?? compra.documentoTipo}${compra.documentoNumero ? ` ${compra.documentoNumero}` : ""}` },
    ],
    lineas: lineas?.length
      ? lineas.map((linea) => ({ descripcion: linea.descripcion, cantidad: linea.cantidad, precioUnitario: linea.costoUnitario, total: linea.cantidad * linea.costoUnitario }))
      : [{ descripcion: compra.unidades === 1 ? "Mototaxi" : "Mototaxis", cantidad: compra.unidades, total }],
    importes: { total },
    adelanto: pagado > 0 && pagado < total ? { monto: pagado, saldo: Math.max(0, total - pagado) } : null,
    observacion: compra.observacion,
    leyenda: "",
    advertencias: compra.estado === "ANULADA" ? ["COMPRA ANULADA"] : [],
    emisor: await emisorParaImpresion(),
  });
}
