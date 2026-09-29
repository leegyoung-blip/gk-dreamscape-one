import {
  advanceLiveMonthToDay,
  budgetLiveLiquidTotal,
  budgetLiveProtectedTotal,
  budgetLiveTotal,
} from "./budget-simulator-live-month";
import { createBudgetRandom } from "./budget-simulator-scenarios";
import type {
  BudgetAllocation,
  BudgetDecisionFactorKey,
  BudgetDifficulty,
  BudgetFinalWeekChallenge,
  BudgetFinalWeekChoice,
  BudgetFinalWeekResult,
  BudgetFinancialProfile,
  BudgetLiveMonthState,
  BudgetResultsSummary,
  BudgetScenarioKey,
  BudgetSimulationData,
  BudgetSkillEvidenceSummary,
  BudgetWhatIfComparison,
  BudgetFinalWeekChoiceId,
} from "./budget-simulator-types";

const LIQUID_KEYS = ["unallocated", "lifestyle", "essentials"] as const;

function round10(value: number) {
  return Math.max(0, Math.round(value / 10) * 10);
}

function cloneAllocation(allocation: BudgetAllocation): BudgetAllocation {
  return { ...allocation };
}

function spendFromLiquid(allocation: BudgetAllocation, amount: number) {
  const next = cloneAllocation(allocation);
  let remaining = round10(Math.max(0, amount));

  for (const key of LIQUID_KEYS) {
    if (remaining <= 0) break;
    const used = Math.min(next[key], remaining);
    next[key] = round10(next[key] - used);
    remaining = round10(remaining - used);
  }

  return { allocation: next, shortfall: remaining };
}

export const FINAL_WEEK_FACTOR_OPTIONS: Array<{
  key: BudgetDecisionFactorKey;
  label: string;
  description: string;
}> = [
  {
    key: "available_cash",
    label: "Available cash",
    description: "How much liquid DT remains after the decision.",
  },
  {
    key: "goal_deadline",
    label: "Goal deadline",
    description: "Whether diverting DT slows an important goal with a near deadline.",
  },
  {
    key: "possible_return",
    label: "Possible return",
    description: "The opportunity could create value, but the outcome is uncertain.",
  },
  {
    key: "emergency_reserve",
    label: "Emergency reserve",
    description: "How much resilience remains if another surprise arrives.",
  },
  {
    key: "upcoming_commitment",
    label: "Upcoming commitment",
    description: "Known payments still due before the month ends.",
  },
];

