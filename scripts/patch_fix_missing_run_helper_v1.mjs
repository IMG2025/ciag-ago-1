#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function readFile(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = fs.existsSync(p)?readFile(p):"";
  if(prev!==next) fs.writeFileSync(p,next);
}

const FILE = path.join("scripts","generate_triage_scaffold_v1.mjs");
if(!fs.existsSync(FILE)) throw new Error("Missing generate_triage_scaffold_v1.mjs");

let src = readFile(FILE);

// If run() already defined, exit clean
if(/\bfunction\s+run\(/.test(src) || /\bconst\s+run\s*=/.test(src)){
  execSync("npm run build",{stdio:"inherit"});
  process.exit(0);
}

// Inject run helper after child_process import
src = src.replace(
  /(import\s+\{\s*execSync\s*\}\s+from\s+["']node:child_process["'];)/,
  `$1\nconst run = (cmd) => execSync(cmd, { stdio: "inherit" });`
);

writeIfChanged(FILE, src);
execSync("npm run build",{stdio:"inherit"});
