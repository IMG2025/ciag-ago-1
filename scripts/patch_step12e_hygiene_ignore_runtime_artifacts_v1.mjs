#!/usr/bin/env node
/**
 * Step 12E — Hygiene lock
 * Goal:
 *  - Prevent runtime artifacts from polluting git status
 *  - Untrack previously committed runtime outputs (keep local files)
 *
 * Idempotent. Gates: node --check + npm run build.
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

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

// 1) Authoritative ignores (runtime/state)
const gi = ".gitignore";
if (!exists(gi)) throw new Error("Missing .gitignore");

const addLines = [
  "",
  "# --- CIAG-AGO-1 runtime artifacts (generated) ---",
  ".ago/",
  "data/operator_override.json",
  "docs/intake/",
  "docs/triage/TRG-*/",
  "out/",
  "",
  "# --- deps ---",
  "node_modules/",
];

const cur = read(gi);
const ensure = (line) => (cur.includes(`\n${line}\n`) || cur.endsWith(`\n${line}`)) ? null : line;

const toAppend = addLines.filter((l) => l === "" ? true : !!ensure(l));
if (toAppend.join("\n").trim().length > 0) {
  writeIfChanged(gi, cur.replace(/\s*$/, "") + "\n" + toAppend.join("\n").replace(/^\n+/, ""));
}

// 2) Untrack any previously committed runtime artifacts.
// IMPORTANT: use --cached so we do not delete local files.
function untrackIfTracked(rel) {
  // git ls-files --error-unmatch fails if not tracked
  try {
    sh(`git ls-files --error-unmatch "${rel}"`);
    run(`git rm -r --cached --ignore-unmatch "${rel}"`);
  } catch { /* not tracked */ }
}

untrackIfTracked("docs/intake");
untrackIfTracked("docs/triage/TRG-Acme-Hospitality");
untrackIfTracked("docs/triage/TRG-undefined");
untrackIfTracked("docs/triage/TRG-cole-hospitality");
untrackIfTracked("out");
untrackIfTracked(".ago");
untrackIfTracked("data/operator_override.json");
untrackIfTracked("node_modules");

// 3) Gate
run("npm run build");

console.log("Step 12E complete: runtime artifacts ignored + untracked (if previously committed).");
