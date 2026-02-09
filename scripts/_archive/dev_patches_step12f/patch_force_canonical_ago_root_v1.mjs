#!/usr/bin/env node
/**
 * Force canonical AGO artifact root.
 * Eliminates Termux HOME / cwd shadowing.
 * Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const FILE = path.join(process.cwd(), "scripts", "select_first_operator_from_queue_v1.mjs");
let src = read(FILE);

// Hard replace DEST path
src = src.replace(
  /const DEST\s*=.*?;\n/,
  `const DEST = path.join(process.env.PWD || process.cwd(), ".ago", "operator_selected.json");\n`
);

// Ensure directory exists
if (!src.includes("mkdirSync")) {
  src = src.replace(
    /const DEST.*\n/,
    match => match + `fs.mkdirSync(path.dirname(DEST), { recursive: true });\n`
  );
}

write(FILE, src);

// Gate
execSync("npm run build", { stdio: "inherit" });
