#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/run.ts" <<'TS'
import fs from 'fs';
import path from 'path';
import { EXIT_CODES } from './status.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (process.argv.length < 3) {
  console.error('Usage: ciag-ago run <intake.json>');
  process.exit(EXIT_CODES.SYSTEM_ERROR);
}

const intakePath = path.resolve(process.cwd(), process.argv[2]);

if (!fs.existsSync(intakePath)) {
  console.error(`Intake file not found: ${intakePath}`);
  process.exit(EXIT_CODES.SYSTEM_ERROR);
}

try {
  import('./pipeline/runPipeline.js');
} catch (err) {
  console.error('Pipeline execution failed');
  process.exit(EXIT_CODES.PIPELINE_ERROR);
}
TS

cd "$ROOT_DIR"
npm run build
