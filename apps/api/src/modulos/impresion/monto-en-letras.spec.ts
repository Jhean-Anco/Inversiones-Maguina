import assert from "node:assert/strict";
import { test } from "node:test";
import { enteroEnLetras, montoEnLetras } from "./monto-en-letras";

test("convierte enteros representativos a letras", () => {
  const casos: [number, string][] = [
    [0, "CERO"], [1, "UNO"], [15, "QUINCE"], [16, "DIECISÉIS"], [21, "VEINTIUNO"], [29, "VEINTINUEVE"], [30, "TREINTA"],
    [31, "TREINTA Y UNO"], [99, "NOVENTA Y NUEVE"], [100, "CIEN"], [101, "CIENTO UNO"], [500, "QUINIENTOS"], [999, "NOVECIENTOS NOVENTA Y NUEVE"],
    [1000, "MIL"], [1001, "MIL UNO"], [2000, "DOS MIL"], [21000, "VEINTIÚN MIL"], [31000, "TREINTA Y UN MIL"], [100000, "CIEN MIL"],
    [101000, "CIENTO UN MIL"], [1_000_000, "UN MILLÓN"], [2_500_000, "DOS MILLONES QUINIENTOS MIL"], [21_000_000, "VEINTIÚN MILLONES"],
    [1_001_001, "UN MILLÓN MIL UNO"], [999_999_999_999, "NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE MILLONES NOVECIENTOS NOVENTA Y NUEVE MIL NOVECIENTOS NOVENTA Y NUEVE"],
  ];
  for (const [numero, esperado] of casos) assert.equal(enteroEnLetras(numero), esperado, String(numero));
});

test("rechaza enteros fuera de rango o no enteros", () => {
  assert.throws(() => enteroEnLetras(-1), RangeError);
  assert.throws(() => enteroEnLetras(1.5), RangeError);
  assert.throws(() => enteroEnLetras(1e12), RangeError);
});

test("expresa importes con céntimos y moneda", () => {
  assert.equal(montoEnLetras(1250.5), "SON: MIL DOSCIENTOS CINCUENTA CON 50/100 SOLES");
  assert.equal(montoEnLetras("0.05"), "SON: CERO CON 05/100 SOLES");
  assert.equal(montoEnLetras(10.005), "SON: DIEZ CON 01/100 SOLES");
  assert.equal(montoEnLetras(99.999), "SON: CIEN CON 00/100 SOLES");
  assert.equal(montoEnLetras(1, "DÓLARES AMERICANOS"), "SON: UNO CON 00/100 DÓLARES AMERICANOS");
});

test("rechaza importes inválidos", () => {
  assert.throws(() => montoEnLetras(-3), RangeError);
  assert.throws(() => montoEnLetras("abc"), RangeError);
  assert.throws(() => montoEnLetras(Number.POSITIVE_INFINITY), RangeError);
});
