#!/usr/bin/env node
/**
 * Step 9A — Add deterministic triage seeder.
 * - Reads .ago/operator_selected.json
 * - Seeds docs/triage/TRG-<slug> with memo.md, risk-register.csv, evidence.json, recommendation.md
 * - Idempotent (writes only if content differs)
 * - MUST end with npm run build
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
if(!exists(SEL)) throw new Error("Missing .ago/operator_selected.json (run selection step first)");

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

// Resolve evidence sources if present (optional)
const reachMeta = path.join("out","reach","meta.json");
const reachEvidenceCsv = path.join("out","reach","evidence.csv");
const reachQueueJsonl = path.join("out","reach","queue.jsonl");

const evidence = {
  operator: { name: operator_name, slug: operator_slug, locations, confidence_score: confidence, priority, outreach_status },
  selected: { source: ".ago/operator_selected.json", ...op },
  inputs: {
    reach_meta_json: exists(reachMeta) ? reachMeta : null,
    reach_evidence_csv: exists(reachEvidenceCsv) ? reachEvidenceCsv : null,
    reach_queue_jsonl: exists(reachQueueJsonl) ? reachQueueJsonl : null
  },
  provenance: provenance ?? null,
  notes: [
    "Seeded by scripts/patch_add_triage_seed_v1.mjs",
    "Populate evidence items by attaching artifacts/links into this JSON under evidence.items[]"
  ],
  evidence: { items: [] }
};

const nowISO = new Date().toISOString();
const header = [
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
  "## Inputs (Authoritative)",
  "- `.ago/operator_selected.json` (selection control plane)",
  "- `out/reach/*` (Tier-1 intake outputs; do not hand-edit generated queue artifacts)",
  "",
  "## Scope (Phase 1)",
  "- Workforce AI usage",
  "- Vendor AI density and data flows (PMS/POS, HRIS, scheduling, payments/PCI adjacency)",
  "- Policy/control readiness (minimum viable governance baseline)",
  "",
  "## Working Assumptions",
  "- Treat missing evidence as risk (fail-closed).",
  "- Record every claim with evidence pointers (URLs, screenshots, docs) in `evidence.json`.",
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
  "",
  "## Near-Term (7–30 days)",
  "1. Map the compliance overlays that apply (PCI adjacency, privacy, labor/employment, any state-level AI rules if applicable).",
  "2. Deploy a lightweight governance framework: policy pack + evidence ledger + monitoring checklist.",
  "3. Produce a decision memo: proceed / pause / conditions to proceed.",
  "",
  "## Evidence Requirements",
  "- Every recommendation must cite one or more evidence items from `evidence.json`.",
  ""
].join("\n");

const riskCsv = [
  "risk_id,title,category,severity,likelihood,status,owner,evidence_refs,notes",
  "R-001,Unknown AI usage scope,Discovery,High,Medium,Open,CIAG,[],Inventory AI-enabled tools and workflows",
  "R-002,Vendor AI feature opacity,Third-Party,High,Medium,Open,CIAG,[],Request vendor disclosures + configurations",
  "R-003,Payment/PCI adjacency exposure,Compliance,High,Low,Open,CIAG,[],Confirm PCI scope + data flows",
  "R-004,Workforce AI in hiring/scheduling,Operational,High,Medium,Open,CIAG,[],Assess bias/impact + human approvals",
  ""
].join("\n");

writeIfChanged(path.join(DIR, "memo.md"), header);
writeIfChanged(path.join(DIR, "recommendation.md"), rec);
writeIfChanged(path.join(DIR, "risk-register.csv"), riskCsv);
writeIfChanged(path.join(DIR, "evidence.json"), JSON.stringify(evidence, null, 2) + "\n");

// Ensure package.json has a runner (optional but useful)
const pkgPath = path.join(ROOT, "package.json");
if (exists(pkgPath)) {
  try {
    const pkg = JSON.parse(read(pkgPath));
    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts["ciag:triage"]) {
      pkg.scripts["ciag:triage"] = "node scripts/seed_triage_from_selected_operator_v1.mjs";
    }
    writeIfChanged(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    // Do not mutate non-JSON package.json
  }
}

// Create the canonical generator file (called by ciag:triage)
const genPath = path.join("scripts","seed_triage_from_selected_operator_v1.mjs");
const genSrc = `#!/usr/bin/env node
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
const DIR = path.join(TRIAGE_ROOT, \`TRG-\${operator_slug}\`);
mkdirp(DIR);

const nowISO = new Date().toISOString();
const memo = [
  "# CIAG Governance Triage Memo",
  "",
  \`**Operator:** \${operator_name} (\${operator_slug})\`,
  locations != null ? \`**Locations:** \${locations}\` : null,
  confidence != null ? \`**Confidence Score:** \${confidence}\` : null,
  priority != null ? \`**Priority:** \${priority}\` : null,
  outreach_status != null ? \`**Outreach Status:** \${outreach_status}\` : null,
  "",
  "## Objective",
  "Run a governance-first triage to identify AI/automation exposure, compliance surface area, and the minimum viable control set for a pilot-safe deployment mode.",
  "",
  \`Seed timestamp: \${nowISO}\`,
  ""
].filter(Boolean).join("\\n");

const rec = [
  "# Recommendations (Draft v1)",
  "",
  "## Immediate (0–7 days)",
  "1. Confirm operator’s core systems: PMS/POS, HRIS/WFM, scheduling, payments processor(s).",
  "2. Identify any AI-enabled vendor features already active (forecasting, dynamic pricing, fraud tools, hiring/screening).",
  "3. Stand up a pilot governance perimeter: access control, logging, human-approval gating for high-impact actions.",
  ""
].join("\\n");

const riskCsv = [
  "risk_id,title,category,severity,likelihood,status,owner,evidence_refs,notes",
  "R-001,Unknown AI usage scope,Discovery,High,Medium,Open,CIAG,[],Inventory AI-enabled tools and workflows",
  ""
].join("\\n");

const evidence = {
  operator: { name: operator_name, slug: operator_slug, locations, confidence_score: confidence, priority, outreach_status },
  selected: { source: ".ago/operator_selected.json", ...op },
  provenance: provenance ?? null,
  evidence: { items: [] }
};

writeIfChanged(path.join(DIR,"memo.md"), memo);
writeIfChanged(path.join(DIR,"recommendation.md"), rec);
writeIfChanged(path.join(DIR,"risk-register.csv"), riskCsv);
writeIfChanged(path.join(DIR,"evidence.json"), JSON.stringify(evidence, null, 2) + "\\n");

run("npm run build");
`;
writeIfChanged(genPath, genSrc);
try { fs.chmodSync(genPath, 0o755); } catch {}

run("npm run build");
