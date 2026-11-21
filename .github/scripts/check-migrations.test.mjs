import assert from "node:assert/strict";
import test from "node:test";
import { inspectMigrationChanges } from "./check-migrations.mjs";

test("permite migración SQL aditiva", () => {
  const findings = inspectMigrationChanges(
    [{ status: "A", path: "packages/database/migrations/0190_safe_change.sql" }],
    new Map([["packages/database/migrations/0190_safe_change.sql", [
      'ALTER TABLE "clientes" ADD COLUMN "alias" varchar(120);',
      'CREATE INDEX "clientes_alias_idx" ON "clientes" ("alias");',
    ]]]),
  );
  assert.deepEqual(findings, []);
});

test("bloquea operaciones destructivas en nuevas migraciones", () => {
  const path = "packages/database/migrations/0190_risky_change.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, ['ALTER TABLE "clientes" DROP COLUMN "alias";']]]),
  );
  assert.match(findings.join("\n"), /operación potencialmente destructiva/);
});

test("permite reemplazar una restricción en la misma migración", () => {
  const path = "packages/database/migrations/0190_reemplazo_restriccion.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, [
      'ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_tipo_relacion_ck";',
      'ALTER TABLE "ingresos_detalle" ADD CONSTRAINT "ingresos_detalle_tipo_relacion_ck" CHECK ("tipo" IN (\'PRODUCTO\', \'SERVICIO\', \'MOTOTAXI\'));',
    ]]]),
  );
  assert.deepEqual(findings, []);
});

test("sigue bloqueando la eliminación de una restricción sin reemplazo", () => {
  const path = "packages/database/migrations/0190_eliminar_restriccion.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, ['ALTER TABLE "ingresos_detalle" DROP CONSTRAINT "ingresos_detalle_tipo_relacion_ck";']]]),
  );
  assert.match(findings.join("\n"), /operación potencialmente destructiva/);
});

test("permite relajar NOT NULL si la migración añade una restricción de integridad", () => {
  const path = "packages/database/migrations/0190_garantia_por_compra.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, [
      'ALTER TABLE "garantias_mototaxis" ALTER COLUMN "unidad_id" DROP NOT NULL;',
      'ALTER TABLE "garantias_mototaxis" ADD CONSTRAINT "garantias_origen_ck" CHECK (num_nonnulls("unidad_id", "compra_detalle_id") = 1);',
    ]]]),
  );
  assert.deepEqual(findings, []);
});

test("detecta cambios destructivos partidos en varias líneas y conserva el número original", () => {
  const path = "packages/database/migrations/0190_risky_change.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, [
      { line: 41, text: 'ALTER TABLE "clientes"' },
      { line: 42, text: '  ALTER COLUMN "telefono" TYPE text;' },
      { line: 43, text: 'ALTER TABLE "clientes" ALTER COLUMN "telefono"' },
      { line: 44, text: "  SET NOT NULL;" },
    ]]]),
  );
  assert.match(findings.join("\n"), /0190_risky_change\.sql:42:/);
  assert.match(findings.join("\n"), /0190_risky_change\.sql:44:/);
});

test("bloquea renombrados y tipos destructivos comunes incluso en varias líneas", () => {
  const path = "packages/database/migrations/0190_risky_change.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, [
      "ALTER TABLE clientes",
      "  RENAME COLUMN telefono TO numero;",
      "ALTER TABLE pedidos ALTER COLUMN total",
      "  TYPE integer;",
    ]]]),
  );
  assert.equal(findings.length, 2);
});

test("bloquea cambios a migraciones históricas", () => {
  const findings = inspectMigrationChanges(
    [{ status: "M", path: "packages/database/migrations/0180_existing.sql" }],
    new Map(),
  );
  assert.match(findings.join("\n"), /no se permite modificar una migración existente/);
});

test("ignora comentarios SQL en líneas nuevas", () => {
  const path = "packages/database/migrations/0190_safe_change.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, ["-- no ejecutar DROP TABLE en producción", "CREATE TABLE prueba (id integer);"]]]),
  );
  assert.deepEqual(findings, []);
});
