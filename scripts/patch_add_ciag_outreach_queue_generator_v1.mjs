#!/usr/bin/env node
/**
 * Patch v1: Add CIAG Outreach Queue Generator (Tier-1 consumer)
 * - Reads Tier-1 export contract from data/tier1/*
 * - Generates CIAG-owned outreach queue artifacts in out/reach/*
 * - Fail-closed gates (no silent partial success)
 * - Idempotent file writes
 * - Ends with: npm run build
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function die(msg) {
  process.stderr.write("[FATAL] " + msg + "\n");
  process.exit(1);
}

const ROOT = process.cwd();
const SCRIPTS = path.join(ROOT, "scripts");
ensureDir(SCRIPTS);

const generatorPath = path.join(SCRIPTS, "generate_outreach_queue_from_tier1_v1.mjs");

const generator = `#!/usr/bin/env node
/**
 * CIAG Outreach Queue Generator v1 (Tier-1 Consumer)
 *
 * Inputs (read-only contract):
 * - data/tier1/tier1.csv
 * - data/tier1/meta.json
 * - data/tier1/evidence.manifest.json
 * Optional:
 * - data/tier1/pull.meta.json
 *
 * Outputs (CIAG-owned):
 * - out/reach/queue.csv
 * - out/reach/queue.jsonl
 * - out/reach/meta.json
 *
 * Fail-closed rules:
 * - Missing meta.json => exit 1
 * - Missing engine provenance (repo + commit) => exit 1
 * - Missing/empty tier1.csv => exit 1
 * - Any parse error => exit 1
 */
import fs from "node:fs";
import path from "node:path";

function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function die(msg) {
  process.stderr.write("[FATAL] " + msg + "\\n");
  process.exit(1);
}

function isoNow() { return new Date().toISOString(); }

