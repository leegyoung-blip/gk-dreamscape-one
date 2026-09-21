"use client";

import {
  formatDateTime,
  formatNumber,
  type PropertyLease,
  type PropertyMaintenanceAction,
  type PropertyMaintenanceIssue,
  type PropertyTabStyles,
  type PropertyUnit,
} from "./propertyExchangeShared";

type Props = PropertyTabStyles & {
  unit: PropertyUnit;
  lease: PropertyLease | null;
  issues: PropertyMaintenanceIssue[];
  actions: PropertyMaintenanceAction[];
  dreamTokens: number;
  actionLoading: boolean;
  isMobile: boolean;
  onRespondIssue: (
    issueId: string,
    action: "full_repair" | "quick_fix" | "ignore"
  ) => Promise<void>;
  onPreventiveService: (unitId: string) => Promise<void>;
};

const SEVERITY_META: Record<
  string,
  { label: string; accent: string; background: string; rank: number }
> = {
  minor: {
    label: "Minor",
    accent: "#8ee8ff",
    background: "rgba(142,232,255,0.08)",
    rank: 1,
  },
  moderate: {
    label: "Moderate",
    accent: "#ffd18a",
    background: "rgba(255,209,138,0.08)",
    rank: 2,
  },
  major: {
    label: "Major",
    accent: "#ffb37a",
    background: "rgba(255,179,122,0.09)",
    rank: 3,
  },
  critical: {
    label: "Critical",
    accent: "#ff9292",
    background: "rgba(255,146,146,0.10)",
    rank: 4,
  },
};

function conditionLabel(condition: number) {
  if (condition >= 90) return "Excellent";
  if (condition >= 75) return "Good";
  if (condition >= 60) return "Fair";
  if (condition >= 40) return "Poor";
  return "Critical";
}

function satisfactionLabel(value: number) {
  if (value >= 85) return "Very happy";
  if (value >= 70) return "Happy";
  if (value >= 50) return "Stable";
  if (value >= 35) return "At risk";
  return "Likely to leave";
}

function actionLabel(action: string) {
  if (action === "full_repair") return "Full repair";
  if (action === "quick_fix") return "Quick fix";
  if (action === "ignore") return "Ignored";
  if (action === "preventive_service") return "Preventive service";
  if (action === "system_resolution") return "Temporary fix held";
  if (action === "tenant_departure") return "Tenant departed";
  return action;
}

