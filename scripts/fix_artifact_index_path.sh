#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/pipeline/runPipeline.ts" <<'TS'
import fs from 'fs';
import path from 'path';
import { validateIntake } from '../intake/validateIntake.js';
import { fileURLToPath } from 'url';

// ESM-safe module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PipelineResult {
  accepted: boolean;
  tier?: string;
  outputDir?: string;
  reasons?: string[];
}

// --- SAMPLE INTAKE (placeholder)
const intake = {
  company: {
    name: 'SampleCo',
    industry: 'SaaS',
    employees: 10,
    revenue_range: '<1M',
  },
  founder: {
    role: 'CEO',
    decision_authority: true,
  },
  objectives: {
    primary: 'Governance diagnostic',
    timeline_months: 12,
  },
  constraints: {
    budget_usd: 5000,
    regulatory: [],
  },
};

// --- VALIDATION
const validation = validateIntake(intake);

if (!validation.accepted) {
  const result: PipelineResult = {
    accepted: false,
    reasons: validation.reasons,
  };

  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

// --- TIER (v1 deterministic)
const tier = 'T1';

// --- LOAD ARTIFACT INDEX (module-relative)
const artifactIndexPath = path.resolve(
  __dirname,
  '../../../artifacts/artifact-index.json',
);

const artifactIndex = JSON.parse(
  fs.readFileSync(artifactIndexPath, 'utf-8'),
) as Record<string, string[]>;

const artifacts = artifactIndex[tier];

// --- OUTPUT DIR
const clientId = intake.company.name.replace(/\s+/g, '-').toLowerCase();
const outputDir = path.resolve(
  __dirname,
  `../../../output/${clientId}/${tier}`,
);

fs.mkdirSync(outputDir, { recursive: true });

// --- COPY ARTIFACTS
for (const artifact of artifacts) {
  const src = path.resolve(
    __dirname,
    `../../../artifacts/${tier}/${artifact}`,
  );
  const dest = path.join(outputDir, artifact);
  fs.copyFileSync(src, dest);
}

// --- RESULT
const result: PipelineResult = {
  accepted: true,
  tier,
  outputDir,
};

console.log(JSON.stringify(result, null, 2));
TS

cd "$ROOT_DIR"
npm run build
