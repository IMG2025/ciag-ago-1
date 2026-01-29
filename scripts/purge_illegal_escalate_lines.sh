#!/usr/bin/env bash
set -euo pipefail

FILE="src/executor.ts"

node - <<'NODE'
import fs from "fs";

const file = "src/executor.ts";
let s = fs.readFileSync(file, "utf8");

// Remove ANY standalone ESCALATE property lines (object-style)
s = s.replace(/^\s*ESCALATE\s*:\s*\[[^\]]*\]\s*,?\s*$/gm, "");

// Also remove trailing commas left behind on previous lines
s = s.replace(/,\s*\n\s*\}/g, "\n}");

fs.writeFileSync(file, s);
console.log("Purged illegal ESCALATE property lines from executor.ts");
NODE

npm run build
