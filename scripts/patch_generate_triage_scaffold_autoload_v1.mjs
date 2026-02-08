#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = fs.existsSync(p)?read(p):"";
  if(prev!==next) fs.writeFileSync(p,next);
}

const FILE = path.join("scripts","generate_triage_scaffold_v1.mjs");
if(!fs.existsSync(FILE)) throw new Error("Missing scaffold generator");

let src = read(FILE);

if(src.includes("operator.selected.json")) {
  run("npm run build");
  process.exit(0);
}

src = src.replace(
  /const operator = process\.argv\[2\];[\s\S]*?throw new Error\([\s\S]*?\);\s*\}/,
  `
const arg = process.argv[2];
let operator = arg;

if(!operator){
  const sel = path.join(process.cwd(),"out","operator.selected.json");
  if(!fs.existsSync(sel)) throw new Error("Missing operator (arg or out/operator.selected.json)");
  operator = JSON.parse(read(sel)).slug;
}
`
);

writeIfChanged(FILE, src);
run("npm run build");
