#!/usr/bin/env node
/**
 * Step 16D: Govern the cleanup patch (commit + push) and enforce clean tree
 * - Stages/commits the cleanup patch if untracked
 * - Ensures the previously-stray v1 patch is absent
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
const CLEANUP = "scripts/patch_step16c_cleanup_stray_v1_patch_v1.mjs";
const COMMIT_PATCH = "scripts/patch_step16d_commit_cleanup_patch_v1.mjs";

// Ensure stray file is absent (idempotent)
if (exists(STRAY)) fs.rmSync(STRAY, { force: true });

// Stage files if present
const stage = [CLEANUP, COMMIT_PATCH].filter(exists);
if (stage.length) run("git add " + stage.join(" "));

// Commit only if something staged
const staged = sh("git diff --cached --name-only || true").trim();
if (staged) {
  run('git commit -m "chore: govern step16 cleanup patch + enforce clean tree"');
  run("git push");
} else {
  console.log("Step 16D: nothing new to commit.");
}

// Required final gate
run("npm run build");

// Fail-closed clean-tree check
const dirty = sh("git status --porcelain").trim();
if (dirty) {
  console.error("[FATAL] Repo not clean after Step 16D:\n" + dirty);
  process.exit(1);
}

console.log("Step 16D complete: cleanup patch governed; repo clean.");
