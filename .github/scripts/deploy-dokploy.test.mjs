import test from "node:test";
import assert from "node:assert/strict";
import { solicitarDespliegue } from "./deploy-dokploy.mjs";

const sha = "a".repeat(40);
test("fija la revisión y despliega sin leer ni escribir variables", async () => {
  const calls = [];
  await solicitarDespliegue(
    { base: "https://dokploy.example", apiKey: "test-key", composeId: "service-id", sha },
    async (url, options) => {
      calls.push({ url: url.toString(), ...options });
      return { ok: true };
    },
  );
  assert.deepEqual(calls.map((call) => call.url), [
    "https://dokploy.example/api/compose.update",
    "https://dokploy.example/api/compose.deploy",
  ]);
  assert.deepEqual(JSON.parse(calls[0].body), {
    composeId: "service-id",
    customGitBranch: `ci-deploy-${sha}`,
  });
  assert.deepEqual(JSON.parse(calls[1].body), { composeId: "service-id" });
});

test("rechaza datos inválidos y detiene el flujo ante errores", async () => {
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
