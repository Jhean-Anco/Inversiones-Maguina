import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ServicioEgresos } from "./egresos.service";

const servicio = new ServicioEgresos();
const usuarioId = "00000000-0000-4000-8000-000000000001";
const egresoId = "00000000-0000-4000-8000-000000000002";

test("rechaza egresos sin usuario, objeto o tipo permitido", async () => {
  await assert.rejects(servicio.crear({}, "invalido"), BadRequestException);
  await assert.rejects(servicio.crear([], usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ tipo: "OTRO" }, usuarioId), BadRequestException);
});

test("valida fecha, importe y pago inicial del egreso", async () => {
  const base = { tipo: "MOTOTAXI", fecha: "2026-11-19", monto: 120, categoria: "Compra", concepto: "Mototaxi" };
  await assert.rejects(servicio.crear({ ...base, fecha: "2026-02-30" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, fecha: "2099-01-01" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, monto: "no-numérico" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, monto: 0 }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, importePagoInicial: 121 }, usuarioId), BadRequestException);
});

test("rechaza sustento de compra incompleto o moneda fuera del catálogo", async () => {
  const base = { tipo: "MOTOTAXI", fecha: "2026-11-19", monto: 120, categoria: "Compra", concepto: "Mototaxi" };
  await assert.rejects(servicio.crear({ ...base, proveedorRuc: "12345678901" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, documentoTipo: "FACTURA" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, documentoTipo: "RECIBO" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.crear({ ...base, moneda: "XYZ" }, usuarioId), BadRequestException);
});

test("valida pagos antes de consultar el egreso en la base de datos", async () => {
  await assert.rejects(servicio.registrarPago("x", {}, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, [], usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2026-02-30" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2099-01-01" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2026-11-19", importePagado: 0 }, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2026-11-19", importePagado: 1.005 }, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2026-11-19", importePagado: "no-numérico" }, usuarioId), BadRequestException);
  await assert.rejects(servicio.registrarPago(egresoId, { fechaPago: "2026-11-19", importePagado: 1, medioPago: "CHEQUE" }, usuarioId), BadRequestException);
});
