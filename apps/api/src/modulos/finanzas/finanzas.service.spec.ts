import assert from "node:assert/strict";
import { BadRequestException } from "@nestjs/common";
import { test } from "node:test";
import { ServicioFinanzas, validarDatosCuentaFinanciera } from "./finanzas.service";

test("normaliza una cuenta de efectivo y aplica PEN por defecto", () => {
  assert.deepEqual(
    validarDatosCuentaFinanciera({ tipo: "EFECTIVO", nombre: "  Caja principal  " }),
    {
      tipo: "EFECTIVO",
      nombre: "Caja principal",
      entidad: null,
      titular: null,
      moneda: "PEN",
      numeroCuenta: null,
      cci: null,
      numeroTarjeta: null,
      telefono: null,
      observacion: null,
    },
  );
});

test("acepta una cuenta bancaria si tiene número de cuenta o CCI", () => {
  const cuenta = validarDatosCuentaFinanciera({
    tipo: "BANCO",
    nombre: "Cuenta de operaciones",
    entidad: "Banco de prueba",
    cci: "CCI ficticio",
    moneda: "USD",
  });

  assert.equal(cuenta.entidad, "Banco de prueba");
  assert.equal(cuenta.cci, "CCI ficticio");
  assert.equal(cuenta.moneda, "USD");
});

test("rechaza cuentas bancarias sin entidad o medio de identificación", () => {
  assert.throws(
    () => validarDatosCuentaFinanciera({ tipo: "BANCO", nombre: "Cuenta" }),
    (error) => error instanceof BadRequestException,
  );
  assert.throws(
    () =>
      validarDatosCuentaFinanciera({
        tipo: "BANCO",
        nombre: "Cuenta",
        entidad: "Banco de prueba",
      }),
    (error) => error instanceof BadRequestException,
  );
});

test("valida requisitos de billeteras y los últimos cuatro dígitos de tarjetas", () => {
  assert.equal(
    validarDatosCuentaFinanciera({
      tipo: "BILLETERA",
      nombre: "Billetera",
      entidad: "Proveedor ficticio",
      telefono: "999000111",
    }).telefono,
    "999000111",
  );
  assert.equal(
    validarDatosCuentaFinanciera({
      tipo: "TARJETA",
      nombre: "Tarjeta",
      entidad: "Banco de prueba",
      numeroTarjeta: "1234",
    }).numeroTarjeta,
    "1234",
  );
  assert.throws(
    () =>
      validarDatosCuentaFinanciera({
        tipo: "TARJETA",
        nombre: "Tarjeta",
        entidad: "Banco de prueba",
        numeroTarjeta: "12345",
      }),
    (error) => error instanceof BadRequestException,
  );
});

test("rechaza tipos, monedas, campos obligatorios e importes de entrada no estructurados", () => {
  for (const entrada of [
    null,
    [],
    {},
    { tipo: "CRIPTO", nombre: "Cuenta" },
    { tipo: "EFECTIVO", nombre: "Cuenta", moneda: "XYZ" },
    { tipo: "EFECTIVO", nombre: "   " },
  ]) {
    assert.throws(
      () => validarDatosCuentaFinanciera(entrada),
      (error) => error instanceof BadRequestException,
    );
  }
});

test("rechaza fechas calendario imposibles antes de consultar PostgreSQL", async () => {
  const servicio = new ServicioFinanzas();

  await assert.rejects(
    () => servicio.movimientosPorPeriodo("DIA", "2026-02-30"),
    (error) => error instanceof BadRequestException,
  );
});
