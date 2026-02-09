#!/usr/bin/env node
/**
 * Step 11B FIX — repair generate_pilot_intake_pack_v1.mjs
 * Root cause: invalid Markdown token leaked into JS.
 * Action: rewrite generator deterministically.
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function out(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = out("git rev-parse --show-toplevel");
process.chdir(ROOT);

const GEN = path.join(ROOT, "scripts", "generate_pilot_intake_pack_v1.mjs");

const SRC = `#!/usr/bin/env node
/**
 * Generate CIAG Pilot Intake Pack (v1)
 * Safe, minimal, machine-ingestable.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function out(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

const ROOT = out("git rev-parse --show-toplevel");
process.chdir(ROOT);

const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing .ago/operator_selected.json");

const op = JSON.parse(read(SEL));
const slug = String(op.operator_slug || op.slug || "").trim();
const name = String(op.operator_name || op.name || slug).trim();
const locations = Number(op.locations || 0) || 0;

if (!slug) throw new Error("Missing operator slug");

const triageDir = path.join(ROOT, "docs", "triage", \`TRG-\${slug}\`);
const intakeDir = path.join(ROOT, "docs", "intake");
const fixturesDir = path.join(ROOT, "fixtures", "intake");

mkdirp(triageDir);
mkdirp(intakeDir);
mkdirp(fixturesDir);

const CANON = path.join(intakeDir, "CIAG_PILOT_INTAKE_PACK.md");
const OP_MD = path.join(triageDir, "pilot-intake.md");
const TEMPLATE = path.join(fixturesDir, \`\${slug}.intake-template.json\`);

const canonicalMd = \`# CIAG Pilot Intake Pack (v1)

This intake pack collects operator-provided inputs required to close
governance evidence gaps during a CIAG pilot.

Delivery format:
- JSON (preferred)
- Supporting links where available

The output feeds:
intake → evidence → risk register → policy → recommendation → pilot runbook
\`;

const operatorMd = \`# CIAG Pilot Intake — Operator Specific

**Operator:** \${name} (\${slug})
**Locations:** \${locations}

Complete the JSON intake template and return it to CIAG.
\`;

const template = {
  meta: {
    schema: "ciag-intake-v1",
    slug,
    operator_name: name,
    locations,
    generatedAt: new Date().toISOString()
  },
  systems: [
    { systemType: "PMS", vendor: "", product: "", notes: "" },
    { systemType: "Payments", vendor: "", product: "", pci_scope: "unknown", notes: "" },
    { systemType: "POS", vendor: "", product: "", notes: "" },
    { systemType: "HRIS", vendor: "", product: "", notes: "" },
    { systemType: "WFM", vendor: "", product: "", notes: "" },
    { systemType: "Scheduling", vendor: "", product: "", notes: "" },
    { systemType: "Other", vendor: "", product: "", notes: "" }
  ],
  ai_usage_inventory: {
    blocker_r001_complete: false,
    notes: ""
  }
};

writeIfChanged(CANON, canonicalMd);
writeIfChanged(OP_MD, operatorMd);
writeIfChanged(TEMPLATE, JSON.stringify(template, null, 2) + "\\n");

console.log("Intake pack generated:");
console.log(" -", CANON);
console.log(" -", OP_MD);
console.log(" -", TEMPLATE);

run("npm run build");
`;

writeIfChanged(GEN, SRC);
chmod755(GEN);

// Syntax gate
run(\`node --check "\${GEN}"\`);

// Build gate
run("npm run build");

console.log("Step 11B generator syntax repaired.");
