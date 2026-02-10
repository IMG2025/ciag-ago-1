#!/usr/bin/env node
/**
 * Sales Funnel smoke gate (fail-closed)
 * Ensures pilot-runbook Locations is non-null and numeric after funnel run.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

function parseArgs(argv){
  const out = { slug: null, tier1: null, intake: null };
  for (let i=0;i<argv.length;i++){
    const a = argv[i];
    if (a === "--slug") out.slug = argv[++i];
    else if (a === "--tier1") out.tier1 = argv[++i];
    else if (a === "--intake") out.intake = argv[++i];
  }
  if (!out.slug) throw new Error("Missing --slug");
  if (!out.tier1) throw new Error("Missing --tier1");
  if (!out.intake) throw new Error("Missing --intake");
  return out;
}

const { slug, tier1, intake } = parseArgs(process.argv.slice(2));

// 1) Run the funnel e2e (this also regenerates pilot-runbook)
run(`npm run ciag:sales-funnel-e2e -- --tier1 "${tier1}" --slug "${slug}" --intake "${intake}"`);

// 2) Assert Locations in pilot-runbook is numeric + not null
const runbook = path.join("docs","triage",`TRG-${slug}`,"pilot-runbook.md");
if (!exists(runbook)) throw new Error(`Missing pilot-runbook: ${runbook}`);
const md = read(runbook);

const m = md.match(/\*\*Locations:\*\*\s*([^\n\r]+)/);
if (!m) throw new Error("Missing '**Locations:**' line in pilot-runbook.md");

const raw = String(m[1]).trim();
if (!raw || raw === "null" || raw === "undefined") throw new Error(`Locations invalid: '${raw}'`);

const n = Number(raw);
if (!Number.isFinite(n) || n <= 0) throw new Error(`Locations not a positive number: '${raw}'`);

console.log("Sales Funnel smoke gate PASS:", { slug, locations: n, runbook });
