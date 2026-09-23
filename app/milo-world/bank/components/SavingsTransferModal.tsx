"use client";

import { useEffect, useMemo, useState } from "react";
import type { SavingsGoal } from "../lib/savings-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(
      (error as { message?: unknown }).message || "Could not move Dream Tokens.",
    );
  }
  return "Could not move Dream Tokens.";
}

export default function SavingsTransferModal({
  open,
  mode,
  goal,
  availableDt,
  mutating,
  onClose,
  onConfirm,
}: {
  open: boolean;
  mode: "deposit" | "withdraw";
  goal: SavingsGoal | null;
  availableDt: number;
  mutating: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<unknown>;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAmount("");
    setError(null);
  }, [goal?.id, mode, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mutating, onClose, open]);

  const maxAmount = useMemo(() => {
    if (!goal) return 0;
    if (mode === "withdraw") return goal.savedAmount;
    return Math.max(
      0,
      Math.min(availableDt, goal.targetAmount - goal.savedAmount),
    );
  }, [availableDt, goal, mode]);

  const amountNumber = Math.round(Number(amount || 0));
  const valid =
    Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= maxAmount;

  const walletAfter = valid
    ? mode === "deposit"
      ? Math.max(availableDt - amountNumber, 0)
      : availableDt + amountNumber
    : availableDt;

  const goalAfter = goal
    ? valid
      ? mode === "deposit"
        ? goal.savedAmount + amountNumber
        : Math.max(goal.savedAmount - amountNumber, 0)
      : goal.savedAmount
    : 0;

  const reachesTarget = Boolean(
    valid &&
      goal &&
      mode === "deposit" &&
      goalAfter >= goal.targetAmount,
  );

  if (!open || !goal) return null;

  async function confirm() {
    if (!valid || mutating) return;
    setError(null);
    try {
      await onConfirm(amountNumber);
      onClose();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  function setFraction(fraction: number) {
    if (maxAmount <= 0) return;
    setAmount(String(Math.max(1, Math.floor(maxAmount * fraction))));
    setError(null);
  }

  return (
    <div
      role="presentation"
      onClick={() => !mutating && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 185,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={mode === "deposit" ? "Add DT to savings" : "Withdraw DT from savings"}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: "28px",
          border: "1px solid rgba(126,232,255,0.24)",
          background:
            "linear-gradient(145deg, rgba(6,25,47,0.995), rgba(6,8,24,0.995))",
          boxShadow: "0 34px 110px rgba(0,0,0,0.66)",
          padding: "26px",
          color: "white",
        }}
      >
        <div style={{ display: "flex", gap: "13px", alignItems: "center" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "17px",
              border: "1px solid rgba(126,232,255,0.22)",
              background: "rgba(83,215,255,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "23px",
            }}
          >
            {goal.icon}
          </div>
          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
              }}
            >
              {mode === "deposit" ? "Add to Savings" : "Move Back to Wallet"}
            </p>
            <h2
              style={{
                margin: "6px 0 0",
                fontSize: "24px",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {goal.name}
            </h2>
          </div>
        </div>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "9px",
          }}
        >
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.035)",
              padding: "13px",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.42)",
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              {mode === "deposit" ? "Available Wallet" : "Saved Here"}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "6px",
                color: "white",
                fontSize: "18px",
              }}
            >
              {formatDt(mode === "deposit" ? availableDt : goal.savedAmount)}
            </strong>
          </div>
          <div
            style={{
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.035)",
              padding: "13px",
            }}
          >
            <span
              style={{
                color: "rgba(255,255,255,0.42)",
                fontSize: "9px",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              Maximum
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "6px",
                color: "#8ee8ff",
                fontSize: "18px",
              }}
            >
              {formatDt(maxAmount)}
            </strong>
          </div>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.62)",
              fontSize: "11px",
              fontWeight: 850,
            }}
          >
            Amount
          </span>
          <div style={{ position: "relative", marginTop: "8px" }}>
            <input
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value.replace(/[^0-9]/g, ""));
                setError(null);
              }}
              inputMode="numeric"
              autoFocus
              placeholder="0"
              style={{
                width: "100%",
                height: "56px",
                borderRadius: "15px",
                border:
                  amountNumber > maxAmount
                    ? "1px solid rgba(255,160,130,0.42)"
                    : "1px solid rgba(126,232,255,0.20)",
                background: "rgba(255,255,255,0.045)",
                color: "white",
                outline: "none",
                padding: "0 58px 0 16px",
                fontFamily: "inherit",
                fontSize: "24px",
                fontWeight: 900,
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "16px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#8ee8ff",
                fontSize: "11px",
                fontWeight: 900,
              }}
            >
              DT
            </span>
          </div>
        </label>

        <div
          style={{
            marginTop: "9px",
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: "7px",
          }}
        >
          {[
            ["25%", 0.25],
            ["50%", 0.5],
            ["75%", 0.75],
            ["Max", 1],
          ].map(([label, fraction]) => (
            <button
              key={String(label)}
              type="button"
              disabled={maxAmount <= 0}
              onClick={() => setFraction(Number(fraction))}
              style={{
                minHeight: "38px",
                borderRadius: "11px",
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.035)",
                color:
                  maxAmount > 0
                    ? "rgba(255,255,255,0.68)"
                    : "rgba(255,255,255,0.26)",
                cursor: maxAmount > 0 ? "pointer" : "not-allowed",
                fontFamily: "inherit",
                fontSize: "10px",
                fontWeight: 850,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {valid && (
          <div
            style={{
              marginTop: "14px",
              borderRadius: "15px",
              border: reachesTarget
                ? "1px solid rgba(116,255,190,0.20)"
                : "1px solid rgba(126,232,255,0.12)",
              background: reachesTarget
                ? "rgba(93,255,181,0.055)"
                : "rgba(83,215,255,0.045)",
              padding: "12px 13px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <span>
                <small
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.40)",
                    fontSize: "8px",
                    fontWeight: 850,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Wallet after
                </small>
                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: "white",
                    fontSize: "14px",
                  }}
                >
                  {formatDt(walletAfter)}
                </strong>
              </span>
              <span>
                <small
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.40)",
                    fontSize: "8px",
                    fontWeight: 850,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Goal after
                </small>
                <strong
                  style={{
                    display: "block",
                    marginTop: "4px",
                    color: reachesTarget ? "#9fffd2" : "#8ee8ff",
                    fontSize: "14px",
                  }}
                >
                  {formatDt(goalAfter)}
                </strong>
              </span>
            </div>
            {reachesTarget && (
              <p
                style={{
                  margin: "10px 0 0",
                  color: "#9fffd2",
                  fontSize: "10px",
                  lineHeight: 1.45,
                  fontWeight: 850,
                }}
              >
                ✓ This transfer reaches your savings goal.
              </p>
            )}
          </div>
        )}

        {maxAmount <= 0 && (
          <p
            style={{
              margin: "12px 2px 0",
              color: "#ffd18a",
              fontSize: "10px",
              lineHeight: 1.45,
            }}
          >
            {mode === "deposit"
              ? "There are no available DT to add to this goal right now."
              : "There are no DT left in this goal to withdraw."}
          </p>
        )}

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "15px",
              borderRadius: "13px",
              border: "1px solid rgba(255,160,130,0.25)",
              background: "rgba(255,120,90,0.08)",
              color: "#ffc0a0",
              padding: "11px 13px",
              fontSize: "11px",
              lineHeight: 1.45,
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: "0.8fr 1.2fr",
            gap: "9px",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={mutating}
            style={{
              minHeight: "49px",
              borderRadius: "13px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.68)",
              cursor: mutating ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontWeight: 850,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!valid || mutating}
            style={{
              minHeight: "49px",
              borderRadius: "13px",
              border: valid
                ? "1px solid rgba(126,232,255,0.42)"
                : "1px solid rgba(255,255,255,0.08)",
              background: valid
                ? "linear-gradient(135deg, rgba(83,215,255,0.22), rgba(92,80,210,0.20))"
                : "rgba(255,255,255,0.04)",
              color: valid ? "white" : "rgba(255,255,255,0.30)",
              cursor: valid && !mutating ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              fontWeight: 900,
              fontSize: "11px",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {mutating
              ? "Moving DT..."
              : mode === "deposit"
                ? "Add to Savings"
                : "Withdraw to Wallet"}
          </button>
        </div>
      </section>
    </div>
  );
}
