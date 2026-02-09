#!/usr/bin/env node
/**
 * Step 13A FIX v4
 * Rewrite sales funnel E2E as pure JS with NO template literals inside generated code.
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

const CANON =
`#!/usr/bin/env node
/**
 * CIAG Sales Funnel E2E (v1)
 * Pure runtime JS. No TS. No template literals.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeText(p, s) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, s);
}
function writeJson(p, o) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(o, null, 2));
}

function parseArgs(argv) {
  const out = { tier1: null, slug: null, intake: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--tier1") out.tier1 = argv[++i];
    else if (argv[i] === "--slug") out.slug = argv[++i];
    else if (argv[i] === "--intake") out.intake = argv[++i];
  }
  return out;
}

function normalizeSlug(s) {
  return String(s || "").toLowerCase().trim().replace(/\\s+/g, "-");
}

function renderLetter(lead) {
  const name = lead.name || lead.operator || lead.company || "Operator";
  const locs = lead.locations || lead.locationCount || lead.units || "N/A";
  return [
    "# CIAG Governance Triage — Pilot Invite",
    "",
    "Hi " + name + ",",
    "",
    "We run a governance-first AI compliance triage for multi-location hospitality operators.",
    "",
    "Reported locations: " + locs,
    "",
    "— CIAG"
  ].join("\\n");
}

const args = parseArgs(process.argv);
if (!args.tier1) throw new Error("Missing --tier1");

const tier = readJson(args.tier1);
const leads = Array.isArray(tier.leads) ? tier.leads : tier;
if (!leads.length) throw new Error("No leads in tier1");

const chosen = args.slug
  ? leads.find(l => normalizeSlug(l.slug || l.operator || l.company) === normalizeSlug(args.slug))
  : leads[0];

if (!chosen) throw new Error("Operator not found");

const slug = normalizeSlug(chosen.slug || chosen.operator || chosen.company);
const OUT = path.join("out", "reach", slug);

writeJson(path.join(OUT, "prequal.json"), chosen);
writeText(path.join(OUT, "letter.md"), renderLetter(chosen));

console.log("Sales Funnel prequal complete:", OUT);

if (args.intake) {
  run("npm run ciag:sales-e2e -- --slug " + slug + " --intake " + args.intake);
}

run("npm run build");
console.log("Sales Funnel E2E complete:", OUT);
`;

writeIfChanged(FILE, CANON);
try { fs.chmodSync(FILE, 0o755); } catch {}

run(`node --check "${FILE}"`);
run("npm run build");

console.log("Step 13A FIX v4 complete: sales funnel E2E rewritten safely.");
