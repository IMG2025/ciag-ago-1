#!/usr/bin/env node
/**
 * Step 16 (bundled): Golden Path Contract + Clean Tree Gate + Fixtures
 * PURE JS — Node-safe
 * Idempotent, fail-closed, build-gated
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

/* ─────────────────────────────
 * 16A — README Golden Path Contract
 * ───────────────────────────── */
const README = "README.md";
const HEADER = "## Authoritative Execution Path (Golden Path)";
const BLOCK = `${HEADER}

\`\`\`bash
npm run ciag:golden-path -- \\
  --tier1 fixtures/sourcing/tier1.sample.json \\
  --slug cole-hospitality \\
  --intake fixtures/intake/cole-hospitality.intake-response.json
\`\`\`

Fail-closed gates:
- Locations must be numeric
- Manifest must validate
- Repo must be clean
- Ends with \`npm run build\`
`;

if (!exists(README)) {
  writeIfChanged(README, `# CIAG AGO-1\n\n${BLOCK}\n`);
} else if (!read(README).includes(HEADER)) {
  writeIfChanged(README, read(README).trimEnd() + "\n\n" + BLOCK + "\n");
}

/* ─────────────────────────────
 * 16B — Clean Tree Gate Library
 * ───────────────────────────── */
ensureDir("scripts/_lib");

const CLEAN_GATE = "scripts/_lib/clean_tree_gate_v1.mjs";
writeIfChanged(
  CLEAN_GATE,
  `import { execSync } from "node:child_process";
export function assertCleanTree(label) {
  const dirty = execSync("git status --porcelain", { encoding: "utf8" });
  if (dirty.trim()) {
    console.error("[FATAL]", label, "repo dirty:");
    console.error(dirty);
    process.exit(1);
  }
}
`
);
try { fs.chmodSync(CLEAN_GATE, 0o755); } catch {}

/* ─────────────────────────────
 * 16C — Regression Fixtures
 * ───────────────────────────── */
ensureDir("fixtures/sourcing");
ensureDir("fixtures/intake");

writeIfChanged("fixtures/sourcing/tier1.sample.2.json", JSON.stringify([
  { slug: "cole-hospitality", operator_name: "Cole Hospitality", locations: 38, score: 84 }
], null, 2) + "\n");

/* ─────────────────────────────
 * Stage + commit (safe)
 * ───────────────────────────── */
const stage = [
  README,
  CLEAN_GATE,
  "fixtures/sourcing/tier1.sample.2.json",
  "scripts/patch_step16_bundle_golden_path_contract_v2.mjs"
].filter(exists);

run("git add " + stage.join(" "));
if (sh("git diff --cached --name-only").trim()) {
  run('git commit -m "chore: bundle golden path contract + clean tree gate (step16)"');
  run("git push");
}

/* ─────────────────────────────
 * Final gate
 * ───────────────────────────── */
run("npm run build");
run("git status --porcelain");
console.log("Step 16 bundle complete (v2).");
