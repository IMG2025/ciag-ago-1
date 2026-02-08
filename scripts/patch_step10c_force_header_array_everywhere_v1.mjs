#!/usr/bin/env node
/**
 * Force header to be an array at ALL entry points.
 * Makes headerIndex() self-healing and call-site safe.
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

/**
 * 1) Make headerIndex self-healing
 */
src = src.replace(
  /function\s+headerIndex\s*\([\s\S]*?\n}\n/g,
  `
function headerIndex(header, key) {
  // Force header to array if a CSV line slipped through
  if (typeof header === "string") {
    header = header.split(",").map(h => h.trim());
  }
  if (!Array.isArray(header)) {
    throw new Error("headerIndex: header is not array after normalization");
  }
  const k = String(key || "").trim().toLowerCase();
  return header.findIndex(h => String(h).trim().toLowerCase() === k);
}
`.trim() + "\n"
);

/**
 * 2) Ensure header is always derived once from lines[0]
 */
src = src.replace(
  /const\s+lines\s*=\s*[^;]+;/,
  match => `${match}\nconst header = lines[0].split(",").map(h => h.trim());`
);

/**
 * 3) Remove any shadowed / reassigned header vars
 */
src = src.replace(
  /const\s+header\s*=\s*lines\[0\][^;]*;/g,
  ""
);

writeIfChanged(FILE, src);

try { fs.chmodSync(FILE, 0o755); } catch {}
run("node --check scripts/derive_risk_register_from_evidence_v1.mjs");
run("npm run build");
