#!/usr/bin/env node
/**
 * Step 10B — Update a single evidence item deterministically
 * Usage:
 *   node scripts/update_evidence_item_v1.mjs <item_id> <status> <confidence> <note>
 *
 * Example:
 *   node scripts/update_evidence_item_v1.mjs \
 *     <id> observed 6 "Confirmed via operator call"
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function readJson(p){ return JSON.parse(fs.readFileSync(p,"utf8")); }
function writeJson(p,o){ fs.writeFileSync(p,JSON.stringify(o,null,2)+"\n"); }

const [,, ID, STATUS, CONF, NOTE] = process.argv;
if(!ID||!STATUS||!CONF) throw new Error("Usage: update <id> <status> <confidence> <note?>");

const ROOT = process.cwd();
const SEL = path.join(ROOT,".ago","operator_selected.json");
const op = JSON.parse(fs.readFileSync(SEL,"utf8"));
const slug = op.operator_slug || op.slug;

const FILE = path.join(ROOT,"docs","triage",`TRG-${slug}`,"evidence.json");
const doc = readJson(FILE);

const item = doc.items.find(i=>i.id===ID);
if(!item) throw new Error("Evidence item not found: "+ID);

item.status = STATUS;
item.confidence = Number(CONF);
item.notes = NOTE || item.notes;
item.source.capturedAt = new Date().toISOString();

doc.meta.updatedAt = new Date().toISOString();

writeJson(FILE,doc);
console.log("Updated evidence item:",ID);

run("npm run build");