export function buildBudgetFinalWeekChallenge(input: {
  profile: BudgetFinancialProfile;
  liveMonth: BudgetLiveMonthState;
  openingAllocation: BudgetAllocation;
  scenarioSeed: number;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
}): BudgetFinalWeekChallenge {
  const random = createBudgetRandom(input.scenarioSeed + 45051);
  const paid = new Set(input.liveMonth.paidCommitments.map((item) => item.commitmentId));
  const finalCommitments = input.profile.commitments
    .filter((item) => !paid.has(item.id) && item.dueDay >= 25)
    .sort((a, b) => a.dueDay - b.dueDay);

  const liquid = budgetLiveLiquidTotal(input.openingAllocation);
  const protectedTotal = budgetLiveProtectedTotal(input.openingAllocation);
  const due = finalCommitments.reduce((sum, item) => sum + item.amount, 0);
  const freeAfterDue = Math.max(0, liquid - due);

  const difficultyFactor =
    input.difficulty === "strategic" ? 1.18 : input.difficulty === "complex" ? 1.08 : 1;
  const scenarioFactor =
    input.scenarioKey === "tight_month" || input.scenarioKey === "high_commitments"
      ? 1.08
      : input.scenarioKey === "opportunity_month"
        ? 1.16
        : 1;
  const jitter = 0.92 + random() * 0.16;

  const opportunityAmount = round10(
    Math.min(
      1800,
      Math.max(
        350,
        (freeAfterDue * 0.82 + protectedTotal * 0.13) * difficultyFactor * scenarioFactor * jitter,
      ),
    ),
  );

  const benefitLow = Math.round(7 + random() * 4);
  const benefitHigh = Math.round(benefitLow + 7 + random() * 5);
  const half = round10(opportunityAmount / 2);

  const choices: BudgetFinalWeekChoice[] = [
    {
      id: "protect_position",
      label: "Protect the month-end position",
      description:
        "Do not commit new DT. Keep liquidity and protected funds intact while the remaining commitments are settled.",
      commitmentAmount: 0,
      effectSummary:
        "You chose certainty and financial flexibility over the new opportunity.",
      riskNote:
        "You may miss a worthwhile opportunity, but you do not add new financial pressure this month.",
    },
    {
      id: "balanced_commitment",
      label: `Make a measured commitment · ${half.toLocaleString()} DT`,
      description:
        "Take part with roughly half the suggested amount, preserving more room for known payments and surprises.",
      commitmentAmount: half,
      effectSummary:
        "You accepted some uncertainty while preserving more month-end flexibility than a full commitment.",
      riskNote:
        "The simulated benefit is uncertain; committing less also limits the possible upside.",
    },
    {
      id: "full_commitment",
      label: `Take the full opportunity · ${opportunityAmount.toLocaleString()} DT`,
      description:
        "Commit the full suggested amount. This gives the opportunity more capital but leaves less liquidity available.",
      commitmentAmount: opportunityAmount,
      effectSummary:
        "You prioritised the opportunity and accepted a tighter month-end financial position.",
      riskNote:
        "The potential benefit is not guaranteed. A full commitment can require releasing money from other priorities.",
    },
  ];

  return {
    day: 26,
    title: "The final-week capital decision",
    subtitle: "One opportunity, several obligations, and no way to maximise everything.",
    briefing:
      "A short-window Nova-Milo Mobility pilot has opened. DT committed now could support a future operating benefit, but the month is not finished and some money may still be needed elsewhere.",
    opportunityAmount,
    potentialBenefitLow: benefitLow,
    potentialBenefitHigh: benefitHigh,
    finalCommitments,
    choices,
  };
}

export function finalWeekFundingGap(input: {
  allocation: BudgetAllocation;
  choice: BudgetFinalWeekChoice;
  challenge: BudgetFinalWeekChallenge;
}) {
  const liquid = budgetLiveLiquidTotal(input.allocation);
  const commitments = input.challenge.finalCommitments.reduce(
    (sum, item) => sum + item.amount,
    0,
  );
  const required = commitments + input.choice.commitmentAmount;
  return Math.max(0, round10(required - liquid));
}

export function completeBudgetFinalWeek(input: {
  liveMonth: BudgetLiveMonthState;
  allocation: BudgetAllocation;
  challenge: BudgetFinalWeekChallenge;
  choice: BudgetFinalWeekChoice;
  factors: BudgetDecisionFactorKey[];
  confidence: number;
  profile: BudgetFinancialProfile;
}): { ok: true; result: BudgetFinalWeekResult } | { ok: false; shortfall: number } {
  const fundingGap = finalWeekFundingGap({
    allocation: input.allocation,
    choice: input.choice,
    challenge: input.challenge,
  });
  if (fundingGap > 0) return { ok: false, shortfall: fundingGap };

  const decisionAllocation = cloneAllocation(input.allocation);
  let opportunityAllocation = cloneAllocation(decisionAllocation);
  if (input.choice.commitmentAmount > 0) {
    const spent = spendFromLiquid(opportunityAllocation, input.choice.commitmentAmount);
    if (spent.shortfall > 0) return { ok: false, shortfall: spent.shortfall };
    opportunityAllocation = {
      ...spent.allocation,
      investing: round10(
        spent.allocation.investing + input.choice.commitmentAmount,
      ),
    };
  }

  const finalLiveState: BudgetLiveMonthState = {
    ...input.liveMonth,
    allocation: opportunityAllocation,
    lastOutcome: null,
  };
  const settled = advanceLiveMonthToDay({
    profile: input.profile,
    state: finalLiveState,
    day: 30,
  });
  if (!settled.ok) return { ok: false, shortfall: settled.shortfall };

  const newlyPaid = settled.state.paidCommitments.filter(
    (item) => !input.liveMonth.paidCommitments.some((existing) => existing.commitmentId === item.commitmentId),
  );
  const finalAllocation = settled.state.allocation;

  return {
    ok: true,
    result: {
      challengeDay: input.challenge.day,
      choiceId: input.choice.id,
      choiceLabel: input.choice.label,
      selectedFactors: input.factors.slice(0, 2),
      confidence: Math.max(0, Math.min(100, Math.round(input.confidence))),
      opportunityCommitted: input.choice.commitmentAmount,
      openingAllocation: cloneAllocation(input.liveMonth.allocation),
      decisionAllocation,
      finalAllocation: cloneAllocation(finalAllocation),
      paidCommitments: newlyPaid,
      endingAvailable: budgetLiveLiquidTotal(finalAllocation),
      endingProtected: budgetLiveProtectedTotal(finalAllocation),
      endingTotal: budgetLiveTotal(finalAllocation),
      finalCommitmentsPaid: newlyPaid.reduce((sum, item) => sum + item.amount, 0),
      commitmentsMissed: 0,
      completedAt: new Date().toISOString(),
    },
  };
}

