#!/usr/bin/env node
/**
 * Step 10C — Derive risk register from evidence
 * - Reads .ago/operator_selected.json
 * - Reads docs/triage/TRG-<slug>/evidence.json
 * - Updates docs/triage/TRG-<slug>/risk-register.csv
 * - Idempotent
 * - Fails closed
 * - Ends with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }

const ROOT = process.cwd();
const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing .ago/operator_selected.json");

const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if (!slug) throw new Error("Operator slug missing");

const TRIAGE = path.join(ROOT, "docs", "triage", `TRG-${slug}`);
const EVID = path.join(TRIAGE, "evidence.json");
const RISK = path.join(TRIAGE, "risk-register.csv");

if (!exists(EVID)) throw new Error("Missing evidence.json");
if (!exists(RISK)) throw new Error("Missing risk-register.csv");

const evidence = JSON.parse(read(EVID)).items;

// Build lookup: systemType → strongest status
const statusRank = { observed: 2, partial: 1, missing: 0 };
const evidenceBySystem = {};
for (const e of evidence) {
  const k = e.systemType;
  if (!k) continue;
  const prev = evidenceBySystem[k];
  if (!prev || statusRank[e.status] > statusRank[prev.status]) {
    evidenceBySystem[k] = e;
  }
}

// Read CSV
const rows = read(RISK).trim().split("\n");
const header = rows[0];
const out = [header];

for (const line of rows.slice(1)) {
  const cols = line.split(",");
  const systemType = cols[1]; // assumes column 2 = systemType
  const ev = evidenceBySystem[systemType];

  if (ev && ev.status === "observed") {
    // Reduce likelihood + mark derived
    cols[5] = "Low";              // likelihood
    cols[7] = "Mitigated";        // status
    cols.push("derivedFromEvidence");
  }

  out.push(cols.join(","));
}

fs.writeFileSync(RISK, out.join("\n"));
console.log("Risk register derived from evidence for:", slug);

run("npm run build");
