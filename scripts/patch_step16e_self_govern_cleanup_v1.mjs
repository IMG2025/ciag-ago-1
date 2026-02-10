#!/usr/bin/env node
/**
 * Step 16E: Make Step 16C self-governing (commit/push itself) + deprecate Step 16D
 * - PURE JS — Node-safe
 * - Idempotent, fail-closed, build-gated
 * - Ensures stray v1 patch is removed if present
 * - Ensures repo ends clean
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

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

const STRAY = "scripts/patch_step16_bundle_golden_path_contract_v1.mjs";
const C16C = "scripts/patch_step16c_cleanup_stray_v1_patch_v1.mjs";
const C16D = "scripts/patch_step16d_commit_cleanup_patch_v1.mjs";

// 1) Rewrite Step 16C as self-governing cleanup
const c16cNext = `#!/usr/bin/env node
/**
 * Step 16C: Cleanup stray v1 patch file (SELF-GOVERNING)
 * - Removes untracked scripts/patch_step16_bundle_golden_path_contract_v1.mjs if present
 * - Stages/commits/pushes THIS cleanup patch (and itself) if needed
 * - Idempotent, fail-closed, build-gated
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const STRAY = "scripts/patch_step16_bundle_golden_path_contract_v1.mjs";
const SELF = "scripts/patch_step16c_cleanup_stray_v1_patch_v1.mjs";

// Only remove STRAY if it's untracked (safety)
const untracked = sh("git ls-files --others --exclude-standard || true").split("\\n").filter(Boolean);
const isUntracked = untracked.includes(STRAY);

if (isUntracked && exists(STRAY)) {
  fs.rmSync(STRAY, { force: true });
  console.log("Removed stray untracked file:", STRAY);
} else {
  console.log("No stray untracked v1 patch to remove.");
}

// Stage + commit this cleanup patch if needed
run("git add " + SELF);
const staged = sh("git diff --cached --name-only || true").trim();
if (staged) {
  run('git commit -m "chore: self-govern step16c cleanup patch"');
  run("git push");
} else {
  console.log("Step 16C: nothing new to commit.");
}

// Required final gate
run("npm run build");

// Fail-closed: repo must be clean at end
const dirty = sh("git status --porcelain").trim();
if (dirty) {
  console.error("[FATAL] Repo not clean after Step 16C:\\n" + dirty);
  process.exit(1);
}

console.log("Step 16C complete: cleanup governed; repo clean.");
`;

// Ensure target exists; if not, create it (deterministic)
writeIfChanged(C16C, c16cNext);
chmod755(C16C);

// 2) Deprecate Step 16D (keep file, but mark as not required going forward)
if (exists(C16D)) {
  const cur = read(C16D);
  if (!cur.includes("DEPRECATED BY STEP 16E")) {
    const banner =
`/**
 * DEPRECATED BY STEP 16E
 * - Step 16C is now self-governing (it stages/commits/pushes itself)
 * - This script remains for historical traceability only
 */
`;
    // Insert after shebang if present, else prepend
    const next = cur.startsWith("#!")
      ? cur.replace(/^(#!.*\n)/, `$1${banner}`)
      : `${banner}${cur}`;
    writeIfChanged(C16D, next);
    chmod755(C16D);
  }
}

// 3) Remove stray file if present (even if tracked/untracked) — safety: only if it exists AND is untracked
const untrackedNow = sh("git ls-files --others --exclude-standard || true").split("\n").filter(Boolean);
if (exists(STRAY) && untrackedNow.includes(STRAY)) {
  fs.rmSync(STRAY, { force: true });
  console.log("Removed stray untracked v1 file:", STRAY);
}

// 4) Stage + commit/push if needed for Step 16E changes
const stage = [C16C, C16D, "scripts/patch_step16e_self_govern_cleanup_v1.mjs"].filter(exists);
if (stage.length) run("git add " + stage.join(" "));
const staged2 = sh("git diff --cached --name-only || true").trim();
if (staged2) {
  run('git commit -m "chore: make step16c self-governing; deprecate step16d (step16e)"');
  run("git push");
} else {
  console.log("Step 16E: nothing new to commit.");
}

// 5) Required final gate
run("npm run build");

// 6) Fail-closed: repo must be clean
const dirty = sh("git status --porcelain").trim();
if (dirty) {
  console.error("[FATAL] Repo not clean after Step 16E:\n" + dirty);
  process.exit(1);
}
console.log("Step 16E complete: Step 16C is self-governing; Step 16D deprecated; repo clean.");
