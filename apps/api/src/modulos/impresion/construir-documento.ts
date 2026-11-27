import {
  cadenaQrSunat, type DocumentoImprimible, type EmisorImpresion, enlaceArchivado, etiquetaDocumentoCliente, etiquetaMedioPago,
  fechaIso, importe, type LineaImprimible, leyendaRepresentacion, montoEnLetras, respuestaVigente, type TipoImprimible, TITULOS,
} from "./representacion-impresa";

type Registro = Record<string, unknown>;
const objeto = (valor: unknown): Registro => valor && typeof valor === "object" && !Array.isArray(valor) ? valor as Registro : {};
const texto = (valor: unknown) => typeof valor === "string" && valor.trim() ? valor.trim() : typeof valor === "number" ? String(valor) : null;
const cantidad = (valor: unknown) => { const n = Number(valor); return Number.isFinite(n) && n > 0 ? String(Number(n.toFixed(3))) : "1"; };

/** Hora local de Perú (HH:mm) del registro, o null si no se conoce. */
export function horaPeru(fecha: Date | string | null | undefined) {
  if (!fecha) return null;
  const valor = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(valor.getTime())) return null;
  return new Intl.DateTimeFormat("es-PE", { timeZone: "America/Lima", hour: "2-digit", minute: "2-digit", hour12: false }).format(valor);
}

function advertenciasBase(emisor: EmisorImpresion | null) {
  void emisor;
  return [] as string[];
}

export type EntradaElectronico = {
  tipo: Exclude<TipoImprimible, "NOTA_VENTA">;
  emisor: EmisorImpresion | null;
  rucRespaldo: string | null;
  datosNubefact: unknown;
  creadoEn: Date | string | null;
  condicionPago: "CONTADO" | "CREDITO";
  medioPago: string | null;
  tasaIgv: string | number;
  documentoModificado?: { serieNumero: string; motivo: string } | null;
};

/**
 * Construye la representación impresa a partir de la trama exacta enviada a NubeFact
 * (`datosNubefact.solicitud`) y de su respuesta vigente (hash y cadena QR).
 */
export function documentoDesdeTrama(entrada: EntradaElectronico): DocumentoImprimible {
  const datos = objeto(entrada.datosNubefact);
  const solicitud = objeto(datos.solicitud);
  const respuesta = respuestaVigente(datos);
  const serie = texto(solicitud.serie) ?? texto(datos.serie) ?? "";
  const numeroBruto = Number(solicitud.numero ?? datos.numero);
  const numerado = Boolean(serie) && Number.isInteger(numeroBruto);
  const serieNumero = numerado ? `${serie}-${String(numeroBruto).padStart(6, "0")}` : "SIN NUMERAR";
  const fechaEmision = fechaIso(solicitud.fecha_de_emision) ?? "";
  const items: LineaImprimible[] = (Array.isArray(solicitud.items) ? solicitud.items : []).map(objeto).map((item) => ({
    codigo: texto(item.codigo),
    descripcion: texto(item.descripcion) ?? "",
    unidad: texto(item.unidad_de_medida),
    cantidad: cantidad(item.cantidad),
    precioUnitario: importe(item.precio_unitario),
    descuento: Number(item.descuento) > 0 ? importe(item.descuento) : null,
    total: importe(item.total),
  }));
  const total = importe(solicitud.total);
  const igv = importe(solicitud.total_igv);
  const tipoDocumentoCliente = texto(solicitud.cliente_tipo_de_documento);
  const numeroDocumentoCliente = texto(solicitud.cliente_numero_de_documento);
  const hash = texto(respuesta.codigo_hash);
  const ruc = entrada.emisor?.ruc ?? entrada.rucRespaldo;
  const cadenaQr = texto(respuesta.cadena_para_codigo_qr)
    ?? (ruc && numerado ? cadenaQrSunat({ ruc, tipo: entrada.tipo, serieNumero, igv, total, fecha: fechaEmision, tipoDocumentoCliente, numeroDocumentoCliente: numeroDocumentoCliente === "-" ? null : numeroDocumentoCliente, hash }) : null);
  const advertencias = advertenciasBase(entrada.emisor);
  if (!hash) advertencias.push("NubeFact aún no devolvió el código hash; el comprobante puede estar pendiente de confirmación.");
  const cuotas = (Array.isArray(solicitud.venta_al_credito) ? solicitud.venta_al_credito : []).map(objeto).map((cuota, indice) => ({
    cuota: Number(cuota.cuota) || indice + 1, fecha: fechaIso(cuota.fecha_de_pago) ?? "", importe: importe(cuota.importe),
  }));
  return {
    tipo: entrada.tipo,
    titulo: TITULOS[entrada.tipo],
    electronico: true,
    serieNumero,
    fechaEmision,
    horaEmision: horaPeru(entrada.creadoEn),
    fechaVencimiento: fechaIso(solicitud.fecha_de_vencimiento),
    moneda: "PEN",
    emisor: entrada.emisor,
    cliente: {
      tipoDocumento: tipoDocumentoCliente === "-" ? null : etiquetaDocumentoCliente(tipoDocumentoCliente),
      numeroDocumento: numeroDocumentoCliente === "-" ? null : numeroDocumentoCliente,
      nombre: texto(solicitud.cliente_denominacion) ?? "CLIENTES VARIOS",
      direccion: texto(solicitud.cliente_direccion),
    },
    items,
    totales: {
      gravada: importe(solicitud.total_gravada), exonerada: importe(solicitud.total_exonerada), inafecta: importe(solicitud.total_inafecta),
      descuento: importe(solicitud.total_descuento), igv, tasaIgv: importe(solicitud.porcentaje_de_igv ?? entrada.tasaIgv), total,
    },
    montoEnLetras: montoEnLetras(total),
    condicionPago: entrada.condicionPago,
    medioPago: entrada.condicionPago === "CREDITO" ? null : etiquetaMedioPago(entrada.medioPago) ?? texto(solicitud.medio_de_pago),
    cuotas,
    documentoModificado: entrada.documentoModificado ?? null,
    observacion: texto(solicitud.observaciones),
    hash,
    cadenaQr,
    leyenda: leyendaRepresentacion(entrada.tipo, entrada.emisor),
    enlacePdf: enlaceArchivado(datos, "PDF") ?? texto(respuesta.enlace_del_pdf),
    advertencias,
  };
}

