import assert from "node:assert/strict";
import { BadRequestException, ConflictException } from "@nestjs/common";
import test from "node:test";
import { analizarEstadoComprobante, validarElegibilidadReintento } from "./comprobante-emision.util";

const respuestaRechazada = {
  aceptada_por_sunat: false,
  sunat_description: "El documento del cliente no coincide.",
  sunat_note: "Revise el tipo de documento.",
  sunat_responsecode: 2335,
};

test("conserva descripción, nota, código y errores de una boleta rechazada por SUNAT", () => {
  const resultado = analizarEstadoComprobante("ERROR_NUBEFACT", {}, {
    ...respuestaRechazada,
    errors: ["Validación adicional"],
  });

  assert.deepEqual(resultado, {
    estadoProveedor: "RECHAZADO_SUNAT",
    detalleProveedor: "El documento del cliente no coincide. · Revise el tipo de documento. · Código de respuesta SUNAT: 2335 · Validación adicional",
  });
});

test("los errores del proveedor no se clasifican como rechazo definitivo de SUNAT", () => {
  assert.deepEqual(
    analizarEstadoComprobante("ERROR_NUBEFACT", {}, { aceptada_por_sunat: false, errors: { cliente: "Documento inválido" } }),
    {
      estadoProveedor: "ERROR_NUBEFACT",
      detalleProveedor: "cliente: Documento inválido",
    },
  );
});

test("una respuesta negativa sin motivo ni estado explícito queda pendiente de confirmación", () => {
  assert.deepEqual(analizarEstadoComprobante("ERROR_NUBEFACT", {}, { aceptada_por_sunat: false }), {
    estadoProveedor: "PENDIENTE_CONFIRMACION",
    detalleProveedor: "NubeFact aún no confirma el resultado. La respuesta no contiene un rechazo SUNAT detallado; consulta el estado antes de volver a enviar.",
  });
});

test("acepta como rechazo solo el estado explícito reportado por el proveedor", () => {
  assert.equal(analizarEstadoComprobante("ERROR_NUBEFACT", {}, {
    aceptada_por_sunat: false,
    estado: "RECHAZADO",
  }).estadoProveedor, "RECHAZADO_SUNAT");
});

test("prioriza el estado pendiente devuelto por NubeFact aunque aceptada_por_sunat sea falso", () => {
  assert.deepEqual(analizarEstadoComprobante("ERROR_NUBEFACT", {}, {
    aceptada_por_sunat: false,
    estado: "PENDIENTE",
  }), {
    estadoProveedor: "PENDIENTE_CONFIRMACION",
    detalleProveedor: "NubeFact aún no confirma el resultado del comprobante.",
  });
  assert.equal(analizarEstadoComprobante("ERROR_NUBEFACT", {}, {
    aceptada_por_sunat: false,
    sunat_description: "El comprobante está pendiente de envío.",
  }).estadoProveedor, "PENDIENTE_CONFIRMACION");
});

test("no confunde un error SOAP o una respuesta pendiente con rechazo definitivo", () => {
  assert.equal(
    analizarEstadoComprobante("ERROR_NUBEFACT", {}, { aceptada_por_sunat: false, sunat_soap_error: "Servicio temporalmente no disponible" }).estadoProveedor,
    "ERROR_SUNAT",
  );
  assert.equal(
    analizarEstadoComprobante("NUBEFACT_PENDIENTE", {}, { aceptada_por_sunat: false }).estadoProveedor,
    "PENDIENTE_CONFIRMACION",
  );
});

test("solo permite boletas y facturas con rechazo confirmado y dentro del plazo", () => {
  const base = {
    fecha: "2026-11-10",
    estado: "ERROR_NUBEFACT",
    datos: {},
    respuesta: respuestaRechazada,
    fechaHoy: "2026-11-15",
  };

  assert.doesNotThrow(() => validarElegibilidadReintento({ ...base, tipoComprobante: "BOLETA" }));
  assert.throws(
    () => validarElegibilidadReintento({ ...base, tipoComprobante: "NOTA_VENTA" }),
    (error) => error instanceof BadRequestException,
  );
  assert.throws(
    () => validarElegibilidadReintento({ ...base, tipoComprobante: "BOLETA", fecha: "2026-11-09" }),
    (error) => error instanceof BadRequestException && /plazo de envío/.test(error.message),
  );
  assert.doesNotThrow(() => validarElegibilidadReintento({ ...base, tipoComprobante: "FACTURA", fecha: "2026-11-12" }));
  assert.throws(
    () => validarElegibilidadReintento({ ...base, tipoComprobante: "FACTURA", fecha: "2026-11-11" }),
    (error) => error instanceof BadRequestException && /plazo de envío/.test(error.message),
  );
});

test("rechaza reintentar documentos aceptados, pendientes o sin rechazo confirmado", () => {
  const base = {
    tipoComprobante: "BOLETA",
    fecha: "2026-11-15",
    estado: "EMITIDO",
    datos: {},
    respuesta: { aceptada_por_sunat: true },
    fechaHoy: "2026-11-15",
  };

  assert.throws(() => validarElegibilidadReintento(base), (error) => error instanceof ConflictException);
  assert.throws(
    () => validarElegibilidadReintento({ ...base, estado: "NUBEFACT_PENDIENTE", respuesta: respuestaRechazada }),
    (error) => error instanceof ConflictException,
  );
  assert.throws(
    () => validarElegibilidadReintento({ ...base, estado: "ERROR_NUBEFACT", respuesta: { errors: "Fallo genérico" } }),
    (error) => error instanceof ConflictException,
  );
});
