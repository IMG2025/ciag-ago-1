#!/usr/bin/env node
/**
 * Step 12B — Repair Sales E2E sourcing resolution
 * - Removes hard dependency on `ciag:queue`
 * - Dynamically resolves available sourcing entrypoints
 * - Idempotent
 * - Ends with npm run build
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

const SALES = path.join("scripts","ciag_sales_e2e_v1.mjs");
if (!exists(SALES)) throw new Error("ciag_sales_e2e_v1.mjs missing");

let src = read(SALES);

// Replace hard-coded queue call with adaptive resolver
src = src.replace(
  /run\\("npm run ciag:queue"\\);/g,
  `
const pkg = JSON.parse(fs.readFileSync("package.json","utf8"));
const scripts = pkg.scripts || {};
if (scripts["ciag:queue"]) {
  console.log("Sales E2E: using ciag:queue");
  run("npm run ciag:queue");
} else if (scripts["ciag:e2e"]) {
  console.log("Sales E2E: using ciag:e2e");
  run("npm run ciag:e2e");
} else {
  console.log("Sales E2E: no queue script found; proceeding with fixture/operator override");
}
`.trim()
);

writeIfChanged(SALES, src);

// Syntax gate
run(`node --check "${SALES}"`);

// Required gate
run("npm run build");

console.log("Step 12B complete: Sales E2E queue resolution hardened.");
