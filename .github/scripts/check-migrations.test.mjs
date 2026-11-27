import assert from "node:assert/strict";
import test from "node:test";
import { inspectMigrationChanges, isApprovedDestructiveMigration } from "./check-migrations.mjs";

test("acepta solo el contenido exacto de la migración destructiva autorizada y etiquetada", () => {
  assert.equal(isApprovedDestructiveMigration({
    findings: ["packages/database/migrations/0189_retirar_fotografias.sql:8: operación potencialmente destructiva"],
    approvalLabel: "true",
    migrationPaths: ["packages/database/migrations/0189_retirar_fotografias.sql"],
    migrationBlob: "80d56760b1a015715a05b090dd77e42e48e36b69",
  }), true);
});

test("acepta la relajación de proveedor solo con el blob exacto y la etiqueta del PR", () => {
  const base = {
    findings: ["packages/database/migrations/0199_compra_mototaxi_sin_proveedor.sql:1: operación potencialmente destructiva"],
    approvalLabel: "true",
    migrationPaths: ["packages/database/migrations/0199_compra_mototaxi_sin_proveedor.sql"],
    migrationBlob: "bcc1ad2da4e6a2d276457d027c601e26b8dd763c",
  };
  assert.equal(isApprovedDestructiveMigration(base), true);
  assert.equal(isApprovedDestructiveMigration({ ...base, approvalLabel: "false" }), false);
  assert.equal(isApprovedDestructiveMigration({ ...base, migrationBlob: "changed" }), false);
});

test("mantiene bloqueadas migraciones destructivas sin aprobación externa o con cambios al contenido aprobado", () => {
  const base = {
    findings: ["packages/database/migrations/0189_retirar_fotografias.sql:8: operación potencialmente destructiva"],
    approvalLabel: "true",
    migrationPaths: ["packages/database/migrations/0189_retirar_fotografias.sql"],
    migrationBlob: "80d56760b1a015715a05b090dd77e42e48e36b69",
  };
  assert.equal(isApprovedDestructiveMigration({ ...base, approvalLabel: "false" }), false);
  assert.equal(isApprovedDestructiveMigration({ ...base, migrationBlob: "changed" }), false);
  assert.equal(isApprovedDestructiveMigration({ ...base, migrationPaths: [...base.migrationPaths, "0191_other.sql"] }), false);
  assert.equal(isApprovedDestructiveMigration({
    ...base,
    findings: ["packages/database/migrations/0191_other.sql:1: operación potencialmente destructiva"],
  }), false);
});

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

test("permite reemplazar una restriccion con DROP CONSTRAINT IF EXISTS", () => {
  const path = "packages/database/migrations/0190_reemplazo_restriccion.sql";
  const findings = inspectMigrationChanges(
    [{ status: "A", path }],
    new Map([[path, [
      'ALTER TABLE "garantias_modelos_mototaxis" DROP CONSTRAINT IF EXISTS "garantias_modelos_mototaxis_alcance_ck";',
      'ALTER TABLE "garantias_modelos_mototaxis" ADD CONSTRAINT "garantias_modelos_mototaxis_alcance_ck" CHECK ("activa" OR length(trim("alcance")) BETWEEN 3 AND 4000);',
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
