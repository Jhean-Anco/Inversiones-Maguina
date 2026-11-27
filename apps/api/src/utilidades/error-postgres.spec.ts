import assert from "node:assert/strict";
import { test } from "node:test";
import { codigoErrorPostgres, esViolacionUnicidad } from "./error-postgres";

test("detecta el código SQLSTATE directo o envuelto por Drizzle", () => {
  assert.equal(esViolacionUnicidad({ code: "23505" }), true);
  assert.equal(esViolacionUnicidad(Object.assign(new Error("Failed query"), { cause: { code: "23505" } })), true);
  assert.equal(codigoErrorPostgres({ cause: { cause: { code: "23503" } } }), "23503");
  assert.equal(esViolacionUnicidad({ code: "ECONNREFUSED" }), false);
  assert.equal(codigoErrorPostgres(null), null);
  assert.equal(codigoErrorPostgres("23505"), null);
});
