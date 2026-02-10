#!/usr/bin/env node
/**
 * Step 13C
 * Add fail-closed Sales Funnel smoke gate:
 *  - Runs ciag:sales-funnel-e2e on a fixture
 *  - Asserts pilot-runbook Locations is non-null + numeric
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

const SMOKE = path.join("scripts", "ciag_sales_funnel_smoke_v1.mjs");
const smokeSrc = `#!/usr/bin/env node
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
run(\`npm run ciag:sales-funnel-e2e -- --tier1 "\${tier1}" --slug "\${slug}" --intake "\${intake}"\`);

// 2) Assert Locations in pilot-runbook is numeric + not null
const runbook = path.join("docs","triage",\`TRG-\${slug}\`,"pilot-runbook.md");
if (!exists(runbook)) throw new Error(\`Missing pilot-runbook: \${runbook}\`);
const md = read(runbook);

const m = md.match(/\\*\\*Locations:\\*\\*\\s*([^\\n\\r]+)/);
if (!m) throw new Error("Missing '**Locations:**' line in pilot-runbook.md");

const raw = String(m[1]).trim();
if (!raw || raw === "null" || raw === "undefined") throw new Error(\`Locations invalid: '\${raw}'\`);

const n = Number(raw);
if (!Number.isFinite(n) || n <= 0) throw new Error(\`Locations not a positive number: '\${raw}'\`);

console.log("Sales Funnel smoke gate PASS:", { slug, locations: n, runbook });
`;

writeIfChanged(SMOKE, smokeSrc);
chmod755(SMOKE);

// Wire npm script: ciag:sales-funnel-smoke
const pkg = JSON.parse(read(PKG));
pkg.scripts = pkg.scripts || {};
if (!pkg.scripts["ciag:sales-funnel-smoke"]) {
  pkg.scripts["ciag:sales-funnel-smoke"] = "node scripts/ciag_sales_funnel_smoke_v1.mjs";
  writeIfChanged(PKG, JSON.stringify(pkg, null, 2) + "\n");
}

// Gates
run(`node --check "${SMOKE}"`);
run(`node --check "${path.join("scripts","patch_step13c_add_sales_funnel_smoke_gate_v1.mjs")}"`);
run("npm run build");

console.log("Step 13C complete: sales funnel smoke gate wired (ciag:sales-funnel-smoke).");
