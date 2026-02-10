#!/usr/bin/env node
/**
 * CIAG Sales Funnel E2E (v1)
 * Pure runtime JS. No TS. No template literals.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function resolveLocationsFromPrequal(slug) {
  const pq = path.join("out", "reach", slug, "prequal.json");
  if (!fs.existsSync(pq)) return null;
  try {
    const j = JSON.parse(fs.readFileSync(pq, "utf8"));
    const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function patchPilotRunbookLocations(slug) {
  const loc = resolveLocationsFromPrequal(slug);
  if (!Number.isFinite(loc)) return { patched: false, reason: "locations_unavailable" };

  const rb = path.join("docs", "triage", "TRG-" + slug, "pilot-runbook.md");
  if (!fs.existsSync(rb)) return { patched: false, reason: "runbook_missing" };

  let md = fs.readFileSync(rb, "utf8");
  if (!md.includes("**Locations:** null")) return { patched: false, reason: "already_set" };

  md = md.replace("**Locations:** null", "**Locations:** " + String(loc));
  fs.writeFileSync(rb, md);
  return { patched: true, locations: loc };
}


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
  return String(s || "").toLowerCase().trim().replace(/\s+/g, "-");
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
  ].join("\n");
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

const tier1Path = args?.tier1 ?? args?.["--tier1"] ?? null;
const intakePath = args?.intake ?? args?.["--intake"] ?? null;

const slug = normalizeSlug(chosen.slug || chosen.operator || chosen.company);
const OUT = path.join("out", "reach", slug);

writeJson(path.join(OUT, "prequal.json"), chosen);
writeText(path.join(OUT, "letter.md"), renderLetter(chosen));

console.log("Sales Funnel prequal complete:", OUT);

if (args.intake) {
  run("npm run ciag:sales-e2e -- --slug " + slug + " --intake " + args.intake);
}

run("npm run build");

// Step 13B: write audit manifest (non-destructive, deterministic)
try {
  const args = [];
  args.push("--slug", slug);
  if (tier1Path) args.push("--tier1", tier1Path);
  if (intakePath) args.push("--intake", intakePath);
  run(`node scripts/generate_run_manifest_v1.mjs ${args.map(x=>String(x)).join(" ")}`);
} catch (e) {
  // Manifest is audit support; do not fail the pipeline on manifest write.
  console.warn("WARN: manifest write failed:", e?.message ?? e);
}

console.log("Sales Funnel E2E complete:", OUT);
