#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ---------------------------------------
# Fix ESM import extensions explicitly
# ---------------------------------------

cat > "$ROOT_DIR/src/intake/disqualification.rules.ts" <<'TS'
import fs from 'fs';
import path from 'path';

export interface DisqualificationRules {
  minimum_budget_usd: number;
  requires_decision_author: boolean;
  max_timeline_months: number;
}

export function loadDisqualificationRules(): DisqualificationRules {
  const rulesPath = path.resolve('rules/disqualification.rules.json');
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  return JSON.parse(raw) as DisqualificationRules;
}
TS

cat > "$ROOT_DIR/src/intake/validateIntake.ts" <<'TS'
import { IntakePayload } from './intake.types.js';
import { loadDisqualificationRules } from './disqualification.rules.js';

export interface ValidationResult {
  accepted: boolean;
  reasons: string[];
}

export function validateIntake(intake: IntakePayload): ValidationResult {
  const rules = loadDisqualificationRules();
  const reasons: string[] = [];

  if (intake.constraints.budget_usd < rules.minimum_budget_usd) {
    reasons.push('Budget below minimum threshold');
  }

  if (rules.requires_decision_author && !intake.founder.decision_authority) {
    reasons.push('No decision authority');
  }

  if (intake.objectives.timeline_months > rules.max_timeline_months) {
    reasons.push('Timeline exceeds governance limit');
  }

  return {
    accepted: reasons.length === 0,
    reasons,
  };
}
TS

cd "$ROOT_DIR"
npm run build
