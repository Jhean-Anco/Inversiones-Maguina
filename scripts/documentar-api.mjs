import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const sourceRoot = path.join(root, "apps/api/src");
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile() && entry.name.endsWith(".controller.ts")) files.push(target);
  }
}
await walk(sourceRoot);

const value = (node) => node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) ? node.text : "";
const decoratorName = (decorator) => {
  const expr = decorator.expression;
  return ts.isCallExpression(expr) ? (ts.isIdentifier(expr.expression) ? expr.expression.text : "") : ts.isIdentifier(expr) ? expr.text : "";
};
const decoratorArg = (decorator) => ts.isCallExpression(decorator.expression) ? value(decorator.expression.arguments[0]) : "";
const rows = [];
for (const file of files.sort()) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const text = await readFile(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const visit = (node) => {
    if (ts.isClassDeclaration(node)) {
      const classDecorators = ts.getDecorators(node) ?? [];
      const controller = classDecorators.find((item) => decoratorName(item) === "Controller");
      if (controller) {
        const prefix = decoratorArg(controller);
        const classGuards = classDecorators.some((item) => decoratorName(item) === "UseGuards");
        for (const member of node.members) {
          if (!ts.isMethodDeclaration(member) || !member.name) continue;
          const decorators = ts.getDecorators(member) ?? [];
          const route = decorators.find((item) => ["Get", "Post", "Put", "Patch", "Delete", "Options", "Head"].includes(decoratorName(item)));
          if (!route) continue;
          const method = decoratorName(route).toUpperCase();
          const suffix = decoratorArg(route);
          const fullPath = `/${[prefix, suffix].filter(Boolean).join("/")}`.replace(/\/+/g, "/");
          const permission = decorators.find((item) => decoratorName(item) === "RequierePermiso");
          const params = member.parameters.flatMap((param) => {
            if (!param.name || !ts.isIdentifier(param.name)) return [];
            for (const dec of ts.getDecorators(param) ?? []) {
              const kind = decoratorName(dec);
              if (["Body", "Param", "Query"].includes(kind)) return [`${kind}${decoratorArg(dec) ? `(${decoratorArg(dec)})` : ""}`];
            }
            return [];
          });
          const guards = decorators.some((item) => decoratorName(item) === "UseGuards") || classGuards;
          rows.push(`| ${method} | \`${fullPath}\` | \`${member.name.getText(source)}\` | ${guards ? "Sí" : "No declarado en controlador"} | ${permission ? `\`${decoratorArg(permission)}\`` : "No declarado"} | ${params.join(", ") || "—"} | [\`${relative}\`](../${relative}) |`);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
}
rows.sort((a, b) => a.localeCompare(b, "es"));
const generated = `<!-- Generado con scripts/documentar-api.mjs. No editar manualmente esta tabla. -->\n\n## Catálogo de rutas extraído de controladores\n\nLas rutas y parámetros de transporte provienen de los decoradores TypeScript. “No declarado” significa que ese método no tiene decorador visible de guard/permisos; confirmar guards globales antes de concluir que es público. Los tipos de respuesta y efectos de base de datos deben leerse en servicio/pruebas; esta extracción no los inventa.\n\n| Método | Ruta | Método de controlador | Guardia de clase/método | Permiso decorado | Entradas decoradas | Fuente |\n|---|---|---|---|---|---|---|\n${rows.join("\n")}\n`;
await writeFile(path.join(root, "docs/catalogo-de-endpoints.md"), generated, "utf8");
console.log(`Catálogo generado: ${rows.length} rutas en docs/catalogo-de-endpoints.md`);
