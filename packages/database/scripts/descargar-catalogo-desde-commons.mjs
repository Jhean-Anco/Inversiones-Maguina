import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import postgres from "postgres";

const raiz = resolve(import.meta.dirname, "../../..");
const carpetaCategorias = resolve(raiz, "apps/web/public/catalogo/categorias");
const carpetaMarcas = resolve(raiz, "apps/web/public/catalogo/marcas");
const cabeceras = { "User-Agent": "MaginaInventory/1.0 (catalog image sourcing)" };

const categorias = [
  { nombre: "Frenos", slug: "frenos", descripcion: "Discos, pastillas, zapatas y componentes de frenado.", archivo: "Brembo Disc brake.jpg" },
  { nombre: "Motor", slug: "motor", descripcion: "Componentes internos y externos del motor.", archivo: "Bike engine 01.jpg" },
  { nombre: "Transmisión", slug: "transmision", descripcion: "Cadenas, piñones, coronas y transmisión final.", archivo: "Gearbox.jpg" },
  { nombre: "Embrague", slug: "embrague", descripcion: "Discos, campanas y mandos de embrague.", archivo: "Motorcycle clutch.jpg" },
  { nombre: "Suspensión", slug: "suspension", descripcion: "Amortiguadores, barras y componentes de suspensión.", archivo: "Plunger suspension.jpg" },
  { nombre: "Dirección y mandos", slug: "direccion-y-mandos", descripcion: "Manubrios, espejos y piezas de dirección.", archivo: "Motorcycle handlebars (Unsplash).jpg" },
  { nombre: "Sistema eléctrico", slug: "sistema-electrico", descripcion: "Alternadores, reguladores, cableado y encendido.", archivo: "Zuendsp.jpg" },
  { nombre: "Baterías", slug: "baterias", descripcion: "Baterías y componentes de alimentación eléctrica.", archivo: "Lead-acid battery for motorcycle.jpg" },
  { nombre: "Iluminación", slug: "iluminacion", descripcion: "Faros, focos, direccionales y luces posteriores.", archivo: "Vespa PS lamp.jpg" },
  { nombre: "Admisión y carburación", slug: "admision-y-carburacion", descripcion: "Carburadores, inyección y admisión de aire.", archivo: "Carburador biz.JPG" },
  { nombre: "Escape", slug: "escape", descripcion: "Tubos, silenciadores y accesorios de escape.", archivo: "Motorcycle exhaust with multiple holes.jpeg" },
  { nombre: "Lubricantes", slug: "lubricantes", descripcion: "Aceites, grasas y fluidos de mantenimiento.", archivo: "Motor oil for cars and motorcycles from various producers in German hardware store (cropped).jpg" },
  { nombre: "Filtros", slug: "filtros", descripcion: "Filtros de aceite, aire y combustible.", archivo: "Motorcycle oil filter.jpg" },
  { nombre: "Neumáticos y cámaras", slug: "neumaticos-y-camaras", descripcion: "Llantas, neumáticos y cámaras para motocicleta.", archivo: "Motorcycle tyre stack.jpg" },
  { nombre: "Aros y ruedas", slug: "aros-y-ruedas", descripcion: "Aros, rayos y componentes de rueda.", archivo: "A Sliver motorcycle wheel.jpg" },
  { nombre: "Rodamientos y retenes", slug: "rodamientos-y-retenes", descripcion: "Rodajes, retenes y sellos mecánicos.", archivo: "Upper bearing race.jpg" },
  { nombre: "Cables y controles", slug: "cables-y-controles", descripcion: "Cables de acelerador, embrague y freno.", archivo: "Lenkerschalter rechts.jpg" },
  { nombre: "Carrocería y plásticos", slug: "carroceria-y-plasticos", descripcion: "Carenados, guardafangos y piezas plásticas.", archivo: "996R carbon fairing.jpg" },
  { nombre: "Accesorios para moto", slug: "accesorios-para-moto", descripcion: "Accesorios funcionales para motocicletas.", archivo: "Crash pad02.jpg" },
  { nombre: "Seguridad y protección", slug: "seguridad-y-proteccion", descripcion: "Cascos, guantes y elementos de protección.", archivo: "BlackFullCoverageMotorcycleHelmet.jpg" },
];

