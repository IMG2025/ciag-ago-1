#!/usr/bin/env node
/**
 * Step 13A FIX
 * Remove TypeScript-only syntax from ciag_sales_funnel_e2e_v1.mjs
 * Guardrail: runtime JS files must not contain TS annotations
 * Idempotent. Build-gated.
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

// Strip TS type annotations like `: string`
src = src.replace(/function\s+run\s*\(\s*cmd\s*:\s*string\s*\)/g, "function run(cmd)");
src = src.replace(/function\s+sh\s*\(\s*cmd\s*:\s*string\s*\)/g, "function sh(cmd)");
src = src.replace(/function\s+exists\s*\(\s*p\s*:\s*string\s*\)/g, "function exists(p)");
src = src.replace(/function\s+read\s*\(\s*p\s*:\s*string\s*\)/g, "function read(p)");
src = src.replace(/function\s+mkdirp\s*\(\s*p\s*:\s*string\s*\)/g, "function mkdirp(p)");
src = src.replace(/function\s+writeIfChanged\s*\(\s*p\s*:\s*string\s*,\s*next\s*:\s*string\s*\)/g, "function writeIfChanged(p, next)");
src = src.replace(/function\s+writeJson\s*\(\s*p\s*:\s*string\s*,\s*obj\s*:\s*unknown\s*\)/g, "function writeJson(p, obj)");

writeIfChanged(FILE, src);

// Syntax + build gates
run(`node --check "${FILE}"`);
run("npm run build");

console.log("Step 13A FIX complete: JS syntax normalized.");