function level(points: number): BudgetSkillEvidenceSummary["level"] {
  return points >= 3 ? "demonstrated" : points >= 2 ? "applied" : "observed";
}

function skill(
  skillKey: BudgetSkillEvidenceSummary["skillKey"],
  title: string,
  points: 1 | 2 | 3,
  reason: string,
): BudgetSkillEvidenceSummary {
  return { skillKey, title, level: level(points), evidencePoints: points, reason };
}

function changedCategoryCount(first: BudgetAllocation, final: BudgetAllocation) {
  return (Object.keys(first) as Array<keyof BudgetAllocation>).filter(
    (key) => Math.abs((first[key] ?? 0) - (final[key] ?? 0)) >= 50,
  ).length;
}

export function buildBudgetResultsSummary(input: {
  data: BudgetSimulationData;
  result: BudgetFinalWeekResult;
}): BudgetResultsSummary {
  const firstPlan = input.data.firstPlan ?? input.result.openingAllocation;
  const final = input.result.finalAllocation;
  const stressCount = input.data.stressTestsRun?.length ?? 0;
  const decisions = input.data.liveMonth?.decisions.length ?? 0;
  const inspected = input.data.inspectedItems?.length ?? 0;
  const pinned = input.data.pinnedItems?.length ?? 0;
  const changed = changedCategoryCount(firstPlan, final);
  const liquidShare = input.result.endingTotal > 0
    ? input.result.endingAvailable / input.result.endingTotal
    : 0;
  const planningProtected = final.savings + final.emergency + final.goals;
  const factors = new Set(input.result.selectedFactors);

  const budgetingPoints: 1 | 2 | 3 =
    stressCount >= 2 && decisions >= 5 && changed >= 3 ? 3 : decisions >= 3 ? 2 : 1;
  const managementPoints: 1 | 2 | 3 =
    input.result.commitmentsMissed === 0 && liquidShare >= 0.08 ? 3 : input.result.commitmentsMissed === 0 ? 2 : 1;
  const planningPoints: 1 | 2 | 3 =
    planningProtected > 0 &&
    (factors.has("goal_deadline") || factors.has("emergency_reserve") || factors.has("upcoming_commitment"))
      ? 3
      : planningProtected > 0
        ? 2
        : 1;
  const decisionPoints: 1 | 2 | 3 =
    input.result.selectedFactors.length === 2 && decisions >= 5
      ? 3
      : input.result.selectedFactors.length === 2
        ? 2
        : 1;

  const skills: BudgetSkillEvidenceSummary[] = [
    skill(
      "budgeting",
      "Budgeting",
      budgetingPoints,
      budgetingPoints === 3
        ? "You tested the plan, adapted several categories and kept working with the budget as conditions changed."
        : "You built and adjusted a budget across competing priorities during the month.",
    ),
    skill(
      "money_management",
      "Money Management",
      managementPoints,
      managementPoints === 3
        ? "Known commitments were covered while you still finished with a usable liquid buffer."
        : "You managed the available DT through the month and dealt with known commitments.",
    ),
    skill(
      "saving_planning",
      "Saving & Planning",
      planningPoints,
      planningPoints === 3
        ? "Your final-week reasoning considered future obligations, goals or resilience while protected DT remained in the plan."
        : "You maintained at least some DT for future priorities rather than treating the whole month as immediate spending.",
    ),
    skill(
      "financial_decisions",
      "Financial Decisions",
      decisionPoints,
      decisionPoints === 3
        ? "You made repeated trade-off decisions and explicitly identified the evidence that mattered in the hardest choice."
        : "You compared trade-offs and recorded the factors behind the final decision.",
    ),
  ];

  const patterns: BudgetResultsSummary["patterns"] = [
    {
      key: "planning",
      label: "Planning",
      observation:
        inspected >= 5 || pinned >= 3
          ? `You reviewed ${inspected} planning items and pinned ${pinned} pieces of information before or during the budget process.`
          : "You used the plan, but there is still limited evidence that you deliberately gathered information before acting.",
    },
    {
      key: "liquidity_awareness",
      label: "Liquidity awareness",
      observation:
        factors.has("available_cash") || factors.has("upcoming_commitment") || liquidShare >= 0.1
          ? "Your choices show attention to money that needed to remain accessible for near-term use."
          : "You reached the end of the month with less evidence that immediate access to DT was a major decision factor.",
    },
    {
      key: "goal_discipline",
      label: "Goal discipline",
      observation:
        final.goals >= firstPlan.goals
          ? "Goal funding was maintained or increased even while other parts of the plan changed."
          : "Some goal funding was released as pressure increased, showing the trade-off between flexibility and staying on target.",
    },
    {
      key: "adaptability",
      label: "Adaptability",
      observation:
        changed >= 3
          ? `Your final allocation differs meaningfully from the Day 1 plan in ${changed} categories.`
          : "Your final plan stayed relatively close to the original allocation despite changing conditions.",
    },
    {
      key: "opportunity_cost",
      label: "Opportunity-cost reasoning",
      observation:
        input.result.opportunityCommitted > 0
          ? `You committed ${input.result.opportunityCommitted.toLocaleString()} DT to the final opportunity, accepting that the same DT could not serve another priority at the same time.`
          : "You declined the final opportunity, preserving DT for liquidity and existing priorities instead.",
    },
  ];

  const insights: string[] = [];
  if (liquidShare < 0.08) {
    insights.push(
      "Your month finished with a tight liquid buffer. The plan worked, but another surprise would have given you little room to respond.",
    );
  } else {
    insights.push(
      "You finished the month with accessible DT still available, which preserved flexibility after the final commitments were paid.",
    );
  }

  if (final.emergency < firstPlan.emergency) {
    insights.push(
      "You used part of the emergency allocation to keep the month moving. That was a real trade-off: it solved pressure now but reduced protection against the next surprise.",
    );
  } else if (final.emergency > 0) {
    insights.push(
      "You kept an emergency buffer through the month instead of using every protected DT for immediate opportunities.",
    );
  }

  if (input.result.choiceId === "full_commitment") {
    insights.push(
      "Your final choice leaned towards growth. The important question is not whether the opportunity was 'right', but whether the remaining liquidity matched the uncertainty you accepted.",
    );
  } else if (input.result.choiceId === "protect_position") {
    insights.push(
      "Your final choice leaned towards resilience. You gave up possible upside in exchange for keeping more options open at month-end.",
    );
  } else {
    insights.push(
      "Your final choice split the difference between opportunity and resilience, keeping some upside while limiting how much DT became less accessible.",
    );
  }

  return { skills, patterns, miloInsights: insights.slice(0, 3) };
}


