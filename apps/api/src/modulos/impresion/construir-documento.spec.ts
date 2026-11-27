import assert from "node:assert/strict";
import { ConflictException } from "@nestjs/common";
import { test } from "node:test";
import { documentoDesdeTrama, documentoNotaVenta, horaPeru } from "./construir-documento";
import { evaluarImpresionElectronica } from "./impresion.politica";
import { codigoOrigen } from "./impresion.service";
import {
  cadenaQrSunat, enlaceArchivado, etiquetaDocumentoCliente, etiquetaMedioPago, type EmisorImpresion, fechaIso, importe, leyendaRepresentacion, respuestaVigente,
} from "./representacion-impresa";

const emisor: EmisorImpresion = {
  ruc: "20123456789", razonSocial: "INVERSIONES DEMO S.A.C.", nombreComercial: "Demo", direccion: "Av. Siempre Viva 123, Lima",
  telefono: "999888777", correo: "ventas@demo.pe", sitioWeb: null, mensajePie: "Gracias por su compra", urlConsultaComprobantes: "https://consulta.demo.pe",
};

const solicitudBoleta = {
  serie: "B001", numero: 12, fecha_de_emision: "25-11-2026", fecha_de_vencimiento: "", cliente_tipo_de_documento: 1, cliente_numero_de_documento: "45678912",
  cliente_denominacion: "JUAN PEREZ", cliente_direccion: "", porcentaje_de_igv: 18, total_gravada: 100, total_exonerada: "", total_inafecta: "", total_descuento: 2.5,
  total_igv: 18, total: 118, observaciones: "Entrega inmediata", medio_de_pago: "Efectivo",
  items: [
    { unidad_de_medida: "NIU", codigo: "P-01", descripcion: "Filtro de aceite", cantidad: 2, precio_unitario: 35.4, descuento: 2.5, total: 70.8 },
    { unidad_de_medida: "ZZ", codigo: "SERVICIO", descripcion: "Mano de obra", cantidad: "1.0000", precio_unitario: "47.2", descuento: "", total: "47.2" },
  ],
};

test("construye una boleta desde la trama y la respuesta vigente", () => {
  const documento = documentoDesdeTrama({
    tipo: "BOLETA", emisor, rucRespaldo: null, creadoEn: "2026-11-25T20:05:00.000Z", condicionPago: "CONTADO", medioPago: "EFECTIVO", tasaIgv: "18.00",
    datosNubefact: {
      solicitud: solicitudBoleta,
      respuesta: { codigo_hash: "viejo", aceptada_por_sunat: true },
      consultaComprobante: { respuesta: { codigo_hash: "abc123=", cadena_para_codigo_qr: "QR|NUBEFACT|", aceptada_por_sunat: true } },
      archivos: { guardados: [{ tipo: "PDF", ruta: "/archivos/1/contenido" }] },
    },
  });
  assert.equal(documento.titulo, "BOLETA DE VENTA ELECTRÓNICA");
  assert.equal(documento.serieNumero, "B001-000012");
  assert.equal(documento.fechaEmision, "2026-11-25");
  assert.equal(documento.horaEmision, "15:05");
  assert.equal(documento.fechaVencimiento, null);
  assert.deepEqual(documento.cliente, { tipoDocumento: "DNI", numeroDocumento: "45678912", nombre: "JUAN PEREZ", direccion: null });
  assert.deepEqual(documento.items[0], { codigo: "P-01", descripcion: "Filtro de aceite", unidad: "NIU", cantidad: "2", precioUnitario: "35.40", descuento: "2.50", total: "70.80" });
  assert.equal(documento.items[1].descuento, null);
  assert.equal(documento.items[1].cantidad, "1");
  assert.deepEqual(documento.totales, { gravada: "100.00", exonerada: "0.00", inafecta: "0.00", descuento: "2.50", igv: "18.00", tasaIgv: "18.00", total: "118.00" });
  assert.equal(documento.montoEnLetras, "SON: CIENTO DIECIOCHO CON 00/100 SOLES");
  assert.equal(documento.medioPago, "Efectivo");
  assert.equal(documento.hash, "abc123=");
  assert.equal(documento.cadenaQr, "QR|NUBEFACT|");
  assert.equal(documento.enlacePdf, "/archivos/1/contenido");
  assert.equal(documento.observacion, "Entrega inmediata");
  assert.match(documento.leyenda, /Representación impresa de la BOLETA DE VENTA ELECTRÓNICA\. Consulte su documento en https:\/\/consulta\.demo\.pe/);
  assert.deepEqual(documento.advertencias, []);
});

