#!/usr/bin/env node
/**
 * Step 8B — Revenue Ledger Initialization (v1)
 * - Append-only financial tracking
 * - No governance mutation
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
const FILE = path.join(ROOT,"out","revenue","ledger.csv");

const header = [
  "timestamp",
  "operator",
  "triage_id",
  "state",
  "amount_usd",
  "contract_ref",
  "notes"
].join(",");

if(!exists(FILE)){
  fs.mkdirSync(path.dirname(FILE),{recursive:true});
  writeIfChanged(FILE, header + "\n");
}

run("npm run build");
