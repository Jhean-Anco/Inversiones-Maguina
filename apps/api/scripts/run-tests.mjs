import { mkdtemp, readdir, rm } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const category = process.argv[2] ?? "unit";
const coverage = process.argv.includes("--coverage");
const suffixes = {
  unit: [".spec.ts"],
  integration: [".integration.spec.ts"],
  api: [".api.spec.ts"],
  security: [".security.spec.ts"],
};

if (!Object.hasOwn(suffixes, category)) {
  console.error(`Categoría de pruebas desconocida: ${category}`);
  process.exit(2);
}

async function archivosRecursivos(directorio) {
  const entradas = await readdir(directorio, { withFileTypes: true });
  const grupos = await Promise.all(
    entradas.map((entrada) => {
      const ruta = join(directorio, entrada.name);
      return entrada.isDirectory()
        ? archivosRecursivos(ruta)
        : entrada.isFile()
          ? [ruta]
          : [];
    }),
  );
  return grupos.flat();
}

const archivos = (await archivosRecursivos(join(packageRoot, "src")))
  .filter((ruta) => suffixes[category].some((sufijo) => ruta.endsWith(sufijo)))
  .filter((ruta) => category !== "unit" || !/\.(?:integration|api|security)\.spec\.ts$/.test(ruta))
  .sort((a, b) => a.localeCompare(b));

if (!archivos.length) {
  console.error(`No hay pruebas de categoría "${category}". No se considera una aprobación.`);
  process.exit(2);
}

let carpetaTemporalIntegracion;
const entorno = {
  NODE_ENV: "test",
  FRONTEND_ORIGIN: "http://localhost:5173",
  AUTENTICACION_SECRETO: "ci-only-random-secret-value-with-more-than-32-chars",
  NUBEFACT_RUTA: "https://example.invalid/api",
  NUBEFACT_TOKEN: "ci-only-fake-token",
  PATH: process.env.PATH ?? "",
};
for (const nombre of ["SystemRoot", "WINDIR", "TEMP", "TMP", "PATHEXT", "ComSpec"]) {
  if (process.env[nombre]) entorno[nombre] = process.env[nombre];
}

if (category === "integration") {
  const valor = process.env.DATABASE_URL;
  if (!valor) {
    console.error("Define DATABASE_URL con una instancia PostgreSQL local desechable *_test.");
    process.exit(2);
  }
  const url = new URL(valor);
  const hostPermitido = ["localhost", "127.0.0.1", "::1", "[::1]", "db"].includes(url.hostname);
  if (
    !hostPermitido ||
    url.pathname !== "/magina_test" ||
    url.username !== "ci" ||
    url.password !== "ci-only-password" ||
    !["postgres:", "postgresql:"].includes(url.protocol)
  ) {
    console.error("Se rechazó DATABASE_URL: se exige PostgreSQL local con las credenciales ficticias de magina_test.");
    process.exit(2);
  }
  entorno.DATABASE_URL = valor;
  carpetaTemporalIntegracion = await mkdtemp(join(tmpdir(), "magina-integration-"));
  entorno.UPLOADS_DIR = join(carpetaTemporalIntegracion, "uploads");
} else {
  entorno.DATABASE_URL = "postgres://ci:ci-only@127.0.0.1:5432/magina_test";
}

if (category === "api" || category === "security") {
  const valor = process.env.API_BASE_URL;
  if (!valor) {
    console.error("Define API_BASE_URL con la instancia local de API iniciada para pruebas.");
    process.exit(2);
  }
  let url;
  try {
    url = new URL(valor);
  } catch {
    console.error("Se rechazó API_BASE_URL: debe ser una URL HTTP local.");
    process.exit(2);
  }
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    console.error("Se rechazó API_BASE_URL: se permite únicamente un origen HTTP local sin ruta ni credenciales.");
    process.exit(2);
  }
  entorno.API_BASE_URL = url.origin;
}

console.log(
  `${category}: ${archivos.map((archivo) => relative(packageRoot, archivo)).join(", ")}`,
);

const argumentos = ["--import", "tsx"];
if (coverage) argumentos.push("--experimental-test-coverage");
argumentos.push("--test");
argumentos.push(...archivos);

const ejecucion = spawn(process.execPath, argumentos, {
  cwd: packageRoot,
  stdio: "inherit",
  env: entorno,
});

ejecucion.once("error", (error) => {
  console.error(`No se pudo iniciar el ejecutor de pruebas: ${error.message}`);
  process.exitCode = 1;
});
ejecucion.once("exit", (codigo, senal) => {
  if (senal) console.error(`El ejecutor de pruebas terminó por la señal ${senal}.`);
  const limpiar = async () => {
    if (carpetaTemporalIntegracion) {
      await rm(carpetaTemporalIntegracion, { recursive: true, force: true });
    }
    process.exitCode = codigo ?? 1;
  };
  void limpiar().catch((error) => {
    console.error(`No se pudo limpiar el directorio temporal de integración: ${error.message}`);
    process.exitCode = 1;
  });
});
