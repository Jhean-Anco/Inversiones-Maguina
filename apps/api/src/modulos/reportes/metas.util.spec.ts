import assert from "node:assert/strict";
import { test } from "node:test";
import { resolverMetas, validarGuardarMeta, validarPeriodoMeta } from "./metas.util";

test("validarPeriodoMeta acepta AAAA-MM y rechaza lo demás", () => {
  assert.equal(validarPeriodoMeta("2026-11"), "2026-11");
  for (const invalido of ["2026-13", "2026-00", "2026-1", "26-11", "2026-11-01", "", undefined, null, 202611]) assert.throws(() => validarPeriodoMeta(invalido));
});

test("validarGuardarMeta normaliza metas válidas", () => {
  assert.deepEqual(validarGuardarMeta({ indicador: "VENTAS_MES", periodo: "2026-11", valor: 88000.456 }), { indicador: "VENTAS_MES", periodo: "2026-11", valor: 88000.46 });
  assert.deepEqual(validarGuardarMeta({ indicador: "MARGEN", periodo: null, valor: 30 }), { indicador: "MARGEN", periodo: null, valor: 30 });
  assert.deepEqual(validarGuardarMeta({ indicador: "COBRANZA", valor: 90 }), { indicador: "COBRANZA", periodo: null, valor: 90 });
});

test("validarGuardarMeta permite quitar una meta con valor nulo", () => {
  assert.deepEqual(validarGuardarMeta({ indicador: "COBRANZA", periodo: "2026-11", valor: null }), { indicador: "COBRANZA", periodo: "2026-11", valor: null });
});

test("validarGuardarMeta rechaza datos inválidos", () => {
  const casos: unknown[] = [null, [], "texto", { indicador: "OTRO", valor: 10 }, { indicador: "VENTAS_MES", valor: 0 }, { indicador: "VENTAS_MES", valor: -5 },
    { indicador: "VENTAS_MES", valor: "100" }, { indicador: "VENTAS_MES", valor: Number.NaN }, { indicador: "VENTAS_MES", valor: Infinity },
    { indicador: "MARGEN", valor: 100.5 }, { indicador: "COBRANZA", valor: 150 }, { indicador: "VENTAS_MES", periodo: "2026-13", valor: 10 }, { indicador: "VENTAS_MES", valor: 2_000_000_000 }];
  for (const caso of casos) assert.throws(() => validarGuardarMeta(caso), Error, JSON.stringify(caso));
});

test("resolverMetas prefiere la meta del mes sobre la predeterminada", () => {
  const filas = [
    { indicador: "VENTAS_MES", periodo: null, valor: "80000.00" }, { indicador: "VENTAS_MES", periodo: "2026-11", valor: "88000.00" },
    { indicador: "MARGEN", periodo: null, valor: "30.00" }, { indicador: "MARGEN", periodo: "2026-10", valor: "35.00" },
  ];
  const resuelta = resolverMetas(filas, "2026-11");
  assert.deepEqual(resuelta.VENTAS_MES, { valor: 88000, origen: "MES" });
  assert.deepEqual(resuelta.MARGEN, { valor: 30, origen: "PREDETERMINADA" });
  assert.equal(resuelta.COBRANZA, null);
  assert.deepEqual(resolverMetas(filas, "2026-10").MARGEN, { valor: 35, origen: "MES" });
});
