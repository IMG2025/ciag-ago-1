#!/usr/bin/env node
/**
 * Step 12F — Canonicalize repo hygiene
 * - Keep canonical runnable scripts in /scripts
 * - Archive untracked iterative patch_* scripts to /scripts/_archive/dev_patches_step12f
 * - Keep fixtures (E2E/test data) in /fixtures
 *
 * Idempotent. Gates: node --check + npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const ARCH = path.join("scripts", "_archive", "dev_patches_step12f");
mkdirp(ARCH);

// We only archive UNTRACKED patch scripts that are NOT "step" patches.
// Rationale: step patches are part of the formal sequence; keep them at root for discoverability.
const untracked = sh("git ls-files --others --exclude-standard")
  .split("\n")
  .map(s => s.trim())
  .filter(Boolean);

const toArchive = untracked.filter(p =>
  p.startsWith("scripts/patch_") &&
  !p.startsWith("scripts/patch_step") &&
  p.endsWith(".mjs")
);

// Move files deterministically. If already moved, no-op.
for (const rel of toArchive) {
  const src = path.join(ROOT, rel);
  const base = path.basename(rel);
  const dst = path.join(ROOT, ARCH, base);
  if (!exists(src)) continue;
  if (exists(dst)) {
    // If already archived, remove duplicate source if still present (shouldn't happen, but safe).
    try { fs.unlinkSync(src); } catch {}
    continue;
  }
  fs.renameSync(src, dst);
}

// Gate: ensure canonical scripts still parse
const mustExist = [
  "scripts/generate_triage_scaffold_v1.mjs",
  "scripts/ciag_sales_e2e_v1.mjs",
  "scripts/ciag_e2e_from_fixture_v1.mjs",
  "scripts/generate_pilot_intake_pack_v1.mjs",
  "scripts/generate_pilot_intake_pack_for_selected_operator_v1.mjs",
].filter(p => exists(p));

for (const f of mustExist) run(`node --check "${f}"`);

// Required build gate
run("npm run build");

console.log(`Step 12F complete: archived ${toArchive.length} dev patch scripts to ${ARCH}`);
