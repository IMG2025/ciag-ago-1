#!/usr/bin/env node
import fs from "node:fs";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){
  fs.mkdirSync(path.dirname(p),{recursive:true});
  fs.writeFileSync(p,c);
}
function run(cmd){ execSync(cmd,{stdio:"inherit"}); }

import path from "node:path";
import { execSync } from "node:child_process";



const ROOT = path.resolve(new URL('.', import.meta.url).pathname, "..");
const QUEUE = path.join(ROOT,"out","reach","queue.jsonl");
const DEST = path.join(process.env.PWD || process.cwd(), ".ago", "operator_selected.json");
const OVERRIDE = path.join(ROOT,"data","operator_override.json");

if(!fs.existsSync(QUEUE)) throw new Error("Missing outreach queue");

const rows = read(QUEUE).trim().split("\n").map(JSON.parse);
rows.sort((a,b)=> (b.confidence||0)-(a.confidence||0));

// PREFER_OVERRIDE
if (exists(OVERRIDE)) {
  const ov = JSON.parse(read(OVERRIDE));
  const pinned = {
    rank: 1,
    operator_name: ov.operator_name || "Cole Hospitality",
    operator_slug: ov.operator_slug || "cole-hospitality",
    locations: ov.locations || null,
    composite_score: ov.composite_score || null,
    confidence_score: 10,
    priority: "Immediate",
    outreach_status: "simulation-pin",
    provenance: { source: "operator_override.json" }
  };
  write(DEST, JSON.stringify(pinned, null, 2) + "\n");
  console.log("operator_selected.json written to:", DEST);
  if (!exists(DEST)) throw new Error("FATAL: missing operator_selected.json after override write");
  process.exit(0);
}
if (!rows.length) {
  throw new Error("Operator selection failed: empty Tier-1 queue");
}



write(DEST, JSON.stringify(rows[0], null, 2) + "\n");
console.log("operator_selected.json written to:", DEST);
if (!fs.existsSync(DEST)) {
  throw new Error("FATAL: operator_selected.json missing after write");
}
console.log("Operator selected:", rows[0]);
if (!fs.existsSync(DEST)) {
  throw new Error("FATAL: operator_selected.json was not created");
}
