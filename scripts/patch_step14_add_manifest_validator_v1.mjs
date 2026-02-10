#!/usr/bin/env node
/**
 * Step 14
 * Add run-manifest validator:
 *  - Ensures required artifact kinds exist in out/manifests/<slug>.run.json
 *  - Ensures each referenced path exists on disk
 * Idempotent. Required gates: node --check + npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const PKG = "package.json";
if (!exists(PKG)) throw new Error("Missing: package.json");

const VALIDATOR = path.join("scripts", "ciag_validate_manifest_v1.mjs");
const validatorSrc = `#!/usr/bin/env node
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
const mf = path.join("out","manifests",\`\${slug}.run.json\`);
if (!exists(mf)) throw new Error(\`Missing manifest: \${mf}\`);

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
`;

writeIfChanged(VALIDATOR, validatorSrc);
chmod755(VALIDATOR);

// Wire npm script: ciag:validate-manifest
const pkg = JSON.parse(read(PKG));
pkg.scripts = pkg.scripts || {};
if (!pkg.scripts["ciag:validate-manifest"]) {
  pkg.scripts["ciag:validate-manifest"] = "node scripts/ciag_validate_manifest_v1.mjs";
  writeIfChanged(PKG, JSON.stringify(pkg, null, 2) + "\n");
}

// Gates
run(`node --check "${VALIDATOR}"`);
run(`node --check "${path.join("scripts","patch_step14_add_manifest_validator_v1.mjs")}"`);
run("npm run build");

console.log("Step 14 complete: manifest validator wired (ciag:validate-manifest).");
