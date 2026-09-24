import { FINANCIAL_ADVISORS, resolveAdvisorMessage } from "../lib/financial-advisors";
import type { FinancialAdvisorId, FinancialAdvisorMessage } from "../lib/financial-learning-engine-types";
import FinancialAdvisorAvatar from "./FinancialAdvisorAvatar";

export default function FinancialAdvisorNote({
  advisorId,
  message,
}: {
  advisorId: FinancialAdvisorId;
  message?: FinancialAdvisorMessage;
}) {
  const advisor = FINANCIAL_ADVISORS[advisorId];
  const resolved = resolveAdvisorMessage(message, advisorId);
  if (!resolved) return null;

  return (
    <div style={{ marginTop: "17px", display: "flex", gap: "11px", alignItems: "flex-start", borderRadius: "17px", border: `1px solid ${advisor.accent}28`, background: `linear-gradient(145deg, ${advisor.glow}, rgba(5,13,28,0.55))`, padding: "12px 13px" }}>
      <FinancialAdvisorAvatar advisorId={advisorId} size={42} />
      <div>
        <div style={{ color: advisor.accent, fontSize: "9px", fontWeight: 900, letterSpacing: "0.11em", textTransform: "uppercase" }}>{advisor.name} · Your advisor</div>
        <div style={{ marginTop: "5px", color: "rgba(255,255,255,0.68)", fontSize: "12px", lineHeight: 1.55 }}>{resolved}</div>
      </div>
    </div>
  );
}
