import { pathToFileURL } from "node:url";

export async function solicitarDespliegue({ base, apiKey, composeId, sha }, fetchImpl = fetch) {
  if (!base || !apiKey || !composeId || !/^[a-f0-9]{40}$/.test(sha ?? "")) {
    throw new Error("Faltan datos de Dokploy o un SHA completo.");
  }
  const origin = new URL(base);
  if (origin.protocol !== "https:") throw new Error("Dokploy debe usar HTTPS.");
  async function post(endpoint, body) {
    const response = await fetchImpl(new URL(endpoint, origin), {
      method: "POST",
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Dokploy ${endpoint}: HTTP ${response.status}.`);
  }
  await post("/api/compose.update", { composeId, customGitBranch: `ci-deploy-${sha}` });
  await post("/api/compose.deploy", { composeId });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await solicitarDespliegue({
    base: process.env.DOKPLOY_URL,
    apiKey: process.env.DOKPLOY_API_KEY,
    composeId: process.env.DOKPLOY_COMPOSE_ID,
    sha: process.env.DEPLOY_SHA,
  });
  console.log("Dokploy recibió la solicitud; se comprobará la versión publicada.");
}
