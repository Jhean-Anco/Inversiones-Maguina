import type { DocumentoImprimible } from "../impresion/tipos";

export const emisorEjemplo: DocumentoImprimible["emisor"] = {
  ruc: "20100066603", razonSocial: "INVERSIONES DEMO SAC", nombreComercial: "Demo Motos", direccion: "Av. Uno 123", telefono: "999",
  correo: "a@b.pe", sitioWeb: null, mensajePie: "¡Gracias!", urlConsultaComprobantes: null,
};

/** Nota de venta de ejemplo (sin valor tributario) para probar plantillas y flujos de impresión. */
export function documentoEjemplo(emisor: DocumentoImprimible["emisor"] = emisorEjemplo): DocumentoImprimible {
  return {
    tipo: "NOTA_VENTA", titulo: "NOTA DE VENTA", electronico: false, serieNumero: "NV01-000001", fechaEmision: "2026-11-25", horaEmision: "10:00", fechaVencimiento: null, moneda: "PEN",
    emisor, cliente: { tipoDocumento: "DNI", numeroDocumento: "00000000", nombre: "Cliente de prueba · Ñandú Ávila", direccion: null },
    items: [
      { codigo: "P-001", descripcion: "Filtro de aceite (repuesto de prueba)", unidad: "NIU", cantidad: "2", precioUnitario: "25.00", descuento: null, total: "50.00" },
      { codigo: null, descripcion: "Mano de obra · servicio técnico", unidad: "ZZ", cantidad: "1", precioUnitario: "68.00", descuento: "8.00", total: "60.00" },
    ],
    totales: { gravada: "93.22", exonerada: "0.00", inafecta: "0.00", descuento: "8.00", igv: "16.78", tasaIgv: "18.00", total: "110.00" },
    montoEnLetras: "SON: CIENTO DIEZ CON 00/100 SOLES", condicionPago: "CONTADO", medioPago: "Efectivo", cuotas: [], documentoModificado: null,
    observacion: "Si ve este texto completo, con tildes y eñes, la impresora está lista.", hash: "PRUEBA+hash=", cadenaQr: "20000000001|03|B001|000001|16.78|110.00|2026-01-01|1|00000000|PRUEBA|",
    leyenda: "Documento sin valor tributario.", enlacePdf: null, advertencias: [],
  };
}
