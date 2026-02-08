#!/usr/bin/env node
/**
 * Seed triage pack for selected operator.
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function exists(p){ return fs.existsSync(p); }
function mkdirp(p){ fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p, next){
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)) throw new Error("Missing .ago/operator_selected.json");

const op = JSON.parse(read(SEL));
const operator_name = op.operator_name ?? op.name ?? "UNKNOWN_OPERATOR";
const operator_slug = (op.operator_slug ?? op.slug ?? op.operator ?? "unknown-operator").toString().toLowerCase();
const locations = op.locations ?? null;
const confidence = op.confidence_score ?? null;
const priority = op.priority ?? null;
const outreach_status = op.outreach_status ?? null;
const provenance = op.provenance ?? null;

const TRIAGE_ROOT = path.join("docs","triage");
const DIR = path.join(TRIAGE_ROOT, `TRG-${operator_slug}`);
mkdirp(DIR);

const nowISO = new Date().toISOString();
const memo = [
  "# CIAG Governance Triage Memo",
  "",
  `**Operator:** ${operator_name} (${operator_slug})`,
  locations != null ? `**Locations:** ${locations}` : null,
  confidence != null ? `**Confidence Score:** ${confidence}` : null,
  priority != null ? `**Priority:** ${priority}` : null,
  outreach_status != null ? `**Outreach Status:** ${outreach_status}` : null,
  "",
  "## Objective",
  "Run a governance-first triage to identify AI/automation exposure, compliance surface area, and the minimum viable control set for a pilot-safe deployment mode.",
  "",
  `Seed timestamp: ${nowISO}`,
  ""
].filter(Boolean).join("\n");

const rec = [
  "# Recommendations (Draft v1)",
  "",
  "## Immediate (0–7 days)",
  "1. Confirm operator’s core systems: PMS/POS, HRIS/WFM, scheduling, payments processor(s).",
  "2. Identify any AI-enabled vendor features already active (forecasting, dynamic pricing, fraud tools, hiring/screening).",
  "3. Stand up a pilot governance perimeter: access control, logging, human-approval gating for high-impact actions.",
  ""
].join("\n");

const riskCsv = [
  "risk_id,title,category,severity,likelihood,status,owner,evidence_refs,notes",
  "R-001,Unknown AI usage scope,Discovery,High,Medium,Open,CIAG,[],Inventory AI-enabled tools and workflows",
  ""
].join("\n");

const evidence = {
  operator: { name: operator_name, slug: operator_slug, locations, confidence_score: confidence, priority, outreach_status },
  selected: { source: ".ago/operator_selected.json", ...op },
  provenance: provenance ?? null,
  evidence: { items: [] }
};

writeIfChanged(path.join(DIR,"memo.md"), memo);
writeIfChanged(path.join(DIR,"recommendation.md"), rec);
writeIfChanged(path.join(DIR,"risk-register.csv"), riskCsv);
writeIfChanged(path.join(DIR,"evidence.json"), JSON.stringify(evidence, null, 2) + "\n");

run("npm run build");
