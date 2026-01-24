export interface IntakePayload {
  company: {
    name: string;
    industry: string;
    employees: number;
    revenue_range: string;
  };
  founder: {
    role: string;
    decision_authority: boolean;
  };
  objectives: {
    primary: string;
    timeline_months: number;
  };
  constraints: {
    budget_usd: number;
    regulatory: string[];
  };
}
