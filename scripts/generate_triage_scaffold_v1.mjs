#!/usr/bin/env node
/**
 * Step 8A — Governance Triage Scaffold
 * - Creates standardized triage artifact structure
 * Idempotent. Ends with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const operator = process.argv[2];
if(!operator) throw new Error("Usage: node generate_triage_scaffold_v1.mjs <operator>");

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
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
