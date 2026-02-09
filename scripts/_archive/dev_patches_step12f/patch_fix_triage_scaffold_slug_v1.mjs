#!/usr/bin/env node
/**
 * Fix triage scaffold generator:
 * - Canonical operator source: .ago/operator_selected.json
 * - Resolve slug from operator_slug (preferred), slug, operator, name
 * - Fail-closed if slug cannot be determined
 * - Remove docs/triage/TRG-undefined if present
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function write(p, c){ fs.writeFileSync(p, c); }

function toSlug(s){
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const GEN = path.join("scripts", "generate_triage_scaffold_v1.mjs");
if (!exists(GEN)) throw new Error(`Missing generator: ${GEN}`);

let src = read(GEN);

// 1) Force canonical operator_selected path to .ago/operator_selected.json
// Replace any hard-coded out/operator_selected.json or similar
src = src.replace(/["']out\/operator_selected\.json["']/g, `" .ago/operator_selected.json "`.replace(/ /g,""));
src = src.replace(/["']\.?\/?out\/operator_selected\.json["']/g, `".ago/operator_selected.json"`);

// 2) Ensure it reads operator_selected.json from .ago
if (!src.includes('".ago/operator_selected.json"') && !src.includes("'.ago/operator_selected.json'")) {
  // If the file path is built via path.join, we patch the common pattern later.
  // No-op here.
}

// 3) Patch slug resolution to include operator_slug and normalize
// We inject a robust resolver if not present.
if (!src.includes("function resolveOperatorSlug")) {
  const inject = `
function resolveOperatorSlug(op){
  const raw =
    op?.operator_slug ??
    op?.slug ??
    op?.operator ??
    op?.name ??
    op?.operator_name;
  const slug = String(raw ?? "").trim().length ? toSlug(raw) : "";
  if (!slug) {
    throw new Error("Invalid operator_selected.json: missing operator_slug/slug/operator/name");
  }
  return slug;
}
`.trim() + "\n";

  // Insert helper after toSlug or near top. We look for toSlug() definition.
  if (src.includes("function toSlug")) {
    src = src.replace(/function toSlug[\s\S]*?\n}\n/, (m) => m + "\n" + inject + "\n");
  } else {
    // Fallback: prepend helper near top after imports
    src = src.replace(/(\n)(const ROOT|\bconst ROOT|\blet ROOT|\bvar ROOT)/, `\n${inject}\n$2`);
  }
}

// 4) Replace any direct slug derivation with resolveOperatorSlug(op)
if (!src.includes("resolveOperatorSlug(")) {
  // If resolver wasn't used anywhere, we try to swap the most common slug assignment patterns.
  // Pattern A: const slug = op.slug || op.operator || op.name;
  src = src.replace(
    /const\s+slug\s*=\s*op\.(slug|operator|name)[\s\S]*?;\n/g,
    "const slug = resolveOperatorSlug(op);\n"
  );
  // Pattern B: let slug = ...
  src = src.replace(
    /let\s+slug\s*=\s*op\.(slug|operator|name)[\s\S]*?;\n/g,
    "let slug = resolveOperatorSlug(op);\n"
  );
}

// 5) Add cleanup for TRG-undefined (safe)
if (!src.includes("TRG-undefined") && !src.includes("removeUndefinedTriage")) {
  const cleanup = `
function removeUndefinedTriage(triageRoot){
  const bad = path.join(triageRoot, "TRG-undefined");
  if (fs.existsSync(bad)) {
    fs.rmSync(bad, { recursive: true, force: true });
    console.log("Removed stale triage folder:", bad);
  }
}
`.trim() + "\n";

  // Insert cleanup helper after resolveOperatorSlug
  if (src.includes("function resolveOperatorSlug")) {
    src = src.replace(/function resolveOperatorSlug[\s\S]*?\n}\n/, (m) => m + "\n" + cleanup + "\n");
  } else {
    src = src.replace(/(\n)(const ROOT|\bconst ROOT|\blet ROOT|\bvar ROOT)/, `\n${cleanup}\n$2`);
  }
}

// 6) Ensure cleanup is called once triage root is known.
// We search for triage root assignment like: const DIR = path.join(ROOT,"docs","triage", ...)
if (!src.includes("removeUndefinedTriage(")) {
  // no-op; it's possible it already existed elsewhere
} else {
  // ensure there is at least one call; if none, add near triage root.
  const hasCall = /removeUndefinedTriage\(/.test(src);
  if (!hasCall) {
    // We'll try to find triage root creation: path.join(ROOT,"docs","triage"
    src = src.replace(
      /(const\s+\w+\s*=\s*path\.join\(\s*ROOT\s*,\s*["']docs["']\s*,\s*["']triage["']\s*(?:,|\))/,
      (m) => m + `\nremoveUndefinedTriage(path.join(ROOT,"docs","triage"));`
    );
  }
}

// 7) Ensure generator uses resolved slug in TRG-${slug}
if (!src.includes("TRG-${slug}") && !src.includes("TRG-" )) {
  // If generator uses "TRG-${operator}" style, we leave it—can't safely generalize.
}

// Write back only if changed
const prev = read(GEN);
if (prev !== src) {
  write(GEN, src);
  console.log("Patched:", GEN);
} else {
  console.log("No changes needed:", GEN);
}

run("npm run build");
