import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { hash } from "argon2";
import { eq } from "drizzle-orm";
import {
  cerrarBaseDatos,
  db,
  personas,
  tiposDocumento,
  tiposPersona,
  trabajadores,
  usuarios,
} from "@magina/database";

const valorPrueba = process.env.DATABASE_URL;
assert.ok(valorPrueba, "E2E requiere DATABASE_URL de la PostgreSQL desechable.");
const basePrueba = new URL(valorPrueba);
assert.ok(
  ["localhost", "127.0.0.1", "::1", "[::1]"].includes(basePrueba.hostname) &&
    basePrueba.pathname === "/magina_test" &&
    basePrueba.username === "ci" &&
    basePrueba.password === "ci-only-password",
  "E2E rechaza bases de datos distintas a magina_test con credenciales ficticias.",
);

const sufijo = randomUUID().replaceAll("-", "").slice(0, 12).toLowerCase();
const nombreUsuario = `qa-e2e-${sufijo}`;
const correo = `qa-e2e-${sufijo}@example.invalid`;
const contrasena = randomBytes(24).toString("base64url");
let personaId: string | undefined;
let trabajadorCreado = false;
let usuarioId: string | undefined;

test.beforeAll(async () => {
  assert.equal(process.env.NODE_ENV, "test", "E2E exige NODE_ENV=test.");
  const [tipoNatural] = await db
    .select({ id: tiposPersona.id })
    .from(tiposPersona)
    .where(eq(tiposPersona.codigo, "NATURAL"))
    .limit(1);
  const [tipoDni] = await db
    .select({ id: tiposDocumento.id })
    .from(tiposDocumento)
    .where(eq(tiposDocumento.codigo, "01"))
    .limit(1);
  assert.ok(tipoNatural && tipoDni, "Faltan tipos base creados por migraciones.");

  const [persona] = await db
    .insert(personas)
    .values({
      tipoPersonaId: tipoNatural.id,
      tipoDocumentoId: tipoDni.id,
      numeroDocumento: String(10_000_000 + Math.floor(Math.random() * 89_999_999)),
      nombres: "Usuario E2E",
      apellidoPaterno: "Prueba",
    })
    .returning({ id: personas.id });
  const idPersona = persona.id;
  personaId = idPersona;

  await db.insert(trabajadores).values({
    personaId: idPersona,
    fechaIngreso: new Date().toISOString().slice(0, 10),
  });
  trabajadorCreado = true;

  const [usuario] = await db
    .insert(usuarios)
    .values({
      trabajadorId: idPersona,
      nombreUsuario,
      correo,
      contrasenaHash: await hash(contrasena),
      requiereCambioContrasena: false,
    })
    .returning({ id: usuarios.id });
  usuarioId = usuario.id;
});

test.afterAll(async () => {
  try {
    if (usuarioId) await db.delete(usuarios).where(eq(usuarios.id, usuarioId));
    if (personaId && trabajadorCreado) {
      await db.delete(trabajadores).where(eq(trabajadores.personaId, personaId));
    }
    if (personaId) await db.delete(personas).where(eq(personas.id, personaId));
  } finally {
    await cerrarBaseDatos();
  }
});

test("login, permisos visibles y cierre de sesión funcionan con la API y PostgreSQL reales", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();

  await page.getByLabel("Usuario o correo electrónico").fill(nombreUsuario);
  await page.getByLabel("Contraseña", { exact: true }).fill("clave-incorrecta-sintetica");
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page.getByText("Usuario o contraseña incorrectos.")).toBeVisible();

  await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.locator(".topbar-logout-button")).toBeVisible();
  await expect(page.locator(".topbar-user")).toContainText("Usuario E2E Prueba");
  const navegacion = page.getByRole("navigation", { name: "Navegación principal" });
  await expect(navegacion.getByRole("link", { name: "Resumen" })).toBeVisible();
  await expect(navegacion.getByRole("button", { name: "Inventario" })).toHaveCount(0);

  await page.getByRole("button", { name: "Cerrar sesión" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/inicio");
  await expect(page).toHaveURL(/\/login$/);
});
