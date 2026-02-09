#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

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

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)) throw new Error("Missing selected operator at .ago/operator_selected.json");
const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if(!slug) throw new Error("Selected operator missing operator_slug");

const OUT = path.join("fixtures","intake",`${slug}.intake-response.json`);

const doc = {
  operator: { name: op.operator_name || op.name || slug, slug, locations: op.locations ?? null },
  capturedAt: new Date().toISOString(),
  systems: {
    PMS: { vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7 },
    POS: { vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7 },
    HRIS:{ vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7 },
    WFM: { vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7 },
    Scheduling:{ vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7 },
    Payments:{ vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7, pci: { saq: null, tokenization: null, scopeNotes: null } },
    Other:{ vendor: null, product: null, evidenceUrl: null, notes: null, confidence: 7, aiEnabledFeatures: [] }
  },
  aiInventory: {
    blocker_R001_closed: false,
    aiEnabledTools: [],
    shadowAI: [],
    dataClasses: { PII: [], PCI: [], Workforce: [], Other: [] },
    owner: null,
    notes: null,
    confidence: 7
  }
};

writeIfChanged(OUT, JSON.stringify(doc,null,2) + "\n");
console.log("Intake response template ready:", OUT);
