"use client";

import type { BankScreenMode } from "../lib/bank-types";
import { getSavingsGoalPurpose } from "../lib/savings-goal-presets";
import type { SavingsGoal } from "../lib/savings-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function milestone(progress: number) {
  if (progress >= 100) return "Goal reached";
  if (progress >= 75) return "Nearly there";
  if (progress >= 50) return "Halfway there";
  if (progress >= 25) return "Building up";
  return "Getting started";
}

export default function SavingsGoalCard({
  goal,
  screenMode,
  onDeposit,
  onWithdraw,
  onEdit,
}: {
  goal: SavingsGoal;
  screenMode: BankScreenMode;
  onDeposit: () => void;
  onWithdraw: () => void;
  onEdit: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const completed = goal.status === "completed";
  const liveProgress = Math.min(
    100,
    Math.max(0, (goal.savedAmount / Math.max(goal.targetAmount, 1)) * 100),
  );
  const displayProgress = completed ? 100 : liveProgress;
  const remaining = Math.max(goal.targetAmount - goal.savedAmount, 0);
  const purpose = getSavingsGoalPurpose(goal.linkedType);

  return (
    <article
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: isMobile ? "22px" : "25px",
        border: completed
          ? "1px solid rgba(116,255,190,0.30)"
          : "1px solid rgba(126,232,255,0.18)",
        background: completed
          ? "linear-gradient(145deg, rgba(8,49,43,0.74), rgba(5,19,31,0.94))"
          : "linear-gradient(145deg, rgba(8,29,52,0.88), rgba(5,12,29,0.94))",
        boxShadow: completed
          ? "0 22px 55px rgba(0,0,0,0.24), 0 0 28px rgba(93,255,181,0.06)"
          : "0 22px 55px rgba(0,0,0,0.24)",
        padding: isMobile ? "18px" : "22px",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "220px",
          height: "220px",
          right: "-90px",
          top: "-110px",
          borderRadius: "999px",
          background: completed
            ? "rgba(93,255,181,0.08)"
            : "rgba(83,215,255,0.06)",
          filter: "blur(4px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: "54px minmax(0,1fr) auto",
          gap: "13px",
          alignItems: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "54px",
            height: "54px",
            borderRadius: "17px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: completed
              ? "1px solid rgba(116,255,190,0.32)"
              : "1px solid rgba(126,232,255,0.24)",
            background: completed
              ? "rgba(93,255,181,0.10)"
              : "rgba(83,215,255,0.08)",
            fontSize: "24px",
          }}
        >
          {goal.icon}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                margin: 0,
                color: "white",
                fontSize: isMobile ? "18px" : "20px",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {goal.name}
            </h3>

            <span
              style={{
                minHeight: "23px",
                padding: "0 8px",
                borderRadius: "999px",
                display: "inline-flex",
                alignItems: "center",
                border: "1px solid rgba(126,232,255,0.16)",
                background: "rgba(83,215,255,0.055)",
                color: "#bdf6ff",
                fontSize: "8px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {purpose.shortLabel}
            </span>

            {completed && (
              <span
                style={{
                  minHeight: "23px",
                  padding: "0 8px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  border: "1px solid rgba(116,255,190,0.30)",
                  background: "rgba(93,255,181,0.08)",
                  color: "#9fffd2",
                  fontSize: "8px",
                  fontWeight: 900,
                  letterSpacing: "0.09em",
                  textTransform: "uppercase",
                }}
              >
                Reached
              </span>
            )}
          </div>

          <p
            style={{
              margin: "5px 0 0",
              color: "rgba(255,255,255,0.48)",
              fontSize: "11px",
              lineHeight: 1.4,
            }}
          >
            {completed
              ? `Target reached · ${formatDt(goal.savedAmount)} still set aside`
              : `${formatDt(remaining)} left to save`}
          </p>
        </div>

        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${goal.name}`}
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "12px",
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.045)",
            color: "rgba(255,255,255,0.72)",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "17px",
          }}
        >
          ⋯
        </button>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "20px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "end",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: completed ? "#9fffd2" : "#8ee8ff",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
            }}
          >
            {completed ? "Still set aside" : "Saved"}
          </p>
          <strong
            style={{
              display: "block",
              marginTop: "5px",
              color: "white",
              fontSize: isMobile ? "27px" : "31px",
              lineHeight: 1,
              letterSpacing: "-0.04em",
            }}
          >
            {formatDt(goal.savedAmount)}
          </strong>
        </div>

        <div style={{ textAlign: "right" }}>
          <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "10px" }}>
            Target
          </span>
          <strong
            style={{
              display: "block",
              marginTop: "4px",
              color: "rgba(255,255,255,0.74)",
              fontSize: "14px",
            }}
          >
            {formatDt(goal.targetAmount)}
          </strong>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "15px",
          height: "10px",
          overflow: "hidden",
          borderRadius: "999px",
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.045)",
        }}
      >
        <div
          style={{
            width: `${displayProgress}%`,
            height: "100%",
            borderRadius: "999px",
            background: completed
              ? "linear-gradient(90deg, #5dffb5, #9fffd2)"
              : "linear-gradient(90deg, #53d7ff, #8f7cff)",
            boxShadow: completed
              ? "0 0 18px rgba(93,255,181,0.28)"
              : "0 0 18px rgba(83,215,255,0.22)",
            transition: "width 320ms ease",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "10px",
          display: "flex",
          justifyContent: "space-between",
          color: "rgba(255,255,255,0.42)",
          fontSize: "10px",
          fontWeight: 800,
        }}
      >
        <span>{milestone(displayProgress)}</span>
        <span>{completed ? "100% reached" : `${Math.round(liveProgress)}%`}</span>
      </div>

      <div
        style={{
          position: "relative",
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns:
            !completed && goal.savedAmount > 0 ? "1fr 1fr" : "1fr",
          gap: "9px",
        }}
      >
        {!completed && (
          <button
            type="button"
            onClick={onDeposit}
            style={{
              minHeight: "46px",
              borderRadius: "13px",
              border: "1px solid rgba(126,232,255,0.38)",
              background:
                "linear-gradient(135deg, rgba(83,215,255,0.18), rgba(92,80,210,0.14))",
              color: "white",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 900,
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            + Add DT
          </button>
        )}

        {goal.savedAmount > 0 && (
          <button
            type="button"
            onClick={onWithdraw}
            style={{
              minHeight: "46px",
              borderRadius: "13px",
              border: completed
                ? "1px solid rgba(116,255,190,0.24)"
                : "1px solid rgba(255,255,255,0.10)",
              background: completed
                ? "rgba(93,255,181,0.07)"
                : "rgba(255,255,255,0.045)",
              color: completed ? "#9fffd2" : "rgba(255,255,255,0.76)",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 850,
              fontSize: "11px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {completed ? "Use DT · Move to Wallet" : "Withdraw"}
          </button>
        )}

        {completed && goal.savedAmount === 0 && (
          <div
            style={{
              minHeight: "46px",
              borderRadius: "13px",
              border: "1px solid rgba(116,255,190,0.18)",
              background: "rgba(93,255,181,0.05)",
              color: "#9fffd2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            ✓ Goal completed
          </div>
        )}
      </div>
    </article>
  );
}
