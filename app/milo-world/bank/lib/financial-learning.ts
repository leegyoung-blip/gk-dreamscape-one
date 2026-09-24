import type { MiloFinanceAccessTier } from "./milo-finance-access";

export type FinancialLearningPathway = {
  id: string;
  order: number;
  title: string;
  description: string;
  status: "available" | "planned";
  meta: string;
  accent: string;
  accessTier: MiloFinanceAccessTier;
  includesPremium?: boolean;
};

export const FINANCIAL_FOUNDATIONS_TOTAL_LESSONS = 6;

export const FINANCIAL_LEARNING_PATHWAYS: FinancialLearningPathway[] = [
  {
    id: "financial-foundations",
    order: 1,
    title: "Financial Foundations",
    description:
      "Build the core ideas behind saving, interest, bonds, priorities and risk before applying them elsewhere in Milo’s World.",
    status: "available",
    meta: "6 lessons · free",
    accent: "#8ee8ff",
    accessTier: "free",
  },
  {
    id: "banking-growth",
    order: 2,
    title: "Banking & Growth",
    description:
      "Go deeper into banks, liquidity, interest, compound growth and bonds through applied Dreamscape decisions.",
    status: "available",
    meta: "8 lessons · first 2 free",
    accent: "#9fffd2",
    accessTier: "free",
    includesPremium: true,
  },
  {
    id: "markets-investing",
    order: 3,
    title: "Markets & Investing",
    description:
      "Understand changing prices, diversification, long-term thinking and investment risk.",
    status: "planned",
    meta: "Advanced pathway",
    accent: "#b8a8ff",
    accessTier: "milo_finance",
  },
  {
    id: "money-decisions",
    order: 4,
    title: "Money Decisions",
    description:
      "Work through realistic choices where there may be trade-offs rather than one obvious answer.",
    status: "planned",
    meta: "Advanced pathway",
    accent: "#ffd18a",
    accessTier: "milo_finance",
  },
  {
    id: "business-enterprise",
    order: 5,
    title: "Business & Enterprise",
    description:
      "Learn revenue, cost, profit, pricing, cash flow and business growth before using Business Builder.",
    status: "planned",
    meta: "Advanced pathway",
    accent: "#ffb98e",
    accessTier: "milo_finance",
  },
];
