#!/usr/bin/env node
/**
 * Adds a pinned operator override for simulation (Cole Hospitality),
 * and hardens selector to:
 *  - log cwd + dest
 *  - prefer override if present
 *  - fail closed if output not written
 * Idempotent. Ends with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function write(p, c) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, c);
}
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) write(p, next);
}

const ROOT = process.cwd();

const OVERRIDE = path.join(ROOT, "out", "operator_override.json");
const SELECTOR = path.join(ROOT, "scripts", "select_first_operator_from_queue_v1.mjs");

if (!exists(SELECTOR)) throw new Error("Missing: scripts/select_first_operator_from_queue_v1.mjs");

// 1) Write override (Cole Hospitality) — simulation pin
const overrideObj = {
  operator_name: "Cole Hospitality",
  operator_slug: "cole-hospitality",
  mode: "simulation-pin",
  notes: "Pinned test operator for CIAG run-through. Remove/disable for live queue selection."
};
writeIfChanged(OVERRIDE, JSON.stringify(overrideObj, null, 2) + "\n");

// 2) Patch selector to prefer override + harden logging/verification
let src = read(SELECTOR);

// Ensure fs/path imports exist (light-touch; do not duplicate)
if (!src.includes('import fs from "node:fs"')) {
  src = src.replace(/^#!/, '#!/usr/bin/env node\nimport fs from "node:fs";\nimport path from "node:path";\n');
}
if (!src.includes('import path from "node:path"')) {
  // If fs import exists but path doesn't
  src = src.replace('import fs from "node:fs";', 'import fs from "node:fs";\nimport path from "node:path";');
}

// Ensure helper functions exist
if (!src.match(/function\s+exists\s*\(/)) {
  src = src.replace(/import\s+\{\s*execSync\s*\}\s+from\s+"node:child_process";/,
`import { execSync } from "node:child_process";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p,"utf8"); }
function write(p,c){ fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,c); }`);
}

// Inject override logic near the DEST definition.
// We replace DEST declaration to also define OVERRIDE + log paths.
src = src.replace(
  /const DEST\s*=\s*path\.join\(ROOT,\s*"out",\s*"operator_selected\.json"\)\s*;/,
`const DEST = path.join(ROOT, "out", "operator_selected.json");
const OVERRIDE = path.join(ROOT, "out", "operator_override.json");

console.log("selector cwd:", process.cwd());
console.log("selector ROOT:", ROOT);
console.log("selector DEST:", DEST);`
);

// After queue parse/sort, before writing, prefer override if present
if (!src.includes("PREFER_OVERRIDE")) {
  src = src.replace(
    /rows\.sort\(\(a,b\)=>\s*\(b\.confidence\|\|0\)\-\(a\.confidence\|\|0\)\)\s*;?/,
`rows.sort((a,b)=> (b.confidence||0)-(a.confidence||0));

// PREFER_OVERRIDE
if (exists(OVERRIDE)) {
  const ov = JSON.parse(read(OVERRIDE));
  const pinned = {
    rank: 1,
    operator_name: ov.operator_name || "Cole Hospitality",
    operator_slug: ov.operator_slug || "cole-hospitality",
    locations: ov.locations || null,
    composite_score: ov.composite_score || null,
    confidence_score: 10,
    priority: "Immediate",
    outreach_status: "simulation-pin",
    provenance: { source: "operator_override.json" }
  };
  write(DEST, JSON.stringify(pinned, null, 2) + "\\n");
  console.log("operator_selected.json written to:", DEST);
  if (!exists(DEST)) throw new Error("FATAL: missing operator_selected.json after override write");
  run("npm run build");
  process.exit(0);
}`
  );
}

// Ensure normal path also verifies output after writing
if (!src.includes("FATAL: missing operator_selected.json")) {
  src = src.replace(
    /write\(\s*DEST\s*,\s*JSON\.stringify\(\s*rows\[0\]\s*,\s*null\s*,\s*2\s*\)\s*\+\s*"\\n"\s*\)\s*;\s*run\("npm run build"\)\s*;/,
`write(DEST, JSON.stringify(rows[0], null, 2) + "\\n");
console.log("operator_selected.json written to:", DEST);
if (!exists(DEST)) throw new Error("FATAL: missing operator_selected.json after write");
run("npm run build");`
  );
}

writeIfChanged(SELECTOR, src);
run("npm run build");
