import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { ServicioAlmacenamiento } from "./almacenamiento.service";

test("rechaza identificadores de archivo mal formados antes de consultar la base", async () => {
  await assert.rejects(new ServicioAlmacenamiento().descargarArchivoRegistrado("no-es-un-uuid"), BadRequestException);
});
