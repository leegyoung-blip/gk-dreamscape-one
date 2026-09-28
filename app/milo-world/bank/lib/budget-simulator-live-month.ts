import { createBudgetRandom } from "./budget-simulator-scenarios";
import type {
  BudgetAllocation,
  BudgetAllocationKey,
  BudgetDifficulty,
  BudgetFinancialProfile,
  BudgetLiveDecision,
  BudgetLiveEvent,
  BudgetLiveEventChoice,
  BudgetLiveMonthSnapshot,
  BudgetLiveMonthState,
  BudgetPaidCommitment,
  BudgetScenarioKey,
} from "./budget-simulator-types";

const LIQUID_KEYS: BudgetAllocationKey[] = ["unallocated", "lifestyle", "essentials"];
const PROTECTED_KEYS: BudgetAllocationKey[] = ["savings", "emergency", "investing", "goals"];

function round10(value: number) {
  return Math.max(0, Math.round(value / 10) * 10);
}

function signedRound10(value: number) {
  return Math.round(value / 10) * 10;
}

function cloneAllocation(allocation: BudgetAllocation): BudgetAllocation {
  return { ...allocation };
}

function seededAmount(base: number, random: () => number, spread = 0.12) {
  return round10(base * (1 + (random() * 2 - 1) * spread));
}

export function budgetLiveLiquidTotal(allocation: BudgetAllocation) {
  return LIQUID_KEYS.reduce((sum, key) => sum + Number(allocation[key] || 0), 0);
}

export function budgetLiveProtectedTotal(allocation: BudgetAllocation) {
  return PROTECTED_KEYS.reduce((sum, key) => sum + Number(allocation[key] || 0), 0);
}

export function budgetLiveTotal(allocation: BudgetAllocation) {
  return Object.values(allocation).reduce((sum, value) => sum + Number(value || 0), 0);
}

