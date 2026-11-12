import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { hash } from "argon2";
import { and, eq } from "drizzle-orm";
import {
  archivosLocales,
  cerrarBaseDatos,
  categoriasProductos,
  db,
  personas,
  roles,
  tiposDocumento,
  tiposPersona,
  trabajadores,
  usuarios,
  usuariosRoles,
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
const imagenCategoria = fileURLToPath(new URL("../../../apps/web/src/pages/login-page/logo-transparente.png", import.meta.url));
let personaId: string | undefined;
let trabajadorCreado = false;
let usuarioId: string | undefined;
let categoriaPruebaId: string | undefined;

async function limpiarCategoriaTemporal(id: string) {
  const archivos = await db
    .select({ id: archivosLocales.id, rutaRelativa: archivosLocales.rutaRelativa })
    .from(archivosLocales)
    .where(and(eq(archivosLocales.entidadTipo, "CATEGORIA"), eq(archivosLocales.entidadId, id)));
  const raizSubidas = resolve(process.cwd(), process.env.UPLOADS_DIR?.trim() || "storage");

  for (const archivo of archivos) {
    const rutaAbsoluta = resolve(raizSubidas, archivo.rutaRelativa);
    assert.ok(rutaAbsoluta.startsWith(`${raizSubidas}${sep}`), "La limpieza E2E solo puede borrar archivos dentro de UPLOADS_DIR.");
    try {
      await unlink(rutaAbsoluta);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    await db.delete(archivosLocales).where(eq(archivosLocales.id, archivo.id));
  }

  await db.delete(categoriasProductos).where(eq(categoriasProductos.id, id));
}

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

test("el rol de almacén crea y edita una categoría con imagen persistida", async ({ page }) => {
  assert.ok(usuarioId, "El fixture E2E debe crear el usuario antes de probar el catálogo.");
  const [rolAlmacenero] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.codigo, "ALMACENERO"))
    .limit(1);
  assert.ok(rolAlmacenero, "Las migraciones deben crear el rol ALMACENERO.");
  await db.insert(usuariosRoles).values({ usuarioId, rolId: rolAlmacenero.id });

  try {
    await page.goto("/login");
    await page.getByLabel("Usuario o correo electrónico").fill(nombreUsuario);
    await page.getByLabel("Contraseña", { exact: true }).fill(contrasena);
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page).toHaveURL(/\/inicio$/);

    await page.goto("/inventario/categorias");
    await expect(page.locator(".catalog-manager.is-category-manager")).toBeVisible();
    const nombreCategoria = `Categoría E2E ${sufijo}`;
    const nombreEditado = `${nombreCategoria} editada`;

    await page.getByRole("button", { name: "Crear categoría" }).click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByRole("textbox", { name: /Nombre/ }).fill(nombreCategoria);
    await dialogo.locator('input[type="file"]').setInputFiles(imagenCategoria);

    const respuestaCrear = page.waitForResponse((respuesta) =>
      respuesta.request().method() === "POST" && new URL(respuesta.url()).pathname.endsWith("/inventario/categorias"),
    );
    await dialogo.getByRole("button", { name: "Crear categoría" }).click();
    const creada = await respuestaCrear;
    const cuerpoCreacion = await creada.json().catch(() => undefined) as { id?: string } | undefined;
    categoriaPruebaId = cuerpoCreacion?.id;
    expect(creada.ok()).toBeTruthy();
    assert.ok(categoriaPruebaId, "La API debe devolver el identificador de la categoría creada.");

    const tarjeta = page.locator(".catalog-manager-card").filter({ hasText: nombreCategoria });
    await expect(tarjeta).toBeVisible();
    await expect.poll(() => tarjeta.locator("img").evaluate((imagen) => (imagen as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);

    const archivosCategoria = await db
      .select({ id: archivosLocales.id, rutaRelativa: archivosLocales.rutaRelativa, mimeType: archivosLocales.mimeType })
      .from(archivosLocales)
      .where(and(eq(archivosLocales.entidadTipo, "CATEGORIA"), eq(archivosLocales.entidadId, categoriaPruebaId)));
    expect(archivosCategoria).toHaveLength(1);
    expect(archivosCategoria[0]?.mimeType).toBe("image/png");
    const [categoriaGuardada] = await db
      .select({ nombre: categoriasProductos.nombre, rutaImagen: categoriasProductos.rutaImagen })
      .from(categoriasProductos)
      .where(eq(categoriasProductos.id, categoriaPruebaId))
      .limit(1);
    expect(categoriaGuardada?.nombre).toBe(nombreCategoria);
    expect(categoriaGuardada?.rutaImagen).toContain(archivosCategoria[0]?.id);

    await tarjeta.getByRole("button", { name: `Editar categoría ${nombreCategoria}` }).click();
    const dialogoEdicion = page.getByRole("dialog");
    await dialogoEdicion.getByRole("textbox", { name: /Nombre/ }).fill(nombreEditado);
    await dialogoEdicion.getByRole("button", { name: "Guardar cambios" }).click();
    const tarjetaEditada = page.locator(".catalog-manager-card").filter({ hasText: nombreEditado });
    await expect(tarjetaEditada).toBeVisible();

    const [categoriaEditada] = await db
      .select({ nombre: categoriasProductos.nombre, rutaImagen: categoriasProductos.rutaImagen })
      .from(categoriasProductos)
      .where(eq(categoriasProductos.id, categoriaPruebaId))
      .limit(1);
    expect(categoriaEditada?.nombre).toBe(nombreEditado);
    expect(categoriaEditada?.rutaImagen).toBe(categoriaGuardada?.rutaImagen);
  } finally {
    try {
      if (categoriaPruebaId) await limpiarCategoriaTemporal(categoriaPruebaId);
    } finally {
      await db.delete(usuariosRoles).where(and(eq(usuariosRoles.usuarioId, usuarioId), eq(usuariosRoles.rolId, rolAlmacenero.id)));
    }
  }
});
