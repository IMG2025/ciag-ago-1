#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/intake.t2.json" <<'JSON'
{
  "company": {
    "name": "BlueprintCo",
    "industry": "Healthcare",
    "employees": 50,
    "revenue_range": "1–5M"
  },
  "founder": {
    "role": "COO",
    "decision_authority": true
  },
  "objectives": {
    "primary": "Operating blueprint",
    "timeline_months": 12
  },
  "constraints": {
    "budget_usd": 15000,
    "regulatory": ["HIPAA"]
  }
}
JSON

cat > "$ROOT_DIR/intake.t3.json" <<'JSON'
{
  "company": {
    "name": "PilotCo",
    "industry": "Finance",
    "employees": 200,
    "revenue_range": "10M+"
  },
  "founder": {
    "role": "CTO",
    "decision_authority": true
  },
  "objectives": {
    "primary": "Pilot autonomous agent",
    "timeline_months": 6
  },
  "constraints": {
    "budget_usd": 50000,
    "regulatory": ["SOX"]
  }
}
JSON

cd "$ROOT_DIR"
npm run build
