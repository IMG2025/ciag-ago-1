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
function chmod755(p){ try{ fs.chmodSync(p,0o755);}catch{} }

const ROOT = execSync("git rev-parse --show-toplevel",{encoding:"utf8"}).trim();
process.chdir(ROOT);

const PKG = "package.json";
if(!exists(PKG)) throw new Error("Missing package.json");
const pkg = JSON.parse(read(PKG));

pkg.scripts = pkg.scripts || {};
pkg.scripts["ciag:intake:template"] = "node scripts/generate_pilot_intake_response_template_v1.mjs";
pkg.scripts["ciag:intake:apply"]    = "node scripts/apply_intake_response_to_evidence_v1.mjs";
pkg.scripts["ciag:closure"]         = "node scripts/ciag_closure_loop_from_intake_v1.mjs";
writeIfChanged(PKG, JSON.stringify(pkg,null,2) + "\n");

// --- Script: generate intake response template (per selected operator) ---
const tpl = `#!/usr/bin/env node
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

const OUT = path.join("fixtures","intake",\`\${slug}.intake-response.json\`);

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

writeIfChanged(OUT, JSON.stringify(doc,null,2) + "\\n");
console.log("Intake response template ready:", OUT);
`;
writeIfChanged("scripts/generate_pilot_intake_response_template_v1.mjs", tpl);

// --- Script: apply intake response to evidence.json (idempotent merge) ---
const apply = `#!/usr/bin/env node
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

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)) throw new Error("Missing selected operator at .ago/operator_selected.json");
const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if(!slug) throw new Error("Selected operator missing operator_slug");

const intakePath = process.argv[2] || path.join("fixtures","intake",\`\${slug}.intake-response.json\`);
if(!exists(intakePath)) throw new Error("Missing intake response: " + intakePath);
const intake = JSON.parse(read(intakePath));

const EVID = path.join("docs","triage",\`TRG-\${slug}\`,"evidence.json");
if(!exists(EVID)) throw new Error("Missing evidence.json (run triage scaffold first): " + EVID);
const evidence = JSON.parse(read(EVID));
evidence.items = evidence.items || [];

function now(){ return new Date().toISOString(); }

// Update evidence items by systemType
function updateSystem(systemType, patch){
  const items = evidence.items.filter(x => x.systemType === systemType);
  if(items.length === 0) return 0;
  let n = 0;
  for(const it of items){
    if(patch.vendor !== undefined && patch.vendor !== null) it.vendor = patch.vendor;
    if(patch.product !== undefined && patch.product !== null) it.product = patch.product;
    if(patch.evidenceUrl !== undefined && patch.evidenceUrl !== null){
      it.source = it.source || {};
      it.source.url = patch.evidenceUrl;
    }
    if(patch.notes !== undefined && patch.notes !== null) it.notes = patch.notes;
    if(patch.confidence !== undefined && patch.confidence !== null) it.confidence = Number(patch.confidence);
    // If we have *any* concrete intake for this system, status becomes observed
    it.status = "observed";
    it.source = it.source || {};
    it.source.capturedAt = now();
    n++;
  }
  return n;
}

// Apply systems
const s = intake.systems || {};
let touched = 0;
if(s.PMS) touched += updateSystem("PMS", s.PMS);
if(s.POS) touched += updateSystem("POS", s.POS);
if(s.HRIS) touched += updateSystem("HRIS", s.HRIS);
if(s.WFM) touched += updateSystem("WFM", s.WFM);
if(s.Scheduling) touched += updateSystem("Scheduling", s.Scheduling);
if(s.Payments) touched += updateSystem("Payments", s.Payments);
if(s.Other) touched += updateSystem("Other", s.Other);

// Special: AI inventory blocker R-001 evidence item is stored under systemType HRIS in our current schema for PII,
// but R-001 lives in risk register. We capture closure intent in evidence meta.
evidence.meta = evidence.meta || {};
evidence.meta.intakeAppliedAt = now();
evidence.meta.intakeSource = intakePath;
evidence.meta.aiInventory = intake.aiInventory || null;

writeIfChanged(EVID, JSON.stringify(evidence,null,2) + "\\n");
console.log("Intake applied to evidence:", { slug, evidence: EVID, items_touched: touched });

// Required gate
run("npm run build");
`;
writeIfChanged("scripts/apply_intake_response_to_evidence_v1.mjs", apply);

// --- Script: closure loop orchestrator (intake→evidence→risk→policy→recommendation→runbook) ---
const loop = `#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }

const ROOT = execSync("git rev-parse --show-toplevel",{encoding:"utf8"}).trim();
process.chdir(ROOT);

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)) throw new Error("Missing selected operator at .ago/operator_selected.json");
const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if(!slug) throw new Error("Selected operator missing operator_slug");

const intakePath = process.argv[2] || path.join("fixtures","intake",\`\${slug}.intake-response.json\`);

run(\`node scripts/apply_intake_response_to_evidence_v1.mjs "\${intakePath}"\`);
run("node scripts/derive_risk_register_from_evidence_v1.mjs");
run("node scripts/apply_policy_to_risk_register_v1.mjs");
run("node scripts/generate_recommendation_from_risk_register_v1.mjs");
run("node scripts/generate_pilot_runbook_from_recommendation_v1.mjs");

// Required gate
run("npm run build");
`;
writeIfChanged("scripts/ciag_closure_loop_from_intake_v1.mjs", loop);

chmod755("scripts/generate_pilot_intake_response_template_v1.mjs");
chmod755("scripts/apply_intake_response_to_evidence_v1.mjs");
chmod755("scripts/ciag_closure_loop_from_intake_v1.mjs");

// Required gate
run("npm run build");
