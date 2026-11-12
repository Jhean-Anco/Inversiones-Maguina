import { appendFile } from "node:fs/promises";

const base = process.env.DOKPLOY_URL?.replace(/\/$/, "");
const apiKey = process.env.DOKPLOY_API_KEY;
const composeId = process.env.DOKPLOY_COMPOSE_ID;
const deploySha = process.env.DEPLOY_SHA;

if (!base || !apiKey || !composeId || !/^[a-f0-9]{40}$/.test(deploySha ?? "")) {
  throw new Error(
    "Faltan DOKPLOY_URL, DOKPLOY_API_KEY, DOKPLOY_COMPOSE_ID o un DEPLOY_SHA completo.",
  );
}

async function request(endpoint, method, payload) {
  const response = await fetch(`${base}/api/${endpoint}`, {
    method,
    headers: {
      "x-api-key": apiKey,
      ...(payload ? { "content-type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  const text = await response.text();
  if (!response.ok)
    throw new Error(`Dokploy ${endpoint} respondió HTTP ${response.status}.`);
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Dokploy ${endpoint} no devolvió JSON válido.`);
  }
}

const current = await request(
  `compose.one?composeId=${encodeURIComponent(composeId)}`,
  "GET",
);
const compose =
  current?.compose ?? current?.data?.compose ?? current?.data ?? current;
if (typeof compose?.env !== "string") {
  throw new Error(
    "La respuesta compose.one no expuso env como texto; no se modificó Dokploy.",
  );
}

const previous = compose.env;
const lines = previous.split(/\r?\n/);
const deploymentEntries = lines.filter((line) =>
  /^\s*DEPLOY_SHA\s*=/.test(line),
);
const previousSha =
  deploymentEntries[0]?.split("=").slice(1).join("=").trim() ?? "";
if (previousSha && !/^[a-f0-9]{40}$/.test(previousSha)) {
  throw new Error(
    "Current DEPLOY_SHA is not a full commit SHA; Dokploy was not changed.",
  );
}
if (deploymentEntries.length > 1)
  throw new Error("DEPLOY_SHA está duplicado en el entorno Dokploy.");
const nextLines = deploymentEntries.length
  ? lines.map((line) =>
      /^\s*DEPLOY_SHA\s*=/.test(line) ? `DEPLOY_SHA=${deploySha}` : line,
    )
  : [
      ...lines.filter((line, index) => line.length || index < lines.length - 1),
      `DEPLOY_SHA=${deploySha}`,
    ];
const next = nextLines.join("\n");

// Fail closed by default. The gate is only enabled after the operator verifies
// endpoint compatibility and safe environment-update behavior on this Dokploy instance.
if (process.env.DOKPLOY_ENV_UPDATE_ATOMIC_VERIFIED !== "true") {
  throw new Error(
    "Dokploy environment update has not been verified; refusing to overwrite its full environment.",
  );
}

await request("compose.saveEnvironment", "POST", {
  composeId,
  env: next,
  createEnvFile: true,
});
const savedResponse = await request(
  `compose.one?composeId=${encodeURIComponent(composeId)}`,
  "GET",
);
const savedCompose =
  savedResponse?.compose ??
  savedResponse?.data?.compose ??
  savedResponse?.data ??
  savedResponse;
if (typeof savedCompose?.env !== "string")
  throw new Error(
    "No se pudo volver a leer el entorno tras guardarlo; despliegue cancelado.",
  );

function normalizedExceptDeploySha(value) {
  return value
    .split(/\r?\n/)
    .filter((line) => !/^\s*DEPLOY_SHA\s*=/.test(line))
    .join("\n")
    .replace(/\n+$/, "");
}
if (
  normalizedExceptDeploySha(savedCompose.env) !==
    normalizedExceptDeploySha(previous) ||
  !savedCompose.env.split(/\r?\n/).includes(`DEPLOY_SHA=${deploySha}`)
) {
  throw new Error(
    "El entorno Dokploy no coincide con el estado esperado; se detuvo antes de compose.deploy.",
  );
}

if (previousSha && process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `previous_sha=${previousSha}\n`,
    "utf8",
  );
}

await request("compose.deploy", "POST", {
  composeId,
  title: `main ${deploySha}`,
  description: "CI, pruebas, migraciones limpias y escaneos completados.",
});
console.log(
  `Dokploy recibió el despliegue de ${deploySha}. La comprobación de salud posterior queda registrada en la ejecución.`,
);
