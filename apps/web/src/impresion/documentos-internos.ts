import { servicioEmpresa } from "../services/empresa.service";
import type { DocumentoImprimible, TipoDocumentoImprimible } from "./tipos";

type TipoInterno = Extract<TipoDocumentoImprimible, "ORDEN_SERVICIO" | "COTIZACION" | "GUIA_REMISION" | "COMPRA">;
type Emisor = DocumentoImprimible["emisor"];

export type DatosDocumentoInterno = {
  tipo: TipoInterno;
  titulo: string;
  codigo: string;
  /** Fecha ISO (`aaaa-mm-dd`, se ignora la hora). */
  fecha: string;
  vencimiento?: string | null;
  contraparte: string;
  etiquetaContraparte?: string;
  documentoContraparte?: { tipo: string; numero: string } | null;
  direccion?: string | null;
  datosExtra?: { etiqueta: string; valor: string }[];
  lineas: { descripcion: string; cantidad: number | string; precioUnitario?: number | null; descuento?: number | null; total?: number | null }[];
  /** Importes del documento; sin ellos (guías de remisión) no se imprime ningún total. */
  importes?: { total: number; subtotal?: number; igv?: number; tasaIgv?: number } | null;
  medioPago?: string | null;
  observacion?: string | null;
  leyenda?: string;
  electronico?: boolean;
  enlacePdf?: string | null;
  advertencias?: string[];
  emisor: Emisor;
};

const dinero = (valor: number) => valor.toFixed(2);

/** Arma el documento imprimible de órdenes, cotizaciones, guías y compras con los datos ya cargados en pantalla. */
export function documentoInterno(d: DatosDocumentoInterno): DocumentoImprimible {
  const importes = d.importes;
  const gravada = importes ? importes.subtotal ?? importes.total : 0;
  return {
    tipo: d.tipo, titulo: d.titulo, electronico: d.electronico ?? false, serieNumero: d.codigo, fechaEmision: d.fecha.slice(0, 10), horaEmision: null,
    fechaVencimiento: d.vencimiento ? d.vencimiento.slice(0, 10) : null, moneda: "PEN", emisor: d.emisor,
    cliente: { tipoDocumento: d.documentoContraparte?.tipo ?? null, numeroDocumento: d.documentoContraparte?.numero ?? null, nombre: d.contraparte, direccion: d.direccion ?? null },
    etiquetaCliente: d.etiquetaContraparte, datosExtra: d.datosExtra,
    items: d.lineas.map((linea) => ({
      codigo: null, descripcion: linea.descripcion, unidad: null, cantidad: String(linea.cantidad),
      precioUnitario: linea.precioUnitario == null ? null : dinero(linea.precioUnitario),
      descuento: linea.descuento ? dinero(linea.descuento) : null,
      total: linea.total == null ? null : dinero(linea.total),
    })),
    totales: importes ? { gravada: dinero(gravada), exonerada: "0.00", inafecta: "0.00", descuento: "0.00", igv: dinero(importes.igv ?? 0), tasaIgv: dinero(importes.tasaIgv ?? 0), total: dinero(importes.total) } : null,
    montoEnLetras: "", condicionPago: "CONTADO", medioPago: d.medioPago ?? null, cuotas: [], documentoModificado: null, observacion: d.observacion || null,
    hash: null, cadenaQr: null, leyenda: d.leyenda ?? "Documento interno sin valor tributario.", enlacePdf: d.enlacePdf ?? null,
    advertencias: [...(d.advertencias ?? []), ...(d.emisor ? [] : ["Configura los datos de la empresa (EMPRESA_RUC, EMPRESA_RAZON_SOCIAL y EMPRESA_DIRECCION) para que aparezcan en el documento."])],
  };
}

let emisorEnCache: Emisor = null;

/** Datos del emisor para los documentos internos; se guardan al obtenerlos y, si falla la consulta, se imprime sin ellos. */
export async function emisorParaImpresion(): Promise<Emisor> {
  if (emisorEnCache) return emisorEnCache;
  emisorEnCache = await servicioEmpresa.obtener().catch(() => null);
  return emisorEnCache;
}