const marcas = [
  ["Honda", "Honda Logo.svg"],
  ["Yamaha", "Yamaha Motor logo.svg"],
  ["Suzuki", "Suzuki logo 2025.svg"],
  ["Bajaj", "Bajaj Motorcycles logo.svg"],
  ["Hero", "Hero MotoCorp Logo.svg"],
  ["Kawasaki", "Kawasaki-logo.svg"],
  ["KTM", "KTM-Logo.svg"],
  ["Kymco", "KYMCO logo.svg"],
  ["CFMOTO", "CFMOTO Logo.svg"],
  ["Benelli", "Benelli logo 2019.png"],
  ["Lifan", "Lifan Logo.jpg"],
  ["Zongshen", "ZongShen-Logo.JPG"],
  ["Loncin", "LONCIN LOGO.jpg"],
  ["Haojue", "Haojue Holdings logo.svg"],
  ["Royal Enfield", "Royal Enfield logo.svg"],
  ["Harley-Davidson", "Harley-Davidson logo.svg"],
  ["TVS", "Tvsdesign.jpg", "https://companieslogo.com/img/orig/TVSMOTOR.NS-72a11be9.png", "https://companieslogo.com/tvs-motor/logo"],
  ["Aprilia", "Aprilia-logo.svg"],
  ["Indian Motorcycle", "Indian Motorcycle logo.svg"],
  ["Triumph", "Triumph Motorcycles logo and claim 2015.svg"],
];

function valor(meta, clave) {
  return meta?.[clave]?.value ?? null;
}

function slugMarca(nombre) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replaceAll("&", "y").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function urlOptimizada(url) {
  const recurso = new URL(url);
  return `https://wsrv.nl/?${new URLSearchParams({
    url: `${recurso.host}${recurso.pathname}`,
    w: "760",
    h: "560",
    fit: "inside",
    output: "webp",
  })}`;
}

const archivos = [
  ...categorias.map((item) => ({ clase: "categorias", nombre: item.nombre, slug: item.slug, archivoOrigen: item.archivo })),
  ...marcas.map(([nombre, archivoOrigen, urlExterna, fuenteExterna]) => ({ clase: "marcas", nombre, slug: slugMarca(nombre), archivoOrigen, urlExterna, fuenteExterna })),
];

const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
endpoint.search = new URLSearchParams({
  action: "query",
  titles: archivos.filter(({ urlExterna }) => !urlExterna).map(({ archivoOrigen }) => `File:${archivoOrigen}`).join("|"),
  prop: "imageinfo",
  iiprop: "url|mime|extmetadata",
  iiurlwidth: "760",
  format: "json",
});
const respuesta = await fetch(endpoint, { headers: cabeceras });
if (!respuesta.ok) throw new Error(`Wikimedia Commons respondió ${respuesta.status}.`);
const datos = await respuesta.json();
const paginas = new Map(Object.values(datos.query?.pages ?? {}).map((pagina) => [pagina.title.slice(5), pagina]));

for (const archivo of archivos) {
  if (archivo.urlExterna) {
    archivo.informacion = {
      url: archivo.urlExterna,
      thumburl: archivo.urlExterna,
      mime: "image/png",
      descriptionurl: archivo.fuenteExterna,
      extmetadata: {
        Artist: { value: "TVS Motor Company" },
        LicenseShortName: { value: "Marca registrada; derechos reservados al titular" },
        LicenseUrl: { value: null },
      },
    };
    continue;
  }
  const pagina = paginas.get(archivo.archivoOrigen);
  if (!pagina || pagina.missing || !pagina.imageinfo?.[0]) throw new Error(`No se encontró en Commons: ${archivo.archivoOrigen}`);
  archivo.pagina = pagina;
  archivo.informacion = pagina.imageinfo[0];
  if (archivo.clase === "categorias" && archivo.informacion.mime !== "image/jpeg") {
    throw new Error(`La imagen para ${archivo.nombre} no es JPEG: ${archivo.informacion.mime}`);
  }
}

