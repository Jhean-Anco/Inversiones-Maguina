import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import {
  BadGatewayException,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { consultarIdentidadPeru } from "./consulta-identidad-peru";

const tokenAnterior = process.env.APIS_PERU_TOKEN;
const fetchOriginal = globalThis.fetch;

before(() => {
  process.env.APIS_PERU_TOKEN = "token-api-peru-sintetico";
});

after(() => {
  globalThis.fetch = fetchOriginal;
  if (tokenAnterior === undefined) delete process.env.APIS_PERU_TOKEN;
  else process.env.APIS_PERU_TOKEN = tokenAnterior;
});

async function conSimulador(
  simulador: (url: URL, init?: RequestInit) => Promise<Response>,
  ejecutar: () => Promise<unknown>,
) {
  globalThis.fetch = (async (input: URL | RequestInfo, init?: RequestInit) =>
    simulador(new URL(String(input)), init)) as typeof fetch;
  try {
    return await ejecutar();
  } finally {
    globalThis.fetch = fetchOriginal;
  }
}

test("normaliza DNI usando respuesta sintética y mantiene token fuera del resultado", async () => {
  let solicitud: URL | undefined;
  const resultado = await conSimulador(async (url) => {
    solicitud = url;
    return Response.json({ first_name: " ANA ", first_last_name: " PÉREZ ", second_last_name: " LÓPEZ " });
  }, () => consultarIdentidadPeru(" dni ", "12345678"));

  assert.deepEqual(resultado, {
    tipoDocumento: "DNI",
    numeroDocumento: "12345678",
    tipoPersona: "NATURAL",
    nombres: "ANA",
    apellidoPaterno: "PÉREZ",
    apellidoMaterno: "LÓPEZ",
    direccion: "",
  });
  assert.equal(solicitud?.pathname, "/api/v1/dni/12345678");
  assert.equal(solicitud?.searchParams.get("token"), "token-api-peru-sintetico");
  assert.ok(!JSON.stringify(resultado).includes("token-api-peru-sintetico"));
});

test("normaliza RUC jurídico desde el simulador", async () => {
  const resultado = await conSimulador(async () =>
    Response.json({ razon_social: " Empresa Sintética S.A.C. ", direccion: " Lima " }),
  () => consultarIdentidadPeru("RUC", "20100070970"));

  assert.deepEqual(resultado, {
    tipoDocumento: "RUC",
    numeroDocumento: "20100070970",
    tipoPersona: "JURIDICA",
    razonSocial: "Empresa Sintética S.A.C.",
    direccion: "Lima",
  });
});

for (const [status, ErrorEsperado] of [
  [401, ServiceUnavailableException],
  [403, ServiceUnavailableException],
  [404, NotFoundException],
  [422, BadRequestException],
  [429, ServiceUnavailableException],
  [500, BadGatewayException],
  [502, BadGatewayException],
  [503, BadGatewayException],
] as const) {
  test(`convierte HTTP ${status} de API Perú en error controlado`, async () => {
    await conSimulador(async () => new Response(null, { status }), async () => {
      await assert.rejects(
        () => consultarIdentidadPeru("DNI", "12345678"),
        (error) => error instanceof ErrorEsperado &&
          !error.message.includes("token-api-peru-sintetico"),
      );
    });
  });
}

test("rechaza respuesta JSON inválida del proveedor", async () => {
  await conSimulador(async () => new Response("no es JSON", {
    status: 200,
    headers: { "content-type": "application/json" },
  }), async () => {
    await assert.rejects(
      () => consultarIdentidadPeru("DNI", "12345678"),
      (error) => error instanceof BadGatewayException && /no se pudo interpretar/.test(error.message),
    );
  });
});

test("rechaza respuesta exitosa incompleta", async () => {
  await conSimulador(async () => Response.json({ first_name: "ANA" }), async () => {
    await assert.rejects(
      () => consultarIdentidadPeru("DNI", "12345678"),
      (error) => error instanceof BadGatewayException && /respuesta incompleta/.test(error.message),
    );
  });
});

test("valida el documento antes de llamar al proveedor", async () => {
  let solicitudes = 0;
  await conSimulador(async () => {
    solicitudes += 1;
    return Response.json({});
  }, async () => {
    await assert.rejects(() => consultarIdentidadPeru("DNI", "1234"), BadRequestException);
    await assert.rejects(() => consultarIdentidadPeru("RUC", "12345678901"), BadRequestException);
  });
  assert.equal(solicitudes, 0);
});

test("exige token de servidor antes de contactar API Perú", async () => {
  const tokenConfigurado = process.env.APIS_PERU_TOKEN;
  delete process.env.APIS_PERU_TOKEN;
  let solicitudes = 0;
  try {
    await conSimulador(async () => {
      solicitudes += 1;
      return Response.json({});
    }, async () => {
      await assert.rejects(
        () => consultarIdentidadPeru("DNI", "12345678"),
        ServiceUnavailableException,
      );
    });
  } finally {
    if (tokenConfigurado === undefined) delete process.env.APIS_PERU_TOKEN;
    else process.env.APIS_PERU_TOKEN = tokenConfigurado;
  }
  assert.equal(solicitudes, 0);
});
