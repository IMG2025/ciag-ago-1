#!/usr/bin/env node
/**
 * Step 13B.3 — Enforce non-null Locations in pilot-runbook.md at a guaranteed seam.
 * We inject a post-step immediately BEFORE the "Sales Funnel E2E complete" success log.
 *
 * Why: prior injection keyed off downstream invocation text that didn't match actual script.
 *
 * Guardrails:
 * - Zero hand edits
 * - Idempotent transform
 * - Must end with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd: string) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd: string) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p: string) { return fs.existsSync(p); }
function read(p: string) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p: string, next: string) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const FILE = path.join("scripts", "ciag_sales_funnel_e2e_v1.mjs");
if (!exists(FILE)) throw new Error(`Missing: ${FILE}`);

let src = read(FILE);

// 1) Ensure helper block exists exactly once
if (!src.includes("STEP_13B3_LOCATIONS_ENFORCER")) {
  const helper = `
// STEP_13B3_LOCATIONS_ENFORCER (do not remove)
/** Enforce runbook Locations from funnel prequal. */
function _resolveLocationsFromPrequal(slug) {
  try {
    const pq = path.join("out", "reach", slug, "prequal.json");
    if (!fs.existsSync(pq)) return null;
    const j = JSON.parse(fs.readFileSync(pq, "utf8"));
    const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function _patchPilotRunbookLocations(slug) {
  const loc = _resolveLocationsFromPrequal(slug);
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

  // Insert helper after last import line
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith("import ")) lastImport = i;
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, "", helper);
  else lines.unshift(helper, "");
  src = lines.join("\n");
}

// 2) Inject execution right before the success log (stable anchor)
if (!src.includes("STEP_13B3_INJECT_BEFORE_SUCCESS_LOG")) {
  const inject = `
// STEP_13B3_INJECT_BEFORE_SUCCESS_LOG (do not remove)
try {
  const _locFix = _patchPilotRunbookLocations(slug);
  if (_locFix?.patched) console.log("Locations patched in pilot runbook:", _locFix.locations);
} catch (e) {
  console.warn("WARN: locations patch failed:", e?.message ?? e);
}
`.trimEnd();

  const lines = src.split("\n");
  const idx = lines.findIndex(l => l.includes("Sales Funnel E2E complete"));
  if (idx === -1) throw new Error('Anchor not found: "Sales Funnel E2E complete"');

  // Insert immediately BEFORE the success log line
  lines.splice(idx, 0, inject, "");
  src = lines.join("\n");
}

writeIfChanged(FILE, src);

// Syntax gate
run(`node --check "${FILE}"`);

// Required build gate
run("npm run build");

console.log("Step 13B.3 complete: enforced Locations patch before success log.");