test("factura a crédito sin emisor configurado: arma QR SUNAT con RUC de respaldo y avisa", () => {
  const documento = documentoDesdeTrama({
    tipo: "FACTURA", emisor: null, rucRespaldo: "20111111111", creadoEn: null, condicionPago: "CREDITO", medioPago: "TRANSFERENCIA", tasaIgv: 18,
    datosNubefact: {
      solicitud: {
        ...solicitudBoleta, serie: "F001", numero: "7", cliente_tipo_de_documento: 6, cliente_numero_de_documento: "20999999991", fecha_de_vencimiento: "25-12-2026",
        porcentaje_de_igv: undefined, observaciones: "", items: "no-es-lista", venta_al_credito: [{ cuota: 1, fecha_de_pago: "25-12-2026", importe: 118 }, { fecha_de_pago: "x", importe: "abc" }],
      },
      respuesta: { codigo_hash: "HASH1", enlace_del_pdf: "https://www.nubefact.com/cpe/1.pdf" },
    },
  });
  assert.equal(documento.serieNumero, "F001-000007");
  assert.equal(documento.horaEmision, null);
  assert.equal(documento.fechaVencimiento, "2026-12-25");
  assert.equal(documento.cliente.tipoDocumento, "RUC");
  assert.equal(documento.items.length, 0);
  assert.equal(documento.totales.tasaIgv, "18.00");
  assert.equal(documento.medioPago, null);
  assert.deepEqual(documento.cuotas, [{ cuota: 1, fecha: "2026-12-25", importe: "118.00" }, { cuota: 2, fecha: "", importe: "0.00" }]);
  assert.equal(documento.cadenaQr, "20111111111|01|F001|000007|18.00|118.00|2026-11-25|6|20999999991|HASH1|");
  assert.equal(documento.enlacePdf, "https://www.nubefact.com/cpe/1.pdf");
  assert.equal(documento.observacion, null);
  assert.equal(documento.advertencias.length, 0);
  assert.match(documento.leyenda, /FACTURA ELECTRÓNICA\.$/);
});

test("cliente varios, sin hash, sin RUC ni numeración: degrada con advertencias", () => {
  const documento = documentoDesdeTrama({
    tipo: "NOTA_CREDITO", emisor, rucRespaldo: null, creadoEn: "fecha-invalida", condicionPago: "CONTADO", medioPago: null, tasaIgv: "18",
    documentoModificado: { serieNumero: "B001-000001", motivo: "Devolución" },
    datosNubefact: { solicitud: { cliente_tipo_de_documento: "-", cliente_numero_de_documento: "-", total: 10, medio_de_pago: "Yape" }, numero: "x" },
  });
  assert.equal(documento.serieNumero, "SIN NUMERAR");
  assert.equal(documento.horaEmision, null);
  assert.deepEqual(documento.cliente, { tipoDocumento: null, numeroDocumento: null, nombre: "CLIENTES VARIOS", direccion: null });
  assert.equal(documento.medioPago, "Yape");
  assert.equal(documento.documentoModificado?.motivo, "Devolución");
  assert.equal(documento.cadenaQr, null);
  assert.match(documento.advertencias[0], /hash/);
  const sinRuc = documentoDesdeTrama({ tipo: "BOLETA", emisor: null, rucRespaldo: null, creadoEn: null, condicionPago: "CONTADO", medioPago: "OTRO", tasaIgv: 18, datosNubefact: null });
  assert.equal(sinRuc.cadenaQr, null);
  assert.equal(sinRuc.serieNumero, "SIN NUMERAR");
  assert.equal(sinRuc.medioPago, "Otro");
  assert.equal(sinRuc.advertencias.length, 1);
  const sinClienteConNumero = documentoDesdeTrama({ tipo: "NOTA_DEBITO", emisor, rucRespaldo: null, creadoEn: null, condicionPago: "CONTADO", medioPago: null, tasaIgv: 18,
    datosNubefact: { solicitud: { serie: "BD01", numero: 3, fecha_de_emision: "01-12-2026", cliente_tipo_de_documento: "-", cliente_numero_de_documento: "-", total: 5, total_igv: 0.76 } } });
  assert.equal(sinClienteConNumero.cadenaQr, "20123456789|08|BD01|000003|0.76|5.00|2026-12-01|-|-||");
});