export function buildBudgetWhatIfComparison(input: {
  profile: BudgetFinancialProfile;
  liveMonth: BudgetLiveMonthState;
  decisionAllocation: BudgetAllocation;
  actualResult: BudgetFinalWeekResult;
  alternativeChoiceId: BudgetFinalWeekChoiceId;
  scenarioSeed: number;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
}): BudgetWhatIfComparison {
  const challenge = buildBudgetFinalWeekChallenge({
    profile: input.profile,
    liveMonth: input.liveMonth,
    openingAllocation: input.actualResult.openingAllocation,
    scenarioSeed: input.scenarioSeed,
    scenarioKey: input.scenarioKey,
    difficulty: input.difficulty,
  });

  const alternative = challenge.choices.find(
    (choice) => choice.id === input.alternativeChoiceId,
  );
  if (!alternative) {
    throw new Error("The alternative Final Week decision could not be found.");
  }

  const fundingGap = finalWeekFundingGap({
    allocation: input.decisionAllocation,
    choice: alternative,
    challenge,
  });

  if (fundingGap > 0) {
    return {
      actualChoiceId: input.actualResult.choiceId,
      actualChoiceLabel: input.actualResult.choiceLabel,
      alternativeChoiceId: alternative.id,
      alternativeChoiceLabel: alternative.label,
      fundable: false,
      fundingGap,
      actualCommitted: input.actualResult.opportunityCommitted,
      alternativeCommitted: alternative.commitmentAmount,
      actualEndingAvailable: input.actualResult.endingAvailable,
      actualEndingProtected: input.actualResult.endingProtected,
      alternativeEndingAvailable: null,
      alternativeEndingProtected: null,
      availableDelta: null,
      protectedDelta: null,
      interpretation:
        `With the same pre-decision allocation, this alternative needed ${fundingGap.toLocaleString()} DT more liquid funding. ` +
        "Taking it would have required another deliberate rebalance, so the comparison stops before inventing which protected priority you would have sacrificed.",
    };
  }

  const completed = completeBudgetFinalWeek({
    liveMonth: input.liveMonth,
    allocation: input.decisionAllocation,
    challenge,
    choice: alternative,
    factors: input.actualResult.selectedFactors,
    confidence: input.actualResult.confidence,
    profile: input.profile,
  });

  if ("shortfall" in completed) {
    return {
      actualChoiceId: input.actualResult.choiceId,
      actualChoiceLabel: input.actualResult.choiceLabel,
      alternativeChoiceId: alternative.id,
      alternativeChoiceLabel: alternative.label,
      fundable: false,
      fundingGap: completed.shortfall,
      actualCommitted: input.actualResult.opportunityCommitted,
      alternativeCommitted: alternative.commitmentAmount,
      actualEndingAvailable: input.actualResult.endingAvailable,
      actualEndingProtected: input.actualResult.endingProtected,
      alternativeEndingAvailable: null,
      alternativeEndingProtected: null,
      availableDelta: null,
      protectedDelta: null,
      interpretation:
        "The alternative path could not settle the remaining month from the same allocation without another rebalance.",
    };
  }

  const alternativeResult = completed.result;
  const availableDelta =
    alternativeResult.endingAvailable - input.actualResult.endingAvailable;
  const protectedDelta =
    alternativeResult.endingProtected - input.actualResult.endingProtected;

  let interpretation: string;
  if (alternative.commitmentAmount > input.actualResult.opportunityCommitted) {
    interpretation =
      `The alternative commits ${(alternative.commitmentAmount - input.actualResult.opportunityCommitted).toLocaleString()} DT more to the opportunity. ` +
      `That moves ${Math.abs(availableDelta).toLocaleString()} DT of month-end flexibility into protected/invested capital. ` +
      "The possible future return remains uncertain; the important difference is the liquidity you would give up today.";
  } else if (alternative.commitmentAmount < input.actualResult.opportunityCommitted) {
    interpretation =
      `The alternative commits ${(input.actualResult.opportunityCommitted - alternative.commitmentAmount).toLocaleString()} DT less. ` +
      `That leaves ${Math.max(0, availableDelta).toLocaleString()} DT more liquid at month-end, but reduces the amount exposed to the opportunity. ` +
      "This is a resilience-versus-upside trade-off rather than a guaranteed better outcome.";
  } else {
    interpretation =
      "This alternative commits the same amount, so the month-end liquidity position is effectively unchanged. The meaningful difference would be in the reasoning used to reach the decision.";
  }

  return {
    actualChoiceId: input.actualResult.choiceId,
    actualChoiceLabel: input.actualResult.choiceLabel,
    alternativeChoiceId: alternative.id,
    alternativeChoiceLabel: alternative.label,
    fundable: true,
    fundingGap: 0,
    actualCommitted: input.actualResult.opportunityCommitted,
    alternativeCommitted: alternative.commitmentAmount,
    actualEndingAvailable: input.actualResult.endingAvailable,
    actualEndingProtected: input.actualResult.endingProtected,
    alternativeEndingAvailable: alternativeResult.endingAvailable,
    alternativeEndingProtected: alternativeResult.endingProtected,
    availableDelta,
    protectedDelta,
    interpretation,
  };
}
