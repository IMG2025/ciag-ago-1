#!/usr/bin/env node
/**
 * Step 7 — Evidence Ledger Initialization (v1)
 * - Append-only execution evidence
 * - No scoring or tier mutation
 * Idempotent. Ends with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function writeIfChanged(p,next){
  const prev = exists(p) ? fs.readFileSync(p,"utf8") : "";
  if(prev !== next) fs.writeFileSync(p,next);
}

const ROOT = process.cwd();
const FILE = path.join(ROOT,"out","reach","evidence.csv");

const header = [
  "timestamp",
  "operator",
  "rank",
  "evidence_type",
  "source",
  "confidence",
  "notes"
].join(",");

if(!exists(FILE)){
  writeIfChanged(FILE, header + "\n");
}

run("npm run build");
