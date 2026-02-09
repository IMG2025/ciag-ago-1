#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = exists(p) ? read(p) : "";
  if(prev !== next){
    fs.mkdirSync(path.dirname(p), { recursive:true });
    fs.writeFileSync(p,next);
  }
}

const ROOT = execSync("git rev-parse --show-toplevel",{encoding:"utf8"}).trim();
process.chdir(ROOT);

const f = "fixtures/intake/cole-hospitality.intake-response.json";
if(!exists(f)) throw new Error("Missing intake fixture: " + f);

const doc = JSON.parse(read(f));

// Minimum known truth
doc.systems = doc.systems || {};
doc.systems.Payments = doc.systems.Payments || {};
doc.systems.Payments.vendor = "Toast";
doc.systems.Payments.product = "Toast Payments";
doc.systems.Payments.notes = "Confirmed payment vendor via Cole Hospitality simulation (Toast - Toast Payments)";
doc.systems.Payments.confidence = 7;

writeIfChanged(f, JSON.stringify(doc,null,2) + "\n");
console.log("Filled minimum Cole intake fixture:", f);

run("npm run build");
