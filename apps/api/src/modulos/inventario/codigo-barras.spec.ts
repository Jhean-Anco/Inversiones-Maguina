import assert from "node:assert/strict";
import test from "node:test";
import { calcularDigitoVerificadorEAN13, esCodigoEAN13Valido, generarCodigoBarrasInterno } from "./codigo-barras";

test("genera códigos EAN-13 internos con prefijo y verificador válidos", () => {
  const codigo = generarCodigoBarrasInterno();
  assert.match(codigo, /^20\d{11}$/);
  assert.equal(esCodigoEAN13Valido(codigo), true);
});

test("calcula correctamente el dígito verificador EAN-13", () => {
  assert.equal(calcularDigitoVerificadorEAN13("400638133393"), 1);
  assert.equal(esCodigoEAN13Valido("4006381333931"), true);
  assert.equal(esCodigoEAN13Valido("4006381333932"), false);
});
