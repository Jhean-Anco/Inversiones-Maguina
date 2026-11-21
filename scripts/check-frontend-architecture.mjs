import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const sourceRoot = join(projectRoot, "apps", "web", "src");
const reportOnly = process.argv.includes("--report");
const lineLimit = Number(process.argv.find((argument) => argument.startsWith("--max-lines="))?.split("=")[1] ?? 200);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  }));
  return nested.flat();
}

const paths = await listFiles(sourceRoot);
const sourceFiles = paths.filter((path) => [".ts", ".tsx", ".css", ".scss", ".sass"].includes(extname(path)));
const cssFiles = sourceFiles.filter((path) => [".css", ".scss", ".sass"].includes(extname(path)));
const operationalFiles = sourceFiles.filter((path) => [".ts", ".tsx"].includes(extname(path)) && !path.endsWith(".d.ts"));
const contents = await Promise.all(sourceFiles.map(async (path) => [path, await readFile(path, "utf8")]));
const sourceByPath = new Map(contents);

const nonIndexStylesheets = cssFiles.filter((path) => relative(sourceRoot, path).replaceAll("\\", "/") !== "main/index.css");
const totalCssLines = cssFiles.reduce((total, path) => total + sourceByPath.get(path).split(/\r?\n/).length, 0);
const totalOperationalLines = operationalFiles.reduce((total, path) => total + sourceByPath.get(path).replace(/(?:\r?\n)+$/, "").split(/\r?\n/).length, 0);
const tsxFiles = operationalFiles.filter((path) => extname(path) === ".tsx");
const overlongFiles = [];
const importantRules = [];
const inlineStyleObjects = [];
const stylesheetImports = [];
const importEdges = new Map();

function importedModules(source) {
  const specifiers = [];
  const patterns = [
    /\b(?:import|export)\s+(?:type\s+)?[^'"`;]*?\bfrom\s*["']([^"']+)["']/gs,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }
  return specifiers;
}

function resolveSourceImport(importer, specifier) {
  const base = specifier.startsWith("@/")
    ? join(sourceRoot, specifier.slice(2))
    : specifier.startsWith(".")
      ? resolve(importer, "..", specifier)
      : null;
  if (!base) return null;
  const candidates = [base, ...[".ts", ".tsx"].map((extension) => `${base}${extension}`), join(base, "index.ts"), join(base, "index.tsx")];
  return candidates.find((candidate) => sourceByPath.has(candidate)) ?? null;
}

for (const path of operationalFiles) {
  const source = sourceByPath.get(path);
  importEdges.set(path, importedModules(source).map((specifier) => resolveSourceImport(path, specifier)).filter(Boolean));
  const lines = source.replace(/(?:\r?\n)+$/, "").split(/\r?\n/);
  if (lines.length > lineLimit) overlongFiles.push({ path, lines: lines.length });

  lines.forEach((line, index) => {
    if (/\bstyle\s*=\s*\{\s*\{/.test(line)) inlineStyleObjects.push({ path, line: index + 1 });
    const imports = line.matchAll(/(?:import\s*(?:[^"']*?from\s*)?|require\s*\()(["'])([^"']+\.(?:css|scss|sass))(?:\?[^"']*)?\1/g);
    for (const match of imports) {
      const importedPath = match[2].replaceAll("\\", "/");
      const resolvedImport = importedPath.startsWith(".")
        ? resolve(path, "..", importedPath.split("?")[0])
        : null;
      if (resolvedImport !== join(sourceRoot, "main", "index.css")) {
        stylesheetImports.push({ path, line: index + 1, importedPath });
      }
    }
  });
}

const circularImports = [];
const visiting = new Set();
const visited = new Set();
const importStack = [];
function findCircularImports(path) {
  if (visited.has(path)) return;
  if (visiting.has(path)) {
    const start = importStack.indexOf(path);
    const cycle = [...importStack.slice(start), path];
    const key = cycle.map((entry) => relative(sourceRoot, entry)).join(" -> ");
    if (!circularImports.some((item) => item.key === key)) circularImports.push({ path, key });
    return;
  }
  visiting.add(path);
  importStack.push(path);
  for (const dependency of importEdges.get(path) ?? []) findCircularImports(dependency);
  importStack.pop();
  visiting.delete(path);
  visited.add(path);
}
for (const path of operationalFiles) findCircularImports(path);

for (const path of cssFiles) {
  const lines = sourceByPath.get(path).split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/!important/g)) importantRules.push({ path, line: index + 1, column: match.index + 1 });
  });
}

const findings = [
  ["CSS propio fuera de index.css", nonIndexStylesheets.map((path) => ({ path, line: 1 }))],
  [`Archivos TS/TSX sobre ${lineLimit} líneas`, overlongFiles],
  ["Declaraciones !important", importantRules],
  ["Estilos inline para revisar", inlineStyleObjects],
  ["Importaciones de hojas locales fuera de index.css", stylesheetImports],
  ["Ciclos de importación locales", circularImports],
];

console.log(`Fuente: ${relative(projectRoot, sourceRoot).replaceAll("\\", "/")}`);
console.log(`CSS propios: ${cssFiles.length} archivos, ${totalCssLines} lÃ­neas; objetivo: 1 (main/index.css)`);
console.log(`TS/TSX operativos: ${operationalFiles.length} archivos (${tsxFiles.length} TSX), ${totalOperationalLines} lÃ­neas; sobre ${lineLimit}: ${overlongFiles.length}`);
console.log(`Declaraciones !important: ${importantRules.length}; estilos inline: ${inlineStyleObjects.length}`);

for (const [label, items] of findings) {
  if (!items.length) continue;
  console.log(`\n${label}: ${items.length}`);
  for (const item of items.slice(0, 20)) {
    const file = relative(projectRoot, item.path).replaceAll("\\", "/");
    const location = item.line ? `${file}:${item.line}${item.column ? `:${item.column}` : ""}` : file;
    console.log(`  ${location}${item.importedPath ? ` -> ${item.importedPath}` : item.lines ? ` (${item.lines} líneas)` : item.key ? ` -> ${item.key}` : ""}`);
  }
  if (items.length > 20) console.log(`  … ${items.length - 20} hallazgos adicionales`);
}

const blockingFindings = findings
  .filter(([label]) => label !== "Estilos inline para revisar")
  .reduce((total, [, items]) => total + items.length, 0);

if (!reportOnly && blockingFindings > 0) process.exitCode = 1;
