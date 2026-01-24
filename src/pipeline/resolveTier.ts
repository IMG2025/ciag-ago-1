interface Intake {
  objectives: {
    primary: string;
  };
  constraints: {
    budget_usd: number;
  };
}

export function resolveTier(intake: Intake): 'T1' | 'T2' | 'T3' {
  const objective = intake.objectives.primary.toLowerCase();
  const budget = intake.constraints.budget_usd;

  if (budget >= 25000 || objective.includes('pilot')) {
    return 'T3';
  }

  if (budget >= 10000 || objective.includes('blueprint')) {
    return 'T2';
  }

  return 'T1';
}
