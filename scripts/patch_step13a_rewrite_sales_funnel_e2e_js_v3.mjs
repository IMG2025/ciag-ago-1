#!/usr/bin/env node
/**
 * Step 13A FIX v3
 * Rewrite scripts/ciag_sales_funnel_e2e_v1.mjs as canonical pure-JS (no TS artifacts).
 * Idempotent. Syntax + build gated.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const FILE = path.join("scripts", "ciag_sales_funnel_e2e_v1.mjs");
if (!exists("package.json")) throw new Error("Missing package.json");
if (!exists(path.join("scripts", "ciag_sales_e2e_v1.mjs"))) {
  throw new Error("Missing scripts/ciag_sales_e2e_v1.mjs (Step 12D must exist).");
}

// Canonical pure-JS implementation (no TS annotations, no types, no interfaces).
const CANON = `#!/usr/bin/env node
/**
 * CIAG Sales Funnel E2E (v1)
 * Pure runtime JS. No TS artifacts allowed.
 *
 * Flow:
 * 1) Ingest tier1 sourcing fixture -> produce prequal + letter
 * 2) Select operator (optional override) -> run ciag:sales-e2e with intake fixture
 * Output: out/reach/<slug>/... + out/sales/<slug>/... + docs/triage/TRG-<slug>/...
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}
function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}

function parseArgs(argv) {
  const out = { tier1: null, slug: null, intake: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--tier1") out.tier1 = argv[++i] || null;
    else if (a === "--slug") out.slug = argv[++i] || null;
    else if (a === "--intake") out.intake = argv[++i] || null;
  }
  return out;
}

function normalizeSlug(s) {
  return String(s || "").trim().toLowerCase().replace(/\\s+/g, "-");
}

function renderLetter(lead) {
  const name = lead?.name || lead?.operator || lead?.company || "Operator";
  const locs = lead?.locations ?? lead?.locationCount ?? lead?.units ?? "N/A";
  return [
    "# CIAG Governance Triage — Pilot Invite",
    "",
    `Hi ${name},`,
    "",
    "We run a governance-first AI compliance triage for multi-location hospitality operators.",
    "If we align, we can execute a **governance-observed pilot** to validate AI usage visibility and control readiness.",
    "",
    `- Reported locations: **${locs}**`,
    "- Output artifacts: risk register, recommendation, pilot runbook",
    "",
    "If you’re open, reply with the attached intake questionnaire so we can generate your readiness artifacts.",
    "",
    "— CIAG",
    ""
  ].join("\\n");
}

function toPrequal(lead) {
  const slug = normalizeSlug(lead?.slug || lead?.operator_slug || lead?.operator || lead?.company || "");
  const locations = Number(lead?.locations ?? lead?.locationCount ?? lead?.units ?? 0) || null;
  const okBand = locations != null ? (locations >= 15 && locations <= 150) : null;
  return {
    slug: slug || null,
    name: lead?.name || lead?.operator || lead?.company || null,
    locations,
    prequal: {
      in_band_15_150: okBand,
      status: okBand === false ? "disqualified" : "candidate"
    }
  };
}

const { tier1, slug, intake } = parseArgs(process.argv);

if (!tier1) throw new Error("Missing --tier1 <file>");
if (!exists(tier1)) throw new Error("Tier1 file not found: " + tier1);

const tier = readJson(tier1);
const leads = Array.isArray(tier?.leads) ? tier.leads : Array.isArray(tier) ? tier : [];

if (!leads.length) throw new Error("No leads found in tier1 fixture.");

const chosen = slug
  ? leads.find(x => normalizeSlug(x?.slug || x?.operator_slug || x?.operator || x?.company || "") === normalizeSlug(slug))
  : leads[0];

if (!chosen) throw new Error("Slug not found in tier1: " + slug);

const prequal = toPrequal(chosen);
if (!prequal.slug) throw new Error("Chosen lead missing slug-ish identity.");

const OUT = path.join("out", "reach", prequal.slug);
writeJson(path.join(OUT, "prequal.json"), prequal);
writeText(path.join(OUT, "letter.md"), renderLetter(chosen));

console.log("Prequal + letter generated:", OUT);

// Sales E2E is downstream. Queueing is upstream; do not invoke queue here.
if (intake) {
  if (!exists(intake)) throw new Error("Intake file not found: " + intake);
  run(\`npm run ciag:sales-e2e -- --slug \${prequal.slug} --intake \${intake}\`);
}

run("npm run build");
console.log("Sales Funnel E2E complete. Artifacts:", OUT);
`;

writeIfChanged(FILE, CANON);
try { fs.chmodSync(FILE, 0o755); } catch {}

// Gates
run(`node --check "${FILE}"`);
run("npm run build");

console.log("Step 13A FIX v3 complete: sales funnel e2e rewritten as pure JS.");
