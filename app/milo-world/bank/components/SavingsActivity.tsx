"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { SavingsGoal, SavingsMovement } from "../lib/savings-types";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function SavingsActivity({
  movements,
  goals,
  screenMode,
  onOpenStatement,
}: {
  movements: SavingsMovement[];
  goals: SavingsGoal[];
  screenMode: BankScreenMode;
  onOpenStatement?: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const goalNames = new Map(goals.map((goal) => [goal.id, goal.name]));
  const recent = movements.slice(0, 3);

  return (
    <section
      style={{
        borderRadius: isMobile ? "18px" : "20px",
        border: "1px solid rgba(126,232,255,0.12)",
        background: "rgba(4,14,29,0.68)",
        padding: isMobile ? "14px" : "15px 17px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "8px", fontWeight: 900, letterSpacing: "0.13em", textTransform: "uppercase" }}>
            Recent activity
          </p>
          <h3 style={{ margin: "4px 0 0", color: "white", fontSize: "15px" }}>Latest savings movements</h3>
        </div>
        {onOpenStatement && (
          <button
            type="button"
            onClick={onOpenStatement}
            style={{
              border: 0,
              background: "transparent",
              color: "rgba(159,255,210,0.78)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Full statement →
          </button>
        )}
      </div>

      {recent.length === 0 ? (
        <p style={{ margin: "14px 0 0", color: "rgba(255,255,255,0.38)", fontSize: "10px" }}>
          Deposits, withdrawals and monthly interest will appear here.
        </p>
      ) : (
        <div style={{ marginTop: "9px" }}>
          {recent.map((movement) => {
            const isInterest = movement.movementType === "interest";
            const positive = movement.movementType !== "withdrawal";
            return (
              <div
                key={movement.id}
                style={{
                  minHeight: "48px",
                  display: "grid",
                  gridTemplateColumns: "30px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: "9px",
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}
              >
                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "9px",
                    border: isInterest
                      ? "1px solid rgba(255,209,138,0.22)"
                      : positive
                        ? "1px solid rgba(93,255,181,0.20)"
                        : "1px solid rgba(126,232,255,0.18)",
                    background: isInterest
                      ? "rgba(255,209,138,0.06)"
                      : positive
                        ? "rgba(93,255,181,0.06)"
                        : "rgba(83,215,255,0.05)",
                    color: isInterest ? "#ffd18a" : positive ? "#9fffd2" : "#8ee8ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  {isInterest ? "+%" : positive ? "↓" : "↑"}
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: "white", fontSize: "10px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {isInterest ? "Monthly interest" : goalNames.get(movement.savingsGoalId) || movement.title}
                  </strong>
                  <small style={{ display: "block", marginTop: "2px", color: "rgba(255,255,255,0.33)", fontSize: "8px" }}>
                    {isInterest ? `${goalNames.get(movement.savingsGoalId) || "Savings goal"} · ` : ""}{formatDate(movement.createdAt)}
                  </small>
                </span>
                <strong style={{ color: isInterest ? "#ffd18a" : positive ? "#9fffd2" : "#8ee8ff", fontSize: "10px", whiteSpace: "nowrap" }}>
                  {positive ? "+" : "−"}{movement.amount.toLocaleString("en-SG")} DT
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
