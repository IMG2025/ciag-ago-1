#!/usr/bin/env node
/**
 * Canonical rewrite of generate_triage_scaffold_v1.mjs
 * - ESM-safe (shebang at top)
 * - Reads ONLY .ago/operator_selected.json
 * - Fails closed if operator missing
 * - Deletes TRG-undefined deterministically
 * - Idempotent
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd, { stdio: "inherit" }); }
function read(p){ return fs.readFileSync(p, "utf8"); }
function exists(p){ return fs.existsSync(p); }
function mkdir(p){ fs.mkdirSync(p, { recursive: true }); }

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

const TARGET = path.join("scripts","generate_triage_scaffold_v1.mjs");

const SRC = `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function read(p){ return fs.readFileSync(p,"utf8"); }
function exists(p){ return fs.existsSync(p); }
function mkdir(p){ fs.mkdirSync(p,{recursive:true}); }

function toSlug(s){
  return String(s||"")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g,"-")
    .replace(/^-+|-+$/g,"");
}

const ROOT = process.cwd();
const SEL = path.join(ROOT,".ago","operator_selected.json");

if(!exists(SEL)){
  throw new Error("Missing .ago/operator_selected.json");
}

const op = JSON.parse(read(SEL));
const raw =
  op.operator_slug ??
  op.slug ??
  op.operator ??
  op.name ??
  op.operator_name;

if(!raw){
  throw new Error("Invalid operator_selected.json (no operator identity)");
}

const slug = toSlug(raw);
if(!slug){
  throw new Error("Resolved empty operator slug");
}

const TRIAGE_ROOT = path.join(ROOT,"docs","triage");
const DIR = path.join(TRIAGE_ROOT,\`TRG-\${slug}\`);

mkdir(DIR);

const FILES = [
  "memo.md",
  "risk-register.csv",
  "evidence.json",
  "recommendation.md"
];

for(const f of FILES){
  const p = path.join(DIR,f);
  if(!exists(p)) fs.writeFileSync(p,"");
}

// Remove undefined artifact deterministically
const BAD = path.join(TRIAGE_ROOT,"TRG-undefined");
if(exists(BAD)){
  fs.rmSync(BAD,{recursive:true,force:true});
  console.log("Removed stale TRG-undefined");
}

console.log("Triage scaffold ready:", DIR);
`;

fs.writeFileSync(TARGET, SRC, { mode: 0o755 });

run("npm run build");
