#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/pipeline/runPipeline.ts" <<'TS'
import fs from 'fs';
import path from 'path';
import { validateIntake } from '../intake/validateIntake.js';
import { resolveTier } from './resolveTier.js';
import { buildTokenMap } from '../render/tokens.js';
import { renderTemplate } from '../render/renderTemplate.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PipelineResult {
  accepted: boolean;
  tier?: string;
  outputDir?: string;
  reasons?: string[];
}

const intakePath = process.argv[2];
const intake = JSON.parse(fs.readFileSync(intakePath, 'utf-8'));

const validation = validateIntake(intake);

if (!validation.accepted) {
  console.log(JSON.stringify({ accepted: false, reasons: validation.reasons }, null, 2));
  process.exit(0);
}

const tier = resolveTier(intake);

const artifactIndexPath = path.resolve(__dirname, '../../../artifacts/artifact-index.json');
const artifactIndex = JSON.parse(fs.readFileSync(artifactIndexPath, 'utf-8')) as Record<string, string[]>;
const artifacts = artifactIndex[tier];

const clientId = String(intake.company?.name ?? 'client').replace(/\s+/g, '-').toLowerCase();
const outputDir = path.resolve(__dirname, `../../../output/${clientId}/${tier}`);
fs.mkdirSync(outputDir, { recursive: true });

const tokens = buildTokenMap(intake, tier);

for (const artifact of artifacts) {
  const src = path.resolve(__dirname, `../../../artifacts/${tier}/${artifact}`);
  const dest = path.join(outputDir, artifact);

  const template = fs.readFileSync(src, 'utf-8');
  const rendered = renderTemplate(template, tokens);
  fs.writeFileSync(dest, rendered, 'utf-8');
}

const result: PipelineResult = { accepted: true, tier, outputDir };
console.log(JSON.stringify(result, null, 2));
TS

cd "$ROOT_DIR"
npm run build
