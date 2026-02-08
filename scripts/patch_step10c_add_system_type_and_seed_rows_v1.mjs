#!/usr/bin/env node
/**
 * Step 10C schema hardening:
 * - Ensure risk-register.csv has `system_type` column.
 * - Seed deterministic baseline rows for each evidence systemType for selected operator.
 * Idempotent. Must end with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}

function csvSplit(line) {
  // Simple CSV splitter (no quoted commas expected in our generated files)
  return line.split(",").map(s => s.trim());
}
function csvJoin(cols) {
  return cols.map(c => (c ?? "")).join(",");
}

const ROOT = process.cwd();
const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing: .ago/operator_selected.json");
const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if (!slug || String(slug).trim().length === 0) throw new Error("Invalid selected operator slug");

const TRIAGE_DIR = path.join(ROOT, "docs", "triage", `TRG-${slug}`);
const EVID = path.join(TRIAGE_DIR, "evidence.json");
const RISK = path.join(TRIAGE_DIR, "risk-register.csv");

if (!exists(TRIAGE_DIR)) throw new Error(`Missing triage dir: ${TRIAGE_DIR}`);
if (!exists(EVID)) throw new Error(`Missing evidence.json: ${EVID}`);
if (!exists(RISK)) throw new Error(`Missing risk-register.csv: ${RISK}`);

const evidence = JSON.parse(read(EVID));
const types = Array.from(new Set((evidence.items || [])
  .map(i => (i && i.systemType) ? String(i.systemType).trim() : "")
  .filter(Boolean)))
  .sort((a,b) => a.localeCompare(b));

const coreOrder = ["PMS","POS","HRIS","WFM","Scheduling","Payments","PCI","PII","Other"];
const ordered = Array.from(new Set([...coreOrder.filter(t => types.includes(t)), ...types])).filter(Boolean);

const raw = read(RISK).trimEnd();
const lines = raw.length ? raw.split("\n") : [];
if (lines.length === 0) throw new Error("risk-register.csv is empty");

let header = csvSplit(lines[0]);
const want = "system_type";

// Insert `system_type` immediately after `title` if missing (stable position).
if (!header.map(h => h.toLowerCase()).includes(want)) {
  const idxTitle = header.findIndex(h => h.toLowerCase() === "title");
  const insertAt = idxTitle >= 0 ? idxTitle + 1 : 2;
  header.splice(insertAt, 0, want);

  // Rewrite all existing rows to include blank system_type at the same position.
  const nextLines = [csvJoin(header)];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = csvSplit(lines[i]);
    cols.splice(insertAt, 0, ""); // blank system_type
    nextLines.push(csvJoin(cols));
  }
  writeIfChanged(RISK, nextLines.join("\n") + "\n");
}

// Reload after potential rewrite
const raw2 = read(RISK).trimEnd();
const lines2 = raw2.length ? raw2.split("\n") : [];
header = csvSplit(lines2[0]);
const idxSystem = header.findIndex(h => h.toLowerCase() === "system_type");
if (idxSystem < 0) throw new Error("Failed to add system_type column");

const idxRiskId = header.findIndex(h => h.toLowerCase() === "risk_id");
const idxTitle = header.findIndex(h => h.toLowerCase() === "title");
const idxCategory = header.findIndex(h => h.toLowerCase() === "category");
const idxSeverity = header.findIndex(h => h.toLowerCase() === "severity");
const idxLikelihood = header.findIndex(h => h.toLowerCase() === "likelihood");
const idxStatus = header.findIndex(h => h.toLowerCase() === "status");
const idxOwner = header.findIndex(h => h.toLowerCase() === "owner");
const idxEvidenceRefs = header.findIndex(h => h.toLowerCase() === "evidence_refs");
const idxNotes = header.findIndex(h => h.toLowerCase() === "notes");

function must(i, name) { if (i < 0) throw new Error(`Missing column: ${name}`); }
must(idxRiskId,"risk_id"); must(idxTitle,"title"); must(idxCategory,"category");
must(idxSeverity,"severity"); must(idxLikelihood,"likelihood"); must(idxStatus,"status");
must(idxOwner,"owner"); must(idxEvidenceRefs,"evidence_refs"); must(idxNotes,"notes");

const rows = [];
for (let i = 1; i < lines2.length; i++) {
  if (!lines2[i].trim()) continue;
  const cols = csvSplit(lines2[i]);
  // Normalize to header length
  while (cols.length < header.length) cols.push("");
  rows.push(cols);
}

// Map existing system_type presence
const existingBySystem = new Set(
  rows.map(r => (r[idxSystem] || "").trim()).filter(Boolean)
);

// Seed rows deterministically for missing system types
function severityFor(t) {
  if (t === "PCI" || t === "PII" || t === "Payments") return "High";
  if (t === "Other") return "Medium";
  return "Medium";
}
function likelihoodFor(t) {
  if (t === "PCI" || t === "PII" || t === "Payments") return "Medium";
  return "Medium";
}

const toSeed = ordered.filter(t => !existingBySystem.has(t));

for (const t of toSeed) {
  const r = Array(header.length).fill("");
  r[idxRiskId] = `R-SYS-${String(t).toUpperCase()}`;
  r[idxTitle] = `${t} governance coverage unknown`;
  r[idxSystem] = t;
  r[idxCategory] = "Discovery";
  r[idxSeverity] = severityFor(t);
  r[idxLikelihood] = likelihoodFor(t);
  r[idxStatus] = "Open";
  r[idxOwner] = "CIAG";
  r[idxEvidenceRefs] = "[]";
  r[idxNotes] = "";
  rows.push(r);
}

// Deterministic sort: keep original non-seeded ordering first, then seeded by coreOrder then alpha.
const orderIndex = new Map(coreOrder.map((t,i)=>[t,i]));
rows.sort((a,b) => {
  const aId = (a[idxRiskId]||"");
  const bId = (b[idxRiskId]||"");
  const aSeed = aId.startsWith("R-SYS-");
  const bSeed = bId.startsWith("R-SYS-");
  if (aSeed !== bSeed) return aSeed ? 1 : -1;

  const as = (a[idxSystem]||"").trim();
  const bs = (b[idxSystem]||"").trim();
  const ai = orderIndex.has(as) ? orderIndex.get(as) : 999;
  const bi = orderIndex.has(bs) ? orderIndex.get(bs) : 999;
  if (ai !== bi) return ai - bi;
  return as.localeCompare(bs);
});

const out = [csvJoin(header), ...rows.map(csvJoin)].join("\n") + "\n";
writeIfChanged(RISK, out);

run("npm run build");
