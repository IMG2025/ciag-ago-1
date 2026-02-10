#!/usr/bin/env node
/**
 * Step 16C: Cleanup stray v1 patch file
 * - Removes untracked scripts/patch_step16_bundle_golden_path_contract_v1.mjs if present
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

// Only remove if it's untracked (safety)
const untracked = sh("git ls-files --others --exclude-standard");
const isUntracked = untracked.split("\n").includes(STRAY);

if (isUntracked && exists(STRAY)) {
  fs.rmSync(STRAY, { force: true });
  console.log("Removed stray untracked file:", STRAY);
} else {
  console.log("No stray untracked v1 patch to remove.");
}

// Verify tree is clean (porcelain must be empty)
const dirty = sh("git status --porcelain");
if (dirty.trim()) {
  console.error("[FATAL] Repo not clean after cleanup:\n" + dirty);
  process.exit(1);
}

// Required final gate
run("npm run build");
console.log("Step 16C cleanup complete.");
