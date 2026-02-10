#!/usr/bin/env node
/**
 * Step 13A FIX v2
 * Remove TypeScript type/interface blocks from runtime JS (.mjs)
 * Guardrail: runtime JS must be pure JS
 * Idempotent. Syntax + build gated.
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const FILE = "scripts/ciag_sales_funnel_e2e_v1.mjs";
if (!exists(FILE)) throw new Error("Missing " + FILE);

let src = read(FILE);

/**
 * Remove:
 *   type X = { ... }
 *   interface X { ... }
 * Non-greedy, block-safe.
 */
src = src
  .replace(/^\s*type\s+\w+\s*=\s*\{[\s\S]*?\}\s*;?\s*/gm, "")
  .replace(/^\s*interface\s+\w+\s*\{[\s\S]*?\}\s*/gm, "");

// Defensive: remove leftover type-only exports
src = src.replace(/export\s+type\s+\w+[\s\S]*?;?\s*/gm, "");

writeIfChanged(FILE, src);

// Gates
run(`node --check "${FILE}"`);
run("npm run build");

console.log("Step 13A FIX v2 complete: TS type blocks stripped.");
