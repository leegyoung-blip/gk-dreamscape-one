"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import type { SavingsGoal } from "../lib/savings-types";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import SavingsActivity from "./SavingsActivity";
import SavingsCompletionModal from "./SavingsCompletionModal";
import SavingsGoalCard from "./SavingsGoalCard";
import SavingsGoalModal from "./SavingsGoalModal";
import SavingsTransferModal from "./SavingsTransferModal";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function SavingsGoalsPanel({
  screenMode,
  isLoggedIn,
  availableDt,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  availableDt: number;
}) {
  const isMobile = screenMode === "mobile";
  const savings = useSavingsGoals(isLoggedIn);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [transferGoal, setTransferGoal] = useState<SavingsGoal | null>(null);
  const [transferMode, setTransferMode] =
    useState<"deposit" | "withdraw">("deposit");
  const [completedGoal, setCompletedGoal] = useState<SavingsGoal | null>(null);

  const activeGoals = useMemo(
    () => savings.goals.filter((goal) => goal.status === "active"),
    [savings.goals],
  );
  const completedGoals = useMemo(
    () => savings.goals.filter((goal) => goal.status === "completed"),
    [savings.goals],
  );

  function openCreate() {
    setEditingGoal(null);
    setGoalModalOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  }

  function openTransfer(goal: SavingsGoal, mode: "deposit" | "withdraw") {
    setTransferGoal(goal);
    setTransferMode(mode);
  }

  if (!isLoggedIn) {
    return (
      <section
        style={{
          marginTop: "18px",
          minHeight: "360px",
          borderRadius: isMobile ? "24px" : "28px",
          border: "1px solid rgba(126,232,255,0.14)",
          background:
            "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(6,9,26,0.9))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "520px" }}>
          <div
            style={{
              width: "66px",
              height: "66px",
              margin: "0 auto",
              borderRadius: "21px",
              border: "1px solid rgba(126,232,255,0.24)",
              background: "rgba(83,215,255,0.08)",
              color: "#8ee8ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "27px",
            }}
          >
            ◎
          </div>
          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "42px",
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            Your savings live here.
          </h2>
          <p
            style={{
              margin: "14px auto 0",
              color: "rgba(255,255,255,0.54)",
              fontSize: "13px",
              lineHeight: 1.6,
            }}
          >
            Log in to create savings goals and set Dream Tokens aside.
          </p>
          <a
            href="/login"
            style={{
              marginTop: "20px",
              minHeight: "48px",
              padding: "0 20px",
              borderRadius: "13px",
              border: "1px solid rgba(126,232,255,0.38)",
              background: "rgba(83,215,255,0.12)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Log In
          </a>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "18px" }}>
      <div
        style={{
          borderRadius: isMobile ? "24px" : "28px",
          border: "1px solid rgba(126,232,255,0.16)",
          background:
            "radial-gradient(circle at 82% 0%, rgba(83,215,255,0.10), transparent 34%), linear-gradient(145deg, rgba(7,28,50,0.88), rgba(5,11,28,0.94))",
          padding: isMobile ? "20px" : "26px 28px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.20)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: isMobile ? "stretch" : "center",
            justifyContent: "space-between",
            gap: "18px",
            flexDirection: isMobile ? "column" : "row",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              Savings Goals
            </p>
            <h2
              style={{
                margin: "8px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "36px" : "44px",
                lineHeight: 1,
                fontWeight: 500,
                letterSpacing: "-0.035em",
              }}
            >
              Save with a purpose.
            </h2>
            <p
              style={{
                margin: "11px 0 0",
                maxWidth: "650px",
                color: "rgba(255,255,255,0.52)",
                fontSize: "13px",
                lineHeight: 1.55,
              }}
            >
              Set DT aside for something you want to reach. Reserved DT cannot
              be spent elsewhere until you move them back to your Wallet.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            disabled={!savings.canCreateGoal || savings.mutating}
            style={{
              minWidth: isMobile ? "100%" : "180px",
              minHeight: "50px",
              borderRadius: "14px",
              border: savings.canCreateGoal
                ? "1px solid rgba(126,232,255,0.42)"
                : "1px solid rgba(255,255,255,0.08)",
              background: savings.canCreateGoal
                ? "linear-gradient(135deg, rgba(83,215,255,0.20), rgba(92,80,210,0.17))"
                : "rgba(255,255,255,0.035)",
              color: savings.canCreateGoal
                ? "white"
                : "rgba(255,255,255,0.32)",
              cursor:
                savings.canCreateGoal && !savings.mutating
                  ? "pointer"
                  : "not-allowed",
              fontFamily: "inherit",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            + Create Goal
          </button>
        </div>

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : "repeat(3, minmax(0,1fr))",
            gap: "9px",
          }}
        >
          {[
            ["Available to save", formatDt(availableDt), "✦"],
            ["Reserved safely", formatDt(savings.savingsTotal), "◎"],
            ["Active goals", `${savings.activeGoalCount} / 3`, "▦"],
          ].map(([label, value, icon]) => (
            <div
              key={label}
              style={{
                minHeight: "78px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.075)",
                background: "rgba(255,255,255,0.032)",
                padding: "13px 14px",
                display: "grid",
                gridTemplateColumns: "34px minmax(0,1fr)",
                gap: "10px",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "11px",
                  border: "1px solid rgba(126,232,255,0.18)",
                  background: "rgba(83,215,255,0.06)",
                  color: "#8ee8ff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: 900,
                }}
              >
                {icon}
              </span>
              <span>
                <small
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.40)",
                    fontSize: "9px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {label}
                </small>
                <strong
                  style={{
                    display: "block",
                    marginTop: "5px",
                    color: "white",
                    fontSize: "17px",
                  }}
                >
                  {savings.loading ? "—" : value}
                </strong>
              </span>
            </div>
          ))}
        </div>
      </div>

      {savings.error && !savings.loading && (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(255,160,130,0.22)",
            background: "rgba(255,120,90,0.07)",
            color: "#ffc0a0",
            padding: "12px 14px",
            fontSize: "11px",
            lineHeight: 1.5,
          }}
        >
          {savings.error}
        </div>
      )}

      {savings.loading ? (
        <div
          style={{
            marginTop: "14px",
            minHeight: "260px",
            borderRadius: "24px",
            border: "1px solid rgba(126,232,255,0.10)",
            background: "rgba(5,15,31,0.54)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.48)",
            fontSize: "12px",
          }}
        >
          Loading your savings goals...
        </div>
      ) : savings.goals.length === 0 ? (
        <div
          style={{
            marginTop: "14px",
            minHeight: "290px",
            borderRadius: "24px",
            border: "1px dashed rgba(126,232,255,0.18)",
            background: "rgba(5,15,31,0.48)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "26px",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "480px" }}>
            <div style={{ fontSize: "36px" }}>🎯</div>
            <h3
              style={{
                margin: "13px 0 0",
                color: "white",
                fontSize: "23px",
                letterSpacing: "-0.025em",
              }}
            >
              Start with one thing you want to reach.
            </h3>
            <p
              style={{
                margin: "10px auto 0",
                color: "rgba(255,255,255,0.46)",
                fontSize: "12px",
                lineHeight: 1.6,
              }}
            >
              Choose a purpose and target, then watch your progress move as you
              save.
            </p>
            <button
              type="button"
              onClick={openCreate}
              style={{
                marginTop: "18px",
                minHeight: "46px",
                padding: "0 18px",
                borderRadius: "13px",
                border: "1px solid rgba(126,232,255,0.40)",
                background: "rgba(83,215,255,0.12)",
                color: "white",
                cursor: "pointer",
                fontFamily: "inherit",
                fontWeight: 900,
                fontSize: "10px",
                letterSpacing: "0.07em",
                textTransform: "uppercase",
              }}
            >
              Create Your First Goal
            </button>
          </div>
        </div>
      ) : (
        <>
          {activeGoals.length > 0 && (
            <div
              style={{
                marginTop: "14px",
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(2, minmax(0,1fr))",
                gap: "13px",
              }}
            >
              {activeGoals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  screenMode={screenMode}
                  onDeposit={() => openTransfer(goal, "deposit")}
                  onWithdraw={() => openTransfer(goal, "withdraw")}
                  onEdit={() => openEdit(goal)}
                />
              ))}
            </div>
          )}

          {completedGoals.length > 0 && (
            <div style={{ marginTop: activeGoals.length > 0 ? "22px" : "14px" }}>
              <div
                style={{
                  margin: "0 2px 10px",
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                }}
              >
                <span style={{ color: "#9fffd2", fontSize: "12px" }}>✓</span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.48)",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.13em",
                    textTransform: "uppercase",
                  }}
                >
                  Goals Reached
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0,1fr))",
                  gap: "13px",
                }}
              >
                {completedGoals.map((goal) => (
                  <SavingsGoalCard
                    key={goal.id}
                    goal={goal}
                    screenMode={screenMode}
                    onDeposit={() => openTransfer(goal, "deposit")}
                    onWithdraw={() => openTransfer(goal, "withdraw")}
                    onEdit={() => openEdit(goal)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!savings.loading && (
        <div style={{ marginTop: "14px" }}>
          <SavingsActivity
            movements={savings.movements}
            goals={savings.goals}
            screenMode={screenMode}
          />
        </div>
      )}

      <SavingsGoalModal
        open={goalModalOpen}
        goal={editingGoal}
        mutating={savings.mutating}
        canCreateGoal={savings.canCreateGoal}
        onClose={() => {
          if (!savings.mutating) {
            setGoalModalOpen(false);
            setEditingGoal(null);
          }
        }}
        onSave={(input) =>
          editingGoal
            ? savings.updateGoal({ goalId: editingGoal.id, ...input })
            : savings.createGoal(input)
        }
        onArchive={editingGoal ? () => savings.archive(editingGoal.id) : undefined}
      />

      <SavingsTransferModal
        open={Boolean(transferGoal)}
        mode={transferMode}
        goal={transferGoal}
        availableDt={availableDt}
        mutating={savings.mutating}
        onClose={() => {
          if (!savings.mutating) setTransferGoal(null);
        }}
        onConfirm={async (amount) => {
          if (!transferGoal) return;
          if (transferMode === "deposit") {
            const wasComplete = transferGoal.status === "completed";
            const result = await savings.deposit(transferGoal.id, amount);
            if (!wasComplete && result.status === "completed") {
              setCompletedGoal(result);
            }
            return result;
          }
          return savings.withdraw(transferGoal.id, amount);
        }}
      />

      <SavingsCompletionModal
        goal={completedGoal}
        onClose={() => setCompletedGoal(null)}
      />
    </section>
  );
}
