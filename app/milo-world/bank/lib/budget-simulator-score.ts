import type {
  BudgetFinancialProfile,
  BudgetFinalWeekResult,
  BudgetResultsSummary,
} from "./budget-simulator-types";

export type BudgetScoreBreakdown = {
  key: "bills" | "cash_buffer" | "emergency" | "future" | "decisions";
  label: string;
  points: number;
  maxPoints: number;
  detail: string;
};

export type BudgetFinalScore = {
  total: number;
  label: string;
  breakdown: BudgetScoreBreakdown[];
};

export function calculateBudgetFinalScore({
  profile,
  result,
  summary,
}: {
  profile: BudgetFinancialProfile;
  result: BudgetFinalWeekResult;
  summary: BudgetResultsSummary;
}): BudgetFinalScore {
  const monthlyIncome = Math.max(1, profile.monthlyIncome);

  const billPoints = Math.max(0, 30 - result.commitmentsMissed * 12);

  const cashTarget = monthlyIncome * 0.15;
  const cashPoints = clampPoints((result.endingAvailable / Math.max(1, cashTarget)) * 20, 20);

  const emergencyTarget = monthlyIncome * 0.15;
  const emergencyPoints = clampPoints((result.finalAllocation.emergency / Math.max(1, emergencyTarget)) * 20, 20);

  const futureTarget = monthlyIncome * 0.20;
  const futureAmount =
    result.finalAllocation.savings +
    result.finalAllocation.goals +
    result.finalAllocation.investing;
  const futurePoints = clampPoints((futureAmount / Math.max(1, futureTarget)) * 15, 15);

  const evidenceAverage = summary.skills.length
    ? summary.skills.reduce((sum, item) => sum + item.evidencePoints, 0) / summary.skills.length
    : 0;
  const decisionPoints = clampPoints((evidenceAverage / 3) * 15, 15);

  const breakdown: BudgetScoreBreakdown[] = [
    {
      key: "bills",
      label: "Bills covered",
      points: billPoints,
      maxPoints: 30,
      detail: result.commitmentsMissed === 0
        ? "All required commitments were covered."
        : `${result.commitmentsMissed} commitment${result.commitmentsMissed === 1 ? " was" : "s were"} missed.`,
    },
    {
      key: "cash_buffer",
      label: "Cash buffer",
      points: cashPoints,
      maxPoints: 20,
      detail: "Rewards keeping enough immediately available money to absorb surprises.",
    },
    {
      key: "emergency",
      label: "Emergency protection",
      points: emergencyPoints,
      maxPoints: 20,
      detail: "Rewards maintaining a dedicated emergency reserve rather than relying only on spare cash.",
    },
    {
      key: "future",
      label: "Saving & goals",
      points: futurePoints,
      maxPoints: 15,
      detail: "Rewards continuing to fund savings, goals and longer-term growth while handling the month.",
    },
    {
      key: "decisions",
      label: "Decision quality",
      points: decisionPoints,
      maxPoints: 15,
      detail: "Uses the evidence from your planning, adaptation and final trade-off decisions.",
    },
  ];

  const total = Math.max(0, Math.min(100, Math.round(breakdown.reduce((sum, item) => sum + item.points, 0))));

  return {
    total,
    label:
      total >= 90
        ? "Excellent control"
        : total >= 75
          ? "Strong month"
          : total >= 60
            ? "Steady under pressure"
            : total >= 45
              ? "Pressure exposed gaps"
              : "Needs a rethink",
    breakdown,
  };
}

function clampPoints(value: number, maxPoints: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(maxPoints, Math.round(value)));
}
