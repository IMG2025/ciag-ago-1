#!/usr/bin/env node
/**
 * Step 13A — Sales Funnel E2E simulator
 * - Adds fixtures/sourcing/tier1.sample.json
 * - Adds scripts/ciag_sales_funnel_e2e_v1.mjs
 * - Wires npm script: ciag:sales-funnel-e2e
 * - Writes out/reach/<slug>/prequal.json + letter.md
 * - Optionally runs: npm run ciag:sales-e2e -- --slug <slug> --intake <file>
 *
 * Idempotent. Gates: node --check + npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function readJson(p) { return JSON.parse(read(p)); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function writeJsonIfChanged(p, obj) {
  const next = JSON.stringify(obj, null, 2) + "\n";
  writeIfChanged(p, next);
}
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

// ---- 1) package.json: add script
const PKG = "package.json";
if (!exists(PKG)) throw new Error("Missing package.json");
const pkg = readJson(PKG);
pkg.scripts ||= {};
pkg.scripts["ciag:sales-funnel-e2e"] ||= "node scripts/ciag_sales_funnel_e2e_v1.mjs";
writeIfChanged(PKG, JSON.stringify(pkg, null, 2) + "\n");

// ---- 2) fixture: fixtures/sourcing/tier1.sample.json
ensureDir(path.join("fixtures", "sourcing"));
const tier1Sample = {
  generatedAt: new Date().toISOString(),
  source: "tier1.sample",
  leads: [
    {
      operator_slug: "cole-hospitality",
      operator_name: "Cole Hospitality",
      locations: 70,
      score: 84,
      confidence: 9,
      priority: "Immediate",
      notes: "Sample Tier-1 lead for deterministic funnel simulation"
    }
  ]
};
writeJsonIfChanged(path.join("fixtures", "sourcing", "tier1.sample.json"), tier1Sample);

// ---- 3) add scripts/ciag_sales_funnel_e2e_v1.mjs
const FUNNEL = `#!/usr/bin/env node
/**
 * CIAG Sales Funnel E2E v1 (deterministic)
 *
 * Inputs:
 *  --tier1 <path>    JSON file with shape: { leads: [...] } or an array of leads
 *  --slug <slug>     Optional: force a specific operator_slug
 *  --intake <path>   Optional: intake response JSON fixture; triggers ciag:sales-e2e downstream
 *
 * Outputs:
 *  out/reach/<slug>/prequal.json
 *  out/reach/<slug>/letter.md
 *  (optional) out/sales/<slug>/... + docs/triage/TRG-<slug>/... via ciag:sales-e2e
 *
 * Guardrails:
 *  - No network calls
 *  - No "sending" email; generates send-ready artifact only
 *  - Build-gated
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd: string) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd: string) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p: string) { return fs.existsSync(p); }
function read(p: string) { return fs.readFileSync(p, "utf8"); }
function mkdirp(p: string) { fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p: string, next: string) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function writeJson(p: string, obj: unknown) {
  writeIfChanged(p, JSON.stringify(obj, null, 2) + "\\n");
}
function iso() { return new Date().toISOString(); }

type Lead = {
  operator_slug: string;
  operator_name?: string;
  locations?: number;
  score?: number;
  confidence?: number;
  priority?: string;
  notes?: string;
};

function parseArgs(argv: string[]) {
  const out: { tier1?: string; slug?: string; intake?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tier1") out.tier1 = String(argv[++i] || "");
    else if (a === "--slug") out.slug = String(argv[++i] || "");
    else if (a === "--intake") out.intake = String(argv[++i] || "");
  }
  return out;
}

function loadLeads(p: string): Lead[] {
  const raw = JSON.parse(read(p));
  if (Array.isArray(raw)) return raw as Lead[];
  if (raw && Array.isArray(raw.leads)) return raw.leads as Lead[];
  throw new Error("Tier1 file must be an array or { leads: [...] }");
}

function pickLead(leads: Lead[], forcedSlug?: string): Lead {
  if (forcedSlug) {
    const hit = leads.find(l => l.operator_slug === forcedSlug);
    if (hit) return hit;
    throw new Error("Requested --slug not found in tier1 leads: " + forcedSlug);
  }
  // deterministic ranking: score desc, confidence desc, locations desc, slug asc
  const norm = (n?: number) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  const sorted = [...leads].sort((a,b) => {
    const ds = norm(b.score) - norm(a.score);
    if (ds) return ds;
    const dc = norm(b.confidence) - norm(a.confidence);
    if (dc) return dc;
    const dl = norm(b.locations) - norm(a.locations);
    if (dl) return dl;
    return String(a.operator_slug).localeCompare(String(b.operator_slug));
  });
  if (!sorted.length) throw new Error("No leads present in tier1 input");
  return sorted[0];
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const args = parseArgs(process.argv.slice(2));
const tier1Path = args.tier1 || "fixtures/sourcing/tier1.sample.json";
if (!exists(tier1Path)) throw new Error("Tier1 input not found: " + tier1Path);

const leads = loadLeads(tier1Path);
const lead = pickLead(leads, args.slug);

const slug = lead.operator_slug;
const name = lead.operator_name || slug;
const loc = lead.locations ?? null;

const reachDir = path.join(ROOT, "out", "reach", slug);
mkdirp(reachDir);

const prequal = {
  generatedAt: iso(),
  sourceTier1: tier1Path,
  operator_slug: slug,
  operator_name: name,
  locations: loc,
  score: lead.score ?? null,
  confidence: lead.confidence ?? null,
  priority: lead.priority ?? "Immediate",
  decision: {
    prequalified: true,
    qualified: true,
    reasons: [
      "tier1_input_present",
      "operator_selected_deterministically",
      "simulation_mode_no_network"
    ]
  },
  notes: lead.notes ?? null
};

writeJson(path.join(reachDir, "prequal.json"), prequal);

const letter = [
  "# CIAG Outreach Letter (Sales Funnel Simulation)",
  "",
  \`**Operator:** \${name} (\${slug})\`,
  loc ? \`**Locations:** \${loc}\` : "",
  \`**Generated At:** \${iso()}\`,
  "",
  "## Why we are reaching out",
  "We run a governance-first AI exposure and compliance triage to determine pilot readiness and the minimum viable control set for AI-enabled vendor systems.",
  "",
  "## What we need to proceed (intake)",
  "- Confirm core systems: PMS, POS, Payments, HRIS, WFM, Scheduling",
  "- Inventory AI-enabled features + workflows (including shadow AI)",
  "- Map data classes processed (PII / workforce / PCI adjacency)",
  "",
  "## Next step",
  "Complete the CIAG Intake Pack and return the intake response JSON for deterministic processing.",
  ""
].filter(Boolean).join("\\n");

writeIfChanged(path.join(reachDir, "letter.md"), letter + "\\n");

// Optional downstream: full sales-e2e (triage + closure + outputs)
if (args.intake) {
  if (!exists(args.intake)) throw new Error("Intake fixture not found: " + args.intake);
  run(\`npm run ciag:sales-e2e -- --slug \${slug} --intake \${args.intake}\`);
}

console.log("Sales Funnel E2E complete.");
console.log("Reach artifacts:", reachDir);

run("npm run build");
`;
const FUNNEL_PATH = path.join("scripts", "ciag_sales_funnel_e2e_v1.mjs");
writeIfChanged(FUNNEL_PATH, FUNNEL);
chmod755(FUNNEL_PATH);

// Gates
run(`node --check "${FUNNEL_PATH}"`);
run("npm run build");

console.log("Step 13A complete: ciag:sales-funnel-e2e added.");
