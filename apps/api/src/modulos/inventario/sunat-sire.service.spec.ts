import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { BadGatewayException, BadRequestException } from "@nestjs/common";
import { ServicioSunatSire } from "./sunat-sire.service";

const nombresEntorno = [
  "SUNAT_SIRE_RUC",
  "SUNAT_SIRE_USUARIO_SOL",
  "SUNAT_SIRE_CLAVE_SOL",
  "SUNAT_SIRE_CLIENT_ID",
  "SUNAT_SIRE_CLIENT_SECRET",
] as const;
const entornoAnterior = new Map(nombresEntorno.map((nombre) => [nombre, process.env[nombre]]));
const fetchOriginal = globalThis.fetch;

before(() => {
  process.env.SUNAT_SIRE_RUC = "20123456789";
  process.env.SUNAT_SIRE_USUARIO_SOL = "USUARIOQA";
  process.env.SUNAT_SIRE_CLAVE_SOL = "clave-sol-sintetica";
  process.env.SUNAT_SIRE_CLIENT_ID = "cliente-sire-sintetico";
  process.env.SUNAT_SIRE_CLIENT_SECRET = "secreto-sire-sintetico";
});

after(() => {
  globalThis.fetch = fetchOriginal;
  for (const nombre of nombresEntorno) {
    const valor = entornoAnterior.get(nombre);
    if (valor === undefined) delete process.env[nombre];
    else process.env[nombre] = valor;
  }
});

function respuestaToken() {
  return Response.json({ access_token: "token-sire-sintetico", expires_in: 3600 });
}

async function conSimulador(
  simulador: (url: string, init?: RequestInit) => Promise<Response>,
  ejecutar: () => Promise<unknown>,
) {
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) =>
    simulador(String(input), init)) as typeof fetch;
  try {
    return await ejecutar();
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

test("solicita un token sintético y consulta periodos con Bearer sin exponer credenciales", async () => {
  const solicitudes: { url: string; init?: RequestInit }[] = [];
  const resultado = await conSimulador(async (url, init) => {
    solicitudes.push({ url, init });
    return url.includes("/oauth2/token/")
      ? respuestaToken()
      : Response.json({ periodos: ["202610", "202611"] });
  }, () => new ServicioSunatSire().consultarPeriodos());

  assert.deepEqual(resultado, { periodos: ["202610", "202611"] });
  assert.equal(solicitudes.length, 2);
  assert.equal(solicitudes[0].init?.method, "POST");
  assert.match(String(solicitudes[0].init?.body), /grant_type=password/);
  assert.match(String(solicitudes[0].init?.body), /USUARIOQA/);
  assert.equal(solicitudes[1].init?.method, undefined);
  assert.equal(new Headers(solicitudes[1].init?.headers).get("authorization"), "Bearer token-sire-sintetico");
  assert.ok(!JSON.stringify(resultado).includes("clave-sol-sintetica"));
  assert.ok(!JSON.stringify(resultado).includes("secreto-sire-sintetico"));
});

test("rechaza credenciales SUNAT inválidas sin revelar valores enviados", async () => {
  await conSimulador(async () => Response.json({ msg: "credenciales rechazadas" }, { status: 401 }), async () => {
    await assert.rejects(
      () => new ServicioSunatSire().consultarPeriodos(),
      (error) => error instanceof BadRequestException &&
        !error.message.includes("clave-sol-sintetica") &&
        !error.message.includes("secreto-sire-sintetico"),
    );
  });
});

for (const status of [400, 401, 403, 404, 429, 500, 502, 503]) {
  test(`convierte HTTP ${status} de SIRE en error controlado`, async () => {
    let llamadaSire = false;
    await conSimulador(async (url) => {
      if (url.includes("/oauth2/token/")) return respuestaToken();
      llamadaSire = true;
      return Response.json({ msg: `falla sintética ${status}` }, { status });
    }, async () => {
      await assert.rejects(
        () => new ServicioSunatSire().consultarPeriodos(),
        (error) => error instanceof BadGatewayException && !error.message.includes("token-sire-sintetico"),
      );
    });
    assert.equal(llamadaSire, true);
  });
}

test("rechaza JSON inválido del servicio SIRE aunque HTTP responda 200", async () => {
  await conSimulador(async (url) => {
    if (url.includes("/oauth2/token/")) return respuestaToken();
    return new Response("{ respuesta rota", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }, async () => {
    await assert.rejects(
      () => new ServicioSunatSire().consultarPeriodos(),
      (error) => error instanceof BadGatewayException && /JSON no válida/.test(error.message),
    );
  });
});

test("convierte desconexiones de token y SIRE en errores controlados", async () => {
  await conSimulador(async () => {
    throw new Error("simulated network failure");
  }, async () => {
    await assert.rejects(
      () => new ServicioSunatSire().consultarPeriodos(),
      (error) => error instanceof BadGatewayException && /autenticación de SUNAT/.test(error.message),
    );
  });

  let tokenSolicitado = false;
  await conSimulador(async (url) => {
    if (url.includes("/oauth2/token/")) {
      tokenSolicitado = true;
      return respuestaToken();
    }
    throw new Error("simulated network failure");
  }, async () => {
    await assert.rejects(
      () => new ServicioSunatSire().consultarPeriodos(),
      (error) => error instanceof BadGatewayException && /API de SUNAT SIRE/.test(error.message),
    );
  });
  assert.equal(tokenSolicitado, true);
});

test("valida periodos inválidos antes de llamar al proveedor", async () => {
  let solicitudes = 0;
  await conSimulador(async () => {
    solicitudes += 1;
    return respuestaToken();
  }, async () => {
    await assert.rejects(
      () => new ServicioSunatSire().consultarTicket("202613", "12345678901234"),
      (error) => error instanceof BadRequestException,
    );
  });
  assert.equal(solicitudes, 0);
});
