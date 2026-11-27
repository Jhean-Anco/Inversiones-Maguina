import test from "node:test";
import assert from "node:assert/strict";
import { solicitarDespliegue } from "./deploy-dokploy.mjs";

const sha = "a".repeat(40);
test("conserva la configuracion de Dokploy cuando la rama real ya es main", async () => {
  const calls = [];
  let compose = { composeId: "service-id", sourceType: "github", githubBranch: "main", env: "EMPRESA_RUC=privado" };
  const resultado = await solicitarDespliegue(
    { base: "https://dokploy.example", apiKey: "test-key", composeId: "service-id", sha },
    async (url, options) => {
      calls.push({ url: url.toString(), ...options });
      if (url.pathname === "/api/compose.one") return { ok: true, json: async () => compose };
      if (url.pathname === "/api/compose.update") compose = { ...compose, ...JSON.parse(options.body) };
      return { ok: true };
    },
  );
  assert.deepEqual(calls.map((call) => call.url), [
    "https://dokploy.example/api/compose.one?composeId=service-id",
    "https://dokploy.example/api/compose.deploy",
  ]);
  assert.deepEqual(JSON.parse(calls[1].body), { composeId: "service-id" });
  assert.deepEqual(resultado, { sourceType: "github", revisionField: "githubBranch", revision: "main" });
});

test("solo corrige a main cuando Dokploy tiene otra rama configurada", async () => {
  const calls = [];
  let compose = { composeId: "service-id", sourceType: "github", githubBranch: "release", env: "AUTENTICACION_SECRETO=privado" };
  await solicitarDespliegue(
    { base: "https://dokploy.example", apiKey: "test-key", composeId: "service-id", sha },
    async (url, options) => {
      calls.push({ url: url.toString(), ...options });
      if (url.pathname === "/api/compose.one") return { ok: true, json: async () => compose };
      if (url.pathname === "/api/compose.update") compose = { ...compose, ...JSON.parse(options.body) };
      return { ok: true };
    },
  );
  assert.deepEqual(JSON.parse(calls[1].body), { composeId: "service-id", githubBranch: "main" });
  assert.deepEqual(calls.map((call) => call.url), [
    "https://dokploy.example/api/compose.one?composeId=service-id",
    "https://dokploy.example/api/compose.update",
    "https://dokploy.example/api/compose.one?composeId=service-id",
    "https://dokploy.example/api/compose.deploy",
  ]);
});

test("rechaza datos invalidos y detiene el flujo ante errores", async () => {
  await assert.rejects(
    solicitarDespliegue({ base: "http://dokploy.example", apiKey: "key", composeId: "id", sha }),
    /HTTPS/,
  );
  await assert.rejects(
    solicitarDespliegue({ base: "https://dokploy.example", apiKey: "key", composeId: "id", sha: "main" }),
    /SHA/,
  );
  let calls = 0;
  await assert.rejects(
    solicitarDespliegue(
      { base: "https://dokploy.example", apiKey: "key", composeId: "id", sha },
      async () => { calls++; return { ok: false, status: 403 }; },
    ),
    /HTTP 403/,
  );
  assert.equal(calls, 1);
});
