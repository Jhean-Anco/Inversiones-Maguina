import { pathToFileURL } from "node:url";

export async function solicitarDespliegue({ base, apiKey, composeId }, fetchImpl = fetch) {
  if (!base || !apiKey || !composeId) {
    throw new Error("Faltan DOKPLOY_URL, DOKPLOY_API_KEY o DOKPLOY_COMPOSE_ID.");
  }
  const url = new URL("/api/compose.deploy", base);
  if (url.protocol !== "https:") {
    throw new Error("Dokploy debe usar HTTPS.");
  }
  const response = await fetchImpl(url, {
    method: "POST",
    headers: { "x-api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({ composeId }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Dokploy rechazó el despliegue: HTTP ${response.status}.`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await solicitarDespliegue({
    base: process.env.DOKPLOY_URL,
    apiKey: process.env.DOKPLOY_API_KEY,
    composeId: process.env.DOKPLOY_COMPOSE_ID,
  });
  console.log("Dokploy recibió la solicitud; se comprobará la versión publicada.");
}
