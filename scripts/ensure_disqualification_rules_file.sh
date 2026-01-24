#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RULES_DIR="$ROOT_DIR/rules"
RULES_FILE="$RULES_DIR/disqualification.rules.json"

mkdir -p "$RULES_DIR"

# Write canonical rules file (overwrite is idempotent)
cat > "$RULES_FILE" <<'JSON'
{
  "minimum_budget_usd": 2500,
  "requires_decision_author": true,
  "max_timeline_months": 24
}
JSON

cd "$ROOT_DIR"
npm run build
