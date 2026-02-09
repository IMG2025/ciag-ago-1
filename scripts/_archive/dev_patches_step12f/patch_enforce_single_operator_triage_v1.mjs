#!/usr/bin/env node
/**
 * Enforce single-operator triage mode
 * - Keeps ONLY TRG-<selected>
 * - Deletes all other TRG-* directories
 * - Idempotent
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function exists(p){ return fs.existsSync(p); }

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)){
  throw new Error("Missing .ago/operator_selected.json");
}

const op = JSON.parse(read(SEL));
const slug =
  op.operator_slug ??
  op.slug ??
  op.operator ??
  op.name ??
  op.operator_name;

if(!slug) throw new Error("Selected operator has no identity");

const keep = `TRG-${String(slug).toLowerCase()}`;
const TRIAGE_ROOT = path.join("docs","triage");

if(!exists(TRIAGE_ROOT)) process.exit(0);

for(const d of fs.readdirSync(TRIAGE_ROOT)){
  if(d.startsWith("TRG-") && d !== keep){
    fs.rmSync(path.join(TRIAGE_ROOT,d), { recursive:true, force:true });
    console.log("Removed stale triage:", d);
  }
}

run("npm run build");
