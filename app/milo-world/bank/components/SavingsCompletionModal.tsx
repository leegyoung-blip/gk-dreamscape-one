"use client";

import type { SavingsGoal } from "../lib/savings-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function SavingsCompletionModal({
  goal,
  onClose,
}: {
  goal: SavingsGoal | null;
  onClose: () => void;
}) {
  if (!goal) return null;

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 195,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Savings goal reached"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(510px, 100%)",
          overflow: "hidden",
          borderRadius: "30px",
          border: "1px solid rgba(116,255,190,0.32)",
          background:
            "radial-gradient(circle at 50% 0%, rgba(93,255,181,0.15), transparent 38%), linear-gradient(145deg, rgba(7,41,40,0.995), rgba(5,9,25,0.995))",
          boxShadow:
            "0 38px 120px rgba(0,0,0,0.68), 0 0 42px rgba(93,255,181,0.08)",
          padding: "30px",
          color: "white",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "76px",
            height: "76px",
            margin: "0 auto",
            borderRadius: "24px",
            border: "1px solid rgba(116,255,190,0.34)",
            background: "rgba(93,255,181,0.10)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "32px",
            boxShadow: "0 0 30px rgba(93,255,181,0.12)",
          }}
        >
          {goal.icon}
        </div>

        <p
          style={{
            margin: "20px 0 0",
            color: "#9fffd2",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Savings Goal Reached
        </p>
        <h2
          style={{
            margin: "9px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "40px",
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: "-0.04em",
          }}
        >
          You did it.
        </h2>
        <p
          style={{
            margin: "14px auto 0",
            maxWidth: "390px",
            color: "rgba(255,255,255,0.64)",
            fontSize: "13px",
            lineHeight: 1.6,
          }}
        >
          You reached <strong style={{ color: "white" }}>{goal.name}</strong> at {formatDt(goal.targetAmount)}. The DT stay safely set aside until you decide to move them back to your Wallet.
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            marginTop: "24px",
            width: "100%",
            minHeight: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(116,255,190,0.34)",
            background:
              "linear-gradient(135deg, rgba(93,255,181,0.17), rgba(83,215,255,0.12))",
            color: "white",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Keep It Saved
        </button>
      </section>
    </div>
  );
}
