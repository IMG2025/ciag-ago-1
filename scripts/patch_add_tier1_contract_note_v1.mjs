#!/usr/bin/env node
/**
 * Patch: Add Tier-1 intake contract note to README (CIAG)
 * Idempotent. Ends with: npm run build
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const FILE = "README.md";
const note =
`## Tier-1 Target Intake (Authoritative Contract)

This repo **does not score prospects** and **does not select targets manually**.
Tier-1 targets are consumed **read-only** from **ago-tier1-engine** via the export contract:
- Source: \`IMG2025/ago-tier1-engine\`
- Contract path: \`exports/tier1/\`
- Consumer script: \`scripts/pull_tier1_targets_from_engine_v1.mjs\`
- Local inputs: \`data/tier1/\`

Any changes to ICP, scoring, confidence, or tier logic occur **only** in \`ago-tier1-engine\` and are versioned there.
`;

const prev = exists(FILE) ? read(FILE) : "";
const next = prev.includes("## Tier-1 Target Intake (Authoritative Contract)")
  ? prev
  : (prev.trim().length ? prev.trimEnd() + "\n\n" + note + "\n" : note + "\n");

writeIfChanged(FILE, next);

run("npm run build");
