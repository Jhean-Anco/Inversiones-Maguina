import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";
import { limpiarArchivosSubidos } from "../../packages/database/scripts/clean-uploads.mjs";

const root = resolve(import.meta.dirname, "../..");
const extensionsImagen = /\.(?:png|jpe?g|webp|gif|bmp|svg|avif)$/i;

async function listarArchivos(directorio) {
  const encontrados = [];
  for (const entrada of await readdir(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name);
    if (entrada.isDirectory()) encontrados.push(...await listarArchivos(ruta));
    else encontrados.push(ruta);
  }
  return encontrados;
}

test("solo se distribuyen el logo y el fondo optimizado del login", async () => {
  const archivos = await listarArchivos(join(root, "apps/web/public"));
  const imagenes = archivos.filter((ruta) => extensionsImagen.test(ruta));
  assert.deepEqual(imagenes.map((ruta) => relative(root, ruta).replaceAll("\\", "/")), ["apps/web/public/fondo-login.webp", "apps/web/public/logo.webp"]);
});

test("el esquema activo no almacena imagenes ni evidencias adjuntas", async () => {
  const esquema = await readFile(join(root, "packages/database/src/esquema/index.ts"), "utf8");
  for (const referencia of ["ruta_imagen", "productos_imagenes", "imagenes_mototaxis", "evidencia_ruta", "evidencia_mime", "evidencia_nombre"]) {
    assert.equal(esquema.includes(referencia), false, `El esquema aun contiene ${referencia}`);
  }
});

test("el frontend y API no exponen controles ni transporte de archivos del usuario", async () => {
  for (const directorio of ["apps/web/src", "apps/api/src"]) {
    const archivos = await listarArchivos(join(root, directorio));
    const fuentes = archivos.filter((ruta) => /\.(?:ts|tsx|mts)$/.test(ruta) && !ruta.endsWith(".spec.ts") && !ruta.endsWith(".spec.mts"));
    for (const ruta of fuentes) {
      const contenido = await readFile(ruta, "utf8");
      assert.doesNotMatch(contenido, /type\s*=\s*["']file["']|multipart\/form-data|\.setInputFiles\s*\(|solicitud\.file\s*\(/i, `${relative(root, ruta)} contiene una ruta de carga`);
    }
  }
});

test("el servidor obliga a revalidar HTML despues de un despliegue", async () => {
  const nginx = await readFile(join(root, "docker/nginx.conf"), "utf8");
  const compose = await readFile(join(root, "compose.prod.yaml"), "utf8");
  assert.match(nginx, /location\s+\/\s*\{[^}]*Cache-Control\s+"no-cache"/s);
  assert.match(compose, /node scripts\/clean-uploads\.mjs/);
});

test("el saneamiento borra imagenes y adjuntos, y conserva documentos del sistema", async () => {
  const uploads = await mkdtemp(join(tmpdir(), "magina-uploads-"));
  try {
    await mkdir(join(uploads, "catalogo"));
    await mkdir(join(uploads, "evidencias-compras"));
    await mkdir(join(uploads, "ventas"));
    await writeFile(join(uploads, "catalogo", "foto.webp"), "image");
    await writeFile(join(uploads, "evidencias-compras", "compra.pdf"), "user attachment");
    await writeFile(join(uploads, "ventas", "factura.pdf"), "generated document");

    assert.equal(await limpiarArchivosSubidos(uploads), 2);
    assert.deepEqual((await listarArchivos(uploads)).map((ruta) => relative(uploads, ruta).replaceAll("\\", "/")), ["ventas/factura.pdf"]);
  } finally {
    await rm(uploads, { recursive: true, force: true });
  }
});
