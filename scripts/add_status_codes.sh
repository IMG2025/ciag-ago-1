#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/status.ts" <<'TS'
export const EXIT_CODES = {
  SUCCESS: 0,
  VALIDATION_REJECTED: 10,
  PIPELINE_ERROR: 20,
  SYSTEM_ERROR: 30,
} as const;
TS

cd "$ROOT_DIR"
npm run build