const contenidos = [];
for (let indice = 0; indice < archivos.length; indice++) {
  const archivo = archivos[indice];
  const carpeta = archivo.clase === "categorias" ? carpetaCategorias : carpetaMarcas;
  const existente = (await readdir(carpeta).catch(() => [])).find((nombre) => nombre.startsWith(`${archivo.slug}.`));
  if (existente) {
    const extension = existente.split(".").at(-1);
    const mime = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", svg: "image/svg+xml", webp: "image/webp" }[extension];
    contenidos.push({ archivo, bytes: await readFile(resolve(carpeta, existente)), url: archivo.informacion.descriptionurl, extension, mime });
    continue;
  }
  const urlFuente = archivo.informacion.thumburl ?? archivo.informacion.url;
  let url = urlOptimizada(urlFuente);
  let response;
  for (let intento = 0; intento < 6; intento++) {
    response = await fetch(url, { headers: cabeceras });
    if (response.status === 404 && url !== urlFuente) {
      url = urlFuente;
      continue;
    }
    if (response.status !== 429 && response.status !== 503) break;
    const retryAfter = Number(response.headers.get("retry-after")) || 0;
    const espera = Math.max(retryAfter * 1000, 5000 * (intento + 1));
    console.log(`Commons pidió esperar; reintento ${intento + 1} en ${Math.ceil(espera / 1000)} s.`);
    await new Promise((resolveEspera) => setTimeout(resolveEspera, espera));
  }
  if (!response?.ok) throw new Error(`No se pudo descargar ${archivo.archivoOrigen}: HTTP ${response?.status ?? "sin respuesta"}`);
  const tipoMime = response.headers.get("content-type")?.split(";")[0] ?? archivo.informacion.mime;
  const extensiones = { "image/jpeg": "jpg", "image/png": "png", "image/svg+xml": "svg", "image/webp": "webp" };
  const extension = extensiones[tipoMime];
  if (!extension) throw new Error(`Formato de imagen no admitido (${tipoMime}) en ${archivo.archivoOrigen}`);
  contenidos.push({ archivo, bytes: Buffer.from(await response.arrayBuffer()), url, extension, mime: tipoMime });
  if ((indice + 1) % 5 === 0 || indice + 1 === archivos.length) console.log(`Descargados ${indice + 1} de ${archivos.length} archivos.`);
  await new Promise((resolveEspera) => setTimeout(resolveEspera, 1500));
}

await mkdir(carpetaCategorias, { recursive: true });
await mkdir(carpetaMarcas, { recursive: true });
for (const directorio of [carpetaCategorias, carpetaMarcas]) {
  for (const existente of await readdir(directorio)) {
    if (/\.(svg|png|jpe?g|webp)$/i.test(existente)) await rm(resolve(directorio, existente));
  }
}

const fuentes = [];
for (const { archivo, bytes, url, extension, mime } of contenidos) {
  const nombreArchivo = `${archivo.slug}.${extension}`;
  const rutaPublica = `/catalogo/${archivo.clase}/${nombreArchivo}`;
  const carpeta = archivo.clase === "categorias" ? carpetaCategorias : carpetaMarcas;
  await writeFile(resolve(carpeta, nombreArchivo), bytes);
  archivo.rutaPublica = rutaPublica;
  archivo.nombreArchivo = nombreArchivo;
  const meta = archivo.informacion.extmetadata;
  fuentes.push({
    catalogo: archivo.clase,
    registro: archivo.nombre,
    archivo: nombreArchivo,
    archivoFuente: archivo.archivoOrigen,
    fuente: archivo.informacion.descriptionurl,
    descarga: url,
    mime,
    autor: valor(meta, "Artist"),
    licencia: valor(meta, "LicenseShortName"),
    licenciaUrl: valor(meta, "LicenseUrl"),
  });
}
await writeFile(resolve(raiz, "apps/web/public/catalogo/fuentes.json"), `${JSON.stringify(fuentes, null, 2)}\n`, "utf8");

config({ path: resolve(raiz, ".env") });
if (!process.env.DATABASE_URL) throw new Error("Falta DATABASE_URL para conectar a PostgreSQL.");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
try {
  await sql.begin(async (tx) => {
    for (const item of categorias) {
      const archivo = archivos.find((registro) => registro.clase === "categorias" && registro.nombre === item.nombre);
      const rutaImagen = archivo.rutaPublica;
      await tx`insert into categorias_productos (nombre, descripcion, ruta_imagen) values (${item.nombre}, ${item.descripcion}, ${rutaImagen}) on conflict (lower(nombre)) do update set ruta_imagen = excluded.ruta_imagen`;
    }
    const nombresMarcas = marcas.map(([nombre]) => nombre.toLowerCase());
    await tx`delete from marcas_productos where lower(nombre) <> all(${sql.array(nombresMarcas)})`;
    for (const [nombre] of marcas) {
      const item = archivos.find((archivo) => archivo.clase === "marcas" && archivo.nombre === nombre);
      await tx`insert into marcas_productos (nombre, ruta_imagen) values (${nombre}, ${item.rutaPublica}) on conflict (lower(nombre)) do update set ruta_imagen = excluded.ruta_imagen, activo = true`;
    }
  });
  const resultado = await sql`select (select count(*)::int from categorias_productos where activo) as categorias, (select count(*)::int from marcas_productos where activo) as marcas`;
  console.log(`Catálogo actualizado: ${resultado[0].categorias} categorías y ${resultado[0].marcas} marcas activas.`);
  console.log(`${contenidos.length} imágenes guardadas (${archivos.filter(({ urlExterna }) => !urlExterna).length} desde Commons); fuentes y licencias en apps/web/public/catalogo/fuentes.json.`);
} finally {
  await sql.end();
}
