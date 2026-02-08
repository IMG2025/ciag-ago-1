#!/usr/bin/env node
/**
 * Fix: header must be an array, not a string.
 * Ensures headerIndex() always operates on string[].
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = process.cwd();
const FILE = path.join(ROOT, "scripts", "derive_risk_register_from_evidence_v1.mjs");
if (!exists(FILE)) throw new Error("Missing derive script");

let src = read(FILE);

// Force header to always be an array
src = src.replace(
  /const\s+header\s*=\s*lines\[\s*0\s*\][^;]*;/g,
  'const header = lines[0].split(",").map(h => h.trim());'
);

// Harden headerIndex against misuse
src = src.replace(
  /function\s+headerIndex\s*\(\s*header\s*,\s*key\s*\)\s*{[\s\S]*?}/g,
  `
function headerIndex(header, key) {
  if (!Array.isArray(header)) {
    throw new Error("headerIndex: header is not an array");
  }
  const k = String(key || "").trim().toLowerCase();
  return header.findIndex(h => String(h).trim().toLowerCase() === k);
}
`.trim()
);

writeIfChanged(FILE, src);

try { fs.chmodSync(FILE, 0o755); } catch {}
run("node --check scripts/derive_risk_register_from_evidence_v1.mjs");
run("npm run build");
