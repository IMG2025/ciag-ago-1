#!/usr/bin/env node
/**
 * CIAG — Outreach Packets Generator v1
 * Read-only consumption of Tier-1 export contract.
 *
 * Inputs (preferred):
 *   out/reach/queue.jsonl
 * Fallback:
 *   out/reach/queue.csv
 *
 * Optional context (if present):
 *   out/reach/meta.json
 *   data/tier1/evidence.manifest.json
 *
 * Outputs:
 *   out/reach/packs/index.csv
 *   out/reach/packs/<rank>_<operator_slug>.md
 *
 * Deterministic: no network calls; stable sorting by rank then operator name.
 */
import fs from "node:fs";
import path from "node:path";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function ensureDir(p){ fs.mkdirSync(p,{recursive:true}); }
function writeIfChanged(p,next){
  const prev = exists(p) ? read(p) : "";
  if(prev !== next) fs.writeFileSync(p,next);
}
function die(msg){
  process.stderr.write("[FATAL] " + msg + "\n");
  process.exit(1);
}
function slug(s){
  return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
}
function escCsv(s){
  const v = String(s ?? "");
  const needs = v.includes(",") || v.includes('"') || v.includes("\n");
  const q = v.replace(/"/g,'""');
  return needs ? '"' + q + '"' : q;
}
function parseJsonl(raw){
  const lines = raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l=>l.trim().length>0);
  return lines.map((l, i) => {
    try { return JSON.parse(l); }
    catch { die("Invalid JSONL at line " + (i+1)); }
  });
}
function parseCsv(raw){
  const lines = raw.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l=>l.trim().length>0);
  if(lines.length===0) return [];
  const header = splitLine(lines[0]).map(x=>x.trim());
  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = splitLine(lines[i]);
    const row = {};
    for(let c=0;c<header.length;c++) row[header[c]] = (cols[c] ?? "").trim();
    rows.push(row);
  }
  return rows;

  function splitLine(line){
    const out=[]; let cur=""; let inQ=false;
    for(let i=0;i<line.length;i++){
      const ch=line[i];
      if(ch === '"'){
        if(inQ && line[i+1] === '"'){ cur += '"'; i++; }
        else inQ = !inQ;
      } else if(ch === "," && !inQ){
        out.push(cur); cur="";
      } else cur += ch;
    }
    out.push(cur);
    return out;
  }
}

const ROOT = process.cwd();
const IN_JSONL = path.join(ROOT, "out", "reach", "queue.jsonl");
const IN_CSV  = path.join(ROOT, "out", "reach", "queue.csv");
const META    = path.join(ROOT, "out", "reach", "meta.json");
const EVID    = path.join(ROOT, "data", "tier1", "evidence.manifest.json");

if(!exists(IN_JSONL) && !exists(IN_CSV)){
  die("Missing inputs. Expected out/reach/queue.jsonl (preferred) or out/reach/queue.csv (fallback). Run: npm run ciag:queue");
}

let queue = [];
if(exists(IN_JSONL)){
  queue = parseJsonl(read(IN_JSONL));
} else {
  // Expect headers: rank,operator,score,confidence,locations,priority (from Tier-1 contract)
  queue = parseCsv(read(IN_CSV)).map(r => ({
    rank: Number(r.rank || 0),
    operator: r.operator || r.Operator || r.operator_name || "",
    score: Number(r.score || 0),
    confidence: Number(r.confidence || 0),
    locations: r.locations ? Number(String(r.locations).replace(/[^0-9]/g,"")) : null,
    priority: r.priority || "Immediate"
  }));
}

queue = queue
  .filter(x => String(x.operator || x.operator_name || x.operator || "").trim().length > 0)
  .map(x => ({
    rank: Number(x.rank ?? 0) || 0,
    operator: String(x.operator ?? x.operator_name ?? "").trim(),
    score: Number(x.score ?? 0) || 0,
    confidence: Number(x.confidence ?? x.confidence_score ?? 0) || 0,
    locations: (x.locations === null || x.locations === undefined) ? null : Number(x.locations),
    priority: String(x.priority ?? "Immediate")
  }));

