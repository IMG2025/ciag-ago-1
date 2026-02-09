#!/usr/bin/env node
/**
 * CIAG Sales E2E — deterministic simulation runner
 *
 * Produces artifacts under: out/sales/<slug>/
 *
 * Steps:
 *  1) Source: 
 *  2) Select: node scripts/select_first_operator_from_queue_v1.mjs
 *  3) Record pipeline state + generate outreach artifact (local file only)
 *  4) Generate triage scaffold: node scripts/generate_triage_scaffold_v1.mjs
 *  5) Optional: apply intake fixture via npm run ciag:closure -- <fixture>
 *     If no intake fixture provided, we still produce triage outputs from current state.
 *
 * Usage:
 *  npm run ciag:sales-e2e -- --slug cole-hospitality --intake fixtures/intake/cole-hospitality.intake-response.json
 *  npm run ciag:sales-e2e -- --slug cole-hospitality
 *
 * Notes:
 *  - This does NOT send email; it renders a send-ready letter artifact.
 *  - All operations are local + deterministic.
 
 * Guardrail: Sales E2E must not invoke queue. Queueing is upstream.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n"); }
function iso() { return new Date().toISOString(); }

function parseArgs(argv) {
  const out = { slug: "", intake: "", operatorOverride: "" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--slug") out.slug = String(argv[++i] || "");
    else if (a === "--intake") out.intake = String(argv[++i] || "");
    else if (a === "--operator-override") out.operatorOverride = String(argv[++i] || "");
  }
  return out;
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const args = parseArgs(process.argv.slice(2));

const AGO_DIR = path.join(ROOT, ".ago");
const SEL = path.join(AGO_DIR, "operator_selected.json");

// Optional operator override for deterministic selection
// If provided, write to data/operator_override.json (used by your queue/selection flow).
if (args.operatorOverride) {
  const dst = path.join(ROOT, "data", "operator_override.json");
  mkdirp(path.dirname(dst));
  writeIfChanged(dst, read(args.operatorOverride));
}

// 1) Source queue
// 2) Select operator (writes .ago/operator_selected.json in your canonical setup)
run("node scripts/select_first_operator_from_queue_v1.mjs");

if (!exists(SEL)) {
  throw new Error("Missing .ago/operator_selected.json after selection. Aborting sales-e2e.");
}

const selected = JSON.parse(read(SEL));
const slug = args.slug || selected.operator_slug || selected.slug;
if (!slug) throw new Error("Could not determine slug (provide --slug or ensure operator_selected.json has operator_slug).");

const SALES_DIR = path.join(ROOT, "out", "sales", slug);
mkdirp(SALES_DIR);

// 00_source.json (deterministic provenance)
writeJson(path.join(SALES_DIR, "00_source.json"), {
  generatedAt: iso(),
  slug,
  source: "ciag_sales_e2e_v1",
  operatorSelected: selected
});

// 02_pipeline_state.json (minimal, deterministic)
writeJson(path.join(SALES_DIR, "02_pipeline_state.json"), {
  generatedAt: iso(),
  slug,
  status: "prequalified",
  confidence_score: selected.confidence_score ?? selected.confidenceScore ?? null,
  priority: selected.priority ?? null,
  outreach_status: selected.outreach_status ?? selected.outreachStatus ?? null
});

// 01_outreach_letter.md (local artifact only; no sending)
const operatorName = selected.operator_name || selected.operatorName || slug;
const locations = selected.locations ?? "";
const letter = [
  "# CIAG Outreach Letter (Simulation)",
  "",
  `**Operator:** ${operatorName} (${slug})`,
  locations ? `**Locations:** ${locations}` : "",
  `**Generated At:** ${iso()}`,
  "",
  "## Purpose",
  "We are running a governance-first AI exposure and compliance triage to determine pilot readiness and the minimum viable control set for AI-enabled vendor systems.",
  "",
  "## What we need from the operator (pilot-safe, non-production)",
  "- Confirmation of core systems (PMS, POS, Payments, HRIS, WFM, Scheduling)",
  "- Inventory of AI-enabled features and workflows in use (including shadow AI)",
  "- PCI adjacency assumptions and scope confirmation (if applicable)",
  "",
  "## Next step",
  "Complete the CIAG Intake Pack and return the intake response JSON for deterministic processing.",
  ""
].filter(Boolean).join("\n");

writeIfChanged(path.join(SALES_DIR, "01_outreach_letter.md"), letter + "\n");

// 3) Generate triage scaffold (reads .ago/operator_selected.json)
run("node scripts/generate_triage_scaffold_v1.mjs");

// 4) If intake fixture provided, run closure loop (this regenerates triage outputs authoritatively)
if (args.intake) {
  if (!exists(args.intake)) throw new Error(`Intake fixture not found: ${args.intake}`);
  run(`npm run ciag:closure -- ${args.intake}`);
}

console.log("Sales E2E complete. Artifacts:", SALES_DIR);

// Required gate
run("npm run build");
