#!/usr/bin/env node
/**
 * Step 10D — Evidence Threshold Policy (Option A)
 * - Adds governance policy artifact (docs/policy/governance_policy_v1.json)
 * - Adds policy enforcement script (scripts/apply_policy_to_risk_register_v1.mjs)
 * - Wires package.json scripts
 * - Adds operator-facing policy stub doc
 *
 * Idempotent. Must end with npm run build.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

const ROOT = execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
process.chdir(ROOT);

// --- 1) Governance policy artifact
ensureDir(path.join("docs", "policy"));

const POLICY_PATH = path.join("docs", "policy", "governance_policy_v1.json");
const policy = {
  id: "governance_policy_threshold_v1",
  version: "1.0.0",
  type: "evidence_threshold",
  description: "Mitigate system-scoped risks only when observed evidence meets a minimum confidence threshold.",
  threshold: {
    minConfidence: 7,
    requiredStatus: "observed"
  },
  mapping: {
    onMitigate: {
      status: "Mitigated",
      likelihood: "Low",
      notesTag: "policy=threshold-v1"
    }
  },
  inputs: {
    operatorSelected: ".ago/operator_selected.json",
    evidenceJson: "docs/triage/TRG-<operator_slug>/evidence.json",
    riskRegisterCsv: "docs/triage/TRG-<operator_slug>/risk-register.csv"
  },
  guardrails: {
    failClosed: true,
    doNotMutateIfMissingInputs: true
  }
};
writeIfChanged(POLICY_PATH, JSON.stringify(policy, null, 2) + "\n");

// --- 2) Operator-facing doc stub
const DOC_PATH = path.join("docs", "policy", "CIAG_POLICY_THRESHOLD_V1.md");
const doc = `# CIAG Policy — Evidence Threshold (v1)

## Purpose
This policy prevents "paper mitigation." Risks only move to **Mitigated** when we have **observed evidence** at or above a defined confidence threshold.

## Enforcement Rules (v1)
A risk row is eligible for mitigation only if:
- The risk row has **system_type** populated (e.g., PMS, POS, HRIS, Payments).
- There exists an evidence item where:
  - \`item.systemType === row.system_type\`
  - \`item.status === "observed"\`
  - \`item.confidence >= 7\`

## Automated Effects
When the threshold is met:
- \`status\` becomes **Mitigated**
- \`likelihood\` becomes **Low**
- \`notes\` is appended with: \`policy=threshold-v1; derivedFromEvidence=[<evidenceId>]\`

## Audit Notes
- This policy is deterministic, fail-closed, and system-scoped.
- The authoritative policy JSON is: \`docs/policy/governance_policy_v1.json\`
`;
writeIfChanged(DOC_PATH, doc);

// --- 3) Policy enforcement script
const APPLY_PATH = path.join("scripts", "apply_policy_to_risk_register_v1.mjs");

const applySrc = `#!/usr/bin/env node
/**
 * Apply Evidence Threshold Policy (v1) to selected operator risk register.
 * - Reads: .ago/operator_selected.json
 * - Reads: docs/triage/TRG-<slug>/evidence.json
 * - Reads/Writes: docs/triage/TRG-<slug>/risk-register.csv
 *
 * Idempotent: running repeatedly yields the same file once policy is satisfied.
 * Fail-closed when inputs are missing.
 */
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

function read(p) { return fs.readFileSync(p, "utf8"); }
function exists(p) { return fs.existsSync(p); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function die(msg) { throw new Error(msg); }

function getRepoRoot() {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
}

// Minimal CSV parser that supports quoted fields.
function parseCsv(text) {
  const lines = text.split(/\\r?\\n/).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const out = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; continue; }
        inQ = !inQ;
        continue;
      }
      if (ch === "," && !inQ) { out.push(cur); cur = ""; continue; }
      cur += ch;
    }
    out.push(cur);
    rows.push(out);
  }
  return rows;
}

