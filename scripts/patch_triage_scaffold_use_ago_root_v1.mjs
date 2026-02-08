#!/usr/bin/env node
/**
 * Force triage scaffold generator to read operator identity from .ago/operator_selected.json
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.writeFileSync(p,c); }

const FILE = path.join(process.cwd(), "scripts", "generate_triage_scaffold_v1.mjs");
if (!fs.existsSync(FILE)) throw new Error("Missing: scripts/generate_triage_scaffold_v1.mjs");

let src = read(FILE);

// Replace any operator-selected path with canonical .ago location
src = src
  .replace(/path\.join\(ROOT,\s*["']out["'],\s*["']operator_selected\.json["']\)/g,
           `path.join(process.env.PWD || process.cwd(), ".ago", "operator_selected.json")`)
  .replace(/path\.join\(ROOT,\s*["']out["'],\s*["']operator\.selected\.json["']\)/g,
           `path.join(process.env.PWD || process.cwd(), ".ago", "operator_selected.json")`);

// Also handle hard-coded "out/operator_selected.json"
src = src.replace(/["']out\/operator_selected\.json["']/g,
                  `"${path.posix.join(".ago","operator_selected.json")}"`);

write(FILE, src);

execSync("npm run build", { stdio: "inherit" });
