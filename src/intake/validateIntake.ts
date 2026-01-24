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
