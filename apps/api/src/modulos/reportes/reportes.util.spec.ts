import assert from "node:assert/strict";
import { test } from "node:test";
import { diasEntreFechas, sumarFlujosDiarios } from "./reportes.util";

test("sumarFlujosDiarios combina series por fecha y las ordena", () => {
  const resultado = sumarFlujosDiarios(
    [{ fecha: "2026-11-02", total: "100.10" }, { fecha: "2026-11-01", total: "50.00" }],
    [{ fecha: "2026-11-02", total: "0.20" }],
    [{ fecha: "2026-11-03", total: "30.00" }],
  );
  assert.deepEqual(resultado, [
    { fecha: "2026-11-01", total: "50.00" },
    { fecha: "2026-11-02", total: "100.30" },
    { fecha: "2026-11-03", total: "30.00" },
  ]);
});

test("sumarFlujosDiarios evita errores de coma flotante y omite nulos y ceros", () => {
  const resultado = sumarFlujosDiarios([{ fecha: "2026-11-01", total: "0.10" }, { fecha: "2026-11-01", total: "0.20" }, { fecha: "2026-11-02", total: null }, { fecha: "2026-11-03", total: "0.00" }]);
  assert.deepEqual(resultado, [{ fecha: "2026-11-01", total: "0.30" }]);
});

test("sumarFlujosDiarios sin datos devuelve una lista vacía", () => {
  assert.deepEqual(sumarFlujosDiarios(), []);
  assert.deepEqual(sumarFlujosDiarios([], []), []);
});

test("diasEntreFechas cuenta ambos extremos y cruza años bisiestos", () => {
  assert.equal(diasEntreFechas("2026-11-01", "2026-11-01"), 1);
  assert.equal(diasEntreFechas("2025-11-01", "2026-11-24"), 389);
  assert.equal(diasEntreFechas("2024-02-28", "2024-03-01"), 3);
});

test("aplicarPermisosDeCosto conserva las ventas y oculta el costo sin permiso", async () => {
  const { aplicarPermisosDeCosto } = await import("./reportes.util");
  const filas = [
    { tipo: "PRODUCTO" as const, categoria: "Frenos", venta: "100.00", ventaConCosto: "100.00", costo: "60.00" },
    { tipo: "MOTOTAXI" as const, categoria: null, venta: "800.00", ventaConCosto: "800.00", costo: "600.00" },
    { tipo: "SERVICIO" as const, categoria: null, venta: "50.00", ventaConCosto: "0.00", costo: "0.00" },
  ];
  const soloInventario = aplicarPermisosDeCosto(filas, { inventario: true, mototaxis: false });
  assert.deepEqual(soloInventario.map((fila) => [fila.tipo, fila.venta, fila.costo]), [["PRODUCTO", "100.00", "60.00"], ["MOTOTAXI", "800.00", null], ["SERVICIO", "50.00", null]]);
  const ninguno = aplicarPermisosDeCosto(filas, { inventario: false, mototaxis: false });
  assert.ok(ninguno.every((fila) => fila.costo === null && fila.ventaConCosto === null));
  assert.equal(ninguno.reduce((suma, fila) => suma + Number(fila.venta), 0), 950);
  const todo = aplicarPermisosDeCosto(filas, { inventario: true, mototaxis: true });
  assert.equal(todo[1].costo, "600.00");
  assert.equal(todo[2].costo, null, "los servicios nunca tienen costo");
});