export function transferBudgetAllocation(input: {
  allocation: BudgetAllocation;
  from: BudgetAllocationKey;
  to: BudgetAllocationKey;
  amount: number;
}) {
  const amount = Math.min(
    round10(Math.max(0, input.amount)),
    round10(input.allocation[input.from]),
  );
  if (amount <= 0 || input.from === input.to) return cloneAllocation(input.allocation);

  return {
    ...input.allocation,
    [input.from]: round10(input.allocation[input.from] - amount),
    [input.to]: round10(input.allocation[input.to] + amount),
  };
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

function receiveIntoAvailable(allocation: BudgetAllocation, amount: number) {
  return {
    ...allocation,
    unallocated: round10(allocation.unallocated + Math.max(0, amount)),
  };
}

export function applyLiveCashImpact(allocation: BudgetAllocation, cashImpact: number) {
  if (cashImpact >= 0) {
    return {
      allocation: receiveIntoAvailable(allocation, cashImpact),
      shortfall: 0,
    };
  }

  return spendFromLiquid(allocation, Math.abs(cashImpact));
}

export function liveChoiceFundingGap(
  allocation: BudgetAllocation,
  choice: BudgetLiveEventChoice,
) {
  let preview = cloneAllocation(allocation);

  if (choice.release) {
    preview = transferBudgetAllocation({
      allocation: preview,
      from: choice.release.from,
      to: "unallocated",
      amount: choice.release.amount,
    });
  }

  const requiredForMove = choice.allocationMove?.amount ?? 0;
  const requiredForCash = choice.cashImpact < 0 ? Math.abs(choice.cashImpact) : 0;
  return Math.max(
    0,
    requiredForMove + requiredForCash - budgetLiveLiquidTotal(preview),
  );
}

function scenarioPriority(scenarioKey: BudgetScenarioKey) {
  switch (scenarioKey) {
    case "tight_month":
      return [
        "rover_diagnostic",
        "cost_increase",
        "lifestyle_invite",
        "goal_pressure",
        "income_adjustment",
        "business_equipment",
        "exchange_window",
        "unexpected_bonus",
        "supplier_offer",
      ];
    case "goal_conflict":
      return [
        "goal_pressure",
        "business_equipment",
        "exchange_window",
        "rover_diagnostic",
        "supplier_offer",
        "lifestyle_invite",
        "cost_increase",
        "unexpected_bonus",
        "income_adjustment",
      ];
    case "opportunity_month":
      return [
        "business_equipment",
        "exchange_window",
        "supplier_offer",
        "rover_diagnostic",
        "unexpected_bonus",
        "goal_pressure",
        "lifestyle_invite",
        "cost_increase",
        "income_adjustment",
      ];
    case "uncertain_income":
      return [
        "income_adjustment",
        "rover_diagnostic",
        "cost_increase",
        "goal_pressure",
        "business_equipment",
        "lifestyle_invite",
        "unexpected_bonus",
        "exchange_window",
        "supplier_offer",
      ];
    case "high_commitments":
      return [
        "cost_increase",
        "rover_diagnostic",
        "goal_pressure",
        "lifestyle_invite",
        "supplier_offer",
        "income_adjustment",
        "business_equipment",
        "exchange_window",
        "unexpected_bonus",
      ];
    case "random_month":
      return [
        "exchange_window",
        "rover_diagnostic",
        "goal_pressure",
        "unexpected_bonus",
        "business_equipment",
        "cost_increase",
        "supplier_offer",
        "lifestyle_invite",
        "income_adjustment",
      ];
    case "starter":
    default:
      return [
        "rover_diagnostic",
        "lifestyle_invite",
        "business_equipment",
        "unexpected_bonus",
        "goal_pressure",
        "cost_increase",
        "exchange_window",
        "supplier_offer",
        "income_adjustment",
      ];
  }
}

function decisionCount(difficulty: BudgetDifficulty) {
  if (difficulty === "strategic") return 9;
  if (difficulty === "complex") return 7;
  return 5;
}

export function generateBudgetLiveMonthEvents(input: {
  profile: BudgetFinancialProfile;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
}) {
  const random = createBudgetRandom(input.scenarioSeed + 4404);
  const amount = (base: number, spread = 0.12) => seededAmount(base, random, spread);

  const events: Record<string, BudgetLiveEvent> = {
    rover_diagnostic: {
      id: "rover_diagnostic",
      day: 5,
      category: "expense",
      title: "The diagnostic finds more than expected",
      subtitle: "A known maintenance job has developed an uncertain extra cost.",
      briefing:
        "The Rover technician found wear that was not visible during the original inspection. You can fix it now, do a partial service, or accept the risk of waiting.",
      analysis: [
        {
          label: "Full repair now",
          value: `${amount(430)} DT`,
          detail: "Removes most of the near-term breakdown risk.",
        },
        {
          label: "Partial service",
          value: `${amount(250)} DT`,
          detail: "Reduces the immediate cost but does not remove all uncertainty.",
        },
        {
          label: "Delay",
          value: "0 DT today",
          detail: "Preserves liquidity but leaves the possibility of a larger bill later.",
        },
      ],
      choices: [],
    },
    lifestyle_invite: {
      id: "lifestyle_invite",
      day: 8,
      category: "lifestyle",
      title: "A limited Milo World event opens",
      subtitle: "Enjoyment has value too — but the timing matters.",
      briefing:
        "Friends are joining a one-off Milo World event. It is affordable in isolation, but you still have commitments and goals ahead this month.",
      analysis: [
        {
          label: "Full pass",
          value: `${amount(290)} DT`,
          detail: "Best experience, highest immediate cost.",
        },
        {
          label: "Short session",
          value: `${amount(150)} DT`,
          detail: "Lower cost while still taking part.",
        },
        {
          label: "Skip",
          value: "0 DT",
          detail: "Preserves funds for other priorities.",
        },
      ],
      choices: [],
    },
    business_equipment: {
      id: "business_equipment",
      day: 10,
      category: "opportunity",
      title: "A supplier offers discounted equipment",
      subtitle: "The offer is attractive, but the payback is not immediate.",
      briefing:
        "A Business Builder supplier offers an equipment upgrade below its usual price. It may improve future capacity, but buying it reduces this month's flexibility.",
      analysis: [
        {
          label: "Offer price",
          value: `${amount(560)} DT`,
          detail: "The supplier says the normal price is around 800 DT.",
        },
        {
          label: "Estimated payback",
          value: "3–5 months",
          detail: "The benefit depends on future demand, not a guaranteed return.",
        },
        {
          label: "Capacity effect",
          value: "+8–12%",
          detail: "Useful only if the business has enough demand to use it.",
        },
      ],
      choices: [],
    },
    cost_increase: {
      id: "cost_increase",
      day: 13,
      category: "expense",
      title: "Everyday costs rise unexpectedly",
      subtitle: "A small increase across several items can still matter.",
      briefing:
        "Transport and supplies cost more than your forecast assumed. You need to absorb the change somewhere in the remaining plan.",
      analysis: [
        {
          label: "Extra cost",
          value: `${amount(230)} DT`,
          detail: "Spread across transport and ordinary supplies.",
        },
        {
          label: "Timing",
          value: "Immediate",
          detail: "The extra amount is due during this month.",
        },
        {
          label: "Avoidable?",
          value: "Partly",
          detail: "Cutting optional spending could offset some of it.",
        },
      ],
      choices: [],
    },
    exchange_window: {
      id: "exchange_window",
      day: 15,
      category: "market",
      title: "An Exchange opportunity appears",
      subtitle: "Potential return comes with uncertainty and reduced liquidity.",
      briefing:
        "A fictional Milo's Exchange opportunity opens for a short period. You can commit some DT, but the outcome is uncertain and the money will not stay immediately available.",
      analysis: [
        {
          label: "Suggested commitment",
          value: `${amount(420)} DT`,
          detail: "Enough to matter, but large enough to affect flexibility.",
        },
        {
          label: "Possible outcome",
          value: "-8% to +14%",
          detail: "A range, not a promised return.",
        },
        {
          label: "Liquidity",
          value: "Lower",
          detail: "Committed DT cannot help with short-term spending this month.",
        },
      ],
      choices: [],
    },
    unexpected_bonus: {
      id: "unexpected_bonus",
      day: 17,
      category: "income",
      title: "You receive an unexpected bonus",
      subtitle: "Extra income creates another decision, not free money.",
      briefing:
        "A one-off reward arrives. You can strengthen the current plan, accelerate a goal, or keep the amount available for the rest of the month.",
      analysis: [
        {
          label: "Bonus",
          value: `+${amount(360)} DT`,
          detail: "Not expected to repeat next month.",
        },
        {
          label: "Known commitments left",
          value: "Several",
          detail: "The month is not finished yet.",
        },
        {
          label: "Best use",
          value: "Depends",
          detail: "The strongest choice depends on your current liquidity and goals.",
        },
      ],
      choices: [],
    },
    goal_pressure: {
      id: "goal_pressure",
      day: 19,
      category: "goal",
      title: "One goal becomes more urgent",
      subtitle: "A deadline changes the value of waiting.",
      briefing:
        "A goal you were building towards may need to be funded sooner than expected. You can accelerate it, keep the original pace, or deliberately deprioritise it.",
      analysis: [
        {
          label: "Extra progress needed",
          value: `${amount(380)} DT`,
          detail: "Would materially improve the chance of reaching the new deadline.",
        },
        {
          label: "Deadline change",
          value: "Earlier",
          detail: "The goal now competes more directly with this month's remaining commitments.",
        },
        {
          label: "Penalty for waiting",
          value: "Opportunity may close",
          detail: "Waiting is allowed, but the original opportunity may no longer be available.",
        },
      ],
      choices: [],
    },
    supplier_offer: {
      id: "supplier_offer",
      day: 22,
      category: "opportunity",
      title: "A supplier offers a bulk discount",
      subtitle: "A lower unit price can still create a cash-flow problem.",
      briefing:
        "A supplier offers a discount if you buy more supplies now. The purchase saves money per unit, but ties up DT before the month is over.",
      analysis: [
        {
          label: "Bulk purchase",
          value: `${amount(520)} DT`,
          detail: "Requires more cash today than buying only what is needed now.",
        },
        {
          label: "Estimated saving",
          value: `${amount(140)} DT`,
          detail: "Only realised if the supplies are actually used later.",
        },
        {
          label: "Cash-flow effect",
          value: "Negative now",
          detail: "Future efficiency comes at the cost of current liquidity.",
        },
      ],
      choices: [],
    },
    income_adjustment: {
      id: "income_adjustment",
      day: 23,
      category: "income",
      title: "Expected income is revised",
      subtitle: "Plans built on expected income must sometimes change.",
      briefing:
        "A portion of this month's expected income is delayed or reduced. You need to decide whether to protect commitments, goals, or longer-term allocations first.",
      analysis: [
        {
          label: "Income reduction",
          value: `-${amount(340)} DT`,
          detail: "This amount is no longer available during the current month.",
        },
        {
          label: "Next update",
          value: "After Day 30",
          detail: "Do not rely on the delayed amount for this month's remaining commitments.",
        },
        {
          label: "What changes",
          value: "Liquidity",
          detail: "Your goals have not disappeared, but the timing constraint has changed.",
        },
      ],
      choices: [],
    },
  };

  const findAmount = (eventId: string, label: string) => {
    const item = events[eventId].analysis.find((entry) => entry.label === label);
    return Number(String(item?.value ?? "0").replace(/[^0-9.-]/g, "")) || 0;
  };

  const roverFull = findAmount("rover_diagnostic", "Full repair now");
  const roverPartial = findAmount("rover_diagnostic", "Partial service");
  events.rover_diagnostic.choices = [
    {
      id: "repair_now",
      label: `Repair now · ${roverFull.toLocaleString()} DT`,
      description: "Pay the full extra repair cost and remove most of the near-term failure risk.",
      cashImpact: -roverFull,
      effectSummary: "You used liquidity now to reduce the chance of a larger Rover cost later.",
    },
    {
      id: "partial_service",
      label: `Partial service · ${roverPartial.toLocaleString()} DT`,
      description: "Pay less now, accepting that some uncertainty remains.",
      cashImpact: -roverPartial,
      effectSummary: "You reduced the immediate cost but kept some breakdown risk.",
      riskNote: "A later Rover consequence is still possible.",
      schedules: "rover_follow_up",
    },
    {
      id: "delay",
      label: "Delay the work",
      description: "Pay nothing now and keep liquidity, accepting a higher chance of a larger later bill.",
      cashImpact: 0,
      effectSummary: "You protected liquidity now and accepted more uncertainty later.",
      riskNote: "The later outcome is not guaranteed either way.",
      schedules: "rover_follow_up",
    },
  ];

  const lifestyleFull = findAmount("lifestyle_invite", "Full pass");
  const lifestyleShort = findAmount("lifestyle_invite", "Short session");
  events.lifestyle_invite.choices = [
    {
      id: "full_pass",
      label: `Join fully · ${lifestyleFull.toLocaleString()} DT`,
      description: "Take the full experience and accept the reduction in available DT.",
      cashImpact: -lifestyleFull,
      effectSummary: "You chose present enjoyment while keeping the rest of the plan unchanged.",
    },
    {
      id: "short_session",
      label: `Take the shorter option · ${lifestyleShort.toLocaleString()} DT`,
      description: "Spend less while still participating.",
      cashImpact: -lifestyleShort,
      effectSummary: "You balanced enjoyment with the need to preserve more liquidity.",
    },
    {
      id: "skip",
      label: "Skip this event",
      description: "Preserve the full amount for other priorities.",
      cashImpact: 0,
      effectSummary: "You kept the money available for later commitments and goals.",
    },
  ];

  const equipmentCost = findAmount("business_equipment", "Offer price");
  events.business_equipment.choices = [
    {
      id: "buy_equipment",
      label: `Buy the equipment · ${equipmentCost.toLocaleString()} DT`,
      description: "Commit the DT now in exchange for a possible later operating benefit.",
      cashImpact: -equipmentCost,
      effectSummary: "You accepted lower current liquidity for a potential future business benefit.",
      schedules: "equipment_follow_up",
    },
    {
      id: "negotiate",
      label: "Negotiate and wait",
      description: "Keep your DT for now and risk losing the discount while asking for better terms.",
      cashImpact: 0,
      effectSummary: "You protected liquidity and delayed the investment decision.",
    },
    {
      id: "decline",
      label: "Decline the offer",
      description: "Keep the current business setup and protect this month's plan.",
      cashImpact: 0,
      effectSummary: "You rejected the opportunity to preserve financial flexibility.",
    },
  ];

  const extraCost = findAmount("cost_increase", "Extra cost");
  events.cost_increase.choices = [
    {
      id: "absorb",
      label: `Absorb the full increase · ${extraCost.toLocaleString()} DT`,
      description: "Pay the higher costs without changing other plans first.",
      cashImpact: -extraCost,
      effectSummary: "You kept other priorities intact and used available DT to absorb the increase.",
    },
    {
      id: "cut_optional",
      label: "Offset it by cutting optional spending",
      description: "Reduce lifestyle spending first, then cover any remaining increase from available DT.",
      cashImpact: -Math.max(80, round10(extraCost * 0.45)),
      effectSummary: "You responded by sacrificing some optional spending instead of absorbing the full shock.",
    },
    {
      id: "release_goal",
      label: "Slow a goal to preserve liquidity",
      description: "Keep more available DT by intentionally reducing this month's goal contribution.",
      cashImpact: -extraCost,
      effectSummary: "You protected short-term cash flow by releasing some DT from goal progress.",
      release: { from: "goals", amount: Math.max(60, round10(extraCost * 0.75)) },
    },
  ];

  const exchangeCommitment = findAmount("exchange_window", "Suggested commitment");
  events.exchange_window.choices = [
    {
      id: "invest_full",
      label: `Commit ${exchangeCommitment.toLocaleString()} DT`,
      description: "Take the opportunity with the full suggested amount.",
      cashImpact: 0,
      allocationMove: { to: "investing", amount: exchangeCommitment },
      effectSummary: "You moved liquid DT into Investing, increasing market exposure and reducing short-term liquidity.",
      riskNote: "The simulated investment outcome is uncertain and is not a guaranteed return.",
    },
    {
      id: "invest_half",
      label: `Commit ${round10(exchangeCommitment / 2).toLocaleString()} DT`,
      description: "Participate while limiting how much liquidity you give up.",
      cashImpact: 0,
      allocationMove: { to: "investing", amount: round10(exchangeCommitment / 2) },
      effectSummary: "You moved a smaller amount into Investing, limiting how much liquidity you gave up.",
      riskNote: "The simulated investment can still rise or fall.",
    },
    {
      id: "pass",
      label: "Keep the DT available",
      description: "Do not invest during this window.",
      cashImpact: 0,
      effectSummary: "You prioritised liquidity over this uncertain opportunity.",
    },
  ];

  const bonus = Number(events.unexpected_bonus.analysis[0].value.replace(/[^0-9.-]/g, "")) || 0;
  events.unexpected_bonus.choices = [
    {
      id: "keep_available",
      label: `Keep +${bonus.toLocaleString()} DT available`,
      description: "Hold the entire bonus in liquid funds for the rest of the month.",
      cashImpact: bonus,
      effectSummary: "You strengthened liquidity and delayed deciding on a longer-term use.",
    },
    {
      id: "split_bonus",
      label: "Split it between liquidity and goals",
      description: "Keep part available and redirect the rest after the event using the rebalance controls.",
      cashImpact: bonus,
      effectSummary: "You added the bonus to available DT, ready to divide it across priorities.",
    },
    {
      id: "accelerate_plan",
      label: "Use it to accelerate the plan",
      description: "Add the bonus, then move it into Savings, Emergency, Investing or Goals.",
      cashImpact: bonus,
      effectSummary: "You treated the windfall as a chance to strengthen longer-term priorities.",
    },
  ];

  const goalNeed = findAmount("goal_pressure", "Extra progress needed");
  events.goal_pressure.choices = [
    {
      id: "accelerate_goal",
      label: `Accelerate now · ${goalNeed.toLocaleString()} DT`,
      description: "Commit the extra DT so the goal has a stronger chance of meeting the earlier deadline.",
      cashImpact: 0,
      allocationMove: { to: "goals", amount: goalNeed },
      effectSummary: "You moved liquid DT into Goals, prioritising the deadline over keeping the same level of liquidity.",
    },
    {
      id: "partial_progress",
      label: `Make partial progress · ${round10(goalNeed * 0.5).toLocaleString()} DT`,
      description: "Improve the goal without fully funding the new requirement.",
      cashImpact: 0,
      allocationMove: { to: "goals", amount: round10(goalNeed * 0.5) },
      effectSummary: "You moved part of your liquid DT into Goals while keeping more flexibility for the rest of the month.",
    },
    {
      id: "deprioritise",
      label: "Keep the original plan",
      description: "Do not add extra DT even though the goal may now be missed.",
      cashImpact: 0,
      effectSummary: "You accepted slower goal progress to protect other priorities.",
    },
  ];

  const bulkCost = findAmount("supplier_offer", "Bulk purchase");
  events.supplier_offer.choices = [
    {
      id: "buy_bulk",
      label: `Buy in bulk · ${bulkCost.toLocaleString()} DT`,
      description: "Pay more now to reduce future unit cost.",
      cashImpact: -bulkCost,
      effectSummary: "You traded current liquidity for a possible future cost advantage.",
    },
    {
      id: "buy_normal",
      label: `Buy only what is needed · ${round10(bulkCost * 0.55).toLocaleString()} DT`,
      description: "Pay a higher unit cost but preserve more DT this month.",
      cashImpact: -round10(bulkCost * 0.55),
      effectSummary: "You chose cash-flow flexibility over the largest discount.",
    },
    {
      id: "wait",
      label: "Wait",
      description: "Preserve liquidity and accept that future supplies may cost more.",
      cashImpact: 0,
      effectSummary: "You kept your options open instead of committing cash today.",
    },
  ];

  const incomeReduction = Math.abs(findAmount("income_adjustment", "Income reduction"));
  events.income_adjustment.choices = [
    {
      id: "protect_commitments",
      label: `Absorb -${incomeReduction.toLocaleString()} DT and protect commitments`,
      description: "Accept the lower income and plan to rebalance longer-term categories if needed.",
      cashImpact: -incomeReduction,
      effectSummary: "You treated commitments as the first priority after income fell.",
    },
    {
      id: "pause_growth",
      label: "Pause growth allocations first",
      description: "Reduce investing/goals before allowing the income reduction to affect essential commitments.",
      cashImpact: -incomeReduction,
      effectSummary: "You protected near-term obligations by releasing some Investing DT before absorbing the lower income.",
      release: { from: "investing", amount: incomeReduction },
    },
    {
      id: "use_buffer",
      label: "Use part of the emergency buffer",
      description: "Release protected DT so the rest of the plan can continue more closely to its original shape.",
      cashImpact: -incomeReduction,
      effectSummary: "You used resilience built earlier by releasing Emergency DT to absorb the lower income.",
      release: { from: "emergency", amount: incomeReduction },
    },
  ];

  const priority = scenarioPriority(input.scenarioKey);
  const count = decisionCount(input.difficulty);

  // Keep the scenario emphasis, but rotate lower-priority slots deterministically
  // so replays do not always produce the exact same set for every scenario.
  const primary = priority.slice(0, Math.min(4, count));
  const rest = priority.slice(primary.length);
  for (let i = rest.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }

  return [...primary, ...rest.slice(0, count - primary.length)]
    .map((id) => events[id])
    .sort((a, b) => a.day - b.day);
}

function buildRoverConsequence(input: {
  seed: number;
  choiceId: string;
  sourceEventId: string;
}) {
  const random = createBudgetRandom(input.seed + 7717);
  const severeChance = input.choiceId === "delay" ? 0.68 : 0.34;
  const severe = random() < severeChance;
  const amount = severe ? seededAmount(870, random, 0.12) : seededAmount(120, random, 0.2);

  return {
    id: `consequence_rover_${input.choiceId}`,
    day: 18,
    category: "consequence" as const,
    title: severe ? "The Rover problem returns" : "The Rover makes it through the month",
    subtitle: severe
      ? "The risk you accepted earlier has become a real cost."
      : "Accepting risk does not always lead to a loss — but it was still a risk.",
    briefing: severe
      ? "The delayed issue worsened and now needs a larger repair before the Rover can be used normally."
      : "The Rover develops only a minor issue this month. Your earlier decision preserved liquidity, but the favourable outcome was not guaranteed.",
    analysis: [
      {
        label: severe ? "Repair required" : "Minor service",
        value: `${amount.toLocaleString()} DT`,
        detail: severe
          ? "The later repair costs more than the earlier full repair would have."
          : "The month ended with a lower cost than the full early repair.",
      },
      {
        label: "Earlier choice",
        value: input.choiceId === "delay" ? "Delayed" : "Partial service",
        detail: "This outcome is linked to a decision you made earlier in the month.",
      },
      {
        label: "Lesson",
        value: "Risk ≠ certainty",
        detail: "A sensible decision cannot be judged only by whether the uncertain outcome happened to be favourable.",
      },
    ],
    choices: [
      {
        id: "handle_rover_outcome",
        label: severe ? `Pay ${amount.toLocaleString()} DT` : `Pay ${amount.toLocaleString()} DT`,
        description: severe
          ? "Fund the larger repair and continue the month."
          : "Cover the minor service and continue the month.",
        cashImpact: -amount,
        effectSummary: severe
          ? "The delayed risk became a larger cash-flow pressure."
          : "The risk did not become severe this time, but it still consumed some cash.",
      },
    ],
    linkedFrom: input.sourceEventId,
    consequenceKind: "rover_follow_up" as const,
  } satisfies BudgetLiveEvent;
}

function buildEquipmentConsequence(input: { seed: number; sourceEventId: string }) {
  const random = createBudgetRandom(input.seed + 8129);
  const benefit = seededAmount(190, random, 0.18);
  return {
    id: "consequence_equipment_return",
    day: 21,
    category: "consequence" as const,
    title: "The equipment starts producing a benefit",
    subtitle: "Some investments help later rather than immediately.",
    briefing:
      "The equipment improves output enough to generate an additional operating contribution this month. It does not fully repay the purchase yet, but part of the benefit is now visible.",
    analysis: [
      {
        label: "Extra contribution",
        value: `+${benefit.toLocaleString()} DT`,
        detail: "This is a simulated operating benefit from the earlier equipment choice.",
      },
      {
        label: "Full payback?",
        value: "Not yet",
        detail: "The original purchase still needs more time to recover its cost.",
      },
      {
        label: "Cash-flow lesson",
        value: "Timing matters",
        detail: "An investment can be worthwhile and still make the current month tighter.",
      },
    ],
    choices: [
      {
        id: "receive_equipment_benefit",
        label: `Receive +${benefit.toLocaleString()} DT`,
        description: "Add the operating contribution to available DT.",
        cashImpact: benefit,
        effectSummary: "The earlier equipment decision has begun to return some cash, but has not fully paid back yet.",
      },
    ],
    linkedFrom: input.sourceEventId,
    consequenceKind: "equipment_follow_up" as const,
  } satisfies BudgetLiveEvent;
}

export function createInitialLiveMonthState(input: {
  profile: BudgetFinancialProfile;
  scenarioKey: BudgetScenarioKey;
  difficulty: BudgetDifficulty;
  scenarioSeed: number;
  allocation: BudgetAllocation;
}): BudgetLiveMonthState {
  return {
    events: generateBudgetLiveMonthEvents(input),
    allocation: cloneAllocation(input.allocation),
    paidCommitments: [],
    resolvedEventIds: [],
    decisions: [],
    snapshots: [snapshotLiveMonth(1, input.allocation)],
    lastOutcome: null,
  };
}

export function nextBudgetLiveEvent(state: BudgetLiveMonthState) {
  return [...state.events]
    .sort((a, b) => a.day - b.day)
    .find((event) => !state.resolvedEventIds.includes(event.id)) ?? null;
}

export function commitmentsDueThrough(input: {
  profile: BudgetFinancialProfile;
  paidCommitments: BudgetPaidCommitment[];
  throughDay: number;
}) {
  const paidIds = new Set(input.paidCommitments.map((item) => item.commitmentId));
  return input.profile.commitments
    .filter((item) => item.dueDay <= input.throughDay && !paidIds.has(item.id))
    .sort((a, b) => a.dueDay - b.dueDay);
}

export function pendingCommitmentTotal(input: {
  profile: BudgetFinancialProfile;
  paidCommitments: BudgetPaidCommitment[];
  throughDay: number;
}) {
  return commitmentsDueThrough(input).reduce((sum, item) => sum + item.amount, 0);
}

export function advanceLiveMonthToDay(input: {
  profile: BudgetFinancialProfile;
  state: BudgetLiveMonthState;
  day: number;
}) {
  const due = commitmentsDueThrough({
    profile: input.profile,
    paidCommitments: input.state.paidCommitments,
    throughDay: input.day,
  });
  const totalDue = due.reduce((sum, item) => sum + item.amount, 0);
  const liquid = budgetLiveLiquidTotal(input.state.allocation);

  if (totalDue > liquid) {
    return {
      ok: false as const,
      shortfall: round10(totalDue - liquid),
      due,
      state: input.state,
    };
  }

  let allocation = cloneAllocation(input.state.allocation);
  const paid: BudgetPaidCommitment[] = [...input.state.paidCommitments];

  for (const commitment of due) {
    const result = spendFromLiquid(allocation, commitment.amount);
    allocation = result.allocation;
    paid.push({
      commitmentId: commitment.id,
      day: commitment.dueDay,
      amount: commitment.amount,
      title: commitment.title,
    });
  }

  const nextState: BudgetLiveMonthState = {
    ...input.state,
    allocation,
    paidCommitments: paid,
    snapshots: appendSnapshot(input.state.snapshots, snapshotLiveMonth(input.day, allocation)),
  };

  return {
    ok: true as const,
    shortfall: 0,
    due,
    state: nextState,
  };
}

export function resolveBudgetLiveEvent(input: {
  state: BudgetLiveMonthState;
  event: BudgetLiveEvent;
  choice: BudgetLiveEventChoice;
  scenarioSeed: number;
}) {
  const fundingGap = liveChoiceFundingGap(input.state.allocation, input.choice);
  if (fundingGap > 0) {
    return {
      ok: false as const,
      fundingGap,
      state: input.state,
    };
  }

  const before = cloneAllocation(input.state.allocation);
  let working = cloneAllocation(before);

  if (input.choice.release) {
    working = transferBudgetAllocation({
      allocation: working,
      from: input.choice.release.from,
      to: "unallocated",
      amount: input.choice.release.amount,
    });
  }

  if (input.choice.allocationMove) {
    const moved = spendFromLiquid(working, input.choice.allocationMove.amount);
    if (moved.shortfall > 0) {
      return {
        ok: false as const,
        fundingGap: moved.shortfall,
        state: input.state,
      };
    }
    working = {
      ...moved.allocation,
      [input.choice.allocationMove.to]: round10(
        moved.allocation[input.choice.allocationMove.to] +
          input.choice.allocationMove.amount,
      ),
    };
  }

  const impact = applyLiveCashImpact(working, input.choice.cashImpact);
  if (impact.shortfall > 0) {
    return {
      ok: false as const,
      fundingGap: impact.shortfall,
      state: input.state,
    };
  }

  let events = [...input.state.events];
  if (input.choice.schedules === "rover_follow_up") {
    const consequence = buildRoverConsequence({
      seed: input.scenarioSeed,
      choiceId: input.choice.id,
      sourceEventId: input.event.id,
    });
    if (!events.some((event) => event.id === consequence.id)) events.push(consequence);
  }
  if (input.choice.schedules === "equipment_follow_up") {
    const consequence = buildEquipmentConsequence({
      seed: input.scenarioSeed,
      sourceEventId: input.event.id,
    });
    if (!events.some((event) => event.id === consequence.id)) events.push(consequence);
  }
  events = events.sort((a, b) => a.day - b.day);

  const decision: BudgetLiveDecision = {
    eventId: input.event.id,
    day: input.event.day,
    choiceId: input.choice.id,
    choiceLabel: input.choice.label,
    cashImpact: input.choice.cashImpact,
    beforeAllocation: before,
    afterAllocation: cloneAllocation(impact.allocation),
    effectSummary: input.choice.effectSummary,
  };

  const nextState: BudgetLiveMonthState = {
    ...input.state,
    events,
    allocation: impact.allocation,
    resolvedEventIds: [...input.state.resolvedEventIds, input.event.id],
    decisions: [...input.state.decisions, decision],
    snapshots: appendSnapshot(
      input.state.snapshots,
      snapshotLiveMonth(input.event.day, impact.allocation),
    ),
    lastOutcome: {
      title: input.event.title,
      detail: input.choice.effectSummary,
      tone:
        input.choice.cashImpact > 0
          ? "positive"
          : input.choice.cashImpact < 0
            ? "warning"
            : "neutral",
    },
  };

  return {
    ok: true as const,
    fundingGap: 0,
    state: nextState,
  };
}

export function clearLiveOutcome(state: BudgetLiveMonthState): BudgetLiveMonthState {
  return { ...state, lastOutcome: null };
}

export function rebalanceLiveMonth(
  state: BudgetLiveMonthState,
  input: { from: BudgetAllocationKey; to: BudgetAllocationKey; amount: number; day: number },
) {
  const allocation = transferBudgetAllocation({
    allocation: state.allocation,
    from: input.from,
    to: input.to,
    amount: input.amount,
  });

  return {
    ...state,
    allocation,
    snapshots: appendSnapshot(state.snapshots, snapshotLiveMonth(input.day, allocation)),
  };
}

export function snapshotLiveMonth(day: number, allocation: BudgetAllocation): BudgetLiveMonthSnapshot {
  return {
    day,
    allocation: cloneAllocation(allocation),
    liquidTotal: round10(budgetLiveLiquidTotal(allocation)),
    protectedTotal: round10(budgetLiveProtectedTotal(allocation)),
  };
}

function appendSnapshot(
  snapshots: BudgetLiveMonthSnapshot[],
  snapshot: BudgetLiveMonthSnapshot,
) {
  const previous = snapshots.at(-1);
  if (
    previous &&
    previous.day === snapshot.day &&
    JSON.stringify(previous.allocation) === JSON.stringify(snapshot.allocation)
  ) {
    return snapshots;
  }
  return [...snapshots, snapshot];
}

export function liveMonthProgress(state: BudgetLiveMonthState) {
  const total = state.events.length;
  const completed = state.resolvedEventIds.length;
  return {
    total,
    completed,
    percent: total > 0 ? Math.round((completed / total) * 100) : 100,
  };
}

export function liveMonthAllocationDelta(
  firstPlan: BudgetAllocation,
  current: BudgetAllocation,
) {
  return (Object.keys(firstPlan) as BudgetAllocationKey[]).map((key) => ({
    key,
    change: signedRound10(current[key] - firstPlan[key]),
  }));
}
