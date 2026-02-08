#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function readFile(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = fs.existsSync(p)?readFile(p):"";
  if(prev!==next) fs.writeFileSync(p,next);
}

const FILE = path.join("scripts","generate_triage_scaffold_v1.mjs");
if(!fs.existsSync(FILE)) throw new Error("Missing generate_triage_scaffold_v1.mjs");

let src = readFile(FILE);

// If read() already defined, exit clean
if(/\bfunction\s+read\(/.test(src) || /\bconst\s+read\s*=/.test(src)){
  run("npm run build");
  process.exit(0);
}

// Inject read helper after fs import
src = src.replace(
  /(import fs from ["']node:fs["'];)/,
  `$1\nconst read = (p) => fs.readFileSync(p, "utf8");`
);

writeIfChanged(FILE, src);
run("npm run build");
