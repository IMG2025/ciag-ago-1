import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface DisqualificationRules {
  minimum_budget_usd: number;
  requires_decision_author: boolean;
  max_timeline_months: number;
}

// Resolve directory of this module (ESM-safe)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function loadDisqualificationRules(): DisqualificationRules {
  const rulesPath = path.resolve(__dirname, '../../../rules/disqualification.rules.json');
  const raw = fs.readFileSync(rulesPath, 'utf-8');
  return JSON.parse(raw) as DisqualificationRules;
}
