#!/usr/bin/env node
/**
 * Step 12D
 * Remove illegal queue invocation from Sales E2E
 * Guardrail: Sales E2E must NEVER invoke queue directly
 * Idempotent, build-gated
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

const SALES = path.join("scripts", "ciag_sales_e2e_v1.mjs");
if (!exists(SALES)) throw new Error("Missing ciag_sales_e2e_v1.mjs");

let src = read(SALES);

// Hard stop: remove any queue invocation
src = src
  .replace(/run\(["'`]npm run ciag:queue["'`]\);\s*/g, "")
  .replace(/npm run ciag:queue/g, "");

// Insert explicit comment if not present
if (!src.includes("Sales E2E must not invoke queue")) {
  src = src.replace(
    /\/\*\*([\s\S]*?)\*\//,
    `/**$1
 * Guardrail: Sales E2E must not invoke queue. Queueing is upstream.
 */`
  );
}

writeIfChanged(SALES, src);

// Syntax gate
run(`node --check "${SALES}"`);

// Required build gate
run("npm run build");

console.log("Step 12D complete: queue invocation removed from Sales E2E.");
