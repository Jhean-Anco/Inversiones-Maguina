import { readdir, rm } from "node:fs/promises";
import { extname, isAbsolute, parse, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

const extensionesImagen = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".svg", ".avif"]);

export async function limpiarArchivosSubidos(raiz) {
  const base = resolve(raiz);
  if (!isAbsolute(base) || base === parse(base).root) throw new Error("UPLOADS_DIR debe ser una ruta absoluta segura.");
  let eliminados = 0;

  async function recorrer(directorio, esEvidencia = false) {
    for (const entrada of await readdir(directorio, { withFileTypes: true })) {
      const ruta = resolve(directorio, entrada.name);
      if (!ruta.startsWith(`${base}${sep}`)) throw new Error("Se detectó una ruta fuera de UPLOADS_DIR.");
      const evidencia = esEvidencia || entrada.name === "evidencias-compras";
      if (entrada.isDirectory()) await recorrer(ruta, evidencia);
      else if (entrada.isFile() && (evidencia || extensionesImagen.has(extname(entrada.name).toLowerCase()))) {
        await rm(ruta);
        eliminados += 1;
      }
    }
  }

  await recorrer(base);
  return eliminados;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const raiz = process.env.UPLOADS_DIR;
  if (!raiz) throw new Error("Define UPLOADS_DIR para limpiar los archivos cargados.");
  const total = await limpiarArchivosSubidos(raiz);
  console.log(`Archivos de usuario eliminados: ${total}`);
}
