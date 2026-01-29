#!/usr/bin/env node
import fs from "fs";
import path from "path";

function walk(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walk(p));
    else if (ent.isFile() && p.endsWith(".ts")) out.push(p);
  }
  return out;
}

function patchFile(file) {
  const src = fs.readFileSync(file, "utf8");
  if (!src.includes("export const ciagExecutorSpec")) return { touched: false };

  let next = src;

  // Ensure supported_task_types includes "ESCALATE"
  next = next.replace(
    /supported_task_types\s*:\s*\[([^\]]*)\]/m,
    (m, inner) => {
      const has = /["']ESCALATE["']/.test(inner);
      if (has) return m;
      const cleaned = inner.trim();
      const sep = cleaned && !cleaned.trim().endsWith(",") ? ", " : "";
      return `supported_task_types: [${cleaned}${sep}"ESCALATE"]`;
    }
  );

  // Ensure required_scopes contains ESCALATE mapping
  // If required_scopes block exists, inject ESCALATE if missing.
  next = next.replace(
    /required_scopes\s*:\s*\{([\s\S]*?)\}/m,
    (m, body) => {
      if (/ESCALATE\s*:/.test(body)) return m;

      // Insert before closing brace. Preserve indentation (2 spaces default).
      const indentMatch = body.match(/\n(\s*)[A-Z_]+\s*:/);
      const indent = indentMatch ? indentMatch[1] : "  ";
      const insertion = `\n${indent}ESCALATE: ["ciag:escalate"],`;
      return `required_scopes: {${body}${insertion}\n}`;
    }
  );

  if (next === src) return { touched: true, changed: false };

  fs.writeFileSync(file, next);
  return { touched: true, changed: true };
}

const files = walk("src");
let target = null;
for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  if (s.includes("export const ciagExecutorSpec")) { target = f; break; }
}

if (!target) {
  console.error("ERROR: Could not find 'export const ciagExecutorSpec' under src/");
  process.exit(1);
}

const res = patchFile(target);
if (res.changed) console.log(`Patched ESCALATE scopes in ${target}`);
else console.log(`ESCALATE scopes already present (no-op) in ${target}`);
