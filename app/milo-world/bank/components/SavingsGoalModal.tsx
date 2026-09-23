"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SAVINGS_GOAL_PURPOSES,
  getSavingsGoalPurpose,
} from "../lib/savings-goal-presets";
import type {
  SavingsGoal,
  SavingsGoalLinkedType,
} from "../lib/savings-types";

const ICONS = ["✦", "🎯", "🚀", "🏠", "🎮", "💡", "⚙️", "⭐"];

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    return String(
      (error as { message?: unknown }).message || "Could not save this goal.",
    );
  }
  return "Could not save this goal.";
}

export default function SavingsGoalModal({
  open,
  goal,
  mutating,
  canCreateGoal,
  onClose,
  onSave,
  onArchive,
}: {
  open: boolean;
  goal: SavingsGoal | null;
  mutating: boolean;
  canCreateGoal: boolean;
  onClose: () => void;
  onSave: (input: {
    name: string;
    targetAmount: number;
    icon: string;
    linkedType: SavingsGoalLinkedType;
    linkedId: string | null;
  }) => Promise<unknown>;
  onArchive?: () => Promise<unknown>;
}) {
  const editing = Boolean(goal);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [icon, setIcon] = useState("🎯");
  const [linkedType, setLinkedType] =
    useState<SavingsGoalLinkedType>("custom");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const initialType = goal?.linkedType ?? "custom";
    setName(goal?.name ?? "");
    setTarget(goal ? String(goal.targetAmount) : "");
    setLinkedType(initialType);
    setIcon(goal?.icon ?? getSavingsGoalPurpose(initialType).icon);
    setError(null);
  }, [goal, open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !mutating) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mutating, onClose, open]);

  const targetNumber = Math.round(Number(target || 0));
  const targetTooLow = Boolean(goal && targetNumber < goal.savedAmount);
  const valid =
    name.trim().length > 0 &&
    name.trim().length <= 60 &&
    Number.isFinite(targetNumber) &&
    targetNumber > 0 &&
    !targetTooLow &&
    (editing || canCreateGoal);

  const archiveHelp = useMemo(() => {
    if (!editing) return "";
    if ((goal?.savedAmount ?? 0) > 0)
      return "Withdraw all DT before archiving this goal.";
    return "Archiving removes this goal from your savings list.";
  }, [editing, goal?.savedAmount]);

  if (!open) return null;

  async function submit() {
    if (!valid || mutating) return;
    setError(null);
    try {
      await onSave({
        name: name.trim(),
        targetAmount: targetNumber,
        icon,
        linkedType,
        linkedId: goal?.linkedId ?? null,
      });
      onClose();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  async function archive() {
    if (!onArchive || mutating || (goal?.savedAmount ?? 0) > 0) return;
    setError(null);
    try {
      await onArchive();
      onClose();
    } catch (nextError) {
      setError(errorMessage(nextError));
    }
  }

  return (
    <div
      role="presentation"
      onClick={() => !mutating && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.70)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "Edit savings goal" : "Create savings goal"}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(620px, 100%)",
          maxHeight: "calc(100dvh - 36px)",
          overflowY: "auto",
          borderRadius: "28px",
          border: "1px solid rgba(126,232,255,0.24)",
          background:
            "linear-gradient(145deg, rgba(6,25,47,0.995), rgba(6,8,24,0.995))",
          boxShadow: "0 34px 110px rgba(0,0,0,0.66)",
          padding: "26px",
          color: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {editing ? "Savings Goal" : "New Savings Goal"}
            </p>
            <h2
              style={{
                margin: "8px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "34px",
                lineHeight: 1,
                fontWeight: 500,
                letterSpacing: "-0.035em",
              }}
            >
              {editing ? "Edit your goal" : "What are you saving for?"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={mutating}
            aria-label="Close"
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "999px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.05)",
              color: "white",
              cursor: mutating ? "not-allowed" : "pointer",
              fontSize: "20px",
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {!editing && !canCreateGoal && (
          <div
            style={{
              marginTop: "18px",
              borderRadius: "14px",
              border: "1px solid rgba(255,209,138,0.24)",
              background: "rgba(255,186,94,0.08)",
              color: "#ffd18a",
              padding: "13px 14px",
              fontSize: "12px",
              lineHeight: 1.5,
            }}
          >
            You already have 3 active savings goals. Complete or archive one
            before creating another.
          </div>
        )}

        <div style={{ marginTop: "22px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: "11px",
              fontWeight: 850,
            }}
          >
            What kind of goal is this?
          </span>
          <div
            style={{
              marginTop: "9px",
              display: "grid",
              gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
              gap: "7px",
            }}
          >
            {SAVINGS_GOAL_PURPOSES.map((purpose) => {
              const selected = purpose.type === linkedType;
              return (
                <button
                  key={purpose.type}
                  type="button"
                  onClick={() => {
                    setLinkedType(purpose.type);
                    setIcon(purpose.icon);
                  }}
                  title={purpose.description}
                  aria-pressed={selected}
                  style={{
                    minHeight: "74px",
                    borderRadius: "13px",
                    border: selected
                      ? "1px solid rgba(142,232,255,0.54)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: selected
                      ? "rgba(83,215,255,0.11)"
                      : "rgba(255,255,255,0.032)",
                    color: selected ? "white" : "rgba(255,255,255,0.62)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "9px 6px",
                  }}
                >
                  <span style={{ display: "block", fontSize: "20px" }}>
                    {purpose.icon}
                  </span>
                  <strong
                    style={{
                      display: "block",
                      marginTop: "6px",
                      fontSize: "9px",
                      lineHeight: 1.15,
                    }}
                  >
                    {purpose.shortLabel}
                  </strong>
                </button>
              );
            })}
          </div>
        </div>

        <label style={{ display: "block", marginTop: "18px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: "11px",
              fontWeight: 850,
            }}
          >
            Goal name
          </span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            placeholder="e.g. Aurora Glide Rover"
            style={{
              marginTop: "8px",
              width: "100%",
              height: "50px",
              borderRadius: "14px",
              border: "1px solid rgba(126,232,255,0.18)",
              background: "rgba(255,255,255,0.045)",
              color: "white",
              outline: "none",
              padding: "0 15px",
              fontFamily: "inherit",
              fontSize: "14px",
            }}
          />
        </label>

        <label style={{ display: "block", marginTop: "17px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: "11px",
              fontWeight: 850,
            }}
          >
            Target amount
          </span>
          <div style={{ position: "relative", marginTop: "8px" }}>
            <input
              value={target}
              onChange={(event) =>
                setTarget(event.target.value.replace(/[^0-9]/g, ""))
              }
              inputMode="numeric"
              placeholder="5000"
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "14px",
                border: targetTooLow
                  ? "1px solid rgba(255,160,130,0.42)"
                  : "1px solid rgba(126,232,255,0.18)",
                background: "rgba(255,255,255,0.045)",
                color: "white",
                outline: "none",
                padding: "0 58px 0 15px",
                fontFamily: "inherit",
                fontSize: "15px",
                fontWeight: 800,
              }}
            />
            <span
              style={{
                position: "absolute",
                right: "15px",
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
          {targetTooLow && (
            <span
              style={{
                display: "block",
                marginTop: "7px",
                color: "#ffc0a0",
                fontSize: "10px",
              }}
            >
              Target cannot be below the {goal?.savedAmount.toLocaleString("en-SG")} DT already saved.
            </span>
          )}
        </label>

        <div style={{ marginTop: "18px" }}>
          <span
            style={{
              color: "rgba(255,255,255,0.66)",
              fontSize: "11px",
              fontWeight: 850,
            }}
          >
            Choose an icon
          </span>
          <div
            style={{
              marginTop: "9px",
              display: "grid",
              gridTemplateColumns: "repeat(8, 1fr)",
              gap: "7px",
            }}
          >
            {ICONS.map((item) => {
              const selected = item === icon;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setIcon(item)}
                  aria-pressed={selected}
                  style={{
                    height: "46px",
                    borderRadius: "12px",
                    border: selected
                      ? "1px solid rgba(142,232,255,0.56)"
                      : "1px solid rgba(255,255,255,0.08)",
                    background: selected
                      ? "rgba(83,215,255,0.12)"
                      : "rgba(255,255,255,0.035)",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "19px",
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "18px",
              borderRadius: "14px",
              border: "1px solid rgba(255,160,130,0.26)",
              background: "rgba(255,120,90,0.08)",
              color: "#ffc0a0",
              padding: "12px 14px",
              fontSize: "11px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!valid || mutating}
          style={{
            marginTop: "22px",
            width: "100%",
            height: "52px",
            borderRadius: "14px",
            border: valid
              ? "1px solid rgba(126,232,255,0.42)"
              : "1px solid rgba(255,255,255,0.08)",
            background: valid
              ? "linear-gradient(135deg, rgba(83,215,255,0.22), rgba(92,80,210,0.20))"
              : "rgba(255,255,255,0.04)",
            color: valid ? "white" : "rgba(255,255,255,0.34)",
            cursor: valid && !mutating ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            fontSize: "12px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {mutating ? "Saving..." : editing ? "Save Changes" : "Create Goal"}
        </button>

        {editing && onArchive && (
          <div
            style={{
              marginTop: "18px",
              paddingTop: "18px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <button
              type="button"
              onClick={archive}
              disabled={mutating || (goal?.savedAmount ?? 0) > 0}
              style={{
                width: "100%",
                minHeight: "44px",
                borderRadius: "12px",
                border: "1px solid rgba(255,160,130,0.16)",
                background: "rgba(255,120,90,0.045)",
                color:
                  (goal?.savedAmount ?? 0) > 0
                    ? "rgba(255,255,255,0.28)"
                    : "#ffc0a0",
                cursor:
                  !mutating && (goal?.savedAmount ?? 0) === 0
                    ? "pointer"
                    : "not-allowed",
                fontFamily: "inherit",
                fontWeight: 850,
                fontSize: "10px",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Archive Goal
            </button>
            <p
              style={{
                margin: "8px 2px 0",
                color: "rgba(255,255,255,0.38)",
                fontSize: "10px",
                lineHeight: 1.45,
                textAlign: "center",
              }}
            >
              {archiveHelp}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
