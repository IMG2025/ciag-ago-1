#!/usr/bin/env bash
set -euo pipefail

FILE="src/executor.ts"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found"
  ls -la src || true
  exit 1
fi

node - <<'NODE'
import fs from "fs";

const file = "src/executor.ts";
let s = fs.readFileSync(file, "utf8");

// ----------
// A) Remove stray injected line(s) before ciagExecutorSpec only
// ----------
const anchor = s.search(/\b(ciagExecutorSpec)\b/);
const head = anchor >= 0 ? s.slice(0, anchor) : s;
let tail = anchor >= 0 ? s.slice(anchor) : "";

// Remove standalone "ESCALATE: [...]" lines from HEAD only (safe cleanup)
const cleanedHead = head.replace(/^\s*ESCALATE\s*:\s*\[[^\]]*\]\s*,?\s*$/gm, "");

// ----------
// B) Patch ciagExecutorSpec block safely
// ----------
let patched = cleanedHead + tail;

// Find the ciagExecutorSpec object literal block
const m = patched.match(/(export\s+const\s+ciagExecutorSpec\s*=\s*\{[\s\S]*?\n\};)/);
if (!m) {
  // If not found, still write cleaned head (may fix TS1005) and exit
  fs.writeFileSync(file, patched);
  console.log("Cleaned stray ESCALATE line(s). ciagExecutorSpec block not found for contract patch.");
  process.exit(0);
}

let block = m[1];

// Ensure supported_task_types includes "ESCALATE"
block = block.replace(/(supported_task_types\s*:\s*)(\[[^\]]*\])/g, (full, p1, arr) => {
  if (arr.includes('"ESCALATE"') || arr.includes("'ESCALATE'")) return full;
  const body = arr.trim().slice(1, -1).trim();
  const next = body.length ? `${body}, "ESCALATE"` : `"ESCALATE"`;
  return `${p1}[${next}]`;
});

// Ensure required_scopes is an object literal and includes ESCALATE
block = block.replace(/(required_scopes\s*:\s*)(\{[\s\S]*?\})/m, (full, p1, obj) => {
  if (/\bESCALATE\s*:/.test(obj)) return full;

  // Try to reuse ANALYZE scopes if present, else default to ["ciag:escalate"]
  const analyze = obj.match(/\bANALYZE\s*:\s*(\[[^\]]*\])/);
  const fallback = analyze ? analyze[1] : '["ciag:escalate"]';

  // Insert before closing brace
  const insert = obj.replace(/\}\s*$/, `  ,\n    ESCALATE: ${fallback}\n  }`);
  return `${p1}${insert}`;
});

// If required_scopes wasn't an object literal (rare), force-replace the property with a compliant object
if (!/required_scopes\s*:\s*\{[\s\S]*?\}/m.test(block)) {
  block = block.replace(/required_scopes\s*:\s*[^,\n]+[,\n]/m, () => {
    return `required_scopes: {\n    EXECUTE: ["ciag:execute"],\n    ANALYZE: ["ciag:analyze"],\n    ESCALATE: ["ciag:escalate"],\n  },\n`;
  });
}

// Write back
patched = patched.replace(m[1], block);
fs.writeFileSync(file, patched);
console.log("Patched CIAG executor: removed stray ESCALATE line(s) + enforced ESCALATE contract inside ciagExecutorSpec.");
NODE

npm run build
