import type { FinancialLessonDefinition } from "./financial-learning-engine-types";

/**
 * Developer-only Phase 2C route example. Do not add this directly to the learner catalogue.
 * It demonstrates state effects, choice routing, conditional routing, and safe Back behaviour.
 */
export const BRANCHING_ENGINE_REFERENCE_LESSON: FinancialLessonDefinition = {
  schemaVersion: 2,
  id: "reference:rover-upgrade-decision",
  courseId: "financial-foundations",
  moduleId: "money-decisions",
  order: 998,
  title: "Nova & Milo: The Upgrade Decision",
  shortTitle: "Upgrade Decision",
  description: "A developer reference for the Phase 2C branching and consequence engine.",
  duration: "4–6 min",
  rewardDt: 0,
  accessTier: "free",
  concepts: ["Liquidity", "Trade-offs", "Emergency reserves"],
  variables: [
    { key: "cash", label: "Available DT", initialValue: 4500, unit: "DT", visible: true },
    { key: "reserve_target", label: "Reserve target", initialValue: 1500, unit: "DT", visible: true },
  ],
  startBlockId: "briefing",
  blocks: [
    {
      id: "briefing",
      type: "scenario",
      title: "The rover upgrade is available today.",
      body: "Nova wants the 3,800 DT navigation upgrade before an expedition. Milo points out that the team normally keeps 1,500 DT available for unexpected costs.",
      facts: [
        { label: "Available", value: "4,500 DT", tone: "positive" },
        { label: "Upgrade", value: "3,800 DT" },
        { label: "Usual reserve", value: "1,500 DT", tone: "warning" },
      ],
      nextBlockId: "decision",
    },
    {
      id: "decision",
      type: "decision",
      title: "Choose the priority.",
      prompt: "What should Nova and Milo do?",
      choices: [
        {
          id: "buy-now",
          label: "Buy the upgrade now",
          summary: "Gain the navigation upgrade immediately.",
          strengths: ["Immediate expedition capability"],
          tradeoffs: ["Available reserve falls sharply"],
          effects: [{ key: "cash", operation: "subtract", value: 3800 }],
          nextBlockId: "surprise-repair",
          advisorFeedback: {
            nova: "The upgrade improves capability, but the remaining liquidity is now part of the risk calculation.",
            milo: "You got the upgrade. Now look carefully at what is left in the Wallet.",
          },
        },
        {
          id: "wait",
          label: "Keep the reserve and wait",
          summary: "Delay the upgrade and protect available DT.",
          strengths: ["Maintains flexibility"],
          tradeoffs: ["Upgrade may cost more later"],
          nextBlockId: "wait-outcome",
          advisorFeedback: {
            nova: "This prioritises resilience over immediate capability.",
            milo: "Waiting preserves your options, but there may be a cost to delaying.",
          },
        },
      ],
    },
    {
      id: "surprise-repair",
      type: "scenario",
      title: "An unexpected repair appears.",
      body: "A damaged stabiliser needs 900 DT before the rover can leave safely.",
      effects: [{ key: "cash", operation: "subtract", value: 900 }],
      branchRules: [
        {
          id: "cash-negative",
          conditions: [{ source: "variable", key: "cash", operator: "lt", value: 0 }],
          nextBlockId: "shortfall",
        },
      ],
      nextBlockId: "covered",
    },
    {
      id: "shortfall",
      type: "explain",
      eyebrow: "Consequence",
      title: "The team has a shortfall.",
      body: "After buying the upgrade, there was not enough available DT to absorb the repair. The decision delivered immediate capability but reduced resilience.",
      keyIdea: "A purchase can be affordable and still leave too little liquidity afterward.",
      nextBlockId: "final-compare",
    },
    {
      id: "covered",
      type: "explain",
      eyebrow: "Consequence",
      title: "The repair is covered.",
      body: "The team can pay the repair without reversing the earlier decision. The remaining liquidity was enough for this particular event.",
      nextBlockId: "final-compare",
    },
    {
      id: "wait-outcome",
      type: "scenario",
      title: "The upgrade sale ends.",
      body: "The team keeps its reserve intact, but the upgrade later costs 4,100 DT instead of 3,800 DT.",
      questionToConsider: "Was the extra 300 DT worth the flexibility the team kept?",
      nextBlockId: "final-compare",
    },
    {
      id: "final-compare",
      type: "comparison",
      title: "There was no consequence-free option.",
      columns: [
        { id: "now", title: "Buy now", accent: "cyan", points: ["Immediate capability", "Lower liquidity"] },
        { id: "wait", title: "Wait", accent: "gold", points: ["Higher liquidity", "Possible higher future cost"] },
      ],
      takeaway: "Financial judgement is often about choosing which trade-off best matches the goal and the risks—not finding an option with no downside.",
    },
  ],
};
