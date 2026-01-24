#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/index.ts" <<'TS'
import './run.js';
TS

cd "$ROOT_DIR"
npm run build
