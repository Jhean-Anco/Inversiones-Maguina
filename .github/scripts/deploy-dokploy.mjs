import { readFile } from "node:fs/promises";
import { pathToFileURL, fileURLToPath } from "node:url";

const camposRamaPorFuente = {
  github: "githubBranch",
  gitlab: "gitlabBranch",
  bitbucket: "bitbucketBranch",
  gitea: "giteaBranch",
  git: "customGitBranch",
};

export async function solicitarDespliegue({ base, apiKey, composeId, sha, composeFile }, fetchImpl = fetch) {
  if (!base || !apiKey || !composeId || !/^[a-f0-9]{40}$/.test(sha ?? "")) {
    throw new Error("Faltan datos de Dokploy o un SHA completo.");
  }
  const origin = new URL(base);
  if (origin.protocol !== "https:") throw new Error("Dokploy debe usar HTTPS.");

  async function solicitar(endpoint, { method = "GET", body } = {}) {
    const response = await fetchImpl(new URL(endpoint, origin), {
      method,
      headers: { "x-api-key": apiKey, ...(body === undefined ? {} : { "content-type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Dokploy ${endpoint}: HTTP ${response.status}.`);
    return response;
  }

  const rutaCompose = `/api/compose.one?composeId=${encodeURIComponent(composeId)}`;
  const compose = await (await solicitar(rutaCompose)).json();
  if (compose?.composeId !== composeId) throw new Error("Dokploy devolvió un recurso Compose distinto al solicitado.");

  const campoRama = camposRamaPorFuente[compose.sourceType];
  let cambio;
  if (campoRama) {
    // El Compose de producción usa las etiquetas mutables `production` que el workflow
    // actualiza a partir de imágenes ya validadas. No apuntar Dokploy a una rama temporal
    // que no existe en el remoto: mantener siempre la rama real del repositorio.
    cambio = { composeId, [campoRama]: "main" };
  } else if (compose.sourceType === "raw") {
    const rutaArchivo = new URL("../../compose.prod.yaml", import.meta.url);
    cambio = { composeId, composeFile: composeFile ?? await readFile(fileURLToPath(rutaArchivo), "utf8") };
  } else {
    throw new Error(`Fuente Compose de Dokploy no compatible: ${compose.sourceType ?? "sin definir"}.`);
  }

  await solicitar("/api/compose.update", { method: "POST", body: cambio });
  const actualizado = await (await solicitar(rutaCompose)).json();
  const revisionAplicada = campoRama
    ? actualizado?.[campoRama] === "main"
    : actualizado?.composeFile === cambio.composeFile;
  if (!revisionAplicada) throw new Error("Dokploy no confirmó la referencia o el Compose de la revisión aprobada.");

  await solicitar("/api/compose.deploy", { method: "POST", body: { composeId } });
  return { sourceType: compose.sourceType, revisionField: campoRama ?? "composeFile", revision: campoRama ? "main" : sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const resultado = await solicitarDespliegue({
    base: process.env.DOKPLOY_URL,
    apiKey: process.env.DOKPLOY_API_KEY,
    composeId: process.env.DOKPLOY_COMPOSE_ID,
    sha: process.env.DEPLOY_SHA,
  });
  console.log(`Dokploy configurado para ${resultado.sourceType} (${resultado.revisionField}, ${resultado.revision}); se comprobará la versión publicada.`);
}
