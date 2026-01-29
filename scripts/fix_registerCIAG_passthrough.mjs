#!/usr/bin/env node
import fs from "fs";

const FILE = "src/index.ts";
const src = fs.readFileSync(FILE, "utf8");

const replacement = `
export function registerCIAG(reg: { registerExecutor: (spec: any) => void }): void {
  reg.registerExecutor(ciagExecutorSpec);
}
`.trim();

const next = src.replace(
  /export function registerCIAG[\s\S]*?\n\}/m,
  replacement
);

if (next === src) {
  console.log("CIAG register passthrough already in place (no-op).");
} else {
  fs.writeFileSync(FILE, next);
  console.log("Updated registerCIAG to pure passthrough.");
}

