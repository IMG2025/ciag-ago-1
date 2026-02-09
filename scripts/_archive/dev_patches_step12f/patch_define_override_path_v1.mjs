#!/usr/bin/env node
/**
 * Define OVERRIDE path in selector if missing.
 * Idempotent. Safe. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,c);
}

const ROOT = process.cwd();
const FILE = path.join(ROOT,"scripts","select_first_operator_from_queue_v1.mjs");
if(!fs.existsSync(FILE)) throw new Error("Missing selector script");

let src = read(FILE);

// Inject OVERRIDE only if missing
if (!src.includes("const OVERRIDE")) {
  src = src.replace(
    /const DEST\s*=.*?;\n/,
    match => `${match}const OVERRIDE = path.join(ROOT,"data","operator_override.json");\n`
  );
}

write(FILE, src);
run("npm run build");
