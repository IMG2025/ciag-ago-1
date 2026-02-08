#!/usr/bin/env node
/**
 * Step 10A — Seed evidence schema + generator (idempotent)
 * - Adds scripts/seed_evidence_for_selected_operator_v1.mjs
 * - Adds npm script: ciag:evidence (if package.json exists)
 * - Ends with npm run build (required gate)
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
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }

const ROOT = process.cwd();
const scriptsDir = path.join(ROOT, "scripts");
if (!exists(scriptsDir)) fs.mkdirSync(scriptsDir, { recursive: true });

const GEN = path.join("scripts", "seed_evidence_for_selected_operator_v1.mjs");

const generatorSrc = `#!/usr/bin/env node
/**
 * Evidence Seeder v1 (idempotent, deterministic)
 * Inputs:
 *  - .ago/operator_selected.json (authoritative)
 * Output:
 *  - docs/triage/TRG-<operator_slug>/evidence.json
 *
 * Behavior:
 *  - Creates/merges evidence.json (no duplicates)
 *  - Deterministic IDs based on content hash
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function exists(p) { return fs.existsSync(p); }
function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }
function writeJson(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2) + "\\n"); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

function stableId(parts) {
  const s = parts.map(v => (v ?? "")).join("|");
  return crypto.createHash("sha1").update(s).digest("hex");
}

const ROOT = process.cwd();
const SEL = path.join(ROOT, ".ago", "operator_selected.json");
if (!exists(SEL)) throw new Error("Missing .ago/operator_selected.json (run selection step first)");

const op = readJson(SEL);
const name = op.operator_name || op.name || "UNKNOWN";
const slug = op.operator_slug || op.slug || op.operator || op.name || "";
if (!slug || String(slug).trim().length === 0) throw new Error("Invalid operator_selected.json: missing operator_slug/slug/operator/name");
const locations = Number(op.locations ?? 0) || 0;

const TRIAGE_ROOT = path.join(ROOT, "docs", "triage");
mkdirp(TRIAGE_ROOT);

const dir = path.join(TRIAGE_ROOT, \`TRG-\${slug}\`);
mkdirp(dir);

const OUT = path.join(dir, "evidence.json");

const now = new Date().toISOString();

const base = {
  schemaVersion: "evidence.v1",
  operator: { name, slug, locations },
  meta: {
    createdAt: now,
    updatedAt: now,
    provenance: {
      selectedOperatorPath: ".ago/operator_selected.json",
      generator: "scripts/seed_evidence_for_selected_operator_v1.mjs"
    }
  },
  items: []
};

// Load existing if present
let prev = null;
if (exists(OUT)) {
  try { prev = readJson(OUT); } catch { prev = null; }
}

const existingItems = Array.isArray(prev?.items) ? prev.items : [];
const byId = new Map();
for (const it of existingItems) {
  if (it && it.id) byId.set(it.id, it);
}

// Minimal placeholder set (governance-safe; confidence=0; status=missing)
// These are NOT claims. They are structured “evidence gaps” to fill.
const placeholders = [
  { category: "core_systems", systemType: "PMS",        vendor: null, product: null, claim: "PMS vendor/product not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Fill with authoritative vendor evidence (contract, vendor portal, or operator confirmation).", tags: ["tier1", "system"] },
  { category: "core_systems", systemType: "POS",        vendor: null, product: null, claim: "POS vendor/product not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "If hotels: confirm POS presence; if limited-service may be minimal.", tags: ["tier1", "system"] },
  { category: "core_systems", systemType: "HRIS",       vendor: null, product: null, claim: "HRIS vendor/product not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Capture HRIS and payroll adjacency.", tags: ["workforce", "system"] },
  { category: "core_systems", systemType: "WFM",        vendor: null, product: null, claim: "Workforce/WFM vendor not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Scheduling/labor optimization is a primary AI surface in hospitality.", tags: ["workforce", "system"] },
  { category: "core_systems", systemType: "Scheduling", vendor: null, product: null, claim: "Scheduling tool not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Often overlaps with WFM; confirm toolchain.", tags: ["workforce", "system"] },
  { category: "core_systems", systemType: "Payments",   vendor: null, product: null, claim: "Payment processor not yet evidenced", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "PCI adjacency; confirm processor + gateway + PMS integration.", tags: ["pci", "system"] },

  { category: "ai_exposure", systemType: "Other", vendor: null, product: null, claim: "AI-enabled vendor features not yet enumerated", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Examples: fraud detection, dynamic pricing, resume screening, forecasting.", tags: ["ai", "exposure"] },

  { category: "compliance_surface", systemType: "Payments", vendor: null, product: null, claim: "PCI scope/adjacency not yet mapped", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Determine card data environment boundaries and service providers.", tags: ["pci", "compliance"] },

  { category: "data_categories", systemType: "HRIS", vendor: null, product: null, claim: "PII categories processed not yet enumerated", evidenceType: "unknown", source: { url: null, ref: null, capturedAt: now }, confidence: 0, status: "missing", notes: "Payroll, SSN, contact info, scheduling data, performance notes.", tags: ["pii", "data"] }
];

for (const p of placeholders) {
  const id = stableId([base.operator.slug, p.category, p.systemType, p.vendor, p.product, p.claim]);
  if (!byId.has(id)) {
    byId.set(id, { id, ...p });
  }
}

// Merge back out
const mergedItems = Array.from(byId.values());

// Preserve createdAt if prior exists; update updatedAt always
const createdAt = (typeof prev?.meta?.createdAt === "string" && prev.meta.createdAt) ? prev.meta.createdAt : base.meta.createdAt;

const next = {
  ...base,
  operator: { name, slug, locations },
  meta: {
    ...base.meta,
    createdAt,
    updatedAt: now,
    provenance: base.meta.provenance
  },
  items: mergedItems
};

writeJson(OUT, next);
console.log("Evidence seeded:", path.relative(ROOT, OUT));
console.log("Items:", next.items.length);
`;

writeIfChanged(path.join(ROOT, GEN), generatorSrc);
chmod755(path.join(ROOT, GEN));

// Add npm script if possible
const pkgPath = path.join(ROOT, "package.json");
if (exists(pkgPath)) {
  try {
    const pkg = JSON.parse(read(pkgPath));
    pkg.scripts = pkg.scripts || {};
    if (!pkg.scripts["ciag:evidence"]) pkg.scripts["ciag:evidence"] = "node scripts/seed_evidence_for_selected_operator_v1.mjs";
    writeIfChanged(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  } catch {
    // If package.json is non-JSON, do not mutate.
  }
}

// Gate
run("npm run build");
