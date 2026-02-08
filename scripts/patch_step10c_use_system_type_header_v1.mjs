#!/usr/bin/env node
/**
 * Step 10C hardening:
 * - Derivation must NOT assume systemType lives in a fixed CSV column.
 * - Instead, locate `system_type` (preferred) or `systemType` by header name.
 * Idempotent. Must end with npm run build.
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
if (!exists(FILE)) throw new Error("Missing: scripts/derive_risk_register_from_evidence_v1.mjs");

let src = read(FILE);

// Replace any fixed-index `cols[1]` style assumptions with header lookup.
// We patch in a small helper + use it for system type extraction.
const marker = "function parseCsvLine";
if (!src.includes(marker)) {
  // If the script has no such marker, we still patch using a safer insertion near top-level helpers.
}

if (!src.includes("function headerIndex(")) {
  const insertNear = src.indexOf("function") >= 0 ? src.indexOf("function") : 0;
  const helper = `
function headerIndex(header, name) {
  const key = String(name || "").trim().toLowerCase();
  return header.findIndex(h => String(h).trim().toLowerCase() === key);
}
function getSystemTypeFromRow(header, cols) {
  const idx = headerIndex(header, "system_type");
  const idx2 = headerIndex(header, "systemType");
  const at = idx >= 0 ? idx : idx2;
  return at >= 0 ? (cols[at] || "").trim() : "";
}
`.trim() + "\n\n";
  src = src.slice(0, insertNear) + helper + src.slice(insertNear);
}

// Patch the line that derives system type from fixed columns.
// We search common patterns and replace them.
src = src.replace(
  /const\s+systemType\s*=\s*cols\[\s*\d+\s*\]\s*;?/g,
  "const systemType = getSystemTypeFromRow(header, cols);"
);

// Ensure header is in scope: if the script uses `header` variable name differently,
// we normalize by patching the header assignment to `const header = ...`.
src = src.replace(
  /const\s+headers?\s*=\s*lines\[\s*0\s*\]\.split\(\s*","\s*\)\s*;?/g,
  "const header = lines[0].split(\",\");"
);

// If it still references `headers`, alias it.
if (src.includes("headers") && !src.includes("const header = headers")) {
  src = src.replace(/const\s+headers\s*=/g, "const headers =");
  src = src.replace(/headers/g, "header");
}

// Hard fail if header lookup cannot find system_type and returns empty while row exists.
// (We keep it non-fatal for now because we may have legacy rows; mitigation only happens when system_type is present.)
writeIfChanged(FILE, src);

try { fs.chmodSync(FILE, 0o755); } catch {}
run("node --check scripts/derive_risk_register_from_evidence_v1.mjs");
run("npm run build");
