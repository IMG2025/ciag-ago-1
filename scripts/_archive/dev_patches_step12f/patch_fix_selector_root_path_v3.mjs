#!/usr/bin/env node
/**
 * Patch v3 — eliminate cwd ambiguity
 * - Resolve repo root from script location
 * - Hard-log final write path
 * - Fail closed if file missing
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, c) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c);
}

const SCRIPT = path.resolve(process.argv[1]);
const ROOT = path.resolve(path.join(path.dirname(SCRIPT), ".."));
const FILE = path.join(ROOT, "scripts", "select_first_operator_from_queue_v1.mjs");

if (!fs.existsSync(FILE)) throw new Error("Missing selector script");

let src = read(FILE);

// Replace ROOT resolution
src = src.replace(
  /const ROOT\s*=\s*process\.cwd\(\)\s*;/,
  `const ROOT = path.resolve(path.join(path.dirname(import.meta.url.replace("file://","")), ".."));`
);

// Replace write block with explicit logging
src = src.replace(
  /write\s*\(\s*DEST\s*,[\s\S]*?\);\s*/m,
  `
write(DEST, JSON.stringify(rows[0], null, 2) + "\\n");
console.log("operator_selected.json written to:", DEST);
if (!fs.existsSync(DEST)) {
  throw new Error("FATAL: operator_selected.json missing after write");
}
`
);

write(FILE, src);
run("npm run build");
