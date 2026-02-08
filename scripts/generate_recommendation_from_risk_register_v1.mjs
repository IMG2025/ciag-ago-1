#!/usr/bin/env node
/**
 * Step 10E — Generate recommendation.md from policy-applied risk register
 * Inputs (authoritative):
 *  - .ago/operator_selected.json
 *  - docs/triage/TRG-<slug>/risk-register.csv
 *  - docs/triage/TRG-<slug>/evidence.json
 * Output:
 *  - docs/triage/TRG-<slug>/recommendation.md (deterministic)
 *
 * Idempotent: write only if content changes.
 */
import fs from "node:fs";
import path from "node:path";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p, next){
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

function readJson(p){
  return JSON.parse(read(p));
}

// Minimal CSV parser (handles commas inside double quotes)
function parseCsv(text){
  const lines = text.replace(/\r\n/g,"\n").replace(/\r/g,"\n").split("\n").filter(l => l.trim().length);
  if (!lines.length) return { header: [], rows: [] };
  const header = splitCsvLine(lines[0]).map(s => s.trim());
  const rows = lines.slice(1).map(l => {
    const cols = splitCsvLine(l);
    const obj = {};
    for (let i=0;i<header.length;i++){
      obj[header[i]] = (cols[i] ?? "").trim();
    }
    return obj;
  });
  return { header, rows };
}

function splitCsvLine(line){
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i=0;i<line.length;i++){
    const ch = line[i];
    if (ch === '"'){
      if (inQ && line[i+1] === '"'){ // escaped quote
        cur += '"'; i++;
      } else {
        inQ = !inQ;
      }
    } else if (ch === "," && !inQ){
      out.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function norm(s){ return String(s ?? "").trim(); }
function lower(s){ return norm(s).toLowerCase(); }

function severityRank(s){
  const v = lower(s);
  if (v === "critical") return 0;
  if (v === "high") return 1;
  if (v === "medium") return 2;
  if (v === "low") return 3;
  return 9;
}

function statusIsMitigated(s){
  return lower(s) === "mitigated";
}

const ROOT = process.cwd();
const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing .ago/operator_selected.json");

const op = readJson(SEL);
const slug = norm(op.operator_slug || op.slug);
if (!slug) throw new Error("Invalid operator_selected.json: missing operator_slug/slug");

const TRIAGE_DIR = path.join(ROOT, "docs", "triage", `TRG-${slug}`);
const RISK = path.join(TRIAGE_DIR, "risk-register.csv");
const EVID = path.join(TRIAGE_DIR, "evidence.json");
const OUT = path.join(TRIAGE_DIR, "recommendation.md");

if (!exists(TRIAGE_DIR)) throw new Error("Missing triage dir: " + TRIAGE_DIR);
if (!exists(RISK)) throw new Error("Missing: " + RISK);
if (!exists(EVID)) throw new Error("Missing: " + EVID);

const { rows } = parseCsv(read(RISK));
const evidence = readJson(EVID);

const operatorName = norm(op.operator_name || "Unknown Operator");
const locations = norm(op.locations || "");
const priority = norm(op.priority || "");
const confidence = norm(op.confidence_score || "");
const outreach = norm(op.outreach_status || "");

const allRisks = rows.slice();
const mitigated = allRisks.filter(r => statusIsMitigated(r.status));
const openRisks = allRisks.filter(r => !statusIsMitigated(r.status));

// Systems cleared = system_types where every row is mitigated
const bySystem = new Map();
for (const r of allRisks){
  const sys = norm(r.system_type || "Unknown");
  if (!bySystem.has(sys)) bySystem.set(sys, []);
  bySystem.get(sys).push(r);
}

const systems = Array.from(bySystem.keys()).sort((a,b)=>a.localeCompare(b));
const clearedSystems = systems.filter(sys => bySystem.get(sys).every(r => statusIsMitigated(r.status)));
const openSystems = systems.filter(sys => !clearedSystems.includes(sys));

// Blockers heuristic: any non-mitigated High/Critical severity OR any PCI category not mitigated
const blockers = openRisks.filter(r => {
  const sev = severityRank(r.severity);
  const cat = lower(r.category);
  return sev <= 1 || cat.includes("pci");
});

// Evidence lookup by systemType
const evidenceItems = Array.isArray(evidence?.items) ? evidence.items : [];
function evidenceForSystem(sys){
  const want = lower(sys);
  return evidenceItems
    .filter(it => lower(it?.systemType) === want)
    .sort((a,b)=> String(a.id).localeCompare(String(b.id)));
}

function formatRiskLine(r){
  const id = norm(r.risk_id);
  const title = norm(r.title);
  const sev = norm(r.severity);
  const lik = norm(r.likelihood);
  const status = norm(r.status);
  const notes = norm(r.notes);
  const ev = norm(r.evidence_refs);
  const tag = [
    id ? `**${id}**` : "**(no id)**",
    title ? title : "(no title)",
    `sev=${sev||"?"}`,
    `lik=${lik||"?"}`,
    `status=${status||"?"}`,
    ev ? `evidence=${ev}` : ""
  ].filter(Boolean).join(" — ");
  return notes ? `${tag}\n  - Notes: ${notes}` : tag;
}

function nextActionsForSystem(sys){
  const items = evidenceForSystem(sys);
  const missingItems = items.filter(it => lower(it?.status) !== "observed");
  const lines = [];
  lines.push(`- **${sys}**: confirm vendor/product, AI-enabled features, and governance surface.`);
  if (missingItems.length){
    lines.push(`  - Evidence gaps (${missingItems.length}):`);
    for (const it of missingItems.slice(0, 6)){
      const claim = norm(it?.claim || "");
      lines.push(`    - ${it.id}: ${claim || "(no claim)"}`);
    }
    if (missingItems.length > 6) lines.push(`    - (+${missingItems.length - 6} more)`);
  } else {
    lines.push(`  - Evidence: no open gaps recorded for this system type.`);
  }
  return lines.join("\n");
}

const now = new Date().toISOString();

const md = [
  "# CIAG Governance Triage Recommendation",
  "",
  `**Operator:** ${operatorName} (${slug})`,
  locations ? `**Locations:** ${locations}` : "",
  confidence ? `**Confidence Score:** ${confidence}` : "",
  priority ? `**Priority:** ${priority}` : "",
  outreach ? `**Outreach Status:** ${outreach}` : "",
  `**Generated At:** ${now}`,
  "",
  "## Executive Summary",
  "",
  `We ran a governance-first triage for **${operatorName}** to determine pilot readiness and the minimum viable control set.`,
  "",
  `- **Total risks:** ${allRisks.length}`,
  `- **Mitigated:** ${mitigated.length}`,
  `- **Open:** ${openRisks.length}`,
  `- **Blocking candidates:** ${blockers.length}`,
  "",
  "## Systems cleared by evidence",
  "",
  clearedSystems.length
    ? clearedSystems.map(s => `- ${s}`).join("\n")
    : "- None",
  "",
  "## Outstanding risk areas (open)",
  "",
  openSystems.length
    ? openSystems.map(sys => {
        const sysRisks = bySystem.get(sys).filter(r => !statusIsMitigated(r.status));
        sysRisks.sort((a,b)=>{
          const d = severityRank(a.severity) - severityRank(b.severity);
          if (d !== 0) return d;
          return String(a.risk_id).localeCompare(String(b.risk_id));
        });
        return [
          `### ${sys}`,
          "",
          sysRisks.length ? sysRisks.map(formatRiskLine).join("\n") : "_No open risks recorded._",
          ""
        ].join("\n");
      }).join("\n")
    : "_No open risk areas._",
  "",
  "## Immediate next actions (30–60 days)",
  "",
  openSystems.length
    ? openSystems.map(nextActionsForSystem).join("\n\n")
    : "- No actions required.",
  "",
  "## Pilot readiness verdict",
  "",
  blockers.length
    ? "**Pilot-Safe with Conditions** — proceed only after closing blocking risks and confirming remaining system evidence gaps."
    : "**Pilot-Safe with Conditions** — proceed with monitoring and evidence capture plan.",
  "",
  blockers.length
    ? [
        "### Blocking risks (must address)",
        "",
        blockers
          .slice()
          .sort((a,b)=>{
            const d = severityRank(a.severity) - severityRank(b.severity);
            if (d !== 0) return d;
            return String(a.risk_id).localeCompare(String(b.risk_id));
          })
          .map(r => "- " + formatRiskLine(r).replace(/\n/g,"\n  "))
          .join("\n"),
        ""
      ].join("\n")
    : "",
].filter(Boolean).join("\n");

writeIfChanged(OUT, md + "\n");
console.log("Recommendation generated:", OUT);
console.log("Summary:", {
  total_risks: allRisks.length,
  mitigated: mitigated.length,
  open: openRisks.length,
  cleared_systems: clearedSystems.length,
  open_systems: openSystems.length,
  blockers: blockers.length
});
