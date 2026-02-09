#!/usr/bin/env node
/**
 * NORMALIZE selector helpers.
 * Ensures exactly one definition of:
 *   - exists
 *   - read
 *   - write
 *   - run
 * Removes duplicates safely.
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function runCmd(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,c);
}

const ROOT = process.cwd();
const FILE = path.join(ROOT,"scripts","select_first_operator_from_queue_v1.mjs");
if(!exists(FILE)) throw new Error("Missing selector script");

let src = read(FILE);

// Strip ALL helper definitions (defensive)
src = src
  .replace(/function\s+exists\s*\([\s\S]*?\}\n/g,"")
  .replace(/function\s+read\s*\([\s\S]*?\}\n/g,"")
  .replace(/function\s+write\s*\([\s\S]*?\}\n/g,"")
  .replace(/function\s+run\s*\([\s\S]*?\}\n/g,"");

// Inject canonical helpers exactly once after imports
src = src.replace(
  /(import[\s\S]+?;\n)/,
`$1
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,c);
}
function run(cmd){ execSync(cmd,{stdio:"inherit"}); }

`
);

write(FILE, src);
runCmd("npm run build");
