#!/usr/bin/env node
/**
 * Step 13B.4 — Plumb Locations into pilot runbook (fail-closed)
 *
 * Source of truth for funnel-run locations: out/reach/<slug>/prequal.json
 *
 * Guardrails:
 * - Zero hand edits
 * - Idempotent
 * - Must end with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const scriptsDir = path.join(ROOT, "scripts");
if (!exists(scriptsDir)) throw new Error("Missing scripts/ directory");

const scriptFiles = fs.readdirSync(scriptsDir).filter(f => f.endsWith(".mjs"));
let target = null;

for (const f of scriptFiles) {
  const p = path.join("scripts", f);
  const src = read(p);
  if (src.includes("CIAG Pilot Runbook")) { target = p; break; }
}

// Hard fail if we can’t find it (prevents patching wrong file)
if (!target) {
  throw new Error("Could not locate pilot runbook generator (search string: 'CIAG Pilot Runbook').");
}

let src = read(target);

// Inject resolver helpers once
if (!src.includes("function resolveLocationsForSlug")) {
  const inject = `
function safeJson(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}

function resolveLocationsForSlug(slug) {
  // Primary: funnel prequal
  const prequalPath = path.join("out", "reach", slug, "prequal.json");
  const prequal = safeJson(prequalPath);
  if (prequal && Number.isFinite(prequal.locations)) return prequal.locations;

  // Secondary: if prequal uses a different key
  if (prequal && Number.isFinite(prequal.reported_locations)) return prequal.reported_locations;

  // Tertiary: triage memo / operator profile if present
  const triageMeta = safeJson(path.join("docs", "triage", "TRG-" + slug, "pilot-intake.json"));
  if (triageMeta && Number.isFinite(triageMeta.locations)) return triageMeta.locations;

  return null;
}
`;

  // Put after imports (best-effort)
  src = src.replace(
    /(import[\s\S]*?;\n)(\s*)/m,
    `$1$2${inject}\n`
  );
}

// Replace any assignment that yields null-ish locations in the header.
// We target the markdown line creation for "**Locations:**".
//
// Strategy:
// - If file already builds a header md string containing "**Locations:** ${something}",
//   replace the "something" with resolveLocationsForSlug(slug) and fail-closed.
if (!src.includes("FAIL_CLOSED_LOCATIONS")) {
  src = src.replace(
    /\*\*Locations:\*\*\s*\$\{([^}]+)\}/g,
    `**Locations:** \${(() => {
      const _loc = resolveLocationsForSlug(slug);
      if (_loc === null) throw new Error("FAIL_CLOSED_LOCATIONS: Locations unresolved for slug=" + slug);
      return _loc;
    })()}`
  );

  // If no template usage was found, add a secondary fallback by replacing a common "locations" variable pattern.
  // (Safe: only applies if it exists.)
  src = src.replace(
    /\bconst\s+locations\s*=\s*([^\n;]+);/g,
    `const locations = (() => {
      const _loc = resolveLocationsForSlug(slug);
      if (_loc === null) throw new Error("FAIL_CLOSED_LOCATIONS: Locations unresolved for slug=" + slug);
      return _loc;
    })();`
  );
}

writeIfChanged(target, src);

// Syntax + build gates
run(`node --check "${target}"`);
run("npm run build");

console.log("Step 13B.4 complete: Locations resolver wired into " + target);