queue.sort((a,b) => (a.rank - b.rank) || a.operator.localeCompare(b.operator));

const meta = exists(META) ? safeJson(read(META)) : null;
const evid = exists(EVID) ? safeJson(read(EVID)) : null;

function safeJson(raw){
  try { return JSON.parse(raw); }
  catch { return null; }
}

const OUT_DIR = path.join(ROOT, "out", "reach", "packs");
ensureDir(OUT_DIR);

// index.csv for operator execution
const idxHeader = ["rank","operator","score","confidence","locations","priority","packet_path"].join(",");
const idxLines = [idxHeader];

// Generate packet per target
for(const row of queue){
  const opSlug = slug(row.operator);
  const rankPadded = String(row.rank || 0).padStart(3,"0");
  const fileBase = rankPadded + "_" + opSlug + ".md";
  const packetRel = path.join("out","reach","packs",fileBase);
  const packetAbs = path.join(OUT_DIR, fileBase);

  // Evidence pointer (we do NOT interpret; we reference)
  const evidenceNote = evid && evid[opSlug]
    ? "Evidence manifest entry present for operator_key: " + opSlug
    : "Evidence manifest entry not found in data/tier1/evidence.manifest.json for operator_key: " + opSlug;

  const provenance = meta && meta.provenance ? JSON.stringify(meta.provenance) : "unavailable";

  const md =
`# Tier-1 Outreach Packet (v1)

## Target
- **Operator:** ${row.operator}
- **Rank:** ${row.rank}
- **Composite Score:** ${row.score}
- **Confidence:** ${row.confidence}/10
- **Locations:** ${row.locations ?? "unknown"}
- **Priority:** ${row.priority}

## Provenance (Read-only Tier-1 Contract)
- **Queue source:** ${exists(IN_JSONL) ? "out/reach/queue.jsonl" : "out/reach/queue.csv"}
- **Meta:** ${meta ? "out/reach/meta.json" : "not present"}
- **Engine provenance:** ${provenance}

## Why This Is Tier-1 (Non-Interpretive)
This packet is generated from the Tier-1 export contract. We do **not** restate or modify ICP/scoring/tier logic here.
- Score + confidence are consumed as provided.
- ${evidenceNote}

## Outreach Angle (Operator-safe)
We lead with **governance deployment probability** and **audit-grade readiness**:
- Centralized governance + vendor surface + compliance exposure typically create fast ROI for governance controls.
- We offer an **AI Governance & Compliance Deployment** program with a defined “definition-of-done” and evidence tagging.

## Discovery Prompts (Use verbatim)
1. Where is AI currently used across corporate ops (revenue mgmt, HR, guest comms, fraud, analytics)?
2. Which vendors touch regulated data paths (payments/PCI, HR/PII, guest identity)?
3. Do we have an owned compliance lead, or is it delegated to IT / finance?
4. Any current audit pressure, breach history, or insurer-driven controls?

## CTA (Hard Close)
Propose a 20-minute governance triage:
- Validate vendor surface + AI adoption signals
- Confirm buying center + timeline
- If confirmed, schedule the Exposure Assessment kickoff

--- 
Generated by: scripts/generate_outreach_packets_from_tier1_v1.mjs
`;

  writeIfChanged(packetAbs, md);
  idxLines.push([
    String(row.rank),
    escCsv(row.operator),
    String(row.score),
    String(row.confidence),
    String(row.locations ?? ""),
    escCsv(row.priority),
    escCsv(packetRel)
  ].join(","));
}

// Write manifest index
writeIfChanged(path.join(OUT_DIR, "index.csv"), idxLines.join("\n") + "\n");

process.stdout.write("Outreach packets generated\n");
process.stdout.write("Targets: " + queue.length + "\n");
process.stdout.write("Outputs: out/reach/packs/index.csv + out/reach/packs/*.md\n");
