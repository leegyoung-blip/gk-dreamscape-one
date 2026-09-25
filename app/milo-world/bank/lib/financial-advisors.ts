import type { FinancialAdvisorId, FinancialAdvisorMessage } from "./financial-learning-engine-types";

export type FinancialAdvisor = {
  id: FinancialAdvisorId;
  name: string;
  role: string;
  description: string;
  accent: string;
  glow: string;
  imageSrc: string;
  fallbackInitial: string;
};

export const FINANCIAL_ADVISORS: Record<FinancialAdvisorId, FinancialAdvisor> = {
  nova: {
    id: "nova",
    name: "Nova",
    role: "Learning Advisor",
    description: "Calm, analytical guidance that helps you examine the numbers and the reasoning behind a decision.",
    accent: "#8ee8ff",
    glow: "rgba(83,215,255,0.18)",
    imageSrc: "/milo-world/nova/nova-character.png",
    fallbackInitial: "N",
  },
  milo: {
    id: "milo",
    name: "Milo",
    role: "Finance Advisor",
    description: "Practical guidance that connects each idea to the Bank, Exchange and Business Builder.",
    accent: "#ffd18a",
    glow: "rgba(255,190,90,0.18)",
    imageSrc: "/milo-world/milo-character.png",
    fallbackInitial: "M",
  },
};

export const DEFAULT_FINANCIAL_ADVISOR: FinancialAdvisorId = "milo";
export const FINANCIAL_ADVISOR_STORAGE_KEY = "dreamscape:milo-finance:advisor:v1";

export function resolveAdvisorMessage(
  message: FinancialAdvisorMessage | undefined,
  advisorId: FinancialAdvisorId,
): string | null {
  if (!message) return null;
  if (typeof message === "string") return message;
  return message[advisorId] ?? message.milo ?? message.nova ?? null;
}
