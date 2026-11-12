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

test("el formulario de acceso expone controles utilizables con teclado y viewport móvil", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");

  const principal = page.getByRole("main");
  await expect(principal.getByRole("heading", { name: "Bienvenido", level: 1 })).toBeVisible();

  const usuario = page.getByRole("textbox", { name: "Usuario o correo electrónico" });
  const contrasena = page.getByLabel("Contraseña", { exact: true });
  await expect(usuario).toBeVisible();
  await expect(contrasena).toHaveAttribute("autocomplete", "current-password");
  await expect(page.getByRole("checkbox", { name: "Recordar mi usuario" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();

  await usuario.focus();
  await page.keyboard.press("Tab");
  await expect(contrasena).toBeFocused();
  await expect(page.getByRole("button", { name: "Mostrar contraseña" })).toBeVisible();
  await page.getByRole("button", { name: "Mostrar contraseña" }).click();
  await expect(contrasena).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "Ocultar contraseña" })).toBeVisible();

  const controlesSinNombre = await principal.locator("button, input").evaluateAll((elementos) =>
    elementos
      .filter((elemento) => {
        const control = elemento as HTMLInputElement | HTMLButtonElement;
        return !control.labels?.length && !control.getAttribute("aria-label") && !control.textContent?.trim();
      })
      .map((elemento) => elemento.outerHTML),
  );
  assert.deepEqual(controlesSinNombre, [], "Todos los botones e inputs deben tener nombre accesible.");

  const anchoDocumento = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(anchoDocumento <= 390, `El formulario genera desbordamiento horizontal móvil: ${anchoDocumento}px.`);
});

test("desactivar una cuenta revoca de inmediato una sesión ya emitida", async ({ request }) => {
  assert.ok(usuarioId, "El fixture E2E debe crear el usuario antes de validar su sesión.");
  const api = process.env.VITE_API_URL;
  assert.ok(api, "La prueba de revocación necesita la URL de API configurada para el frontend.");

  const inicio = await request.post(new URL("/autenticacion/iniciar-sesion", api).toString(), {
    data: { usuario: nombreUsuario, contrasena },
  });
  expect(inicio.status()).toBe(200);
  const cookieSesion = inicio.headers()["set-cookie"]?.split(";")[0];
  assert.ok(cookieSesion?.startsWith("magina_sesion="), "El inicio válido debe emitir la cookie de sesión.");

  const opciones = { headers: { cookie: cookieSesion } };
  const perfilActivo = await request.get(new URL("/autenticacion/yo", api).toString(), opciones);
  expect(perfilActivo.status()).toBe(200);

  try {
    await db.update(usuarios).set({ activo: false }).where(eq(usuarios.id, usuarioId));
    const perfilDesactivado = await request.get(new URL("/autenticacion/yo", api).toString(), opciones);
    expect(perfilDesactivado.status()).toBe(401);
  } finally {
    await db.update(usuarios).set({ activo: true }).where(eq(usuarios.id, usuarioId));
  }
});