export default function PropertyMaintenancePanel({
  unit,
  lease,
  issues,
  actions,
  dreamTokens,
  actionLoading,
  isMobile,
  glassPanel,
  primaryButton,
  secondaryButton,
  onRespondIssue,
  onPreventiveService,
}: Props) {
  const unresolved = issues
    .filter((issue) => ["open", "ignored", "temporary"].includes(issue.status))
    .sort((a, b) => {
      const rankA = SEVERITY_META[a.severity]?.rank || 1;
      const rankB = SEVERITY_META[b.severity]?.rank || 1;
      return rankB - rankA || new Date(b.reported_at).getTime() - new Date(a.reported_at).getTime();
    });

  const history = actions.slice(0, 8);
  const estimatedServiceCost = Math.max(60, Math.round(unit.current_value * 0.015));
  const canService = dreamTokens >= estimatedServiceCost;
  const satisfaction = Number(lease?.satisfaction || 0);

  return (
    <div
      data-milo-guide="property-maintenance-system"
      style={{
        padding: isMobile ? "22px" : "28px",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "flex-end",
          gap: "14px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#79f2ce",
              fontSize: "11px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.18em",
            }}
          >
            Property Care
          </p>
          <h3
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "30px" : "38px",
              fontWeight: 500,
            }}
          >
            Maintenance & tenant satisfaction
          </h3>
          <p
            style={{
              margin: "9px 0 0",
              maxWidth: "780px",
              color: "rgba(255,255,255,0.52)",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            Condition now affects this unit’s value and rent potential. When a tenant is
            present, unresolved problems also reduce satisfaction and can eventually make
            the tenant leave.
          </p>
        </div>
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
          gap: "12px",
        }}
      >
        <article style={{ ...glassPanel, padding: "17px", borderRadius: "19px" }}>
          <span
            style={{
              display: "block",
              color: "rgba(255,255,255,0.45)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 900,
            }}
          >
            Property Condition
          </span>
          <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <strong style={{ fontSize: "24px" }}>{unit.condition}/100</strong>
            <strong
              style={{
                color:
                  unit.condition >= 75
                    ? "#79f2ce"
                    : unit.condition >= 50
                    ? "#ffd18a"
                    : "#ff9292",
                fontSize: "12px",
              }}
            >
              {conditionLabel(unit.condition)}
            </strong>
          </div>
          <div
            style={{
              marginTop: "10px",
              height: "9px",
              borderRadius: "999px",
              background: "rgba(255,255,255,0.08)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${Math.max(0, Math.min(100, unit.condition))}%`,
                height: "100%",
                borderRadius: "999px",
                background:
                  "linear-gradient(90deg, rgba(121,242,206,0.72), rgba(255,209,138,0.9))",
              }}
            />
          </div>
        </article>

        <article style={{ ...glassPanel, padding: "17px", borderRadius: "19px" }}>
          <span
            style={{
              display: "block",
              color: "rgba(255,255,255,0.45)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 900,
            }}
          >
            Tenant Satisfaction
          </span>
          {lease ? (
            <>
              <div style={{ marginTop: "9px", display: "flex", justifyContent: "space-between", gap: "10px" }}>
                <strong style={{ fontSize: "24px" }}>{satisfaction}/100</strong>
                <strong
                  style={{
                    color:
                      satisfaction >= 70
                        ? "#79f2ce"
                        : satisfaction >= 50
                        ? "#8ee8ff"
                        : satisfaction >= 35
                        ? "#ffd18a"
                        : "#ff9292",
                    fontSize: "12px",
                  }}
                >
                  {satisfactionLabel(satisfaction)}
                </strong>
              </div>
              <small style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.44)", lineHeight: 1.45 }}>
                {lease.resident_name} · rent, condition and unresolved maintenance all influence this score.
              </small>
            </>
          ) : (
            <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "12px", lineHeight: 1.5 }}>
              No active tenant. Condition still affects property value and future rental demand.
            </p>
          )}
        </article>

        <article style={{ ...glassPanel, padding: "17px", borderRadius: "19px" }}>
          <span
            style={{
              display: "block",
              color: "rgba(255,255,255,0.45)",
              fontSize: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 900,
            }}
          >
            Open Maintenance
          </span>
          <strong
            style={{
              display: "block",
              marginTop: "9px",
              fontSize: "24px",
              color: unresolved.length > 0 ? "#ffd18a" : "#79f2ce",
            }}
          >
            {unresolved.length}
          </strong>
          <small style={{ display: "block", marginTop: "7px", color: "rgba(255,255,255,0.44)", lineHeight: 1.45 }}>
            {unresolved.length === 0
              ? "No unresolved problems right now."
              : "Ignoring problems makes them more expensive and can reduce tenant satisfaction."}
          </small>
        </article>
      </div>

      <section
        style={{
          marginTop: "14px",
          borderRadius: "20px",
          border: "1px solid rgba(121,242,206,0.16)",
          background: "rgba(121,242,206,0.045)",
          padding: "17px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
          gap: "14px",
          alignItems: "center",
        }}
      >
        <div>
          <strong style={{ display: "block", color: "#79f2ce" }}>Preventive service</strong>
          <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.53)", fontSize: "12px", lineHeight: 1.55 }}>
            Service the property before something fails. It restores some condition and cuts breakdown risk for 21 days.
          </p>
          <small style={{ display: "block", marginTop: "7px", color: "rgba(255,255,255,0.4)" }}>
            Estimated service cost: {formatNumber(estimatedServiceCost)} DT · 14-day service cooldown
          </small>
        </div>
        <button
          type="button"
          disabled={actionLoading || !canService}
          onClick={() => void onPreventiveService(unit.unit_id)}
          style={{
            ...primaryButton,
            minWidth: isMobile ? "100%" : "190px",
            opacity: actionLoading || !canService ? 0.5 : 1,
            cursor: actionLoading || !canService ? "not-allowed" : "pointer",
          }}
        >
          {actionLoading
            ? "Processing..."
            : canService
            ? `Service Property · ~${formatNumber(estimatedServiceCost)} DT`
            : `Need ~${formatNumber(estimatedServiceCost - dreamTokens)} more DT`}
        </button>
      </section>

      <div style={{ marginTop: "18px" }}>
        <p
          style={{
            margin: 0,
            color: "#ffd18a",
            fontSize: "11px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.16em",
          }}
        >
          Maintenance Requests
        </p>

        {unresolved.length === 0 ? (
          <div
            style={{
              marginTop: "10px",
              minHeight: "96px",
              borderRadius: "17px",
              border: "1px dashed rgba(121,242,206,0.17)",
              display: "grid",
              placeItems: "center",
              padding: "18px",
              textAlign: "center",
              color: "rgba(255,255,255,0.45)",
              fontSize: "12px",
            }}
          >
            No maintenance request needs a decision right now.
          </div>
        ) : (
          <div style={{ marginTop: "10px", display: "grid", gap: "11px" }}>
            {unresolved.map((issue) => {
              const meta = SEVERITY_META[issue.severity] || SEVERITY_META.minor;
              const isTemporary = issue.status === "temporary";
              const canFullRepair = dreamTokens >= issue.full_repair_cost;
              const canQuickFix = dreamTokens >= issue.quick_fix_cost;

              return (
                <article
                  key={issue.issue_id}
                  style={{
                    borderRadius: "19px",
                    border: `1px solid ${meta.accent}35`,
                    background: meta.background,
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", alignItems: "center" }}>
                        <span
                          style={{
                            borderRadius: "999px",
                            padding: "5px 8px",
                            background: meta.background,
                            color: meta.accent,
                            border: `1px solid ${meta.accent}42`,
                            fontSize: "9px",
                            fontWeight: 950,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                          }}
                        >
                          {meta.label}
                        </span>
                        <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px", textTransform: "uppercase", fontWeight: 900 }}>
                          {isTemporary ? "Temporary fix" : issue.status}
                        </span>
                      </div>
                      <h4 style={{ margin: "9px 0 0", fontSize: "17px" }}>{issue.title}</h4>
                      <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,0.55)", fontSize: "12px", lineHeight: 1.55 }}>
                        {issue.description}
                      </p>
                      {issue.resident_message && (
                        <p style={{ margin: "8px 0 0", color: "#ffe1aa", fontSize: "12px", lineHeight: 1.5 }}>
                          {issue.resident_message}
                        </p>
                      )}
                      <small style={{ display: "block", marginTop: "8px", color: "rgba(255,255,255,0.38)" }}>
                        Reported {formatDateTime(issue.reported_at)}
                        {issue.recurrence_due_on ? ` · temporary fix review ${issue.recurrence_due_on}` : ""}
                      </small>
                    </div>

                    <div
                      style={{
                        flexShrink: 0,
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr",
                        gap: "7px",
                        minWidth: isMobile ? "100%" : "170px",
                      }}
                    >
                      <div style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.05)" }}>
                        <small style={{ color: "rgba(255,255,255,0.4)" }}>Full repair</small>
                        <strong style={{ display: "block", marginTop: "4px" }}>{formatNumber(issue.full_repair_cost)} DT</strong>
                      </div>
                      <div style={{ borderRadius: "13px", padding: "10px", background: "rgba(255,255,255,0.05)" }}>
                        <small style={{ color: "rgba(255,255,255,0.4)" }}>Quick fix</small>
                        <strong style={{ display: "block", marginTop: "4px" }}>{formatNumber(issue.quick_fix_cost)} DT</strong>
                      </div>
                    </div>
                  </div>

                  {!isTemporary && (
                    <div
                      style={{
                        marginTop: "13px",
                        display: "grid",
                        gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))",
                        gap: "8px",
                      }}
                    >
                      <button
                        type="button"
                        disabled={actionLoading || !canFullRepair}
                        onClick={() => void onRespondIssue(issue.issue_id, "full_repair")}
                        style={{
                          ...primaryButton,
                          minHeight: "40px",
                          opacity: actionLoading || !canFullRepair ? 0.5 : 1,
                        }}
                      >
                        {canFullRepair
                          ? `Full Repair · ${formatNumber(issue.full_repair_cost)} DT`
                          : `Need ${formatNumber(issue.full_repair_cost - dreamTokens)} DT`}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading || !canQuickFix}
                        onClick={() => void onRespondIssue(issue.issue_id, "quick_fix")}
                        style={{
                          ...secondaryButton,
                          minHeight: "40px",
                          opacity: actionLoading || !canQuickFix ? 0.5 : 1,
                        }}
                      >
                        {canQuickFix
                          ? `Quick Fix · ${formatNumber(issue.quick_fix_cost)} DT`
                          : `Need ${formatNumber(issue.quick_fix_cost - dreamTokens)} DT`}
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading || issue.status === "ignored"}
                        onClick={() => void onRespondIssue(issue.issue_id, "ignore")}
                        style={{
                          ...secondaryButton,
                          minHeight: "40px",
                          color: "#ffb0b0",
                          opacity: actionLoading || issue.status === "ignored" ? 0.5 : 1,
                        }}
                      >
                        {issue.status === "ignored" ? "Issue Ignored" : "Ignore for Now"}
                      </button>
                    </div>
                  )}

                  {isTemporary && (
                    <div style={{ marginTop: "12px", borderRadius: "14px", padding: "12px", background: "rgba(142,232,255,0.06)", color: "rgba(255,255,255,0.57)", fontSize: "12px", lineHeight: 1.5 }}>
                      The quick fix is holding for now. When the review date arrives, the issue may resolve or return—possibly at a higher severity.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <p
            style={{
              margin: 0,
              color: "rgba(255,255,255,0.45)",
              fontSize: "10px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.14em",
            }}
          >
            Recent Property Care History
          </p>
          <div style={{ marginTop: "9px", display: "grid", gap: "7px" }}>
            {history.map((action) => (
              <div
                key={action.action_id}
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "130px minmax(0,1fr) auto",
                  gap: "9px",
                  alignItems: "center",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.035)",
                  padding: "11px 12px",
                }}
              >
                <strong style={{ color: action.action === "tenant_departure" ? "#ff9292" : "#8ee8ff", fontSize: "11px" }}>
                  {actionLabel(action.action)}
                </strong>
                <span style={{ color: "rgba(255,255,255,0.52)", fontSize: "11px", lineHeight: 1.4 }}>
                  {action.note || "Property care activity"}
                </span>
                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: "10px", whiteSpace: "nowrap" }}>
                  {formatDateTime(action.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
