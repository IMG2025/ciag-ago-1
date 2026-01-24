#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

mkdir -p "$ROOT_DIR/src/render"

cat > "$ROOT_DIR/src/render/tokens.ts" <<'TS'
export type TokenMap = Record<string, string>;

export function formatRegulatory(reg: unknown): string {
  if (!Array.isArray(reg)) return '';
  return reg.length ? reg.join(', ') : '';
}

export function buildTokenMap(intake: any, tier: string): TokenMap {
  const company = intake.company ?? {};
  const founder = intake.founder ?? {};
  const objectives = intake.objectives ?? {};
  const constraints = intake.constraints ?? {};

  const runDate = new Date().toISOString().slice(0, 10);

  return {
    COMPANY_NAME: String(company.name ?? ''),
    INDUSTRY: String(company.industry ?? ''),
    EMPLOYEES: String(company.employees ?? ''),
    REVENUE_RANGE: String(company.revenue_range ?? ''),
    FOUNDER_ROLE: String(founder.role ?? ''),
    DECISION_AUTHORITY: String(founder.decision_authority ?? ''),
    OBJECTIVE_PRIMARY: String(objectives.primary ?? ''),
    TIMELINE_MONTHS: String(objectives.timeline_months ?? ''),
    BUDGET_USD: String(constraints.budget_usd ?? ''),
    REGULATORY: formatRegulatory(constraints.regulatory),
    TIER: String(tier),
    RUN_DATE: runDate,
  };
}
TS

cat > "$ROOT_DIR/src/render/renderTemplate.ts" <<'TS'
import { TokenMap } from './tokens.js';

export function renderTemplate(template: string, tokens: TokenMap): string {
  let out = template;

  for (const [key, value] of Object.entries(tokens)) {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    out = out.replace(pattern, value);
  }

  // Hard gate: no unresolved tokens allowed
  const unresolved = out.match(/\{\{[A-Z0-9_]+\}\}/g);
  if (unresolved && unresolved.length) {
    const unique = Array.from(new Set(unresolved)).sort();
    throw new Error(`Unresolved tokens: ${unique.join(', ')}`);
  }

  return out;
}
TS

cd "$ROOT_DIR"
npm run build
