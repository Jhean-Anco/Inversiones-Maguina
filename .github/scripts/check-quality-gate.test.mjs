import assert from "node:assert/strict";
import { test } from "node:test";
import { verifyQualityGate } from "./check-quality-gate.mjs";

test("permite el gate cuando calidad e imágenes terminan correctamente", () => {
  assert.deepEqual(verifyQualityGate({ qualityResult: "success", imagesResult: "success" }), {
    quality: "success",
    images: "success",
  });
});

for (const result of ["failure", "cancelled", "skipped", "missing"]) {
  test(`bloquea el gate cuando calidad termina en ${result}`, () => {
    assert.throws(() => verifyQualityGate({ qualityResult: result, imagesResult: "success" }), /quality=/);
  });
  test(`bloquea el gate cuando imágenes terminan en ${result}`, () => {
    assert.throws(() => verifyQualityGate({ qualityResult: "success", imagesResult: result }), /images=/);
  });
}

test("bloquea el gate cuando falta cualquier resultado", () => {
  assert.throws(() => verifyQualityGate({ qualityResult: "success" }), /images=missing/);
});
