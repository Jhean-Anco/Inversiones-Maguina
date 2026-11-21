import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { BadRequestException } from "@nestjs/common";
import { test } from "node:test";
import { ServicioIngresos } from "./ingresos.service";

const servicio = new ServicioIngresos({} as never);

test("valida los datos iniciales antes de consultar la base al emitir una nota", async () => {
  await assert.rejects(servicio.emitirNota("id-invalido", {}, randomUUID()), BadRequestException);
  await assert.rejects(servicio.emitirNota(randomUUID(), null, randomUUID()), BadRequestException);
  await assert.rejects(servicio.emitirNota(randomUUID(), [], randomUUID()), BadRequestException);
  await assert.rejects(servicio.emitirNota(randomUUID(), { tipo: "AJUSTE" }, randomUUID()), BadRequestException);
  await assert.rejects(servicio.emitirNota(randomUUID(), { tipo: "NOTA_CREDITO" }, randomUUID()), BadRequestException);
  await assert.rejects(servicio.emitirNota(randomUUID(), { tipo: "NOTA_DEBITO", cuentaFinancieraId: "inválido" }, randomUUID()), BadRequestException);
});
