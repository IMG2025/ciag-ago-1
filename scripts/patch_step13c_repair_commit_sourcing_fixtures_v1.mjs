#!/usr/bin/env node
/**
 * Step 13C Repair
 * Ensure sourcing fixtures + patch scripts are tracked and committed.
 * - Creates fixtures/sourcing/.gitkeep
 * - Creates fixtures/sourcing/tier1.sample.json if missing (minimal valid)
 * - Ensures .gitignore does not exclude fixtures/sourcing
 * - Stages + commits (if needed) + pushes
 * Idempotent. Ends with: npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next){
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function ensureDir(p){ fs.mkdirSync(p, { recursive: true }); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

// Ensure fixture dir + keep
ensureDir(path.join("fixtures","sourcing"));
writeIfChanged(path.join("fixtures","sourcing",".gitkeep"), "");

// Ensure tier1.sample.json exists (minimal valid multi-entry vector)
const TIER1 = path.join("fixtures","sourcing","tier1.sample.json");
if (!exists(TIER1)) {
  const sample = [
    { slug: "cole-hospitality", operator_name: "Cole Hospitality", locations: 38, score: 84, confidence: 9 },
    { slug: "demo-hospitality-b", operator_name: "Demo Hospitality B", locations: 52, score: 81, confidence: 8 }
  ];
  writeIfChanged(TIER1, JSON.stringify(sample, null, 2) + "\n");
}

// Ensure .gitignore is not excluding fixtures/sourcing
const GI = ".gitignore";
if (exists(GI)) {
  const before = read(GI);
  const lines = before.split("\n");
  const filtered = lines.filter(line => {
    const t = line.trim();
    if (t === "fixtures/sourcing" || t === "fixtures/sourcing/" || t === "fixtures/sourcing/**") return false;
    return true;
  });
  const after = filtered.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
  if (after !== before) writeIfChanged(GI, after);
}

// Stage everything required for 13C
run("git add -A scripts/patch_step13c_track_sourcing_fixtures_v1.mjs scripts/patch_step13c_repair_commit_sourcing_fixtures_v1.mjs fixtures/sourcing/.gitkeep fixtures/sourcing/tier1.sample.json .gitignore 2>/dev/null || true");

// Commit only if there is something staged
const diff = sh("git diff --cached --name-only || true");
if (diff.trim().length) {
  run('git commit -m "chore: track sourcing fixtures + patch scripts (step 13C)"');
  run("git push");
} else {
  console.log("Nothing to commit (Step 13C already clean).");
}

run("npm run build");
console.log("Step 13C repair complete.");
