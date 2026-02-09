#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd){ execSync(cmd,{ stdio:"inherit" }); }
function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function writeIfChanged(p,next){
  const prev = exists(p) ? read(p) : "";
  if(prev !== next){
    fs.mkdirSync(path.dirname(p), { recursive:true });
    fs.writeFileSync(p,next);
  }
}
function chmod755(p){ try{ fs.chmodSync(p,0o755); } catch {} }

const ROOT = execSync("git rev-parse --show-toplevel",{ encoding:"utf8" }).trim();
process.chdir(ROOT);

const TARGET = path.join("scripts","generate_pilot_runbook_from_recommendation_v1.mjs");
if (exists(TARGET)) {
  console.log("OK: runbook generator already exists:", TARGET);
  run("npm run build");
  process.exit(0);
}

// Candidate real script names we’ve used historically / may exist in repo.
const CANDIDATES = [
  path.join("scripts","generate_pilot_runbook_v1.mjs"),
  path.join("scripts","generate_pilot_runbook_v1.js"),
  path.join("scripts","generate_pilot_runbook_from_recommendation_v1.js"),
  path.join("scripts","generate_runbook_from_recommendation_v1.mjs"),
  path.join("scripts","generate_runbook_from_recommendation_v1.js"),
];

const found = CANDIDATES.find(exists);
if (!found) {
  throw new Error(
    "Missing pilot runbook generator. None of these exist:\n" +
    CANDIDATES.map(x=>" - "+x).join("\n") +
    "\n\nCreate/restore the runbook generator script, then re-run this patch."
  );
}

// Create a shim that forwards execution to the real script.
const shim = `#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";

function run(cmd){ execSync(cmd,{ stdio:"inherit" }); }

const ROOT = execSync("git rev-parse --show-toplevel",{ encoding:"utf8" }).trim();
process.chdir(ROOT);

// Canonical entrypoint expected by ciag:closure.
// Shim forwards to: ${found}
run(\`node "${found.replace(/\\/g, "/")}"\`);
`;

writeIfChanged(TARGET, shim);
chmod755(TARGET);

console.log("Created shim:", TARGET, "→", found);

// Required gate
run("npm run build");
