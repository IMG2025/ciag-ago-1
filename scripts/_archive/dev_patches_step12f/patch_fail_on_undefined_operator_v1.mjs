#!/usr/bin/env node
/**
 * Enforce valid operator identity before triage scaffold.
 * Fails closed if operator slug/name missing.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SEL = path.join(ROOT, "out", "operator_selected.json");

if (!fs.existsSync(SEL)) {
  throw new Error("Missing out/operator_selected.json");
}

const op = JSON.parse(fs.readFileSync(SEL, "utf8"));
const slug = op.slug || op.operator || op.name;

if (!slug || String(slug).trim().length === 0) {
  throw new Error("Invalid operator_selected.json: missing slug/operator/name");
}

console.log("Operator identity validated:", slug);
