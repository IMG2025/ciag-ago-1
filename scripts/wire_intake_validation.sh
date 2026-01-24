#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cat > "$ROOT_DIR/src/index.ts" <<'TS'
import { validateIntake } from './intake/validateIntake.js';

const sampleIntake = {
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
    primary: 'Automate operations',
    timeline_months: 12,
  },
  constraints: {
    budget_usd: 5000,
    regulatory: [],
  },
};

const result = validateIntake(sampleIntake);

console.log(JSON.stringify(result, null, 2));
TS

cd "$ROOT_DIR"
npm run build
