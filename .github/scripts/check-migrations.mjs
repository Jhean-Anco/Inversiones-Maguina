import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const riskyStatements = [
  /\bDROP\s+(?:TABLE|COLUMN|TYPE|SCHEMA|INDEX|CONSTRAINT|SEQUENCE|VIEW|MATERIALIZED\s+VIEW|FUNCTION|PROCEDURE|TRIGGER|POLICY|DOMAIN|EXTENSION|ROLE|DATABASE)\b/gi,
  /\bTRUNCATE(?:\s+TABLE)?\b/gi,
  /\bDELETE\s+FROM\b/gi,
  /\bALTER\s+TABLE\b(?:(?!;)[\s\S])*?\b(?:DROP|RENAME)\b/gi,
  /\bALTER\s+COLUMN\b(?:(?!;)[\s\S])*?\bTYPE\b/gi,
  /\bSET\s+NOT\s+NULL\b/gi,
];

const approvedMigrations = [
  {
    path: "packages/database/migrations/0189_retirar_fotografias.sql",
    blob: "80d56760b1a015715a05b090dd77e42e48e36b69",
  },
  {
    path: "packages/database/migrations/0199_compra_mototaxi_sin_proveedor.sql",
    blob: "bcc1ad2da4e6a2d276457d027c601e26b8dd763c",
  },
];

export function isApprovedDestructiveMigration({ findings, approvalLabel, migrationPaths, migrationBlob }) {
  const migration = approvedMigrations.find(({ path, blob }) =>
    migrationPaths.length === 1 && migrationPaths[0] === path && migrationBlob === blob,
  );
  return approvalLabel === "true"
    && migration !== undefined
    && findings.length > 0
    && findings.every((finding) => finding.startsWith(`${migration.path}:`) && finding.includes("operación potencialmente destructiva"));
}

export function inspectMigrationChanges(nameStatus, addedLines) {
  const findings = [];

  for (const entry of nameStatus) {
    if (!entry.path.endsWith(".sql")) continue;
    if (entry.status !== "A") {
      findings.push(`${entry.path}: no se permite modificar una migración existente (${entry.status}).`);
      continue;
    }

    const lines = (addedLines.get(entry.path) ?? []).map((entryLine, index) =>
      typeof entryLine === "string"
        ? { line: index + 1, text: entryLine }
        : { line: entryLine.line ?? index + 1, text: entryLine.text ?? "" },
    );
    const sql = lines.map(({ text }) => /^\s*--/.test(text) ? "" : text).join("\n");
    const riskyLines = new Set();
    const riskasReemplazadas = new Set();

    for (const match of sql.matchAll(/\bALTER\s+TABLE\s+"?([\w]+)"?\s+DROP\s+CONSTRAINT\s+(?:IF\s+EXISTS\s+)?"?([\w]+)"?/gi)) {
      const tabla = match[1];
      const restriccion = match[2];
      const equivalente = new RegExp(`\\bALTER\\s+TABLE\\s+"?${tabla}"?\\s+ADD\\s+CONSTRAINT\\s+"?${restriccion}"?\\b`, "i");
      if (equivalente.test(sql)) {
        const lineOffset = sql.slice(0, match.index).split("\n").length - 1;
        riskasReemplazadas.add(lines[lineOffset]?.line ?? lineOffset + 1);
      }
    }

    for (const match of sql.matchAll(/\bALTER\s+TABLE\s+"?([\w]+)"?\s+ALTER\s+COLUMN\s+"?[\w]+"?\s+DROP\s+NOT\s+NULL\b/gi)) {
      const tabla = match[1];
      const nuevaValidacion = new RegExp(`\\bALTER\\s+TABLE\\s+"?${tabla}"?\\s+ADD\\s+CONSTRAINT\\b`, "i");
      if (nuevaValidacion.test(sql)) {
        const lineOffset = sql.slice(0, match.index).split("\n").length - 1;
        riskasReemplazadas.add(lines[lineOffset]?.line ?? lineOffset + 1);
      }
    }

    for (const pattern of riskyStatements) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(sql)) !== null) {
        const lineOffset = sql.slice(0, match.index).split("\n").length - 1;
        riskyLines.add(lines[lineOffset]?.line ?? lineOffset + 1);
      }
    }

    for (const lineNumber of [...riskyLines].filter((line) => !riskasReemplazadas.has(line)).sort((a, b) => a - b)) {
      findings.push(`${entry.path}:${lineNumber}: operación potencialmente destructiva; use migración expand-contract y revisión manual.`);
    }
  }

  return findings;
}

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

export function auditMigrations(baseRef = process.env.MIGRATION_BASE_REF ?? "origin/main") {
  const statusOutput = runGit([
    "diff", "--name-status", "--find-renames", `${baseRef}...HEAD`, "--", "packages/database/migrations",
  ]);
  const entries = statusOutput.trim()
    ? statusOutput.trim().split(/\r?\n/).map((line) => {
      const [status, firstPath, secondPath] = line.split("\t");
      return { status: status[0], path: secondPath ?? firstPath };
    })
    : [];
  const addedLines = new Map();

  for (const entry of entries.filter((item) => item.status === "A" && item.path.endsWith(".sql"))) {
    const diff = runGit(["diff", "--no-ext-diff", "--unified=0", `${baseRef}...HEAD`, "--", entry.path]);
    const lines = [];
    let newLineNumber = 0;
    for (const line of diff.split(/\r?\n/)) {
      const hunk = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (hunk) {
        newLineNumber = Number(hunk[1]);
      } else if (line.startsWith("+") && !line.startsWith("+++")) {
        lines.push({ line: newLineNumber++, text: line.slice(1) });
      } else if (line.startsWith(" ")) {
        newLineNumber++;
      }
    }
    addedLines.set(entry.path, lines);
  }

  const findings = inspectMigrationChanges(entries, addedLines);
  if (findings.length) {
    const migrationPaths = [...new Set(findings.map((finding) => finding.split(":")[0]))];
    const migrationBlob = migrationPaths.length === 1 ? runGit(["hash-object", migrationPaths[0]]).trim() : "";
    if (isApprovedDestructiveMigration({
      findings,
      approvalLabel: process.env.MIGRATION_DESTRUCTIVE_APPROVED,
      migrationPaths,
      migrationBlob,
    })) {
      console.log(`Migración destructiva autorizada mediante etiqueta del PR: ${migrationPaths[0]} (${migrationBlob}).`);
      return [];
    }
    console.error("La auditoría de migraciones encontró operaciones que requieren revisión:");
    for (const finding of findings) console.error(`- ${finding}`);
    console.error("Reescriba la migración como cambio compatible y aditivo, o prepare un plan expand-contract antes de solicitar otra revisión.");
    process.exitCode = 1;
    return findings;
  }

  console.log(`Migraciones verificadas: ${entries.length} archivo(s) cambiado(s), sin ediciones históricas ni operaciones destructivas.`);
  return [];
}

if (process.argv[1] && fileURLToPath(import.meta.url).toLocaleLowerCase() === process.argv[1].toLocaleLowerCase()) {
  auditMigrations(process.argv[2]);
}
