export type FinancialCourseRecommendation = {
  nextCourseTitle: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

export const FINANCIAL_COURSE_RECOMMENDATIONS: Record<string, FinancialCourseRecommendation> = {
  "financial-foundations": {
    nextCourseTitle: "Banking & Growth",
    message: "Use the foundations in longer-term decisions about liquidity, interest, time and Bank Bonds.",
  },
  "banking-growth": {
    nextCourseTitle: "Markets & Investing",
    message: "Move from fixed Bank mechanics into changing-value assets, portfolio exposure and market uncertainty.",
  },
  "markets-investing": {
    nextCourseTitle: "Money Decisions",
    message: "You understand the market concepts. Next, practise deciding when those concepts actually fit a goal, deadline or constraint.",
    actionLabel: "Apply it in Milo’s Exchange",
    actionHref: "/milo-world/exchange",
  },
  "money-decisions": {
    nextCourseTitle: "Business & Enterprise",
    message: "Your next pathway will apply trade-offs, opportunity cost and cash decisions inside Business Builder.",
  },
  "business-enterprise": {
    nextCourseTitle: "Milo’s Business Builder",
    message: "You have completed the business pathway. Apply pricing, cash-flow, capacity, risk and growth reasoning inside your live Dreamscape business.",
    actionLabel: "Apply it in Business Builder",
    actionHref: "/milo-world/club",
  },
};
