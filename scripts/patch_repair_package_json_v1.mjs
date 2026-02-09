#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{stdio:"inherit"}); }

const PKG = "package.json";
if (!fs.existsSync(PKG)) {
  throw new Error("package.json missing");
}

// Attempt raw read for forensics
const raw = fs.readFileSync(PKG, "utf8");

// Hard reset to canonical structure
const repaired = {
  name: "ciag-ago-1",
  version: "0.1.0",
  private: true,
  type: "module",
  scripts: {
    "build": "tsc -p tsconfig.json",
    "ciag:triage": "node scripts/ciag_triage_from_selected_operator_v1.mjs",
    "ciag:e2e": "node scripts/ciag_e2e_from_fixture_v1.mjs fixtures/customers/cole-hospitality.sample.json",
    "ciag:policy": "node scripts/apply_policy_to_risk_register_v1.mjs",
    "ciag:recommendation": "node scripts/generate_recommendation_from_risk_register_v1.mjs",
    "ciag:intake": "node scripts/generate_pilot_intake_pack_for_selected_operator_v1.mjs"
  }
};

fs.writeFileSync(PKG, JSON.stringify(repaired, null, 2) + "\n");

console.log("package.json repaired to canonical form");

// required gate
run("npm run build");