function parseJsonFile(p, label) {
  if (!exists(p)) die(\`\${label} missing: \${p}\`);
  try {
    return JSON.parse(read(p));
  } catch (e) {
    die(\`\${label} invalid JSON: \${p}\`);
  }
}

function splitCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === "," && !inQ) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(raw) {
  const lines = raw.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n").split("\\n").filter(l => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = splitCsvLine(lines[0]).map(h => h.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i]);
    const row = {};
    for (let c = 0; c < header.length; c++) row[header[c]] = (cols[c] ?? "").trim();
    rows.push(row);
  }
  return rows;
}

function escCsv(s) {
  const v = String(s ?? "");
  const needs = v.includes(",") || v.includes('"') || v.includes("\\n");
  const out = v.replace(/"/g, '""');
  return needs ? '"' + out + '"' : out;
}

const ROOT = process.cwd();
const IN_DIR = path.join(ROOT, "data", "tier1");
const OUT_DIR = path.join(ROOT, "out", "reach");
ensureDir(OUT_DIR);

// Contract inputs
const metaPath = path.join(IN_DIR, "meta.json");
const tier1Path = path.join(IN_DIR, "tier1.csv");
const evidencePath = path.join(IN_DIR, "evidence.manifest.json");
const pullMetaPath = path.join(IN_DIR, "pull.meta.json");

if (!exists(metaPath)) die("Tier-1 contract gate failed: data/tier1/meta.json is required");
if (!exists(tier1Path)) die("Tier-1 contract gate failed: data/tier1/tier1.csv is required");
if (!exists(evidencePath)) die("Tier-1 contract gate failed: data/tier1/evidence.manifest.json is required");

const meta = parseJsonFile(metaPath, "Tier-1 meta.json");
const evidence = parseJsonFile(evidencePath, "Tier-1 evidence.manifest.json");
const pullMeta = exists(pullMetaPath) ? parseJsonFile(pullMetaPath, "Tier-1 pull.meta.json") : null;

// Provenance gates (fail closed)
const engineRepo =
  meta?.source?.repo ||
  meta?.engine?.repo ||
  meta?.repo;

const engineCommit =
  meta?.source?.commit ||
  meta?.engine?.commit ||
  meta?.commit;

if (!engineRepo || !engineCommit) {
  die("Tier-1 contract gate failed: meta.json must include engine repo + commit (provenance)");
}

// Read + parse Tier-1 CSV
const tierRaw = read(tier1Path);
const tierRows = parseCsv(tierRaw);

if (!tierRows.length) die("Tier-1 contract gate failed: tier1.csv is empty");

// Expect columns: rank, operator, score, confidence, locations, priority
// (We accept minor header variations but require operator+rank at minimum.)
const norm = (s) => String(s ?? "").trim().toLowerCase();
function pick(row, keys) {
  for (const k of keys) {
    const hit = Object.keys(row).find(h => norm(h) === norm(k));
    if (hit) return row[hit];
  }
  return "";
}

const queue = tierRows.map((r) => {
  const rank = Number(pick(r, ["rank"])) || null;
  const operator = pick(r, ["operator", "operator_name", "name"]);
  const score = Number(pick(r, ["score", "composite", "composite_score"])) || null;
  const confidence = Number(pick(r, ["confidence", "confidence_score"])) || null;
  const locations = Number(pick(r, ["locations", "location_count"])) || null;
  const priority = pick(r, ["priority"]) || "Immediate";

  if (!operator) die("Tier-1 contract gate failed: missing operator name in tier1.csv row");

  return {
    rank,
    operator_name: operator,
    locations,
    composite_score: score,
    confidence_score: confidence,
    priority,
    outreach_status: "uncontacted",
  };
});

// Deterministic sort: rank asc, then locations desc, then confidence desc, then operator_name
queue.sort((a, b) => {
  const ra = a.rank ?? 9e9;
  const rb = b.rank ?? 9e9;
  if (ra !== rb) return ra - rb;

  const la = a.locations ?? -1;
  const lb = b.locations ?? -1;
  if (la !== lb) return lb - la;

  const ca = a.confidence_score ?? -1;
  const cb = b.confidence_score ?? -1;
  if (ca !== cb) return cb - ca;

  return a.operator_name.localeCompare(b.operator_name);
});

// Write outputs
const outMeta = {
  generated_at: isoNow(),
  tier1_contract: {
    source_repo: engineRepo,
    source_commit: engineCommit,
    meta_path: "data/tier1/meta.json",
    tier1_path: "data/tier1/tier1.csv",
    evidence_path: "data/tier1/evidence.manifest.json",
    pull_meta_present: Boolean(pullMeta),
  },
  counts: {
    tier1_rows: queue.length,
  },
  notes: [
    "CIAG does not score prospects.",
    "CIAG consumes Tier-1 list read-only from ago-tier1-engine export contract.",
  ],
};

const jsonl = queue.map(x => JSON.stringify(x)).join("\\n") + (queue.length ? "\\n" : "");
const csvHeader = ["rank","operator_name","locations","composite_score","confidence_score","priority","outreach_status"].join(",");
const csvLines = [csvHeader].concat(queue.map(x => ([
  String(x.rank ?? ""),
  escCsv(x.operator_name),
  String(x.locations ?? ""),
  String(x.composite_score ?? ""),
  String(x.confidence_score ?? ""),
  escCsv(x.priority),
  escCsv(x.outreach_status),
].join(","))));
const csv = csvLines.join("\\n") + "\\n";

fs.writeFileSync(path.join(OUT_DIR, "queue.jsonl"), jsonl);
fs.writeFileSync(path.join(OUT_DIR, "queue.csv"), csv);
fs.writeFileSync(path.join(OUT_DIR, "meta.json"), JSON.stringify(outMeta, null, 2) + "\\n");

// Minimal operator output
process.stdout.write("CIAG outreach queue generated\\n");
process.stdout.write("Rows: " + queue.length + "\\n");
process.stdout.write("Outputs: out/reach/queue.csv, out/reach/queue.jsonl, out/reach/meta.json\\n");
process.stdout.write("Provenance: " + engineRepo + "@" + engineCommit + "\\n");

// Evidence is not reprocessed here by design; it remains as the audit attachment referenced by contract.
void evidence;
`;

writeIfChanged(generatorPath, generator);
try { fs.chmodSync(generatorPath, 0o755); } catch {}

// Optionally add npm script (safe + idempotent)
const pkgPath = path.join(ROOT, "package.json");
if (exists(pkgPath)) {
  try {
    const pkg = JSON.parse(read(pkgPath));
    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts["ciag:queue"]) pkg.scripts["ciag:queue"] = "node scripts/generate_outreach_queue_from_tier1_v1.mjs";
    writeIfChanged(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    // If package.json is non-JSON or otherwise special, we do not mutate it.
    // Generator can still be invoked directly via node.
  }
}

run("npm run build");
