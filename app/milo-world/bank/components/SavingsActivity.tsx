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
}: {
  movements: SavingsMovement[];
  goals: SavingsGoal[];
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  const goalNames = new Map(goals.map((goal) => [goal.id, goal.name]));
  const recent = movements.slice(0, 8);

  return (
    <section
      style={{
        borderRadius: isMobile ? "22px" : "25px",
        border: "1px solid rgba(126,232,255,0.13)",
        background: "rgba(5,15,31,0.72)",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: isMobile ? "17px" : "20px 22px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.15em", textTransform: "uppercase" }}>Savings Activity</p>
        <h3 style={{ margin: "6px 0 0", color: "white", fontSize: "19px", letterSpacing: "-0.02em" }}>Recent transfers</h3>
      </div>

      {recent.length === 0 ? (
        <div style={{ padding: "30px 20px", textAlign: "center", color: "rgba(255,255,255,0.42)", fontSize: "12px", lineHeight: 1.6 }}>
          Your savings transfers will appear here.
        </div>
      ) : (
        <div style={{ padding: "8px" }}>
          {recent.map((movement) => {
            const deposit = movement.movementType === "deposit";
            return (
              <div
                key={movement.id}
                style={{
                  minHeight: "58px",
                  display: "grid",
                  gridTemplateColumns: "36px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: "10px",
                  padding: "9px 10px",
                  borderRadius: "13px",
                }}
              >
                <span style={{ width: "34px", height: "34px", borderRadius: "11px", border: deposit ? "1px solid rgba(93,255,181,0.24)" : "1px solid rgba(255,209,138,0.24)", background: deposit ? "rgba(93,255,181,0.07)" : "rgba(255,186,94,0.07)", color: deposit ? "#9fffd2" : "#ffd18a", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                  {deposit ? "↓" : "↑"}
                </span>
                <span style={{ minWidth: 0 }}>
                  <strong style={{ display: "block", color: "white", fontSize: "11px", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {goalNames.get(movement.savingsGoalId) || movement.title}
                  </strong>
                  <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.38)", fontSize: "9px" }}>
                    {formatDate(movement.createdAt)}
                  </small>
                </span>
                <strong style={{ color: deposit ? "#9fffd2" : "#ffd18a", fontSize: "11px", whiteSpace: "nowrap" }}>
                  {deposit ? "+" : "−"}{movement.amount.toLocaleString("en-SG")} DT
                </strong>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
