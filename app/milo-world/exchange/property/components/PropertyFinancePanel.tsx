"use client";

import { useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import {
  formatNumber,
  formatShortDate,
  type PropertyFinanceDashboard,
  type PropertyTabStyles,
  type PropertyUnit,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  dashboard: PropertyFinanceDashboard;
  units: PropertyUnit[];
  dreamTokens: number;
  actionLoading: boolean;
  isMobile: boolean;
  isCompact: boolean;
  onRefresh: () => Promise<void>;
  onCatchUp: (loanId: string) => Promise<void>;
  onPayExtra: (loanId: string, amount: number) => Promise<void>;
  onPayOff: (loanId: string) => Promise<void>;
  onStartProtection: (unitId: string, planCode: "basic" | "plus" | "premium") => Promise<void>;
  onCancelProtection: (policyId: string) => Promise<void>;
};

function healthLabel(score: number) {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Comfortable";
  if (score >= 55) return "Balanced";
  if (score >= 40) return "Stretched";
  return "At Risk";
}

function planLabel(code: string) {
  if (code === "steady") return "Steady";
  if (code === "balanced") return "Balanced";
  if (code === "growth") return "Growth";
  return code;
}

function protectionLabel(code: string) {
  if (code === "basic") return "Basic Cover";
  if (code === "plus") return "Plus Cover";
  if (code === "premium") return "Premium Cover";
  return code;
}

export default function PropertyFinancePanel({
  dashboard,
  units,
  dreamTokens,
  actionLoading,
  isMobile,
  isCompact,
  glassPanel,
  primaryButton,
  secondaryButton,
  onRefresh,
  onCatchUp,
  onPayExtra,
  onPayOff,
  onStartProtection,
  onCancelProtection,
}: Props) {
  const [extraLoanId, setExtraLoanId] = useState<string | null>(null);
  const [extraAmount, setExtraAmount] = useState(100);
  const [protectUnitId, setProtectUnitId] = useState<string | null>(null);
  const [protectPlan, setProtectPlan] = useState<"basic" | "plus" | "premium">("plus");

  const stats = dashboard.stats;
  const activeLoans = dashboard.loans.filter((loan) => ["active", "behind"].includes(loan.status));
  const policyByUnit = useMemo(() => {
    const map = new Map<string, (typeof dashboard.policies)[number]>();
    for (const policy of dashboard.policies) {
      if (policy.status === "active") map.set(policy.unit_id, policy);
    }
    return map;
  }, [dashboard.policies]);

  const health = Math.max(0, Math.min(100, Number(stats.finance_health || 0)));
  const ltv = Number(stats.portfolio_ltv_bps || 0) / 100;
  const rentCoverage = stats.weekly_debt_payment > 0
    ? Number(stats.contracted_weekly_rent || 0) / Number(stats.weekly_debt_payment || 1)
    : 0;

  return (
    <section
      data-milo-guide="property-finance"
      style={{
        ...glassPanel,
        padding: isMobile ? "18px" : "24px",
        border: "1px solid rgba(198,184,255,0.18)",
        background:
          "linear-gradient(145deg, rgba(198,184,255,0.055), rgba(5,13,28,0.76))",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          gap: "12px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#c6b8ff",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Property Finance
          </p>
          <h2
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "31px" : "39px",
              fontWeight: 500,
            }}
          >
            Balance growth with repayments
          </h2>
          <p
            style={{
              margin: "9px 0 0",
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.55,
              maxWidth: "920px",
            }}
          >
            Finance can help you buy a property with a smaller deposit, but the unpaid amount becomes debt. Rent can help with repayments, and paying extra builds your equity faster.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRefresh()}
          disabled={actionLoading}
          style={{ ...secondaryButton, minHeight: "40px", opacity: actionLoading ? 0.55 : 1 }}
        >
          ↻ Refresh Finance
        </button>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))",
          gap: "10px",
        }}
      >
        {[
          ["Property Value", `${formatNumber(stats.gross_property_value)} DT`],
          ["Debt", `${formatNumber(stats.debt_balance)} DT`],
          ["Your Equity", `${formatNumber(stats.property_equity)} DT`],
          ["Weekly Repayments", `${formatNumber(stats.weekly_debt_payment)} DT`],
          ["Portfolio LTV", `${ltv.toFixed(1)}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              borderRadius: "15px",
              background: "rgba(255,255,255,0.045)",
              border: "1px solid rgba(255,255,255,0.08)",
              padding: "13px",
            }}
          >
            <small style={{ color: "rgba(255,255,255,0.44)" }}>{label}</small>
            <strong style={{ display: "block", marginTop: "5px", fontSize: "18px" }}>{value}</strong>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "14px",
          borderRadius: "16px",
          padding: "14px 16px",
          border: "1px solid rgba(198,184,255,0.16)",
          background: "rgba(198,184,255,0.055)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <span>
            <strong>Finance Health: {healthLabel(health)}</strong>
            <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.48)" }}>
              {stats.active_loans} active plan{stats.active_loans === 1 ? "" : "s"} · {stats.loans_behind} behind · {stats.protected_units} protected
            </small>
          </span>
          <strong style={{ color: "#c6b8ff", fontSize: "20px" }}>{health}/100</strong>
        </div>
        <div
          style={{
            marginTop: "10px",
            height: "10px",
            borderRadius: "999px",
            overflow: "hidden",
            background: "rgba(255,255,255,0.08)",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${health}%`,
              borderRadius: "999px",
              background: "linear-gradient(90deg,#ff9b9b,#ffd18a,#79f2ce,#8ee8ff)",
            }}
          />
        </div>
        <div style={{ marginTop: "8px", color: "rgba(255,255,255,0.48)", fontSize: "11px" }}>
          Contracted rent covers {rentCoverage > 0 ? `${rentCoverage.toFixed(1)}×` : "0×"} your scheduled weekly repayments. Cash available: {formatNumber(dreamTokens)} DT.
        </div>
      </div>

      <div style={{ marginTop: "18px" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>My Finance Plans</h3>
        {activeLoans.length === 0 ? (
          <div
            style={{
              marginTop: "10px",
              borderRadius: "16px",
              padding: "18px",
              border: "1px dashed rgba(198,184,255,0.18)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            You do not have an active property finance plan. On the Property Map, choose Finance when buying a new Dreamscape property.
          </div>
        ) : (
          <div
            style={{
              marginTop: "10px",
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
              gap: "12px",
            }}
          >
            {activeLoans.map((loan) => {
              const paidPct = loan.original_principal > 0
                ? Math.max(0, Math.min(100, ((loan.original_principal - loan.principal_remaining) / loan.original_principal) * 100))
                : 100;
              const behind = loan.status === "behind" || loan.missed_payments > 0;
              return (
                <article
                  key={loan.loan_id}
                  style={{
                    borderRadius: "18px",
                    border: behind ? "1px solid rgba(255,146,146,0.24)" : "1px solid rgba(198,184,255,0.15)",
                    background: behind ? "rgba(255,146,146,0.045)" : "rgba(255,255,255,0.04)",
                    padding: "15px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                    <span>
                      <strong style={{ display: "block" }}>{loan.property_name} · Unit {loan.unit_number}</strong>
                      <small style={{ display: "block", marginTop: "4px", color: "rgba(255,255,255,0.45)" }}>
                        {planLabel(loan.plan_code)} Plan · {(loan.annual_rate_bps / 100).toFixed(1)}% rate
                      </small>
                    </span>
                    <span style={{ color: behind ? "#ff9292" : "#79f2ce", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>
                      {behind ? "Behind" : "On Track"}
                    </span>
                  </div>

                  <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                    <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.04)", padding: "10px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Debt left</small><strong style={{ display: "block", marginTop: "4px" }}>{formatNumber(loan.principal_remaining)} DT</strong></div>
                    <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.04)", padding: "10px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Your equity</small><strong style={{ display: "block", marginTop: "4px", color: "#79f2ce" }}>{formatNumber(loan.equity_value)} DT</strong></div>
                    <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.04)", padding: "10px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Weekly payment</small><strong style={{ display: "block", marginTop: "4px" }}>{formatNumber(loan.scheduled_weekly_payment)} DT</strong></div>
                    <div style={{ borderRadius: "12px", background: "rgba(255,255,255,0.04)", padding: "10px" }}><small style={{ color: "rgba(255,255,255,0.42)" }}>Next due</small><strong style={{ display: "block", marginTop: "4px" }}>{formatShortDate(loan.next_payment_due_on)}</strong></div>
                  </div>

                  <div style={{ marginTop: "11px", height: "7px", borderRadius: "999px", overflow: "hidden", background: "rgba(255,255,255,0.07)" }}>
                    <div style={{ width: `${paidPct}%`, height: "100%", background: "#c6b8ff" }} />
                  </div>
                  <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.42)" }}>
                    {paidPct.toFixed(0)}% of principal repaid · LTV {(loan.ltv_bps / 100).toFixed(1)}%
                  </small>

                  {behind && (
                    <button
                      type="button"
                      onClick={() => void onCatchUp(loan.loan_id)}
                      disabled={actionLoading}
                      style={{ ...primaryButton, width: "100%", minHeight: "38px", marginTop: "11px", background: "rgba(255,146,146,0.12)", borderColor: "rgba(255,146,146,0.25)" }}
                    >
                      Catch Up Oldest Payment
                    </button>
                  )}

                  {extraLoanId === loan.loan_id ? (
                    <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr auto", gap: "8px" }}>
                      <input
                        type="number"
                        min={1}
                        max={loan.principal_remaining}
                        value={extraAmount}
                        onChange={(event: ChangeEvent<HTMLInputElement>) => setExtraAmount(Math.max(1, Math.round(Number(event.target.value) || 1)))}
                        style={{ height: "40px", borderRadius: "12px", border: "1px solid rgba(198,184,255,0.2)", background: "rgba(255,255,255,0.07)", color: "white", padding: "0 11px" }}
                      />
                      <button type="button" onClick={() => void onPayExtra(loan.loan_id, extraAmount)} disabled={actionLoading} style={{ ...primaryButton, minHeight: "40px", padding: "0 14px" }}>Pay</button>
                    </div>
                  ) : (
                    <div style={{ marginTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button type="button" onClick={() => { setExtraLoanId(loan.loan_id); setExtraAmount(Math.min(100, Math.max(1, loan.principal_remaining))); }} style={{ ...secondaryButton, minHeight: "38px" }}>Pay Extra</button>
                      <button type="button" onClick={() => void onPayOff(loan.loan_id)} disabled={actionLoading || dreamTokens < loan.principal_remaining} style={{ ...secondaryButton, minHeight: "38px", opacity: dreamTokens < loan.principal_remaining ? 0.45 : 1 }}>Pay Off</button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "18px" }}>Property Protection</h3>
        <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.48)", fontSize: "12px", lineHeight: 1.5 }}>
          Protection reimburses part of qualifying repair costs after a full repair or quick fix. Premiums are paid weekly in DT.
        </p>
        <div
          style={{
            marginTop: "10px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isCompact ? "repeat(2,minmax(0,1fr))" : "repeat(3,minmax(0,1fr))",
            gap: "10px",
          }}
        >
          {units.map((unit) => {
            const policy = policyByUnit.get(unit.unit_id);
            return (
              <article key={unit.unit_id} style={{ borderRadius: "16px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.035)", padding: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span>
                    <strong style={{ display: "block" }}>{unit.property_name}</strong>
                    <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)" }}>Unit {unit.unit_number}</small>
                  </span>
                  <span style={{ color: policy ? "#79f2ce" : "rgba(255,255,255,0.45)", fontSize: "10px", fontWeight: 900, textTransform: "uppercase" }}>{policy ? "Protected" : "No Cover"}</span>
                </div>
                {policy ? (
                  <>
                    <div style={{ marginTop: "10px", color: "rgba(255,255,255,0.58)", fontSize: "12px" }}>
                      {protectionLabel(policy.plan_code)} · {(policy.coverage_bps / 100).toFixed(0)}% reimbursement · {formatNumber(policy.weekly_premium)} DT/week
                    </div>
                    <button type="button" onClick={() => void onCancelProtection(policy.policy_id)} disabled={actionLoading} style={{ ...secondaryButton, width: "100%", minHeight: "36px", marginTop: "9px" }}>Cancel Protection</button>
                  </>
                ) : protectUnitId === unit.unit_id ? (
                  <div style={{ marginTop: "9px", display: "grid", gap: "8px" }}>
                    <select value={protectPlan} onChange={(event: ChangeEvent<HTMLSelectElement>) => setProtectPlan(event.target.value as "basic" | "plus" | "premium")} style={{ height: "40px", borderRadius: "11px", border: "1px solid rgba(198,184,255,0.18)", background: "#111a30", color: "white", padding: "0 10px" }}>
                      <option value="basic">Basic · 40% · 5 DT/week</option>
                      <option value="plus">Plus · 65% · 9 DT/week</option>
                      <option value="premium">Premium · 80% · 15 DT/week</option>
                    </select>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button type="button" onClick={() => void onStartProtection(unit.unit_id, protectPlan)} disabled={actionLoading} style={{ ...primaryButton, minHeight: "36px" }}>Start</button>
                      <button type="button" onClick={() => setProtectUnitId(null)} style={{ ...secondaryButton, minHeight: "36px" }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => { setProtectUnitId(unit.unit_id); setProtectPlan("plus"); }} style={{ ...secondaryButton, width: "100%", minHeight: "36px", marginTop: "9px" }}>Add Protection</button>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
