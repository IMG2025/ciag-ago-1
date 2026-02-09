#!/usr/bin/env node
/**
 * Patch generate_triage_scaffold_v1.mjs deterministically (no regex).
 * Goals:
 *  - Canonical operator source: .ago/operator_selected.json
 *  - Resolve slug from operator_slug (preferred), slug, operator_slug, operator, name, operator_name
 *  - Fail-closed if slug missing/empty/undefined
 *  - Always remove docs/triage/TRG-undefined if present
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next){
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const GEN = path.join("scripts", "generate_triage_scaffold_v1.mjs");
if (!exists(GEN)) throw new Error(`Missing generator: ${GEN}`);

let src = read(GEN);

// 1) Force canonical operator_selected location
src = src.replaceAll("out/operator_selected.json", ".ago/operator_selected.json");
src = src.replaceAll("./out/operator_selected.json", ".ago/operator_selected.json");
src = src.replaceAll("'out/operator_selected.json'", "'.ago/operator_selected.json'");
src = src.replaceAll('"out/operator_selected.json"', '".ago/operator_selected.json"');

// 2) Ensure helpers exist (toSlug + run + read)
if (!src.includes("function toSlug(")) {
  src = `function toSlug(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}\n\n` + src;
}
if (!src.includes("function run(")) {
  // inject run after imports if possible, else prepend
  const marker = "\nconst ROOT";
  if (src.includes(marker)) {
    src = src.replace(marker, `\nfunction run(cmd){ execSync(cmd, { stdio: "inherit" }); }\n` + marker);
  } else {
    src = `function run(cmd){ execSync(cmd, { stdio: "inherit" }); }\n` + src;
  }
}
if (!src.includes("function read(")) {
  const marker = "\nconst ROOT";
  if (src.includes(marker)) {
    src = src.replace(marker, `\nfunction read(p){ return fs.readFileSync(p, "utf8"); }\n` + marker);
  } else {
    src = `function read(p){ return fs.readFileSync(p, "utf8"); }\n` + src;
  }
}

// 3) Inject resolveOperatorSlug if missing
if (!src.includes("function resolveOperatorSlug(")) {
  const inject = `
function resolveOperatorSlug(op){
  const raw =
    op?.operator_slug ??
    op?.slug ??
    op?.operator ??
    op?.name ??
    op?.operator_name;
  const cleaned = String(raw ?? "").trim();
  if (!cleaned || cleaned === "undefined" || cleaned === "null") {
    throw new Error("Invalid operator_selected.json: missing operator_slug/slug/operator/name");
  }
  return toSlug(cleaned);
}
`.trim() + "\n\n";

  // place after toSlug if present, else at top
  const idx = src.indexOf("function toSlug(");
  if (idx >= 0) {
    // insert after end of toSlug block (first occurrence of "\n}\n" after idx)
    const end = src.indexOf("\n}\n", idx);
    if (end >= 0) {
      src = src.slice(0, end + 3) + "\n" + inject + src.slice(end + 3);
    } else {
      src = inject + src;
    }
  } else {
    src = inject + src;
  }
}

// 4) Replace common slug assignment patterns with resolveOperatorSlug(op)
const patterns = [
  "const slug = op.slug || op.operator || op.name;",
  "const slug = op.slug || op.name || op.operator;",
  "const slug = op.operator || op.slug || op.name;",
  "let slug = op.slug || op.operator || op.name;",
  "let slug = op.slug || op.name || op.operator;",
  "let slug = op.operator || op.slug || op.name;",
];
for (const p of patterns) {
  if (src.includes(p)) src = src.replace(p, "const slug = resolveOperatorSlug(op);");
}
// If none matched, we do a conservative insertion: if we see "const op = JSON.parse(...)" and later "slug"
if (!src.includes("resolveOperatorSlug(op)")) {
  // do nothing risky; generator might already resolve differently
}

// 5) Ensure stale TRG-undefined is removed at runtime (safe + idempotent)
if (!src.includes("TRG-undefined") || !src.includes("rmSync") ) {
  // try to inject once near where triage root is used; safest is right after ROOT is established.
  if (!src.includes("function removeUndefinedTriage(")) {
    const cleanup = `
function removeUndefinedTriage(){
  const bad = path.join(ROOT, "docs", "triage", "TRG-undefined");
  if (fs.existsSync(bad)) {
    fs.rmSync(bad, { recursive: true, force: true });
    console.log("Removed stale triage folder:", bad);
  }
}
`.trim() + "\n\n";
    const marker = "\nconst ROOT";
    if (src.includes(marker)) {
      src = src.replace(marker, "\n" + cleanup + marker);
    } else {
      src = cleanup + src;
    }
  }
  if (!src.includes("removeUndefinedTriage();")) {
    const marker = "\nconst ROOT";
    if (src.includes(marker)) {
      // call it right after ROOT is defined (first occurrence)
      // We do a simple insertion after "const ROOT"
      const i = src.indexOf("const ROOT");
      const lineEnd = src.indexOf("\n", i);
      if (lineEnd > 0) {
        src = src.slice(0, lineEnd + 1) + "removeUndefinedTriage();\n" + src.slice(lineEnd + 1);
      }
    }
  }
}

writeIfChanged(GEN, src);

// also delete stale folder immediately (idempotent)
const stale = path.join("docs", "triage", "TRG-undefined");
try { fs.rmSync(stale, { recursive: true, force: true }); } catch {}

run("npm run build");
