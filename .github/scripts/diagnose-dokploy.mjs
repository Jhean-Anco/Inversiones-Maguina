const { DOKPLOY_URL, DOKPLOY_API_KEY, DOKPLOY_COMPOSE_ID } = process.env;
if (!DOKPLOY_URL || !DOKPLOY_API_KEY || !DOKPLOY_COMPOSE_ID) {
  throw new Error("Faltan datos de Dokploy para leer el estado del despliegue.");
}

const origin = new URL(DOKPLOY_URL);
if (origin.protocol !== "https:") throw new Error("Dokploy debe usar HTTPS.");

async function solicitar(endpoint) {
  const response = await fetch(new URL(endpoint, origin), {
    headers: { "x-api-key": DOKPLOY_API_KEY },
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Dokploy ${endpoint}: HTTP ${response.status}.`);
  return response.json();
}

const compose = await solicitar(`/api/compose.one?composeId=${encodeURIComponent(DOKPLOY_COMPOSE_ID)}`);
const resultado = await solicitar(`/api/deployment.allByCompose?composeId=${encodeURIComponent(DOKPLOY_COMPOSE_ID)}`);
const despliegues = Array.isArray(resultado) ? resultado : resultado?.deployments ?? resultado?.data ?? [];
if (!despliegues.length) {
  console.log(`Dokploy no devolvió despliegues para Compose (${compose.sourceType ?? "fuente desconocida"}). Respuesta: ${JSON.stringify(Object.keys(resultado ?? {}))}`);
  process.exit(0);
}

const fecha = (registro) => Date.parse(registro.createdAt ?? registro.created_at ?? registro.startedAt ?? registro.date ?? "") || 0;
const reciente = [...despliegues].sort((a, b) => fecha(b) - fecha(a))[0];
const deploymentId = reciente.deploymentId ?? reciente.id;
console.log(`Último despliegue Dokploy: estado=${reciente.status ?? reciente.state ?? reciente.applicationStatus ?? "desconocido"}, fecha=${reciente.createdAt ?? reciente.created_at ?? reciente.startedAt ?? "desconocida"}, id=${deploymentId ?? "no disponible"}.`);
if (!deploymentId) {
  console.log(`Campos de registro disponibles: ${Object.keys(reciente ?? {}).join(", ") || "ninguno"}.`);
  process.exit(0);
}

const valoresPorOcultar = [
  ...Object.entries(process.env).filter(([nombre]) => /SECRET|TOKEN|PASSWORD|API_KEY/i.test(nombre)).map(([, valor]) => valor),
  ...String(compose.env ?? "").split(/\r?\n/).map((linea) => linea.slice(linea.indexOf("=") + 1).trim().replace(/^(['"])(.*)\1$/, "$2")),
].filter((valor) => valor && valor.length >= 4);
const ocultar = (texto) => valoresPorOcultar.reduce((salida, valor) => salida.replaceAll(valor, "[REDACTADO]"), texto);

const logs = await solicitar(`/api/deployment.readLogs?deploymentId=${encodeURIComponent(deploymentId)}&tail=200`);
const textoLogs = typeof logs === "string" ? logs : typeof logs?.logs === "string" ? logs.logs : JSON.stringify(logs);
console.log("Logs recientes del despliegue Dokploy (secretos y valores de entorno redactados):");
console.log(ocultar(textoLogs).split(/\r?\n/).slice(-120).join("\n"));
