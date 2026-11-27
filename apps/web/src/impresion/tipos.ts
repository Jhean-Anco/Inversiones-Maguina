export type TipoDocumentoImprimible =
  | "FACTURA" | "BOLETA" | "NOTA_VENTA" | "NOTA_CREDITO" | "NOTA_DEBITO"
  | "ORDEN_SERVICIO" | "COTIZACION" | "GUIA_REMISION" | "COMPRA";

/**
 * Documento listo para imprimir. Los comprobantes de venta llegan de `GET /impresion/ingresos/:id`
 * (mismo contrato que el API); órdenes, cotizaciones, guías y compras se arman en el navegador
 * (`documentos-internos.ts`) con los datos ya cargados.
 */
export type DocumentoImprimible = {
  tipo: TipoDocumentoImprimible;
  titulo: string;
  electronico: boolean;
  serieNumero: string;
  fechaEmision: string;
  horaEmision: string | null;
  fechaVencimiento: string | null;
  moneda: "PEN";
  emisor: {
    ruc: string; razonSocial: string; nombreComercial: string | null; direccion: string; telefono: string | null; correo: string | null;
    sitioWeb: string | null; mensajePie: string | null; urlConsultaComprobantes: string | null;
  } | null;
  cliente: { tipoDocumento: string | null; numeroDocumento: string | null; nombre: string; direccion: string | null };
  /** Rótulo de la contraparte; por defecto "Cliente" (en compras es "Proveedor"). */
  etiquetaCliente?: string;
  /** Datos adicionales en pares rótulo/valor (vehículo, vigencia, estado…). */
  datosExtra?: { etiqueta: string; valor: string }[];
  items: { codigo: string | null; descripcion: string; unidad: string | null; cantidad: string; precioUnitario: string | null; descuento: string | null; total: string | null }[];
  /** Null en documentos sin importes (guías de remisión). */
  totales: { gravada: string; exonerada: string; inafecta: string; descuento: string; igv: string; tasaIgv: string; total: string } | null;
  montoEnLetras: string;
  condicionPago: "CONTADO" | "CREDITO";
  medioPago: string | null;
  cuotas: { cuota: number; fecha: string; importe: string }[];
  documentoModificado: { serieNumero: string; motivo: string } | null;
  observacion: string | null;
  hash: string | null;
  cadenaQr: string | null;
  leyenda: string;
  enlacePdf: string | null;
  advertencias: string[];
};

/** Los dos tamaños disponibles: hoja A4 o ticket térmico de 80 mm. */
export type FormatoImpresion = "A4" | "TICKET";

/** Columnas de texto de un rollo de 80 mm (fuente A de una térmica estándar). */
export const COLUMNAS_TICKET = 48;
