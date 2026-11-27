import { documentoInterno, emisorParaImpresion } from "../../../impresion/documentos-internos";
import type { DocumentoImprimible } from "../../../impresion/tipos";
import type { EntradaStock } from "../../../services/inventario/entradas-stock.service";

const nombresDocumentos: Record<string, string> = {
  FACTURA: "Factura", BOLETA: "Boleta", GUIA_REMISION: "Guía de remisión", NOTA: "Nota", SIN_DOCUMENTO: "Sin documento", OTRO: "Otro",
};

/** Constancia imprimible (A4 o ticket) de una compra de repuestos ya registrada. */
export async function documentoDeCompra(entrada: EntradaStock): Promise<DocumentoImprimible> {
  const total = Number(entrada.totalDocumento ?? entrada.total ?? 0);
  const pagado = entrada.montoPagado == null ? null : Number(entrada.montoPagado);
  return documentoInterno({
    tipo: "COMPRA", titulo: "COMPRA DE REPUESTOS", codigo: entrada.codigo, fecha: entrada.fecha,
    contraparte: entrada.proveedor || "No especificado", etiquetaContraparte: "Proveedor",
    documentoContraparte: entrada.proveedorTipoDocumento && entrada.proveedorNumeroDocumento ? { tipo: entrada.proveedorTipoDocumento, numero: entrada.proveedorNumeroDocumento } : null,
    direccion: entrada.proveedorDireccion,
    datosExtra: [
      { etiqueta: "Documento", valor: `${nombresDocumentos[entrada.tipoDocumento] ?? entrada.tipoDocumento}${entrada.numeroDocumento ? ` ${entrada.numeroDocumento}` : ""}` },
    ],
    lineas: (entrada.detalles ?? []).map((detalle) => ({
      descripcion: detalle.nombreProducto, cantidad: detalle.cantidad,
      precioUnitario: Number(detalle.costoUnitario), total: Number(detalle.subtotal),
    })),
    importes: { total },
    adelanto: pagado !== null && pagado > 0 && pagado < total ? { monto: pagado, saldo: Math.max(0, total - pagado) } : null,
    medioPago: entrada.medioPago, observacion: entrada.observacion,
    leyenda: "",
    advertencias: entrada.estado === "ANULADA" ? ["COMPRA ANULADA"] : [],
    emisor: await emisorParaImpresion(),
  });
}
