#!/usr/bin/env node
/**
 * Step 12C-FIX
 * Normalize ciag_sales_e2e_v1.mjs header so Node treats shebang correctly
 * - Ensures shebang is byte-0
 * - Strips BOM / stray characters
 * - Idempotent
 * - Ends with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p); } // raw buffer
function writeIfChanged(p, buf) {
  const prev = exists(p) ? fs.readFileSync(p) : null;
  if (!prev || !prev.equals(buf)) fs.writeFileSync(p, buf);
}

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const SALES = path.join("scripts", "ciag_sales_e2e_v1.mjs");
if (!exists(SALES)) throw new Error("Missing scripts/ciag_sales_e2e_v1.mjs");

// Read raw, strip BOM and anything before shebang
let raw = read(SALES).toString("utf8");

// Remove BOM if present
raw = raw.replace(/^\uFEFF/, "");

// Remove anything before the first shebang
raw = raw.replace(/^[\s\S]*?(?=#!\/usr\/bin\/env node)/, "");

// Ensure correct shebang + newline
if (!raw.startsWith("#!/usr/bin/env node\n")) {
  raw = "#!/usr/bin/env node\n" + raw.replace(/^#!\/usr\/bin\/env node\s*/, "");
}

writeIfChanged(SALES, Buffer.from(raw, "utf8"));

// Syntax gate
run(`node --check "${SALES}"`);

// Build gate
run("npm run build");

console.log("Step 12C-FIX complete: Sales E2E header normalized.");
