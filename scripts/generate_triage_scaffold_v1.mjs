#!/usr/bin/env node
/**
 * Step 8A — Governance Triage Scaffold
 * - Creates standardized triage artifact structure
 * Idempotent. Ends with npm run build
 */
import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
import path from "node:path";
import { execSync } from "node:child_process";


const arg = process.argv[2];
let operator = arg;

if(!operator){
  const sel = path.join(process.cwd(),"out","operator.selected.json");
  if(!fs.existsSync(sel)) throw new Error("Missing operator (arg or out/operator.selected.json)");
  operator = JSON.parse(read(sel)).slug;
}

function mkdir(p){ fs.mkdirSync(p,{recursive:true}); }

const ROOT = process.cwd();
const DIR = path.join(ROOT,"docs","triage",`TRG-${operator}`);

mkdir(DIR);
["memo.md","risk-register.csv","evidence.json","recommendation.md"]
  .forEach(f=>{
    const p = path.join(DIR,f);
    if(!fs.existsSync(p)) fs.writeFileSync(p,"");
  });

run("npm run build");
