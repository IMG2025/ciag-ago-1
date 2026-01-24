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
