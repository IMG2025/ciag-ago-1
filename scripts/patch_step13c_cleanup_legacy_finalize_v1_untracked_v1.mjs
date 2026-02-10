#!/usr/bin/env node
/**
 * Step 13C CLEANUP (v1)
 * Remove legacy untracked finalize script (v1) to restore clean working tree.
 * Idempotent. Build-gated. Ends with: npm run build
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p){ return fs.existsSync(p); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const LEGACY = "scripts/patch_step13c_finalize_track_sourcing_fixtures_v1.mjs";

// If it exists and is untracked, remove it. If tracked, fail closed (we should not delete tracked content silently).
if (exists(LEGACY)) {
  const tracked = sh(`git ls-files -- "${LEGACY}" || true`).trim();
  if (tracked) {
    throw new Error(`Refusing to delete tracked file: ${LEGACY}. Archive via explicit decision.`);
  }
  fs.unlinkSync(LEGACY);
  console.log(`Deleted untracked legacy file: ${LEGACY}`);
} else {
  console.log(`Legacy file not present: ${LEGACY}`);
}

// Commit this cleanup patch (the cleanup patch itself), if new
run(`git add scripts/patch_step13c_cleanup_legacy_finalize_v1_untracked_v1.mjs`);
const staged = sh("git diff --cached --name-only || true").trim();
if (staged) {
  run(`git commit -m "chore: cleanup legacy step13c finalize v1 untracked file"`);
  run("git push");
} else {
  console.log("No cleanup patch changes to commit.");
}

// Required final gate
run("npm run build");
run("git status");
