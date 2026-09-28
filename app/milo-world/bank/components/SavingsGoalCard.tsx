"use client";

import type { BankScreenMode } from "../lib/bank-types";
import { getSavingsGoalPurpose } from "../lib/savings-goal-presets";
import type { SavingsGoal, SavingsMovement } from "../lib/savings-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function goalPace(goal: SavingsGoal, movements: SavingsMovement[]) {
  if (goal.status === "completed") return "Goal reached";
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const relevant = movements.filter(
    (movement) =>
      movement.savingsGoalId === goal.id &&
      new Date(movement.createdAt).getTime() >= cutoff &&
      movement.movementType !== "interest",
  );

  const net = relevant.reduce((sum, movement) => {
    if (movement.movementType === "deposit") return sum + movement.amount;
    if (movement.movementType === "withdrawal") return sum - movement.amount;
    return sum;
  }, 0);

  if (net <= 0) return "No recent net saving pace";
  const earliest = relevant.reduce(
    (value, movement) => Math.min(value, new Date(movement.createdAt).getTime()),
    Date.now(),
  );
  const elapsedDays = Math.max(1, Math.min(30, (Date.now() - earliest) / (24 * 60 * 60 * 1000)));
  const perDay = net / elapsedDays;
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const days = Math.ceil(remaining / Math.max(perDay, 1));
  if (days <= 1) return "At your pace: about 1 day to go";
  if (days <= 60) return `At your pace: about ${days} days to go`;
  const months = Math.max(1, Math.round(days / 30));
  return `At your pace: about ${months} months to go`;
}

export default function SavingsGoalCard({
  goal,
  movements,
  screenMode,
  onDeposit,
  onWithdraw,
  onEdit,
}: {
  goal: SavingsGoal;
  movements: SavingsMovement[];
  screenMode: BankScreenMode;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const completed = goal.status === "completed";
  const progress = Math.min(
    100,
    Math.max(0, (goal.savedAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  const purpose = getSavingsGoalPurpose(goal.linkedType);
  const interestEarned = movements
    .filter(
      (movement) =>
        movement.savingsGoalId === goal.id && movement.movementType === "interest",
    )
    .reduce((sum, movement) => sum + movement.amount, 0);

  return (
    <article
      style={{
        minWidth: 0,
        borderRadius: isMobile ? "20px" : "22px",
        border: completed
          ? "1px solid rgba(159,255,210,0.24)"
          : "1px solid rgba(126,232,255,0.16)",
        background: completed
          ? "linear-gradient(145deg, rgba(10,48,42,0.74), rgba(4,14,29,0.90))"
          : "linear-gradient(145deg, rgba(7,28,50,0.86), rgba(4,13,29,0.91))",
        padding: isMobile ? "17px" : "18px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "11px" }}>
        <span
          style={{
            width: "42px",
            height: "42px",
            borderRadius: "14px",
            border: "1px solid rgba(126,232,255,0.17)",
            background: "rgba(83,215,255,0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          {goal.icon}
        </span>

        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: "flex", gap: "7px", alignItems: "center", flexWrap: "wrap" }}>
            <strong
              style={{
                color: "white",
                fontSize: "15px",
                lineHeight: 1.2,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
            >
              {goal.name}
            </strong>
            <span
              style={{
                borderRadius: "999px",
                border: "1px solid rgba(126,232,255,0.14)",
                background: "rgba(83,215,255,0.05)",
                color: "rgba(255,255,255,0.52)",
                padding: "3px 7px",
                fontSize: "8px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {purpose.label}
            </span>
          </div>
          <small style={{ display: "block", marginTop: "5px", color: "rgba(255,255,255,0.38)", fontSize: "9px" }}>
            {completed ? "Goal reached" : `${formatDt(Math.max(goal.targetAmount - goal.savedAmount, 0))} to go`}
          </small>
        </div>

        <button
          type="button"
          aria-label={`Edit ${goal.name}`}
          onClick={onEdit}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.035)",
            color: "rgba(255,255,255,0.62)",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          ···
        </button>
      </div>

      <div style={{ marginTop: "17px", display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "end" }}>
        <div>
          <small style={{ color: "rgba(255,255,255,0.38)", fontSize: "8px", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Saved
          </small>
          <strong style={{ display: "block", marginTop: "4px", color: "white", fontSize: isMobile ? "26px" : "28px", lineHeight: 1, letterSpacing: "-0.04em" }}>
            {formatDt(goal.savedAmount)}
          </strong>
        </div>
        <div style={{ textAlign: "right" }}>
          <small style={{ color: "rgba(255,255,255,0.34)", fontSize: "8px" }}>Target</small>
          <strong style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.68)", fontSize: "12px" }}>
            {formatDt(goal.targetAmount)}
          </strong>
        </div>
      </div>

      <div style={{ marginTop: "12px", height: "8px", borderRadius: "999px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            borderRadius: "999px",
            background: completed
              ? "linear-gradient(90deg,#5dffb5,#9fffd2)"
              : "linear-gradient(90deg,#53d7ff,#8f7cff)",
          }}
        />
      </div>

      <div style={{ marginTop: "8px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
        <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>{goalPace(goal, movements)}</span>
        <strong style={{ color: completed ? "#9fffd2" : "rgba(255,255,255,0.58)", fontSize: "9px" }}>{Math.round(progress)}%</strong>
      </div>

      {interestEarned > 0 && (
        <div style={{ marginTop: "10px", borderRadius: "11px", background: "rgba(255,209,138,0.055)", padding: "8px 10px", color: "rgba(255,255,255,0.48)", fontSize: "9px" }}>
          Interest earned <strong style={{ color: "#ffd18a" }}>+{formatDt(interestEarned)}</strong>
        </div>
      )}

      <div style={{ marginTop: "auto", paddingTop: "15px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <button
          type="button"
          onClick={onDeposit}
          disabled={completed}
          style={{
            minHeight: "43px",
            borderRadius: "12px",
            border: completed ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(126,232,255,0.28)",
            background: completed ? "rgba(255,255,255,0.025)" : "linear-gradient(135deg,rgba(83,215,255,0.16),rgba(92,80,210,0.13))",
            color: completed ? "rgba(255,255,255,0.26)" : "white",
            cursor: completed ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            fontSize: "9px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          + Add DT
        </button>
        <button
          type="button"
          onClick={onWithdraw}
          disabled={goal.savedAmount <= 0}
          style={{
            minHeight: "43px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.035)",
            color: goal.savedAmount > 0 ? "rgba(255,255,255,0.76)" : "rgba(255,255,255,0.24)",
            cursor: goal.savedAmount > 0 ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            fontSize: "9px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          Withdraw
        </button>
      </div>
    </article>
  );
}
