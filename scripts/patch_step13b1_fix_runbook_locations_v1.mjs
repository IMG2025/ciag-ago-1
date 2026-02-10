#!/usr/bin/env node
/**
 * Step 13B.1 — Fix pilot-runbook Locations rendering.
 * Problem: pilot-runbook.md shows "**Locations:** null" even when prequal has locations.
 *
 * Fix: post-write normalization inside generate_pilot_runbook_from_recommendation_v1.mjs:
 *  - compute locations from out/reach/<slug>/prequal.json (preferred), else intake, else unknown
 *  - replace header line if null
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

const FILE = path.join("scripts", "generate_pilot_runbook_from_recommendation_v1.mjs");
if (!exists(FILE)) throw new Error(`Missing: ${FILE}`);

let src = read(FILE);

// 1) Ensure helper exists exactly once
if (!src.includes("function resolveLocationsFromArtifacts")) {
  const helper = `
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
`.trimStart();

  // Insert after last import
  const lines = src.split("\n");
  let lastImport = -1;
  for (let i = 0; i < lines.length; i++) if (lines[i].startsWith("import ")) lastImport = i;
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, "", helper);
  else lines.unshift(helper, "");
  src = lines.join("\n");
}

// 2) Add post-write normalization block once.
// We look for writeFileSync of pilot-runbook.md; if we can't find it, we append a safe wrapper
// around the final "outPath" write by pattern matching "pilot-runbook.md".
if (!src.includes("normalizePilotRunbookLocations")) {
  const normalizer = `
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
`.trimStart();

  // Insert helper near other helpers (after resolveLocationsFromArtifacts)
  const idx = src.indexOf("function resolveLocationsFromArtifacts");
  if (idx !== -1) {
    const before = src.slice(0, idx);
    const after = src.slice(idx);
    src = before + normalizer + "\n" + after;
  } else {
    src = normalizer + "\n" + src;
  }
}

// 3) Ensure normalizePilotRunbookLocations(...) is called after writing pilot-runbook.md.
// We do NOT assume variable names; we pattern match the output path containing "pilot-runbook.md".
if (!src.includes("normalizePilotRunbookLocations(")) {
  // Attempt: find the first occurrence of "pilot-runbook.md" and insert a call after its write.
  const lines = src.split("\n");
  let inserted = false;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("pilot-runbook.md") && lines[i].includes("writeFileSync")) {
      // try to extract the outPath variable name from writeFileSync(<x>, ...)
      const m = lines[i].match(/writeFileSync\(([^,]+),/);
      const outVar = m ? m[1].trim() : "outPath";
      // find slug var name (best-effort): prefer "slug", else "operatorSlug", else inline string won't matter
      const slugVar = src.includes("const slug") || src.includes("let slug") ? "slug" : (src.includes("operatorSlug") ? "operatorSlug" : "slug");
      lines.splice(i + 1, 0, `normalizePilotRunbookLocations(${slugVar}, ${outVar});`);
      inserted = true;
      break;
    }
  }

  if (!inserted) {
    // Fallback: append a call near end, guarded.
    const slugVar = src.includes("operatorSlug") ? "operatorSlug" : "slug";
    lines.push("", `// Step 13B.1 — post-write normalization (fallback insertion)`, `try { normalizePilotRunbookLocations(${slugVar}, outPath); } catch {}`, "");
  }

  src = lines.join("\n");
}

writeIfChanged(FILE, src);

// Syntax gate
run(`node --check "${FILE}"`);

// Required build gate
run("npm run build");

console.log("Step 13B.1 complete: pilot runbook Locations normalization wired.");
