#!/usr/bin/env node
/**
 * Step 11B — Intake Pack repair + generator
 * - Repairs invalid package.json by restoring from git HEAD, then re-applies required scripts deterministically.
 * - Adds ciag:intake generator.
 * - Creates canonical intake pack + per-operator intake + JSON template.
 * - Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function runOut(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = runOut("git rev-parse --show-toplevel");
process.chdir(ROOT);

const PKG_PATH = path.join(ROOT, "package.json");
if (!exists(PKG_PATH)) throw new Error("Missing package.json");

// --- 1) Load/repair package.json deterministically
function parsePkgText(txt) {
  try { return JSON.parse(txt); } catch { return null; }
}

let pkgText = read(PKG_PATH);
let pkg = parsePkgText(pkgText);

if (!pkg) {
  // Restore last-known-good from git HEAD
  let restored = "";
  try {
    restored = execSync("git show HEAD:package.json", { encoding: "utf8" });
  } catch (e) {
    // fallback one commit back if HEAD blob missing (rare)
    restored = execSync("git show HEAD~1:package.json", { encoding: "utf8" });
  }
  const parsed = parsePkgText(restored);
  if (!parsed) throw new Error("Unable to restore a valid package.json from git history.");
  pkg = parsed;
  pkgText = restored;
  writeIfChanged(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
}

// --- 2) Ensure scripts exist
pkg.scripts = pkg.scripts || {};
pkg.scripts["ciag:intake"] = "node scripts/generate_pilot_intake_pack_v1.mjs";

// Keep existing scripts; do NOT overwrite others.
writeIfChanged(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");

// --- 3) Write generator script
const GEN = path.join(ROOT, "scripts", "generate_pilot_intake_pack_v1.mjs");
const genSrc = `#!/usr/bin/env node
/**
 * Generate CIAG Pilot Intake Pack artifacts
 * Inputs:
 *  - .ago/operator_selected.json (authoritative selection)
 * Outputs:
 *  - docs/intake/CIAG_PILOT_INTAKE_PACK.md (canonical)
 *  - fixtures/intake/<slug>.intake-template.json (customer-fillable template)
 *  - docs/triage/TRG-<slug>/pilot-intake.md (operator-specific pack)
 *
 * Idempotent. No network calls.
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
if (!exists(SEL)) {
  throw new Error("Missing .ago/operator_selected.json. Run operator selection first.");
}
const op = JSON.parse(read(SEL));
const slug = String(op.operator_slug || op.slug || "").trim();
const name = String(op.operator_name || op.name || slug).trim();
const locations = Number(op.locations || 0) || 0;

if (!slug) throw new Error("operator_selected.json missing operator_slug/slug.");

const triageDir = path.join(ROOT, "docs", "triage", \`TRG-\${slug}\`);
mkdirp(triageDir);

const canonicalDir = path.join(ROOT, "docs", "intake");
mkdirp(canonicalDir);

const fixturesDir = path.join(ROOT, "fixtures", "intake");
mkdirp(fixturesDir);

const CANON = path.join(canonicalDir, "CIAG_PILOT_INTAKE_PACK.md");
const OP_MD = path.join(triageDir, "pilot-intake.md");
const TEMPLATE = path.join(fixturesDir, \`\${slug}.intake-template.json\`);

// Intake schema (minimal + compatible with closure loop conventions):
// We keep it simple: systemAnswers[] with systemType + vendor/product + notes + pii/pci flags.
// This is a CUSTOMER INPUT STRUCTURE, not internal evidence schema.
const templateObj = {
  meta: {
    slug,
    operator_name: name,
    locations,
    generatedAt: new Date().toISOString(),
    schema: "ciag-intake-v1"
  },
  systems: [
    { systemType: "PMS", vendor: "", product: "", ai_enabled_features: "", data_classes: ["guest_pii"], notes: "" },
    { systemType: "Payments", vendor: "", product: "", pci_scope: "unknown", tokenization: "unknown", notes: "" },
    { systemType: "POS", vendor: "", product: "", ai_enabled_features: "", pci_adjacent: "unknown", notes: "" },
    { systemType: "HRIS", vendor: "", product: "", data_classes: ["employee_pii"], notes: "" },
    { systemType: "WFM", vendor: "", product: "", data_classes: ["employee_pii"], notes: "" },
    { systemType: "Scheduling", vendor: "", product: "", notes: "" },
    { systemType: "Other", vendor: "", product: "", ai_enabled_features: "", notes: "" }
  ],
  ai_usage_inventory: {
    blocker_r001_complete: false,
    owners: { ops: "", it: "", finance: "", hr: "" },
    known_ai_tools: [],
    shadow_ai_policy: "unknown",
    notes: ""
  }
};

const canonicalMd = \`# CIAG Pilot Intake Pack (v1)

This intake pack is used to close governance evidence gaps during a CIAG pilot.  
It is designed to be **machine-ingestable** and **auditable**.

## What you deliver to CIAG
1) A completed JSON response (recommended) based on the provided template  
2) Optional supporting evidence links (contracts, vendor portals, PCI AOC/SAQ, architecture diagrams)

## Required fields (minimum viable)
- Vendor + product for each system type
- Whether AI-enabled features are in use (if applicable)
- Data classes processed (PII/PCI adjacency/workforce)
- Payment processor + PCI scope posture (SAQ/AOC if known)
- R-001 AI Usage Inventory completion flag

## Systems we collect (standard)
- PMS
- Payments
- POS
- HRIS
- WFM
- Scheduling
- Other AI-enabled vendors

## Output format
Use the JSON template:
- \`fixtures/intake/<slug>.intake-template.json\`

CIAG will run:
- intake → evidence → risk register → policy → recommendation → pilot runbook

\`;

const opMd = \`# CIAG Pilot Intake (Operator-Specific)

**Operator:** \${name} (\${slug})  
**Locations:** \${locations}  
**Generated At:** \${new Date().toISOString()}

## How to respond
1) Copy the JSON template:
- \`fixtures/intake/\${slug}.intake-template.json\`

2) Fill it out (no freeform PDFs as a substitute)
3) Provide supporting links where available (AOC/SAQ, contracts, vendor admin screens, security pages)

## R-001 (Blocker) — AI Usage Inventory
This must be completed during the pilot window. Mark:
- \`ai_usage_inventory.blocker_r001_complete = true\`
only when the inventory is complete.

\`;

writeIfChanged(CANON, canonicalMd);
writeIfChanged(OP_MD, opMd);
writeIfChanged(TEMPLATE, JSON.stringify(templateObj, null, 2) + "\\n");

console.log("Intake pack generated:");
console.log(" -", CANON);
console.log(" -", OP_MD);
console.log(" -", TEMPLATE);

// Gate
run("npm run build");
`;
writeIfChanged(GEN, genSrc);
chmod755(GEN);

// --- 4) Sanity: node --check on generator + patch
run(`node --check "${GEN}"`);

// --- 5) Gate
run("npm run build");

console.log("Step 11B repair complete.");
