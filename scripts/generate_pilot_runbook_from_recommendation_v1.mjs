#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";

function normalizePilotRunbookLocations(slug, outPath) {
  try {
    let md = fs.readFileSync(outPath, "utf8");
    const loc = resolveLocationsFromArtifacts(slug);
    if (md.includes("**Locations:** null")) {
      md = md.replace("**Locations:** null", "**Locations:** " + String(loc ?? "unknown"));
      fs.writeFileSync(outPath, md);
    }
  } catch {}
}

function resolveLocationsFromArtifacts(slug) {
  // Preferred: funnel prequal output
  try {
    const pq = path.join("out", "reach", slug, "prequal.json");
    if (fs.existsSync(pq)) {
      const j = JSON.parse(fs.readFileSync(pq, "utf8"));
      const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  // Fallback: intake if generator has produced / stored one (best-effort)
  try {
    const intake = path.join("fixtures", "intake", slug + ".intake-response.json");
    if (fs.existsSync(intake)) {
      const j = JSON.parse(fs.readFileSync(intake, "utf8"));
      const n = j?.operator?.locations ?? j?.locations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  return null;
}


function resolveLocationsForSlug(slug) {
const locations = resolveLocationsForSlug(slug);
  // Priority order:
  // 1) .ago/operator_selected.json (if it contains locations)
  // 2) out/reach/<slug>/prequal.json (funnel output)
  // 3) out/sales/<slug>/02_pipeline_state.json (if present)
  // Fallback: null
  try {
    const sel = ".ago/operator_selected.json";
    if (fs.existsSync(sel)) {
      const j = JSON.parse(fs.readFileSync(sel, "utf8"));
      const n = j?.locations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  try {
    const pq = path.join("out", "reach", slug, "prequal.json");
    if (fs.existsSync(pq)) {
      const j = JSON.parse(fs.readFileSync(pq, "utf8"));
      const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  try {
    const st = path.join("out", "sales", slug, "02_pipeline_state.json");
    if (fs.existsSync(st)) {
      const j = JSON.parse(fs.readFileSync(st, "utf8"));
      const n = j?.locations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  return null;
}


function run(cmd){ execSync(cmd,{ stdio:"inherit" }); }

const ROOT = execSync("git rev-parse --show-toplevel",{ encoding:"utf8" }).trim();
process.chdir(ROOT);

// Canonical entrypoint expected by ciag:closure.
// Shim forwards to: scripts/generate_pilot_runbook_v1.mjs
run(`node "scripts/generate_pilot_runbook_v1.mjs"`);
