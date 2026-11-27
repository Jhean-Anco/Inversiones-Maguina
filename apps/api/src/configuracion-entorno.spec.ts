import assert from "node:assert/strict";
import { after, test } from "node:test";
import { validarConfiguracionEntorno } from "./configuracion-entorno";

const nombres = [
  "PORT",
  "FRONTEND_ORIGIN",
  "AUTENTICACION_DURACION_SEGUNDOS",
  "AUTENTICACION_DURACION_RECORDAR_SEGUNDOS",
  "NUBEFACT_TIMEOUT_MS",
  "UPLOADS_DIR",
  "DESCUENTO_MAXIMO_PORCENTAJE",
  "REGIMEN_TRIBUTARIO",
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
});

test("aplica los valores predeterminados de configuración cuando son opcionales", () => {
  configurarEntornoSeguro();
  for (const nombre of [
    "PORT",
    "AUTENTICACION_DURACION_SEGUNDOS",
    "AUTENTICACION_DURACION_RECORDAR_SEGUNDOS",
    "NUBEFACT_TIMEOUT_MS",
    "UPLOADS_DIR",
    "DESCUENTO_MAXIMO_PORCENTAJE",
    "REGIMEN_TRIBUTARIO",
  ]) {
    delete process.env[nombre];
  }

  const configuracion = validarConfiguracionEntorno();
  assert.equal(configuracion.puerto, 3000);
  assert.equal(configuracion.segundosSesion, 8 * 60 * 60);
  assert.equal(configuracion.segundosSesionRecordada, 30 * 24 * 60 * 60);
  assert.equal(configuracion.timeoutNubefactMs, 20000);
  assert.equal(configuracion.carpetaSubidas.endsWith("storage"), true);
  assert.equal(configuracion.descuentoMaximoPorcentaje, 0);
});

test("rechaza orígenes HTTP fuera de loopback", () => {
  configurarEntornoSeguro();
  process.env.FRONTEND_ORIGIN = "http://app.example.com";
  assert.throws(
    () => validarConfiguracionEntorno(),
    /FRONTEND_ORIGIN debe usar HTTPS/,
  );
});

test("rechaza datos de empresa incompletos en el entorno", () => {
  configurarEntornoSeguro();
  process.env.EMPRESA_RUC = "20100066603";
  try {
    assert.throws(() => validarConfiguracionEntorno(), /Datos de empresa del entorno inválidos/);
    Object.assign(process.env, { EMPRESA_RAZON_SOCIAL: "Demo SAC", EMPRESA_DIRECCION: "Av. Uno 1" });
    assert.doesNotThrow(() => validarConfiguracionEntorno());
  } finally {
    for (const nombre of ["EMPRESA_RUC", "EMPRESA_RAZON_SOCIAL", "EMPRESA_DIRECCION"]) delete process.env[nombre];
  }
});

test("configura y valida el seguimiento automático de NubeFact", () => {
  configurarEntornoSeguro();
  const nombres = ["NUBEFACT_SEGUIMIENTO_ACTIVO", "NUBEFACT_SEGUIMIENTO_ESPERAS_SEGUNDOS", "NUBEFACT_CONSULTA_INMEDIATA_ESPERAS_MS"] as const;
  try {
    Object.assign(process.env, { NUBEFACT_SEGUIMIENTO_ACTIVO: "true", NUBEFACT_SEGUIMIENTO_ESPERAS_SEGUNDOS: "5, 10", NUBEFACT_CONSULTA_INMEDIATA_ESPERAS_MS: "0" });
    const configuracion = validarConfiguracionEntorno();
    assert.equal(configuracion.seguimientoNubefact.activo, true);
    assert.deepEqual(configuracion.seguimientoNubefact.esperasSegundos, [5, 10]);
    assert.deepEqual(configuracion.esperasConsultaInmediataMs, []);
    process.env.NUBEFACT_SEGUIMIENTO_ACTIVO = "no";
    assert.equal(validarConfiguracionEntorno().seguimientoNubefact.activo, false);
    process.env.NUBEFACT_SEGUIMIENTO_ACTIVO = "quizás";
    assert.throws(() => validarConfiguracionEntorno(), /debe ser true o false/);
    process.env.NUBEFACT_SEGUIMIENTO_ACTIVO = "false";
    process.env.NUBEFACT_SEGUIMIENTO_ESPERAS_SEGUNDOS = "15,x";
    assert.throws(() => validarConfiguracionEntorno(), /lista de enteros/);
    process.env.NUBEFACT_SEGUIMIENTO_ESPERAS_SEGUNDOS = "0";
    assert.throws(() => validarConfiguracionEntorno(), /lista de enteros/);
  } finally {
    for (const nombre of nombres) delete process.env[nombre];
  }
});
