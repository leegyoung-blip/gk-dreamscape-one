import { budgetPool, totalKnownCommitments } from "./budget-simulator-financial-model";
import type {
  BudgetAllocation,
  BudgetFinancialProfile,
  BudgetForecast,
  BudgetForecastPoint,
  BudgetStressTestKey,
  BudgetStressTestResult,
} from "./budget-simulator-types";

const PROTECTED_KEYS: Array<keyof BudgetAllocation> = [
  "savings",
  "emergency",
  "investing",
  "goals",
];

function protectedTotal(allocation: BudgetAllocation) {
  return PROTECTED_KEYS.reduce((sum, key) => sum + Number(allocation[key] || 0), 0);
}

function round10(value: number) {
  return Math.round(value / 10) * 10;
}

function commitmentsForDay(profile: BudgetFinancialProfile, day: number) {
  return profile.commitments.filter((item) => item.dueDay === day);
}

export function buildBudgetForecast(
  profile: BudgetFinancialProfile,
  allocation: BudgetAllocation,
): BudgetForecast {
  const protectedAmount = protectedTotal(allocation);
  const openingAvailable = budgetPool(profile) - protectedAmount;
  let available = openingAvailable;
  let firstShortfallDay: number | null = null;

  const points: BudgetForecastPoint[] = [];

  for (let day = 1; day <= 30; day += 1) {
    const commitments = commitmentsForDay(profile, day);
    const commitmentOutflow = commitments.reduce((sum, item) => sum + item.amount, 0);
    available -= commitmentOutflow;

    if (available < 0 && firstShortfallDay === null) firstShortfallDay = day;

    points.push({
      day,
      available: round10(available),
      protected: round10(protectedAmount),
      commitmentOutflow: round10(commitmentOutflow),
      commitmentIds: commitments.map((item) => item.id),
    });
  }

  return {
    points,
    openingAvailable: round10(openingAvailable),
    protectedTotal: round10(protectedAmount),
    minimumAvailable: round10(Math.min(openingAvailable, ...points.map((point) => point.available))),
    finalAvailable: round10(points.at(-1)?.available ?? openingAvailable),
    totalKnownPayments: round10(totalKnownCommitments(profile)),
    firstShortfallDay,
  };
}

export function stressTestDefinitions(): Array<{
  key: BudgetStressTestKey;
  label: string;
  shortLabel: string;
  description: string;
}> {
  return [
    {
      key: "unexpected_250",
      label: "250 DT unexpected expense",
      shortLabel: "+250 expense",
      description: "Tests whether a smaller unplanned cost can be absorbed without changing protected allocations.",
    },
    {
      key: "unexpected_500",
      label: "500 DT unexpected expense",
      shortLabel: "+500 expense",
      description: "Tests a larger surprise that may force you to release money from another purpose.",
    },
    {
      key: "income_drop_10",
      label: "10% income disruption",
      shortLabel: "-10% income",
      description: "Tests what happens if this month's income is lower than expected before your allocations are fully funded.",
    },
  ];
}

export function runBudgetStressTest(input: {
  profile: BudgetFinancialProfile;
  allocation: BudgetAllocation;
  key: BudgetStressTestKey;
}): BudgetStressTestResult {
  const { profile, allocation, key } = input;
  const base = buildBudgetForecast(profile, allocation);
  const protectedAmount = base.protectedTotal;

  let shockDay = 15;
  let impactAmount = 0;

  if (key === "unexpected_250") {
    shockDay = 14;
    impactAmount = 250;
  } else if (key === "unexpected_500") {
    shockDay = 18;
    impactAmount = 500;
  } else {
    shockDay = 1;
    impactAmount = round10(profile.monthlyIncome * 0.1);
  }

  const stressedPoints = base.points.map((point) => ({ ...point }));
  stressedPoints.forEach((point) => {
    if (point.day >= shockDay) point.available = round10(point.available - impactAmount);
  });

  const minimumAvailable = round10(
    Math.min(base.openingAvailable - (shockDay === 1 ? impactAmount : 0), ...stressedPoints.map((point) => point.available)),
  );
  const finalAvailable = round10(stressedPoints.at(-1)?.available ?? base.finalAvailable);
  const liquidityGap = Math.max(0, -minimumAvailable);
  const commitmentsCoveredWithoutRebalance = liquidityGap === 0;

  let interpretation: string;
  if (commitmentsCoveredWithoutRebalance) {
    interpretation = `The plan absorbs this test and still keeps ${Math.max(0, minimumAvailable).toLocaleString()} DT available at its tightest point.`;
  } else if (liquidityGap <= Math.max(0, allocation.emergency + allocation.savings)) {
    interpretation = `Available DT falls short by ${liquidityGap.toLocaleString()} DT. You could respond, but only by changing the plan or releasing some protected Savings/Emergency DT.`;
  } else if (liquidityGap <= protectedAmount) {
    interpretation = `The shortfall reaches ${liquidityGap.toLocaleString()} DT. Covering it would require breaking into several protected purposes, not just your immediate buffer.`;
  } else {
    interpretation = `The plan cannot absorb this test without a major rebalance. The shortfall exceeds the DT currently protected elsewhere in the plan.`;
  }

  const definition = stressTestDefinitions().find((item) => item.key === key)!;

  return {
    key,
    label: definition.label,
    shortLabel: definition.shortLabel,
    description: definition.description,
    shockDay,
    impactAmount,
    minimumAvailable,
    finalAvailable,
    liquidityGap,
    commitmentsCoveredWithoutRebalance,
    interpretation,
  };
}

export function commitmentDetailsForDay(profile: BudgetFinancialProfile, day: number) {
  return commitmentsForDay(profile, day);
}
