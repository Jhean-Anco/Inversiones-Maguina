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
