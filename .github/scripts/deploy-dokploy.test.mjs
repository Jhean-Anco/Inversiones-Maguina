import test from "node:test";
import assert from "node:assert/strict";
import { solicitarDespliegue } from "./deploy-dokploy.mjs";

test("solicita el despliegue sin leer ni escribir variables", async () => {
  const calls = [];
  await solicitarDespliegue(
    { base: "https://dokploy.example", apiKey: "test-key", composeId: "service-id" },
    async (url, options) => {
      calls.push({ url: url.toString(), ...options });
      return { ok: true };
    },
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://dokploy.example/api/compose.deploy");
  assert.equal(calls[0].method, "POST");
  assert.deepEqual(JSON.parse(calls[0].body), { composeId: "service-id" });
});

test("rechaza conexión insegura y respuestas fallidas", async () => {
  await assert.rejects(
    solicitarDespliegue({ base: "http://dokploy.example", apiKey: "key", composeId: "id" }),
    /HTTPS/,
  );
  await assert.rejects(
    solicitarDespliegue(
      { base: "https://dokploy.example", apiKey: "key", composeId: "id" },
      async () => ({ ok: false, status: 403 }),
    ),
    /HTTP 403/,
  );
});
