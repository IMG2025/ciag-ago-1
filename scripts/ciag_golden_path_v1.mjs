#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }

function arg(flag){
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i+1] : null;
}

const slug = arg("--slug");
const tier1 = arg("--tier1");
const intake = arg("--intake");

if (!slug) throw new Error("Missing required: --slug");
if (!tier1) throw new Error("Missing required: --tier1");
if (!intake) throw new Error("Missing required: --intake");

// 1) Full funnel E2E
run(`npm run ciag:sales-funnel-e2e -- --tier1 "${tier1}" --slug "${slug}" --intake "${intake}"`);

// 2) Locations must be numeric (not null)
const runbook = `docs/triage/TRG-${slug}/pilot-runbook.md`;
if (!fs.existsSync(runbook)) throw new Error("Missing runbook: " + runbook);
const txt = fs.readFileSync(runbook, "utf8");
const m = txt.match(/\*\*Locations:\*\*\s*([^\n\r]+)/);
if (!m) throw new Error("Locations line not found in runbook.");
const raw = (m[1] || "").trim();
const n = Number(raw);
if (!Number.isFinite(n)) throw new Error(`Invalid Locations value (must be numeric): "${raw}"`);

// 3) Manifest must validate
run(`npm run ciag:validate-manifest -- --slug "${slug}"`);

// 4) Required final gate
run("npm run build");

// 5) Repo must be clean
const dirty = sh("git status --porcelain || true");
if (dirty.trim()) {
  console.error(dirty);
  throw new Error("Repo dirty after golden path. Fail-closed.");
}

console.log("Golden Path PASS:", { slug, locations: n });