export type EntradaNotaVenta = {
  emisor: EmisorImpresion | null;
  codigo: string;
  fecha: string;
  creadoEn: Date | string | null;
  cliente: { tipoDocumento: string | null; numeroDocumento: string | null; nombre: string | null; direccion: string | null };
  medioPago: string;
  condicionPago: "CONTADO" | "CREDITO";
  subtotal: string;
  igv: string;
  tasaIgv: string;
  total: string;
  observacion: string | null;
  detalles: { codigo: string | null; descripcion: string; unidad: string | null; cantidad: string; precioUnitario: string; descuento: string; total: string }[];
  datosNubefact: unknown;
};

export function documentoNotaVenta(entrada: EntradaNotaVenta): DocumentoImprimible {
  return {
    tipo: "NOTA_VENTA",
    titulo: TITULOS.NOTA_VENTA,
    electronico: false,
    serieNumero: entrada.codigo,
    fechaEmision: entrada.fecha,
    horaEmision: horaPeru(entrada.creadoEn),
    fechaVencimiento: null,
    moneda: "PEN",
    emisor: entrada.emisor,
    cliente: {
      tipoDocumento: etiquetaDocumentoCliente(entrada.cliente.tipoDocumento),
      numeroDocumento: entrada.cliente.numeroDocumento,
      nombre: entrada.cliente.nombre ?? "CLIENTES VARIOS",
      direccion: entrada.cliente.direccion,
    },
    items: entrada.detalles.map((detalle) => ({
      codigo: detalle.codigo, descripcion: detalle.descripcion, unidad: detalle.unidad, cantidad: cantidad(detalle.cantidad),
      precioUnitario: importe(detalle.precioUnitario), descuento: Number(detalle.descuento) > 0 ? importe(detalle.descuento) : null, total: importe(detalle.total),
    })),
    totales: { gravada: importe(entrada.subtotal), exonerada: "0.00", inafecta: "0.00", descuento: "0.00", igv: importe(entrada.igv), tasaIgv: importe(entrada.tasaIgv), total: importe(entrada.total) },
    montoEnLetras: montoEnLetras(entrada.total),
    condicionPago: entrada.condicionPago,
    medioPago: etiquetaMedioPago(entrada.medioPago),
    cuotas: [],
    documentoModificado: null,
    observacion: entrada.observacion,
    hash: null,
    cadenaQr: null,
    leyenda: leyendaRepresentacion("NOTA_VENTA", entrada.emisor),
    enlacePdf: enlaceArchivado(entrada.datosNubefact, "HTML"),
    advertencias: advertenciasBase(entrada.emisor),
  };
}
