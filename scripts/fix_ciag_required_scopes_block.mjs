#!/usr/bin/env node
import fs from "fs";

const FILE = "src/executor.ts";

let src = fs.readFileSync(FILE, "utf8");

const CANONICAL = `
  required_scopes: {
    EXECUTE: ["ciag:execute"],
    ANALYZE: ["ciag:analyze"],
    ESCALATE: ["ciag:escalate"],
  },
`;

const rx = /required_scopes\s*:\s*\{[\s\S]*?\},/m;

if (!rx.test(src)) {
  console.error("ERROR: required_scopes block not found.");
  process.exit(1);
}

const next = src.replace(rx, CANONICAL);

if (next === src) {
  console.log("CIAG required_scopes already canonical (no-op).");
} else {
  fs.writeFileSync(FILE, next);
  console.log("Replaced CIAG required_scopes with canonical block.");
}
