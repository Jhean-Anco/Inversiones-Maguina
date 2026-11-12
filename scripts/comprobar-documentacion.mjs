import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mdFiles = [path.join(root, "README.md")];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) await walk(file);
    else if (item.isFile() && file.endsWith(".md")) mdFiles.push(file);
  }
}
await walk(path.join(root, "docs"));
const errors = [];
const required = ["docs/README.md", ...Array.from({ length: 20 }, (_, i) => `docs/${String(i + 1).padStart(2, "0")}-${[
  "arquitectura-general", "estructura-del-monorepositorio", "instalacion-y-desarrollo-local", "backend-y-api", "frontend", "modelo-de-datos", "modulos-y-reglas-de-negocio", "autenticacion-y-permisos", "integraciones-externas", "variables-de-entorno", "docker-y-contenedores", "pruebas-y-calidad", "integracion-y-despliegue-continuo", "despliegue-en-dokploy", "respaldo-y-restauracion", "seguridad", "operacion-y-monitoreo", "solucion-de-problemas", "matriz-de-funcionalidades", "proceso-de-versiones"
][i]}.md`), "docs/catalogo-de-endpoints.md", "docs/catalogo-de-datos.md"];
for (const file of required) {
  try { await access(path.join(root, file)); } catch { errors.push(`Falta documento obligatorio: ${file}`); }
}
for (const file of mdFiles) {
  const rel = path.relative(root, file).replaceAll("\\", "/");
  if (path.basename(file).includes("_")) errors.push(`${rel}: el nombre contiene guion bajo`);
  const body = await readFile(file, "utf8");
  for (const match of body.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].split(/[?#]/, 1)[0];
    if (!target || /^(?:https?:|mailto:|#)/i.test(target)) continue;
    try { await access(path.resolve(path.dirname(file), decodeURIComponent(target))); }
    catch { errors.push(`${rel}: enlace local inexistente: ${target}`); }
  }
}
const readme = await readFile(path.join(root, "README.md"), "utf8");
for (const doc of required.filter((f) => f.startsWith("docs/"))) {
  if (doc === "docs/README.md" || doc === "docs/catalogo-de-endpoints.md") continue;
  const targets = [...readme.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1].split(/[?#]/, 1)[0]);
  if (!targets.some((target) => path.resolve(root, decodeURIComponent(target)) === path.resolve(root, doc))) errors.push(`README.md no enlaza ${doc}`);
}
const markdownText = (await Promise.all(mdFiles.map((file) => readFile(file, "utf8")))).join("\n");
if (/\b(?:NUBEFACT_TOKEN|AUTENTICACION_SECRETO|POSTGRES_PASSWORD|DOKPLOY_API_KEY)\s*[:=]\s*['"]?(?!\$\{|<|\*{3})[^\s'"`]{8,}/i.test(markdownText)) {
  errors.push("Posible secreto literal en Markdown; use placeholders y revise manualmente.");
}
const envSources = ["apps/api/src", "apps/web/src", "packages/database/src"];
const sourceFiles = [];
async function walkSources(dir) {
  for (const entry of await readdir(path.join(root, dir), { withFileTypes: true })) {
    const file = path.join(root, dir, entry.name);
    if (entry.isDirectory()) await walkSources(path.relative(root, file));
    else if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name)) sourceFiles.push(file);
  }
}
for (const source of envSources) await walkSources(source);
const code = (await Promise.all(sourceFiles.map((file) => readFile(file, "utf8")))).join("\n");
const envNames = new Set([...code.matchAll(/(?:process\.env|import\.meta\.env)\.([A-Z][A-Z0-9_]*)/g)].map((match) => match[1]));
for (const name of envNames) if (!markdownText.includes(`\`${name}\``)) errors.push(`Variable leída en código pero ausente del inventario: ${name}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else console.log(`Documentación comprobada: ${mdFiles.length} archivos Markdown, enlaces locales y documentos requeridos.`);
