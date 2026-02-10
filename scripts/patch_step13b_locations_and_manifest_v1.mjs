#!/usr/bin/env node
/**
 * Step 13B — Propagate operator.locations into triage outputs + write run manifest.
 * - Fix: pilot-runbook.md currently shows Locations: null even though funnel prequal has locations.
 * - Add: out/manifests/<slug>.run.json (hashes + inputs/outputs pointers) for auditability.
 *
 * Guardrails:
 * - Zero hand edits (scripted transforms only)
 * - Idempotent
 * - Must end with npm run build
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execSync } from "node:child_process";

function run(cmd) { execSync(cmd, { stdio: "inherit" }); }
function sh(cmd) { return execSync(cmd, { encoding: "utf8" }).trim(); }
function exists(p) { return fs.existsSync(p); }
function read(p) { return fs.readFileSync(p, "utf8"); }
function writeIfChanged(p, next) {
  const prev = exists(p) ? read(p) : "";
  if (prev !== next) fs.writeFileSync(p, next);
}
function chmod755(p) { try { fs.chmodSync(p, 0o755); } catch {} }
function ensureDir(p) { if (!exists(p)) fs.mkdirSync(p, { recursive: true }); }
function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function jsonParseFile(p) { return JSON.parse(read(p)); }

const ROOT = sh("git rev-parse --show-toplevel");
process.chdir(ROOT);

const PILOT_RUNBOOK = path.join("scripts", "generate_pilot_runbook_from_recommendation_v1.mjs");
const SALES_FUNNEL = path.join("scripts", "ciag_sales_funnel_e2e_v1.mjs");
const MANIFEST = path.join("scripts", "generate_run_manifest_v1.mjs");

if (!exists(PILOT_RUNBOOK)) throw new Error(`Missing: ${PILOT_RUNBOOK}`);
if (!exists(SALES_FUNNEL)) throw new Error(`Missing: ${SALES_FUNNEL}`);

// ---------- 1) Patch pilot runbook generator to resolve locations deterministically ----------
{
  let src = read(PILOT_RUNBOOK);

  // Insert helper only once.
  if (!src.includes("function resolveLocationsForSlug")) {
    const helper = `
function resolveLocationsForSlug(slug) {
  // Priority order:
  // 1) .ago/operator_selected.json (if it contains locations)
  // 2) out/reach/<slug>/prequal.json (funnel output)
  // 3) out/sales/<slug>/02_pipeline_state.json (if present)
  // Fallback: null
  try {
    const sel = ".ago/operator_selected.json";
    if (fs.existsSync(sel)) {
      const j = JSON.parse(fs.readFileSync(sel, "utf8"));
      const n = j?.locations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  try {
    const pq = path.join("out", "reach", slug, "prequal.json");
    if (fs.existsSync(pq)) {
      const j = JSON.parse(fs.readFileSync(pq, "utf8"));
      const n = j?.locations ?? j?.reported_locations ?? j?.reportedLocations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  try {
    const st = path.join("out", "sales", slug, "02_pipeline_state.json");
    if (fs.existsSync(st)) {
      const j = JSON.parse(fs.readFileSync(st, "utf8"));
      const n = j?.locations;
      if (Number.isFinite(n)) return n;
    }
  } catch {}

  return null;
}
`.trimStart();

    // Anchor: we need fs/path imported already; if not, we add minimal imports.
    // We won't guess structure too hard; safest is to append helper after imports block.
    // Insert after the last import line.
    const lines = src.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith("import ")) lastImportIdx = i;
    }
    if (lastImportIdx >= 0) {
      lines.splice(lastImportIdx + 1, 0, "", helper);
      src = lines.join("\n");
    } else {
      // Fallback: prepend helper at top (rare).
      src = `${helper}\n\n${src}`;
    }
  }

  // Ensure we actually *use* resolved locations when writing the runbook.
  // Replace a likely locations assignment or placeholder with a deterministic lookup.
  // We do this conservatively:
  // - If we can find "Locations:" rendering, ensure it uses a variable `locations`.
  // - If `locations` not defined, define it from slug.
  if (!src.includes("const locations = resolveLocationsForSlug")) {
    // Insert near where slug is known. We search for first occurrence of "slug" variable usage.
    const marker = "slug";
    const idx = src.indexOf(marker);
    if (idx !== -1) {
      // Insert after the first line containing "slug"
      const rows = src.split("\n");
      const lineIdx = rows.findIndex(l => l.includes("slug"));
      if (lineIdx !== -1) {
        rows.splice(lineIdx + 1, 0, `const locations = resolveLocationsForSlug(slug);`);
        src = rows.join("\n");
      }
    }
  }

  // Normalize runbook header line if it renders Locations as null; we enforce `${locations ?? "unknown"}`
  // Replace "**Locations:** " line content generation if present.
  // We cannot assume exact template, so we patch common patterns.
  src = src
    .replace(/\*\*Locations:\*\*\s*\$\{[^}]+\}/g, `**Locations:** \${locations ?? "unknown"}`)
    .replace(/\*\*Locations:\*\*\s*null/g, `**Locations:** \${locations ?? "unknown"}`);

  writeIfChanged(PILOT_RUNBOOK, src);
}

// Syntax gate for pilot runbook generator
run(`node --check "${PILOT_RUNBOOK}"`);

// ---------- 2) Add manifest generator script (idempotent) ----------
{
  const code = `#!/usr/bin/env node
/**
 * generate_run_manifest_v1.mjs
 * Writes out/manifests/<slug>.run.json with sha256 hashes of key artifacts.
 * Intended for audit-grade traceability.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function exists(p){ return fs.existsSync(p); }
function read(p){ return fs.readFileSync(p); }
function ensureDir(p){ if(!exists(p)) fs.mkdirSync(p,{recursive:true}); }
function sha256File(p){
  const buf = read(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function arg(name){
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  return process.argv[i+1] ?? null;
}

const slug = arg("--slug");
if (!slug) throw new Error("Missing --slug <operator-slug>");

const tier1 = arg("--tier1");
const intake = arg("--intake");

const outDir = path.join("out","manifests");
ensureDir(outDir);

const triageDir = path.join("docs","triage",\`TRG-\${slug}\`);
const reachDir  = path.join("out","reach",slug);
const salesDir  = path.join("out","sales",slug);

const candidates = [
  tier1 ? { kind:"input:tier1", path:tier1 } : null,
  intake ? { kind:"input:intake", path:intake } : null,
  { kind:"reach:prequal", path:path.join(reachDir,"prequal.json") },
  { kind:"reach:letter", path:path.join(reachDir,"letter.md") },
  { kind:"sales:source", path:path.join(salesDir,"00_source.json") },
  { kind:"sales:outreach_letter", path:path.join(salesDir,"01_outreach_letter.md") },
  { kind:"sales:pipeline_state", path:path.join(salesDir,"02_pipeline_state.json") },
  { kind:"triage:evidence", path:path.join(triageDir,"evidence.json") },
  { kind:"triage:risk_register", path:path.join(triageDir,"risk-register.csv") },
  { kind:"triage:recommendation", path:path.join(triageDir,"recommendation.md") },
  { kind:"triage:pilot_runbook", path:path.join(triageDir,"pilot-runbook.md") },
].filter(Boolean);

const artifacts = candidates
  .filter(a => exists(a.path))
  .map(a => ({ ...a, sha256: sha256File(a.path) }));

const manifest = {
  slug,
  generatedAt: new Date().toISOString(),
  artifacts,
};

const outPath = path.join(outDir, \`\${slug}.run.json\`);
fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2));
console.log("Run manifest written:", outPath);
`.trim() + "\n";

  writeIfChanged(MANIFEST, code);
  chmod755(MANIFEST);
}
run(`node --check "${MANIFEST}"`);

// ---------- 3) Wire manifest generation into sales funnel e2e ----------
{
  let src = read(SALES_FUNNEL);

  // Add a call near completion if not present.
  if (!src.includes("generate_run_manifest_v1.mjs")) {
    // Insert just before the final success log if present, else append at end.
    const lines = src.split("\n");
    const successIdx = lines.findIndex(l => l.includes("Sales Funnel E2E complete"));
    const hook = [
      "",
      `// Step 13B: write audit manifest (non-destructive, deterministic)`,
      `try {`,
      `  const args = [];`,
      `  args.push("--slug", slug);`,
      `  if (tier1Path) args.push("--tier1", tier1Path);`,
      `  if (intakePath) args.push("--intake", intakePath);`,
      `  run(\`node scripts/generate_run_manifest_v1.mjs \${args.map(x=>String(x)).join(" ")}\`);`,
      `} catch (e) {`,
      `  // Manifest is audit support; do not fail the pipeline on manifest write.`,
      `  console.warn("WARN: manifest write failed:", e?.message ?? e);`,
      `}`,
      ""
    ];

    if (successIdx !== -1) {
      lines.splice(successIdx, 0, ...hook);
    } else {
      lines.push(...hook);
    }

    src = lines.join("\n");

    // Ensure tier1Path/intakePath variables exist in this script; if not, we’ll map from args.
    // We add a tiny normalization block only if needed.
    if (!src.includes("const tier1Path") || !src.includes("const intakePath")) {
      // crude but safe: if the identifiers aren't present, define them from parsed args
      if (!src.includes("const tier1Path")) src = src.replace(/const\s+slug\s*=\s*/m, `const tier1Path = args?.tier1 ?? args?.["--tier1"] ?? null;\nconst intakePath = args?.intake ?? args?.["--intake"] ?? null;\n\nconst slug = `);
      if (!src.includes("const intakePath")) {
        // if tier1Path insert didn't happen, add both after slug parse line
        const rows = src.split("\n");
        const li = rows.findIndex(l => l.includes("const slug"));
        if (li !== -1) rows.splice(li + 1, 0, `const tier1Path = args?.tier1 ?? args?.["--tier1"] ?? null;`, `const intakePath = args?.intake ?? args?.["--intake"] ?? null;`);
        src = rows.join("\n");
      }
    }

    writeIfChanged(SALES_FUNNEL, src);
  }
}
run(`node --check "${SALES_FUNNEL}"`);

// ---------- Final required gate ----------
run("npm run build");

console.log("Step 13B complete: locations propagation + run manifest wired.");
