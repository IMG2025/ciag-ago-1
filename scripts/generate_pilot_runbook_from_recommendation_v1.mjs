#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";

function run(cmd){ execSync(cmd,{ stdio:"inherit" }); }

const ROOT = execSync("git rev-parse --show-toplevel",{ encoding:"utf8" }).trim();
process.chdir(ROOT);

// Canonical entrypoint expected by ciag:closure.
// Shim forwards to: scripts/generate_pilot_runbook_v1.mjs
run(`node "scripts/generate_pilot_runbook_v1.mjs"`);
