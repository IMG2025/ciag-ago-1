#!/usr/bin/env node
/**
 * Step 16C: Cleanup stray v1 patch file (SELF-GOVERNING)
 * - Removes untracked scripts/patch_step16_bundle_golden_path_contract_v1.mjs if present
 * - Stages/commits/pushes THIS cleanup patch (and itself) if needed
 * - Idempotent, fail-closed, build-gated
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const STRAY = "scripts/patch_step16_bundle_golden_path_contract_v1.mjs";
const SELF = "scripts/patch_step16c_cleanup_stray_v1_patch_v1.mjs";

// Only remove STRAY if it's untracked (safety)
const untracked = sh("git ls-files --others --exclude-standard || true").split("\n").filter(Boolean);
const isUntracked = untracked.includes(STRAY);

if (isUntracked && exists(STRAY)) {
  fs.rmSync(STRAY, { force: true });
  console.log("Removed stray untracked file:", STRAY);
} else {
  console.log("No stray untracked v1 patch to remove.");
}

// Stage + commit this cleanup patch if needed
run("git add " + SELF);
const staged = sh("git diff --cached --name-only || true").trim();
if (staged) {
  run('git commit -m "chore: self-govern step16c cleanup patch"');
  run("git push");
} else {
  console.log("Step 16C: nothing new to commit.");
}

// Required final gate
run("npm run build");

// Fail-closed: repo must be clean at end
const dirty = sh("git status --porcelain").trim();
if (dirty) {
  console.error("[FATAL] Repo not clean after Step 16C:\n" + dirty);
  process.exit(1);
}

console.log("Step 16C complete: cleanup governed; repo clean.");