test("nota de venta desde la venta registrada", () => {
  const documento = documentoNotaVenta({
    emisor, codigo: "NV01-000003", fecha: "2026-11-20", creadoEn: new Date("2026-11-20T14:00:00Z"),
    cliente: { tipoDocumento: "01", numeroDocumento: "12345678", nombre: null, direccion: "Jr. Uno" }, medioPago: "BILLETERA_DIGITAL", condicionPago: "CONTADO",
    subtotal: "50", igv: "0", tasaIgv: "18.00", total: "50", observacion: null,
    detalles: [{ codigo: null, descripcion: "Casco", unidad: "NIU", cantidad: "1.000", precioUnitario: "55.0000", descuento: "5.00", total: "50.00" }, { codigo: "X", descripcion: "Guantes", unidad: null, cantidad: "abc", precioUnitario: "0", descuento: "0", total: "0" }],
    datosNubefact: { archivos: { guardados: [{ tipo: "HTML", ruta: "/archivos/2/contenido" }, { tipo: "PDF" }] } },
  });
  assert.equal(documento.electronico, false);
  assert.equal(documento.titulo, "NOTA DE VENTA");
  assert.equal(documento.horaEmision, "09:00");
  assert.equal(documento.cliente.nombre, "CLIENTES VARIOS");
  assert.equal(documento.cliente.tipoDocumento, "DNI");
  assert.equal(documento.items[0].descuento, "5.00");
  assert.equal(documento.items[1].cantidad, "1");
  assert.equal(documento.items[1].descuento, null);
  assert.equal(documento.medioPago, "Billetera digital");
  assert.equal(documento.enlacePdf, "/archivos/2/contenido");
  assert.match(documento.leyenda, /sin valor tributario/);
  assert.equal(documento.montoEnLetras, "SON: CINCUENTA CON 00/100 SOLES");
});

test("utilidades de representación", () => {
  assert.equal(importe("abc"), "0.00");
  assert.equal(importe(""), "0.00");
  assert.equal(importe(null), "0.00");
  assert.equal(importe(3.456), "3.46");
  assert.equal(fechaIso("2026-01-02T10:00:00Z"), "2026-01-02");
  assert.equal(fechaIso("02/01/2026"), null);
  assert.equal(fechaIso(""), null);
  assert.equal(fechaIso(20260102), null);
  assert.deepEqual(respuestaVigente(null), {});
  assert.deepEqual(respuestaVigente({ respuesta: [1] }), {});
  assert.equal(enlaceArchivado({ archivos: { guardados: "x" } }, "PDF"), null);
  assert.equal(etiquetaDocumentoCliente("PASAPORTE"), "PASAPORTE");
  assert.equal(etiquetaDocumentoCliente("XX"), "XX");
  assert.equal(etiquetaDocumentoCliente(null), null);
  assert.equal(etiquetaMedioPago(undefined), null);
  assert.equal(cadenaQrSunat({ ruc: "1", tipo: "NOTA_VENTA", serieNumero: "NV-1", igv: "0", total: "0", fecha: "", tipoDocumentoCliente: null, numeroDocumentoCliente: null, hash: null }), null);
  assert.equal(leyendaRepresentacion("BOLETA", null), "Representación impresa de la BOLETA DE VENTA ELECTRÓNICA.");
  assert.equal(horaPeru(null), null);
  assert.equal(codigoOrigen({ solicitud: { serie: "B001", numero: 5 } }, "VTA-1"), "B001-000005");
  assert.equal(codigoOrigen(null, "VTA-1"), "VTA-1");
  assert.equal(codigoOrigen({ solicitud: { serie: "B001", numero: "x" } }, "VTA-2"), "VTA-2");
});

test("política de impresión de comprobantes electrónicos", () => {
  assert.throws(() => evaluarImpresionElectronica("EMITIDO", null), ConflictException);
  assert.throws(() => evaluarImpresionElectronica("ERROR_NUBEFACT", { solicitud: {}, respuesta: { errors: "Serie inválida" } }), ConflictException);
  assert.throws(() => evaluarImpresionElectronica("EMITIDO", { solicitud: {}, respuesta: { aceptada_por_sunat: false, sunat_responsecode: "2017", sunat_description: "rechazado" } }), ConflictException);
  assert.deepEqual(evaluarImpresionElectronica("EMITIDO", { solicitud: {}, respuesta: { aceptada_por_sunat: true } }), []);
  assert.match(evaluarImpresionElectronica("ANULADO", { solicitud: {}, respuesta: { aceptada_por_sunat: true } })[0], /ANULADO/);
  assert.match(evaluarImpresionElectronica("ANULACION_PENDIENTE", { solicitud: {}, respuesta: { aceptada_por_sunat: true } })[0], /anulación/);
  assert.match(evaluarImpresionElectronica("NUBEFACT_PENDIENTE", { solicitud: {}, respuesta: {} })[0], /aún no confirma/);
  assert.match(evaluarImpresionElectronica("EMITIDO", { solicitud: {}, respuesta: { sunat_ticket_numero: "123" } })[0], /aún no confirma/);
});
