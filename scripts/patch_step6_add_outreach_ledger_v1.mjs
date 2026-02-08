#!/usr/bin/env node
/**
 * Step 6 — Outreach Ledger Initialization (v1)
 * - Append-only execution log
 * - No mutation of Tier-1 artifacts
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
const LEDGER = path.join(ROOT,"out","reach","ledger.csv");

const header = [
  "timestamp",
  "operator",
  "rank",
  "state",
  "channel",
  "actor",
  "notes"
].join(",");

if(!exists(LEDGER)){
  writeIfChanged(LEDGER, header + "\n");
}

run("npm run build");
