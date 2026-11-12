import assert from "node:assert/strict";
import { after, test } from "node:test";
import { validarConfiguracionEntorno } from "./configuracion-entorno";

const nombres = [
  "PORT",
  "FRONTEND_ORIGIN",
  "AUTENTICACION_DURACION_SEGUNDOS",
  "AUTENTICACION_DURACION_RECORDAR_SEGUNDOS",
  "NUBEFACT_TIMEOUT_MS",
  "IMAGEN_MAXIMO_BYTES",
  "UPLOADS_DIR",
  "DESCUENTO_MAXIMO_PORCENTAJE",
  "DATABASE_URL",
  "AUTENTICACION_SECRETO",
  "NUBEFACT_RUTA",
  "NUBEFACT_TOKEN",
];
const original = new Map(
  nombres.map((nombre) => [nombre, process.env[nombre]]),
);

function configurarEntornoSeguro() {
  Object.assign(process.env, {
    PORT: "3000",
    FRONTEND_ORIGIN: "http://localhost:5173",
    AUTENTICACION_DURACION_SEGUNDOS: "28800",
    AUTENTICACION_DURACION_RECORDAR_SEGUNDOS: "2592000",
    NUBEFACT_TIMEOUT_MS: "20000",
    IMAGEN_MAXIMO_BYTES: "5242880",
    UPLOADS_DIR: "storage",
    DESCUENTO_MAXIMO_PORCENTAJE: "0",
    DATABASE_URL: "postgres://ci:ci-only@127.0.0.1:5432/magina",
    AUTENTICACION_SECRETO: "prueba-aislada-sin-credenciales-productivas-98671",
    NUBEFACT_RUTA: "https://ncloud.nubefact.com/api/v1/abc",
    NUBEFACT_TOKEN: "token-ci-ficticio",
  });
}

after(() => {
  for (const [nombre, valor] of original) {
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }
});

test("valida una configuración de desarrollo con valores explícitos", () => {
  configurarEntornoSeguro();
  const configuracion = validarConfiguracionEntorno();
  assert.equal(configuracion.puerto, 3000);
  assert.deepEqual(configuracion.origenes, ["http://localhost:5173"]);
  assert.equal(configuracion.maximoImagenBytes, 5 * 1024 * 1024);
});

test("rechaza orígenes HTTP fuera de loopback", () => {
  configurarEntornoSeguro();
  process.env.FRONTEND_ORIGIN = "http://app.example.com";
  assert.throws(
    () => validarConfiguracionEntorno(),
    /FRONTEND_ORIGIN debe usar HTTPS/,
  );
});
