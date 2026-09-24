export type FinancialProgressEventKind =
  | "lesson"
  | "savings_goal"
  | "goal_reached"
  | "bond_started"
  | "bond_return";

export type FinancialProgressEvent = {
  id: string;
  kind: FinancialProgressEventKind;
  title: string;
  detail: string;
  occurredAt: string;
};

export type FinancialSkillEvidence = {
  id:
    | "money-management"
    | "saving-planning"
    | "budgeting"
    | "risk-return"
    | "financial-decisions";
  title: string;
  description: string;
  evidence: string[];
  upcoming: string;
};

export type FinancialProgressSnapshot = {
  foundationCompleted: number;
  foundationTotal: number;
  foundationRewardEarned: number;
  goalsCreated: number;
  goalsReached: number;
  bondsStarted: number;
  returnsCollected: number;
  appliedActions: number;
  history: FinancialProgressEvent[];
  skills: FinancialSkillEvidence[];
};

export const EMPTY_FINANCIAL_PROGRESS: FinancialProgressSnapshot = {
  foundationCompleted: 0,
  foundationTotal: 6,
  foundationRewardEarned: 0,
  goalsCreated: 0,
  goalsReached: 0,
  bondsStarted: 0,
  returnsCollected: 0,
  appliedActions: 0,
  history: [],
  skills: [
    {
      id: "money-management",
      title: "Money Management",
      description: "Priorities, available resources and everyday money choices.",
      evidence: [],
      upcoming: "More evidence will come from budgeting and decision simulations.",
    },
    {
      id: "saving-planning",
      title: "Saving & Planning",
      description: "Goals, reserves and planning ahead for future needs.",
      evidence: [],
      upcoming: "More evidence will come from longer planning challenges.",
    },
    {
      id: "budgeting",
      title: "Budgeting",
      description: "Allocating limited resources across competing priorities.",
      evidence: [],
      upcoming: "The Budget Simulator will begin assessing this skill.",
    },
    {
      id: "risk-return",
      title: "Risk & Return",
      description: "Understanding uncertainty, fixed returns and changing value.",
      evidence: [],
      upcoming: "Risk Lab and Exchange activities will add stronger evidence later.",
    },
    {
      id: "financial-decisions",
      title: "Financial Decisions",
      description: "Comparing options, trade-offs and consequences before acting.",
      evidence: [],
      upcoming: "Case studies and branching decisions will add deeper evidence later.",
    },
  ],
};
