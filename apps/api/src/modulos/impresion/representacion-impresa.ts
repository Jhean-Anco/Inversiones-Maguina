import { montoEnLetras } from "./monto-en-letras";

export type TipoImprimible = "FACTURA" | "BOLETA" | "NOTA_VENTA" | "NOTA_CREDITO" | "NOTA_DEBITO";

export type EmisorImpresion = {
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

export type LineaImprimible = { codigo: string | null; descripcion: string; unidad: string | null; cantidad: string; precioUnitario: string; descuento: string | null; total: string };

export type DocumentoImprimible = {
  tipo: TipoImprimible;
  titulo: string;
  electronico: boolean;
  serieNumero: string;
  fechaEmision: string;
  horaEmision: string | null;
  fechaVencimiento: string | null;
  moneda: "PEN";
  emisor: EmisorImpresion | null;
  cliente: { tipoDocumento: string | null; numeroDocumento: string | null; nombre: string; direccion: string | null };
  items: LineaImprimible[];
  totales: { gravada: string; exonerada: string; inafecta: string; descuento: string; igv: string; tasaIgv: string; total: string };
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

type Registro = Record<string, unknown>;

export const TITULOS: Record<TipoImprimible, string> = {
  FACTURA: "FACTURA ELECTRÓNICA",
  BOLETA: "BOLETA DE VENTA ELECTRÓNICA",
  NOTA_CREDITO: "NOTA DE CRÉDITO ELECTRÓNICA",
  NOTA_DEBITO: "NOTA DE DÉBITO ELECTRÓNICA",
  NOTA_VENTA: "NOTA DE VENTA",
};
const CODIGO_SUNAT: Partial<Record<TipoImprimible, string>> = { FACTURA: "01", BOLETA: "03", NOTA_CREDITO: "07", NOTA_DEBITO: "08" };
const DOCUMENTO_CLIENTE: Record<string, { etiqueta: string; sunat: string }> = {
  "1": { etiqueta: "DNI", sunat: "1" }, DNI: { etiqueta: "DNI", sunat: "1" }, "01": { etiqueta: "DNI", sunat: "1" },
  "6": { etiqueta: "RUC", sunat: "6" }, RUC: { etiqueta: "RUC", sunat: "6" }, "06": { etiqueta: "RUC", sunat: "6" },
  "4": { etiqueta: "CE", sunat: "4" }, CE: { etiqueta: "CE", sunat: "4" }, "04": { etiqueta: "CE", sunat: "4" },
  "7": { etiqueta: "PASAPORTE", sunat: "7" }, PASAPORTE: { etiqueta: "PASAPORTE", sunat: "7" }, "07": { etiqueta: "PASAPORTE", sunat: "7" },
};
const MEDIOS_PAGO: Record<string, string> = { EFECTIVO: "Efectivo", TARJETA: "Tarjeta", TRANSFERENCIA: "Transferencia", BILLETERA_DIGITAL: "Billetera digital", OTRO: "Otro" };

const objeto = (valor: unknown): Registro => valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Registro : {};
const textoONulo = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : typeof valor === "number" ? String(valor) : null;
export const importe = (valor: unknown) => {
  const numero = typeof valor === "number" ? valor : typeof valor === "string" && valor.trim() ? Number(valor) : 0;
  return (Number.isFinite(numero) ? numero : 0).toFixed(2);
};
/** "25-11-2026" (formato NubeFact) o "2026-11-25" → "2026-11-25". */
export const fechaIso = (valor: unknown) => {
  const texto = textoONulo(valor);
  if (!texto) return null;
  const dma = /^(\d{2})-(\d{2})-(\d{4})$/.exec(texto);
  return dma ? `${dma[3]}-${dma[2]}-${dma[1]}` : /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null;
};

/** Respuesta vigente: la última consulta de estado prevalece sobre la respuesta de emisión. */
export function respuestaVigente(datosNubefact: unknown): Registro {
  const datos = objeto(datosNubefact);
  const consultada = objeto(objeto(datos.consultaComprobante).respuesta);
  return Object.keys(consultada).length ? { ...objeto(datos.respuesta), ...consultada } : objeto(datos.respuesta);
}

export function enlaceArchivado(datosNubefact: unknown, tipo: string): string | null {
  const guardados = objeto(objeto(datosNubefact).archivos).guardados;
  const archivo = Array.isArray(guardados) ? guardados.map(objeto).find((item) => item.tipo === tipo && typeof item.ruta === "string") : undefined;
  return archivo ? String(archivo.ruta) : null;
}

/** Cadena QR según el formato de SUNAT cuando NubeFact no devolvió `cadena_para_codigo_qr`. */
export function cadenaQrSunat(datos: { ruc: string; tipo: TipoImprimible; serieNumero: string; igv: string; total: string; fecha: string; tipoDocumentoCliente: string | null; numeroDocumentoCliente: string | null; hash: string | null }) {
  const codigo = CODIGO_SUNAT[datos.tipo];
  if (!codigo) return null;
  const [serie, numero] = datos.serieNumero.split("-");
  const tipoCliente = DOCUMENTO_CLIENTE[datos.tipoDocumentoCliente ?? ""]?.sunat ?? "-";
  return [datos.ruc, codigo, serie, numero, datos.igv, datos.total, datos.fecha, tipoCliente, datos.numeroDocumentoCliente ?? "-", datos.hash ?? ""].join("|").concat("|");
}

export function leyendaRepresentacion(tipo: TipoImprimible, emisor: EmisorImpresion | null) {
  if (tipo === "NOTA_VENTA") return "Documento interno sin valor tributario. Solicite su comprobante electrónico si lo requiere.";
  const consulta = emisor?.urlConsultaComprobantes ? ` Consulte su documento en ${emisor.urlConsultaComprobantes}` : "";
  return `Representación impresa de la ${TITULOS[tipo]}.${consulta}`;
}

export function etiquetaDocumentoCliente(tipo: unknown) {
  const clave = textoONulo(tipo);
  return clave ? DOCUMENTO_CLIENTE[clave]?.etiqueta ?? clave : null;
}

export function etiquetaMedioPago(medio: unknown) {
  const clave = textoONulo(medio);
  return clave ? MEDIOS_PAGO[clave] ?? clave : null;
}

export { montoEnLetras };
