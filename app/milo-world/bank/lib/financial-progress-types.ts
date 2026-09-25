export type FinancialProgressEventKind =
  | "lesson"
  | "course_completed"
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
  id: string;
  skillKey:
    | "money_management"
    | "saving_planning"
    | "budgeting"
    | "risk_return"
    | "markets"
    | "financial_decisions"
    | "business";
  title: string;
  description: string;
  stageLabel: "Not assessed yet" | "Evidence observed" | "Applied evidence" | "Demonstrated evidence";
  evidenceCount: number;
  evidencePoints: number;
  evidence: string[];
  upcoming: string;
};

export type FinancialCourseProgress = {
  courseId: string;
  title: string;
  plannedLessons: number;
  liveLessons: number;
  completedLessons: number;
  isCompleted: boolean;
  completedAt: string | null;
  advisorId: "nova" | "milo" | null;
  accessTier: "free" | "milo_finance";
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
  completedCourses: number;
  courses: FinancialCourseProgress[];
  history: FinancialProgressEvent[];
  skills: FinancialSkillEvidence[];
};

const EMPTY_SKILLS: FinancialSkillEvidence[] = [
  ["money-management", "money_management", "Money Management", "Priorities, liquidity and everyday use of available resources."],
  ["saving-planning", "saving_planning", "Saving & Planning", "Goals, reserves, time horizons and preparation for future needs."],
  ["budgeting", "budgeting", "Budgeting", "Allocating limited resources across competing priorities."],
  ["risk-return", "risk_return", "Risk & Return", "Understanding uncertainty, fixed returns, changing value and exposure."],
  ["markets", "markets", "Markets", "How market assets change in value and how portfolio exposure works."],
  ["financial-decisions", "financial_decisions", "Financial Decisions", "Comparing choices, trade-offs and consequences before acting."],
  ["business", "business", "Business", "Revenue, costs, profit, cash flow and enterprise decisions."],
].map(([id, skillKey, title, description]) => ({
  id,
  skillKey: skillKey as FinancialSkillEvidence["skillKey"],
  title,
  description,
  stageLabel: "Not assessed yet" as const,
  evidenceCount: 0,
  evidencePoints: 0,
  evidence: [],
  upcoming: "Future lessons, simulations and Milo World activity will add evidence here.",
}));

export const EMPTY_FINANCIAL_PROGRESS: FinancialProgressSnapshot = {
  foundationCompleted: 0,
  foundationTotal: 6,
  foundationRewardEarned: 0,
  goalsCreated: 0,
  goalsReached: 0,
  bondsStarted: 0,
  returnsCollected: 0,
  appliedActions: 0,
  completedCourses: 0,
  courses: [],
  history: [],
  skills: EMPTY_SKILLS,
};
