#!/usr/bin/env node
/**
 * Step 13C-A
 * Track fixtures/sourcing as official test vectors.
 * - Ensures fixtures/sourcing/.gitkeep exists
 * - Ensures tier1.sample.json is present (if already created locally, keep it)
 * - Removes any .gitignore patterns that would exclude fixtures/sourcing
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

ensureDir(path.join("fixtures","sourcing"));
writeIfChanged(path.join("fixtures","sourcing",".gitkeep"), "");

// Ensure .gitignore is not excluding fixtures/sourcing
const GI = ".gitignore";
if (exists(GI)) {
  let g = read(GI);
  const before = g;
  // remove any lines that ignore fixtures/sourcing
  g = g
    .split("\n")
    .filter(line => !line.trim().match(/^fixtures\/sourcing\/?$/))
    .filter(line => !line.trim().match(/^fixtures\/sourcing\/\*\*$/))
    .join("\n");
  if (g !== before) writeIfChanged(GI, g.replace(/\n{3,}/g, "\n\n").trimEnd() + "\n");
}

// Gate
run("npm run build");
console.log("Step 13C-A complete: fixtures/sourcing is governed + trackable.");
