#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\n");
}
function exists(p) { return fs.existsSync(p); }

const ROOT = process.cwd();
const FIX = process.argv[2];
if (!FIX) throw new Error("Usage: node scripts/ciag_e2e_from_fixture_v1.mjs <fixture.json>");

const fixturePath = path.isAbsolute(FIX) ? FIX : path.join(ROOT, FIX);
if (!exists(fixturePath)) throw new Error("Fixture not found: " + fixturePath);

const fx = readJson(fixturePath);
if (!fx.operator?.operator_slug) throw new Error("Fixture missing operator.operator_slug");

const AGO_DIR = path.join(ROOT, ".ago");
const SEL = path.join(AGO_DIR, "operator_selected.json");

const selected = {
  rank: 1,
  operator_name: fx.operator.operator_name,
  operator_slug: fx.operator.operator_slug,
  locations: fx.operator.locations ?? 0,
  composite_score: null,
  confidence_score: fx.operator.confidence_score ?? 0,
  priority: fx.operator.priority ?? "Normal",
  outreach_status: fx.operator.outreach_status ?? "simulation-pin",
  provenance: { source: "fixture", path: path.relative(ROOT, fixturePath) }
};

writeJson(SEL, selected);

// 1) Generate triage scaffold
run("node scripts/generate_triage_scaffold_v1.mjs");

// 2) Seed evidence schema (Step 10A script exists in repo now)
run("node scripts/seed_evidence_for_selected_operator_v1.mjs");

// 3) Update evidence: PMS + Payments if provided
const slug = fx.operator.operator_slug;
const EVID = path.join(ROOT, "docs", "triage", `TRG-${slug}`, "evidence.json");
if (!exists(EVID)) throw new Error("Missing evidence.json after seeding: " + EVID);

const evid = readJson(EVID);
const bySystem = new Map();
for (const item of evid.items || []) {
  if (!bySystem.has(item.systemType)) bySystem.set(item.systemType, []);
  bySystem.get(item.systemType).push(item);
}

function updateFirst(systemType, note, conf = 8) {
  const items = bySystem.get(systemType) || [];
  if (!items.length) return;
  const id = items[0].id;
  // status=observed, conf, note
  run(`node scripts/patch_step10b_update_evidence_item_v1.mjs ${id} observed ${conf} ${JSON.stringify(note)}`);
}

const pms = fx.systems?.PMS;
if (pms?.vendor) {
  updateFirst("PMS", `Confirmed PMS via pilot simulation (${pms.vendor}${pms.product ? " - " + pms.product : ""})`, 7);
}

const pay = fx.systems?.Payments;
if (pay?.vendor) {
  // choose the *payment processor not yet evidenced* item (we can’t guarantee ordering),
  // so we just mark first Payments item as observed with vendor note.
  updateFirst("Payments", `Confirmed payment vendor via pilot simulation (${pay.vendor}${pay.product ? " - " + pay.product : ""})`, 7);
}

// 4) Derive risk register
run("node scripts/derive_risk_register_from_evidence_v1.mjs");

// 5) Apply policy
run("node scripts/apply_policy_to_risk_register_v1.mjs");

// 6) Generate recommendation
run("node scripts/generate_recommendation_from_risk_register_v1.mjs");

// 7) Generate pilot runbook
if (exists(path.join(ROOT, "scripts", "generate_pilot_runbook_v1.mjs"))) {
  run("node scripts/generate_pilot_runbook_v1.mjs");
}

run("npm run build");
