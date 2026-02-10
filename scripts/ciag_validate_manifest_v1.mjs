#!/usr/bin/env node
/**
 * Validate run manifest completeness + referenced paths.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function sh(cmd){ return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p, "utf8"); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

function parseArgs(argv){
  const out = { slug: null };
  for (let i=0;i<argv.length;i++){
    if (argv[i] === "--slug") out.slug = argv[++i];
  }
  if (!out.slug) throw new Error("Missing --slug");
  return out;
}

const { slug } = parseArgs(process.argv.slice(2));
const mf = path.join("out","manifests",`${slug}.run.json`);
if (!exists(mf)) throw new Error(`Missing manifest: ${mf}`);

const doc = JSON.parse(read(mf));
const artifacts = Array.isArray(doc.artifacts) ? doc.artifacts : [];
const kinds = new Set(artifacts.map(a => a && a.kind).filter(Boolean));

const REQUIRED = [
  "input:tier1",
  "input:intake",
  "reach:prequal",
  "reach:letter",
  "sales:source",
  "sales:outreach_letter",
  "sales:pipeline_state",
  "triage:evidence",
  "triage:risk_register",
  "triage:recommendation",
  "triage:pilot_runbook"
];

const missingKinds = REQUIRED.filter(k => !kinds.has(k));
if (missingKinds.length) {
  throw new Error("Manifest missing required kinds: " + missingKinds.join(", "));
}

// Ensure every artifact path exists
const missingPaths = artifacts
  .filter(a => a && a.path)
  .map(a => a.path)
  .filter(p => !exists(p));

if (missingPaths.length) {
  throw new Error("Manifest references missing paths: " + missingPaths.join(", "));
}

console.log("Manifest validator PASS:", { slug, manifest: mf, count: artifacts.length });
