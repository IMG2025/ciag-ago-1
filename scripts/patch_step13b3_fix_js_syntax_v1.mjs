#!/usr/bin/env node
/**
 * Step 13B.3a — Fix JS syntax in enforcement patch
 * Converts TS-style annotations to pure JS.
 *
 * Guardrails:
 * - Zero hand edits
 * - Idempotent
 * - Build gated
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const FILE = "scripts/patch_step13b3_enforce_locations_before_success_log_v1.mjs";
if (!fs.existsSync(FILE)) {
  throw new Error("Missing enforcement patch file");
}

let src = fs.readFileSync(FILE, "utf8");

// Strip TypeScript annotations (safe + idempotent)
src = src
  .replace(/:\s*string/g, "")
  .replace(/:\s*number/g, "")
  .replace(/:\s*boolean/g, "")
  .replace(/:\s*any/g, "")
  .replace(/:\s*unknown/g, "")
  .replace(/\)\s*:\s*\w+/g, ")");

// Write only if changed
const prev = fs.readFileSync(FILE, "utf8");
if (prev !== src) fs.writeFileSync(FILE, src);

// Syntax + build gates
run(`node --check ${FILE}`);
run("npm run build");

console.log("Step 13B.3a complete: JS syntax normalized.");
