import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ServicioIngresos } from "./ingresos.service";

test("rechaza emitir guías de transportista con un mensaje claro", async () => {
  const servicio = new ServicioIngresos({} as never);
  await assert.rejects(
    () => servicio.emitirGuia({ tipo: "TRANSPORTISTA" }, "usuario-prueba"),
    (error) => error instanceof BadRequestException && error.message === "El sistema solo emite guías de remisión de remitente.",
  );
});
