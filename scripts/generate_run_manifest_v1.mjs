#!/usr/bin/env node
/**
 * generate_run_manifest_v1.mjs
 * Writes out/manifests/<slug>.run.json with sha256 hashes of key artifacts.
 * Intended for audit-grade traceability.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p); }
function ensureDir(p){ if(!exists(p)) fs.mkdirSync(p,{recursive:true}); }
function sha256File(p){
  const buf = read(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function arg(name){
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i+1] ?? null;
}

const slug = arg("--slug");
if (!slug) throw new Error("Missing --slug <operator-slug>");

const tier1 = arg("--tier1");
const intake = arg("--intake");

const outDir = path.join("out","manifests");
ensureDir(outDir);

const triageDir = path.join("docs","triage",`TRG-${slug}`);
const reachDir  = path.join("out","reach",slug);
const salesDir  = path.join("out","sales",slug);

const candidates = [
  tier1 ? { kind:"input:tier1", path:tier1 } : null,
  intake ? { kind:"input:intake", path:intake } : null,
  { kind:"reach:prequal", path:path.join(reachDir,"prequal.json") },
  { kind:"reach:letter", path:path.join(reachDir,"letter.md") },
  { kind:"sales:source", path:path.join(salesDir,"00_source.json") },
  { kind:"sales:outreach_letter", path:path.join(salesDir,"01_outreach_letter.md") },
  { kind:"sales:pipeline_state", path:path.join(salesDir,"02_pipeline_state.json") },
  { kind:"triage:evidence", path:path.join(triageDir,"evidence.json") },
  { kind:"triage:risk_register", path:path.join(triageDir,"risk-register.csv") },
  { kind:"triage:recommendation", path:path.join(triageDir,"recommendation.md") },
  { kind:"triage:pilot_runbook", path:path.join(triageDir,"pilot-runbook.md") },
].filter(Boolean);

const artifacts = candidates
  .filter(a => exists(a.path))
  .map(a => ({ ...a, sha256: sha256File(a.path) }));

const manifest = {
  slug,
  generatedAt: new Date().toISOString(),
  artifacts,
};

const outPath = path.join(outDir, `${slug}.run.json`);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log("Run manifest written:", outPath);