function toCsv(rows) {
  const esc = (v) => {
    const s = v == null ? "" : String(v);
    if (/[",\\n\\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };
  return rows.map(r => r.map(esc).join(",")).join("\\n") + "\\n";
}

function idxOf(header, key) {
  const k = String(key).trim().toLowerCase();
  for (let i = 0; i < header.length; i++) {
    if (String(header[i] ?? "").trim().toLowerCase() === k) return i;
  }
  return -1;
}

const ROOT = getRepoRoot();
process.chdir(ROOT);

const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) die("Missing .ago/operator_selected.json (select operator first)");

const op = JSON.parse(read(SEL));
const slug = op.operator_slug || op.slug;
if (!slug || String(slug).trim().length === 0) die("Invalid operator_selected.json: missing operator_slug/slug");

const POLICY = path.join(ROOT, "docs", "policy", "governance_policy_v1.json");
if (!exists(POLICY)) die("Missing docs/policy/governance_policy_v1.json");
const policy = JSON.parse(read(POLICY));

const minConfidence = Number(policy?.threshold?.minConfidence ?? 7);
const requiredStatus = String(policy?.threshold?.requiredStatus ?? "observed");

const TRG = path.join(ROOT, "docs", "triage", \`TRG-\${slug}\`);
const EVID = path.join(TRG, "evidence.json");
const RISK = path.join(TRG, "risk-register.csv");

if (!exists(EVID)) die(\`Missing evidence: \${EVID}\`);
if (!exists(RISK)) die(\`Missing risk register: \${RISK}\`);

const evidenceDoc = JSON.parse(read(EVID));
const items = Array.isArray(evidenceDoc?.items) ? evidenceDoc.items : [];

function bestEvidenceFor(systemType) {
  const st = String(systemType || "").trim();
  if (!st) return null;
  const candidates = items
    .filter(i =>
      String(i?.systemType || "").trim() === st &&
      String(i?.status || "").trim() === requiredStatus &&
      Number(i?.confidence || 0) >= minConfidence
    )
    .sort((a, b) => (Number(b?.confidence || 0) - Number(a?.confidence || 0)));
  return candidates[0] || null;
}

const rows = parseCsv(read(RISK));
if (rows.length < 2) die("risk-register.csv has no rows");

const header = rows[0];
const sysIdx = idxOf(header, "system_type");
const statusIdx = idxOf(header, "status");
const likeIdx = idxOf(header, "likelihood");
const notesIdx = idxOf(header, "notes");
const evidRefsIdx = idxOf(header, "evidence_refs");

if (sysIdx < 0) die("risk-register.csv missing required column: system_type");
if (statusIdx < 0) die("risk-register.csv missing required column: status");
if (likeIdx < 0) die("risk-register.csv missing required column: likelihood");
if (notesIdx < 0) die("risk-register.csv missing required column: notes");
if (evidRefsIdx < 0) die("risk-register.csv missing required column: evidence_refs");

let changed = 0;

for (let r = 1; r < rows.length; r++) {
  const row = rows[r];

  const systemType = row[sysIdx];
  const ev = bestEvidenceFor(systemType);
  if (!ev) continue;

  const prevStatus = String(row[statusIdx] ?? "");
  const prevLike = String(row[likeIdx] ?? "");
  const prevNotes = String(row[notesIdx] ?? "");
  const prevRefs = String(row[evidRefsIdx] ?? "");

  const targetStatus = String(policy?.mapping?.onMitigate?.status ?? "Mitigated");
  const targetLike = String(policy?.mapping?.onMitigate?.likelihood ?? "Low");
  const tag = String(policy?.mapping?.onMitigate?.notesTag ?? "policy=threshold-v1");
  const evidId = String(ev?.id ?? "").trim();

  // evidence_refs is a JSON-ish list in this repo: keep it stable as "[]", or append.
  const nextRefs = (() => {
    const s = prevRefs.trim();
    if (!evidId) return s || "[]";
    if (!s || s === "[]") return \`["\${evidId}"]\`;
    if (s.includes(evidId)) return s;
    // best-effort append for formats like ["a","b"]
    if (s.startsWith("[") && s.endsWith("]")) {
      const inner = s.slice(1, -1).trim();
      return inner.length === 0 ? \`["\${evidId}"]\` : \`[\${inner},"\\\${evidId}"]\`.replace('\\\\', '');
    }
    return s; // fail-closed: don't mutate unknown format
  })();

  const noteAppend = \`\${tag}; derivedFromEvidence=[\${evidId}]\`;
  const nextNotes = prevNotes.includes(noteAppend)
    ? prevNotes
    : (prevNotes.trim().length ? (prevNotes.trim() + " | " + noteAppend) : noteAppend);

  let rowChanged = false;

  if (prevStatus !== targetStatus) { row[statusIdx] = targetStatus; rowChanged = true; }
  if (prevLike !== targetLike) { row[likeIdx] = targetLike; rowChanged = true; }
  if (row[evidRefsIdx] !== nextRefs) { row[evidRefsIdx] = nextRefs; rowChanged = true; }
  if (row[notesIdx] !== nextNotes) { row[notesIdx] = nextNotes; rowChanged = true; }

  if (rowChanged) changed++;
}

writeIfChanged(RISK, toCsv(rows));
console.log(\`Policy applied for \${slug}. Rows updated: \${changed}\`);
`;
writeIfChanged(APPLY_PATH, applySrc);
try { fs.chmodSync(APPLY_PATH, 0o755); } catch {}

// --- 4) Wire package.json scripts
const PKG = path.join(ROOT, "package.json");
if (!exists(PKG)) throw new Error("Missing package.json");
const pkg = JSON.parse(read(PKG));

pkg.scripts = pkg.scripts || {};
pkg.scripts["ciag:policy"] = "node scripts/apply_policy_to_risk_register_v1.mjs";

writeIfChanged(PKG, JSON.stringify(pkg, null, 2) + "\n");

// --- Gate
run("npm run build");
console.log("Step 10D policy threshold v1 installed.");
