import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";

const sourcePath = "packages/database/src/esquema/index.ts";
const text = await readFile(sourcePath, "utf8");
const source = ts.createSourceFile(sourcePath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const tables = [];
const literal = (node) => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : "";
function visit(node) {
  if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "pgTable" && node.arguments.length >= 2) {
    const name = literal(node.arguments[0]);
    if (name && ts.isObjectLiteralExpression(node.arguments[1])) tables.push({ name, columns: node.arguments[1], options: node.arguments[2]?.getText(source) ?? "" });
  }
  ts.forEachChild(node, visit);
}
visit(source);
const output = [
  "<!-- Generated from Drizzle TypeScript declarations by scripts/documentar-datos.mjs. -->",
  "",
  "## Catalogo estructural de tablas y columnas",
  "",
  "Tipos y propiedades se extraen estaticamente de la llamada builder declarada; el tipo identifica el constructor Drizzle y no expande longitudes/precision. Los defaults se indican como presentes, sin mostrar valores calculados. Se listan nombres de indices/checks declarados; los miembros de indices compuestos y constraints de tabla no se desglosan. Revisar SQL de migraciones para historia y estado de bases existentes.",
  "",
];
const calls = (node) => {
  const found = [];
  const walk = (item) => { if (ts.isCallExpression(item)) found.push(item); ts.forEachChild(item, walk); };
  walk(node);
  return found;
};
for (const table of tables.sort((a, b) => a.name.localeCompare(b.name))) {
  output.push(`### \`${table.name}\``, "", "| Columna | Tipo declarado | Nulabilidad | Clave | Default | Referencia |", "|---|---|---|---|---|---|");
  for (const property of table.columns.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name) || !ts.isCallExpression(property.initializer)) continue;
    let rootCall = property.initializer;
    while (ts.isCallExpression(rootCall) && ts.isPropertyAccessExpression(rootCall.expression)) rootCall = rootCall.expression.expression;
    const type = ts.isCallExpression(rootCall) && ts.isIdentifier(rootCall.expression) ? rootCall.expression.text : "unknown";
    const modifiers = calls(property.initializer).map((call) => ts.isPropertyAccessExpression(call.expression) ? call.expression.name.text : "");
    const fk = modifiers.includes("references");
    const ref = fk ? property.initializer.getText(source).match(/references\s*\(\s*\(\)\s*=>\s*([\w.]+)/)?.[1] ?? "FK expression" : "-";
    const key = [modifiers.includes("primaryKey") ? "PK" : "", fk ? "FK" : "", modifiers.includes("unique") ? "UNIQUE" : ""].filter(Boolean).join(", ") || "-";
    const hasDefault = modifiers.some((name) => name.startsWith("default"));
    output.push(`| \`${literal(rootCall.arguments?.[0]) || property.name.text}\` | \`${type}\` | ${modifiers.includes("notNull") ? "NOT NULL" : "NULL"} | ${key} | ${hasDefault ? "yes" : "-"} | ${ref} |`);
  }
  const constraints = [...table.options.matchAll(/\b(index|uniqueIndex|check)\s*\(\s*["']([^"']+)["']/g)].map((match) => `- ${match[1] === "uniqueIndex" ? "UNIQUE INDEX" : match[1].toUpperCase()} \`${match[2]}\``);
  if (constraints.length) output.push("Restricciones e indices declarados:", "", ...constraints, "");
  output.push("");
}
await writeFile("docs/catalogo-de-datos.md", output.join("\n"), "utf8");
console.log(`Drizzle catalog generated from TypeScript AST: ${tables.length} tables.`);
