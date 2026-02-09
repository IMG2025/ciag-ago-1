#!/usr/bin/env node
/**
 * Patch v2 — Hard guarantee operator_selected.json is written
 * - Creates out/ directory
 * - Logs selection
 * - Fails closed if file missing
 * - Idempotent
 * Required gate: npm run build
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

const ROOT = process.cwd();
const FILE = path.join(ROOT, "scripts", "select_first_operator_from_queue_v1.mjs");
if (!fs.existsSync(FILE)) throw new Error("Missing selector script");

let src = read(FILE);

// Force mkdir + explicit logging + assertion
if (!src.includes("Operator selected:")) {
  src = src.replace(
    /write\s*\(\s*DEST\s*,[\s\S]*?\);\s*/m,
    `
write(DEST, JSON.stringify(rows[0], null, 2) + "\\n");
console.log("Operator selected:", rows[0]);
if (!fs.existsSync(DEST)) {
  throw new Error("FATAL: operator_selected.json was not created");
}
`
  );
}

write(FILE, src);

// Required gate
run("npm run build");
