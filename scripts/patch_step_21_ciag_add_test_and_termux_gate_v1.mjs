#!/usr/bin/env node
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const PKG = "package.json";
if (!exists(PKG)) throw new Error("Missing: package.json");

// ------------------------------------------------------------
// 1) Add dist importability audit (runtime contract)
// ------------------------------------------------------------
const AUDIT = "scripts/audit_ciag_dist_importable_v1.sh";

const auditSrc = [
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "",
  'ROOT="$(git rev-parse --show-toplevel)"',
  'cd "$ROOT"',
  "",
  "# Build once (owned by npm test).",
  "# This audit assumes dist/ exists and is importable under Node ESM.",
  "",
  "node - <<'NODE'",
  "async function main() {",
  "  const targets = [",
  '    "./dist/index.js",',
  '    "./dist/executor.js",',
  "  ];",
  "  for (const t of targets) {",
  "    try {",
  "      await import(t);",
  "    } catch (e) {",
  '      console.error("FAIL: dist import failed:", t);',
  "      console.error(String((e && e.stack) || e));",
  "      process.exit(1);",
  "    }",
  "  }",
  '  console.log("OK: CIAG dist entrypoints importable:", targets);',
  "}",
  "main();",
  "NODE",
  "",
].join("\n");

writeIfChanged(AUDIT, auditSrc);
chmod755(AUDIT);
console.log("OK: wrote " + AUDIT);

// ------------------------------------------------------------
// 2) Termux gate (single entrypoint for local hardening)
// ------------------------------------------------------------
const GATE = "scripts/gate_ci_termux_v1.sh";

const gateSrc = [
  "#!/usr/bin/env bash",
  "set -euo pipefail",
  "",
  'ROOT="$(git rev-parse --show-toplevel)"',
  'cd "$ROOT"',
  "",
  'echo "OK: CIAG Termux gate: start"',
  "",
  "# Sanity",
  "git status --porcelain=v1 >/dev/null",
  "",
  "# Tests + build",
  "npm test",
  "npm run build",
  "",
  "# Enforce clean tree after gates (prevents silent drift)",
  'if [[ -n "$(git status --porcelain=v1)" ]]; then',
  '  echo "FAIL: working tree dirty after gates";',
  "  git status --porcelain=v1 || true",
  "  exit 1",
  "fi",
  "",
  'echo "OK: CIAG Termux gate: green + clean tree"',
  "",
].join("\n");

writeIfChanged(GATE, gateSrc);
chmod755(GATE);
console.log("OK: wrote " + GATE);

// ------------------------------------------------------------
// 3) Wire npm test (idempotent)
//    Goal: exactly one build inside test, then audit.
// ------------------------------------------------------------
const pkg = JSON.parse(read(PKG));
pkg.scripts = pkg.scripts || {};

const prevTest = pkg.scripts.test;
const desired = "npm run build && ./" + AUDIT;

if (typeof prevTest !== "string" || !prevTest.length) {
  pkg.scripts.test = desired;
  console.log("OK: created scripts.test");
} else if (prevTest !== desired) {
  // If someone already wired something else, normalize to our canonical baseline.
  pkg.scripts.test = desired;
  console.log("OK: normalized scripts.test to canonical baseline");
} else {
  console.log("OK: scripts.test already canonical");
}

writeIfChanged(PKG, JSON.stringify(pkg, null, 2) + "\n");

// ------------------------------------------------------------
// 4) Gates (must end with npm run build)
// ------------------------------------------------------------
run("npm test");
run("npm run build");
