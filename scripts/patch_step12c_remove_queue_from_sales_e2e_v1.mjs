#!/usr/bin/env node
/**
 * Step 12C — Remove queue dependency from Sales E2E (authoritative)
 * - Sales E2E must not call ciag:queue
 * - Queueing is upstream or fixture-driven
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

const SALES = path.join("scripts", "ciag_sales_e2e_v1.mjs");
if (!exists(SALES)) throw new Error("Missing scripts/ciag_sales_e2e_v1.mjs");

let src = read(SALES);

// Remove ANY queue invocation (hard guarantee)
src = src.replace(/run\\(["']npm run ciag:queue["']\\);?/g, `
// SALES_E2E_NO_QUEUE
// Guardrail: Sales E2E must never invoke queueing directly.
// Queueing is upstream of this pipeline.
`.trim());

// Ensure guardrail marker exists once
if (!src.includes("SALES_E2E_NO_QUEUE")) {
  src =
    `// SALES_E2E_NO_QUEUE
// Guardrail: Sales E2E must never invoke queueing directly.
// Queueing is upstream of this pipeline.

` + src;
}

writeIfChanged(SALES, src);

// Syntax gate (CORRECT invocation)
run(`node --check "${SALES}"`);

// Required build gate
run("npm run build");

console.log("Step 12C complete: Sales E2E fully decoupled from queue.");
