#!/usr/bin/env bash
set -euo pipefail

FILE="src/executor.ts"

if [ ! -f "$FILE" ]; then
  echo "ERROR: $FILE not found. List src/:"
  ls -la src || true
  exit 1
fi

node - <<'NODE'
import fs from "fs";

const file = "src/executor.ts";
let s = fs.readFileSync(file, "utf8");

// 1) Ensure supported_task_types includes "ESCALATE"
//
// We handle common patterns like:
// supported_task_types: ["EXECUTE","ANALYZE"]
// supported_task_types: readonly ["EXECUTE","ANALYZE"]
// supported_task_types: ["EXECUTE", "ANALYZE", ...]
//
// Idempotent: only adds if missing.
s = s.replace(
  /(supported_task_types\s*:\s*)(\[[^\]]*\])/g,
  (m, p1, arr) => {
    if (arr.includes('"ESCALATE"') || arr.includes("'ESCALATE'")) return m;
    // insert before closing ]
    const trimmed = arr.trim();
    const body = trimmed.slice(1, -1).trim();
    const nextBody = body.length ? `${body}, "ESCALATE"` : `"ESCALATE"`;
    return `${p1}[${nextBody}]`;
  }
);

// 2) Ensure required_scopes has an ESCALATE key
//
// Handles:
// required_scopes: { EXECUTE: [...], ANALYZE: [...] }
// Idempotent: only adds if missing.
s = s.replace(
  /(required_scopes\s*:\s*\{)([\s\S]*?)(\})/g,
  (m, open, inner, close) => {
    if (/\bESCALATE\s*:/.test(inner)) return m;

    // Try to re-use ANALYZE scopes if present, otherwise default to []
    const analyzeMatch = inner.match(/\bANALYZE\s*:\s*([^\n,}]+)/);
    const fallback = analyzeMatch ? analyzeMatch[1].trim() : "[]";

    // Insert near end, before closing brace
    const insertion = `\n    ESCALATE: ${fallback},`;
    // If inner already ends with newline/indent, keep formatting conservative
    return `${open}${inner}${insertion}\n  ${close}`;
  }
);

fs.writeFileSync(file, s);
console.log("Patched CIAG executor contract (ESCALATE added where needed).");
NODE

npm run build
