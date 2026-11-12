import assert from "node:assert/strict";
import { after, test } from "node:test";

function urlDePruebas(): URL {
  assert.equal(process.env.NODE_ENV, "test", "La integración exige NODE_ENV=test.");
  const valor = process.env.DATABASE_URL;
  assert.ok(valor, "La integración exige DATABASE_URL explícita.");

  const url = new URL(valor);
  const hostPermitido = ["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname);
  const baseDePrueba =
    url.pathname === "/magina_test" &&
    url.username === "ci" &&
    url.password === "ci-only-password";
  assert.ok(hostPermitido, "PostgreSQL debe ser local o el servicio db de Compose.");
  assert.ok(baseDePrueba, "La base debe terminar en _test; se rechazó el nombre configurado.");
  assert.ok(
    ["postgres:", "postgresql:"].includes(url.protocol),
    "DATABASE_URL debe usar PostgreSQL.",
  );
  return url;
}

const url = urlDePruebas();
const { clientePostgres, cerrarBaseDatos } = await import("@magina/database");

after(async () => {
  await cerrarBaseDatos();
});

test("la conexión apunta a PostgreSQL 16 y a la base desechable autorizada", async () => {
  const [servidor] = await clientePostgres.unsafe(
    "SELECT current_database() AS database, current_setting('server_version_num') AS version_num",
  );

  assert.equal(servidor.database, url.pathname.slice(1));
  assert.equal(String(servidor.version_num).slice(0, 2), "16");
});

test("las migraciones crean tablas de operaciones y relaciones clave", async () => {
  const tablas = await clientePostgres.unsafe(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ANY($1)
  `, [["productos", "ingresos", "ingresos_detalle", "ingresos_pagos", "cuentas_financieras"]]);
  const presentes = new Set(tablas.map((fila) => fila.table_name));

  for (const tabla of ["productos", "ingresos", "ingresos_detalle", "ingresos_pagos", "cuentas_financieras"]) {
    assert.ok(presentes.has(tabla), `Falta la tabla migrada ${tabla}.`);
  }

  const claves = await clientePostgres.unsafe(`
    SELECT count(*)::int AS total
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND c.contype = 'f'
      AND t.relname IN ('ingresos_detalle', 'ingresos_pagos')
  `);
  assert.ok(Number(claves[0]?.total) >= 2, "Faltan relaciones foráneas de ventas o pagos.");
});

test("PostgreSQL conserva precisión monetaria y fraccionaria del esquema", async () => {
  const columnas = await clientePostgres.unsafe(`
    SELECT table_name, column_name, numeric_precision, numeric_scale
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND ((table_name = 'ingresos' AND column_name = 'total')
        OR (table_name = 'ingresos_detalle' AND column_name = 'cantidad'))
  `);
  const total = columnas.find((columna) => columna.table_name === "ingresos");
  const cantidad = columnas.find((columna) => columna.table_name === "ingresos_detalle");

  assert.deepEqual(
    [Number(total?.numeric_precision), Number(total?.numeric_scale)],
    [14, 2],
  );
  assert.deepEqual(
    [Number(cantidad?.numeric_precision), Number(cantidad?.numeric_scale)],
    [14, 3],
  );
});
