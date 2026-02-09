#!/usr/bin/env node
/**
 * Force ROOT to repo top using script location.
 * Fixes CWD drift.
 * Idempotent. Ends with build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const FILE = path.join(
  process.cwd(),
  "scripts",
  "select_first_operator_from_queue_v1.mjs"
);

let src = read(FILE);

// Replace ROOT definition safely
src = src.replace(
  /const ROOT\s*=.*?;\n/,
  `const ROOT = path.resolve(new URL('.', import.meta.url).pathname, "..");\n`
);

write(FILE, src);
run("npm run build");
