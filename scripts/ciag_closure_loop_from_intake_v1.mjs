#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }

const ROOT = execSync("git rev-parse --show-toplevel",{encoding:"utf8"}).trim();
process.chdir(ROOT);

const SEL = path.join(".ago","operator_selected.json");
if(!exists(SEL)) throw new Error("Missing selected operator at .ago/operator_selected.json");
const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if(!slug) throw new Error("Selected operator missing operator_slug");

const intakePath = process.argv[2] || path.join("fixtures","intake",`${slug}.intake-response.json`);

run(`node scripts/apply_intake_response_to_evidence_v1.mjs "${intakePath}"`);
run("node scripts/derive_risk_register_from_evidence_v1.mjs");
run("node scripts/apply_policy_to_risk_register_v1.mjs");
run("node scripts/generate_recommendation_from_risk_register_v1.mjs");
run("node scripts/generate_pilot_runbook_from_recommendation_v1.mjs");

// Required gate
run("npm run build");
