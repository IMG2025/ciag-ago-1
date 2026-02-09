#!/usr/bin/env node
/**
 * Fix Termux root resolution.
 * Use physical PWD to avoid path shadowing.
 * Idempotent.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const FILE = path.join(
  process.cwd(),
  "scripts",
  "select_first_operator_from_queue_v1.mjs"
);

let src = read(FILE);

// Replace ROOT definition
src = src.replace(
  /const ROOT\s*=\s*process\.cwd\(\);\n/,
  `const ROOT = execSync("pwd -P", { encoding: "utf8" }).trim();\n`
);

write(FILE, src);

// Gate
execSync("npm run build", { stdio: "inherit" });
