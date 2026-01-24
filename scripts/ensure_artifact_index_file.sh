#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/artifacts"
INDEX_FILE="$ART_DIR/artifact-index.json"

mkdir -p "$ART_DIR"

# Canonical artifact index (overwrite is idempotent)
cat > "$INDEX_FILE" <<'JSON'
{
  "T1": [
    "governance-gap-map.md",
    "readiness-scorecard.md",
    "risk-drift-register.md",
    "build-deferral-flags.md"
  ],
  "T2": [
    "target-operating-model.md",
    "ai-architecture.md",
    "governance-controls.md",
    "execution-roadmap.md"
  ],
  "T3": [
    "agent-architecture.md",
    "workflow-spec.md",
    "kpi-roi-model.md",
    "platform-transition.md"
  ]
}
JSON

cd "$ROOT_DIR"
npm run build
