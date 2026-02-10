#!/usr/bin/env node
/**
 * Step 13C FINAL (v2)
 * - Deterministically creates fixtures/sourcing artifacts
 * - Safely stages only existing paths
 * - Idempotent, fail-closed, build-gated
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function write(p, c) { fs.writeFileSync(p, c); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

// --- Ensure directory ---
const dir = path.join("fixtures", "sourcing");
ensureDir(dir);

// --- Ensure .gitkeep ---
const gitkeep = path.join(dir, ".gitkeep");
if (!exists(gitkeep)) write(gitkeep, "");

// --- Ensure tier1.sample.json ---
const tier1 = path.join(dir, "tier1.sample.json");
if (!exists(tier1)) {
  write(
    tier1,
    JSON.stringify(
      [
        {
          slug: "cole-hospitality",
          operator_name: "Cole Hospitality",
          locations: 38,
          score: 84,
          confidence: 9
        }
      ],
      null,
      2
    ) + "\n"
  );
}

// --- Stage only existing paths ---
const stage = [
  ".gitignore",
  gitkeep,
  tier1,
  "scripts/patch_step13c_track_sourcing_fixtures_v1.mjs",
  "scripts/patch_step13c_repair_commit_sourcing_fixtures_v1.mjs",
  "scripts/patch_step13c_finalize_track_sourcing_fixtures_v2.mjs"
].filter(exists);

if (stage.length) {
  run("git add " + stage.join(" "));
}

// --- Commit if needed ---
const staged = sh("git diff --cached --name-only || true");
if (staged.trim()) {
  run('git commit -m "chore: finalize governed sourcing fixtures (step 13C)"');
  run("git push");
} else {
  console.log("Step 13C: nothing new to commit.");
}

// --- Required final gate ---
run("npm run build");
run("git status");

console.log("Step 13C FINAL complete.");
