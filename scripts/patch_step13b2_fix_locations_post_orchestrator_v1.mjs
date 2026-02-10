#!/usr/bin/env node
/**
 * Step 13B.2 — Post-orchestrator fix: pilot-runbook Locations must never be null.
 * Rationale: generator-level patch failed to bind; enforce invariant after known generation point.
 *
 * Guardrails:
 * - Zero hand edits (scripted transform)
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

const FILE = path.join("scripts", "ciag_sales_funnel_e2e_v1.mjs");
if (!exists(FILE)) throw new Error(`Missing: ${FILE}`);

let src = read(FILE);

// Insert helper functions once
if (!src.includes("function resolveLocationsFromPrequal")) {
  const helpers = `
function resolveLocationsFromPrequal(slug) {
  const pq = path.join("out", "reach", slug, "prequal.json");
  if (!fs.existsSync(pq)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(pq, "utf8"));
    const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function patchPilotRunbookLocations(slug) {
  const loc = resolveLocationsFromPrequal(slug);
  if (!Number.isFinite(loc)) return { patched: false, reason: "locations_unavailable" };

  const rb = path.join("docs", "triage", "TRG-" + slug, "pilot-runbook.md");
  if (!fs.existsSync(rb)) return { patched: false, reason: "runbook_missing" };

  let md = fs.readFileSync(rb, "utf8");
  if (!md.includes("**Locations:** null")) return { patched: false, reason: "already_set" };

  md = md.replace("**Locations:** null", "**Locations:** " + String(loc));
  fs.writeFileSync(rb, md);
  return { patched: true, locations: loc };
}
`.trimStart();

  // place after imports
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith("import ")) lastImport = i;
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, "", helpers);
  else lines.unshift(helpers, "");
  src = lines.join("\n");
}

// Ensure it runs after ciag:sales-e2e finishes.
// We pattern match the exec/run line that invokes ciag:sales-e2e and inject immediately after.
if (!src.includes("patchPilotRunbookLocations(")) {
  const lines = src.split("\n");
  let injected = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("ciag:sales-e2e") || line.includes("ciag:sales-e2e")) {
      // Insert shortly after this invocation block (next few lines),
      // but safest: insert immediately after the line that triggers it.
      const slugVar = (src.includes("const slug") || src.includes("let slug")) ? "slug" : "args.slug";
      lines.splice(i + 1, 0, `const _locFix = patchPilotRunbookLocations(${slugVar});`, `if (_locFix.patched) console.log("Locations patched in pilot runbook:", _locFix.locations);`);
      injected = true;
      break;
    }
  }

  if (!injected) {
    // Fallback: inject near end of script after main run.
    const slugVar = (src.includes("const slug") || src.includes("let slug")) ? "slug" : "args.slug";
    lines.push("", `const _locFix = patchPilotRunbookLocations(${slugVar});`, `if (_locFix.patched) console.log("Locations patched in pilot runbook:", _locFix.locations);`);
  }

  src = lines.join("\n");
}

writeIfChanged(FILE, src);

// Syntax gate
run(`node --check "${FILE}"`);

// Required build gate
run("npm run build");

console.log("Step 13B.2 complete: post-orchestrator Locations invariant enforced.");
