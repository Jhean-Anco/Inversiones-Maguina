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
      saldoInicial: null,
      fechaSaldoInicial: null,
      numeroCuenta: null,
      cci: null,
      numeroTarjeta: null,
      telefono: null,
      observacion: null,
    },
  );
});

test("valida juntos el saldo inicial y la fecha de corte", () => {
  const cuenta = validarDatosCuentaFinanciera({
    tipo: "EFECTIVO",
    nombre: "Caja principal",
    saldoInicial: "1250.50",
    fechaSaldoInicial: "2026-01-15",
  });

  assert.equal(cuenta.saldoInicial, "1250.50");
  assert.equal(cuenta.fechaSaldoInicial, "2026-01-15");
  assert.throws(
    () => validarDatosCuentaFinanciera({ tipo: "EFECTIVO", nombre: "Caja", saldoInicial: "100.00" }),
    (error) => error instanceof BadRequestException,
  );
  assert.throws(
    () => validarDatosCuentaFinanciera({ tipo: "EFECTIVO", nombre: "Caja", saldoInicial: "100.123", fechaSaldoInicial: "2026-01-15" }),
    (error) => error instanceof BadRequestException,
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
