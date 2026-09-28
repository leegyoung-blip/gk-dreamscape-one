"use client";

import { useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import type { SavingsGoal } from "../lib/savings-types";
import { useSavingsGoals } from "../hooks/useSavingsGoals";
import SavingsActivity from "./SavingsActivity";
import SavingsCompletionModal from "./SavingsCompletionModal";
import SavingsGoalCard from "./SavingsGoalCard";
import SavingsGoalModal from "./SavingsGoalModal";
import SavingsRateCard from "./SavingsRateCard";
import SavingsTransferModal from "./SavingsTransferModal";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

function EmptyGoalSlot({
  disabled,
  onCreate,
  screenMode,
}: {
  disabled: boolean;
  onCreate: () => void;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onCreate}
      style={{
        minHeight: isMobile ? "154px" : "192px",
        borderRadius: isMobile ? "20px" : "22px",
        border: "1px dashed rgba(126,232,255,0.18)",
        background: "rgba(4,14,29,0.42)",
        color: disabled ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.52)",
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "inherit",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
      }}
    >
      <span style={{ fontSize: "24px", color: "#8ee8ff" }}>＋</span>
      <strong style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
        New savings goal
      </strong>
      <small style={{ fontSize: "9px", color: "rgba(255,255,255,0.28)" }}>
        Up to 3 active goals
      </small>
    </button>
  );
}

export default function SavingsGoalsPanel({
  screenMode,
  isLoggedIn,
  availableDt,
  onOpenStatement,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
  availableDt: number;
  onOpenStatement?: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const savings = useSavingsGoals(isLoggedIn);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [transferGoal, setTransferGoal] = useState<SavingsGoal | null>(null);
  const [transferMode, setTransferMode] = useState<"deposit" | "withdraw">("deposit");
  const [completedGoal, setCompletedGoal] = useState<SavingsGoal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const activeGoals = useMemo(
    () => savings.goals.filter((goal) => goal.status === "active"),
    [savings.goals],
  );
  const completedGoals = useMemo(
    () => savings.goals.filter((goal) => goal.status === "completed"),
    [savings.goals],
  );
  const completedSaved = useMemo(
    () => completedGoals.reduce((sum, goal) => sum + goal.savedAmount, 0),
    [completedGoals],
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
          marginTop: "12px",
          minHeight: "320px",
          borderRadius: isMobile ? "22px" : "26px",
          border: "1px solid rgba(126,232,255,0.14)",
          background: "rgba(4,14,29,0.68)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "460px" }}>
          <h2 style={{ margin: 0, color: "white", fontSize: isMobile ? "28px" : "34px", fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 500 }}>
            Savings Goals
          </h2>
          <p style={{ margin: "10px auto 0", color: "rgba(255,255,255,0.46)", fontSize: "12px", lineHeight: 1.55 }}>
            Log in to set DT aside, earn savings interest and track your goals.
          </p>
          <a href="/login" style={{ marginTop: "17px", minHeight: "44px", padding: "0 18px", borderRadius: "12px", border: "1px solid rgba(126,232,255,0.32)", background: "rgba(83,215,255,0.10)", color: "white", textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Log In
          </a>
        </div>
      </section>
    );
  }

  return (
    <section style={{ marginTop: "12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: isMobile ? "stretch" : "center",
          justifyContent: "space-between",
          gap: "12px",
          flexDirection: isMobile ? "column" : "row",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
            My Money
          </p>
          <h2 style={{ margin: "5px 0 0", color: "white", fontSize: isMobile ? "28px" : "34px", lineHeight: 1, fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 500, letterSpacing: "-0.03em" }}>
            Savings Goals
          </h2>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!savings.canCreateGoal || savings.mutating}
          style={{
            minWidth: isMobile ? "100%" : "150px",
            minHeight: "44px",
            borderRadius: "12px",
            border: savings.canCreateGoal ? "1px solid rgba(126,232,255,0.34)" : "1px solid rgba(255,255,255,0.07)",
            background: savings.canCreateGoal ? "linear-gradient(135deg,rgba(83,215,255,0.16),rgba(92,80,210,0.13))" : "rgba(255,255,255,0.025)",
            color: savings.canCreateGoal ? "white" : "rgba(255,255,255,0.25)",
            cursor: savings.canCreateGoal ? "pointer" : "not-allowed",
            fontFamily: "inherit",
            fontSize: "9px",
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          + Create Goal
        </button>
      </div>

      <div
        style={{
          marginTop: "12px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))",
          gap: "8px",
        }}
      >
        {[
          ["Available", formatDt(availableDt)],
          ["In goals", formatDt(savings.savingsTotal)],
          ["Active", `${savings.activeGoalCount} / 3`],
          ["Savings rate", `${savings.interest.annualRatePercent.toFixed(2)}% p.a.`],
        ].map(([label, value]) => (
          <div key={label} style={{ borderRadius: "14px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(4,14,29,0.62)", padding: "12px 13px" }}>
            <small style={{ color: "rgba(255,255,255,0.35)", fontSize: "8px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</small>
            <strong style={{ display: "block", marginTop: "4px", color: label === "Savings rate" ? "#ffd18a" : "white", fontSize: isMobile ? "13px" : "15px" }}>
              {savings.loading ? "—" : value}
            </strong>
          </div>
        ))}
      </div>

      <SavingsRateCard interest={savings.interest} screenMode={screenMode} loading={savings.loading} />

      {savings.error && !savings.loading && (
        <div role="alert" style={{ marginTop: "10px", borderRadius: "12px", border: "1px solid rgba(255,160,130,0.20)", background: "rgba(255,120,90,0.06)", color: "#ffc0a0", padding: "10px 12px", fontSize: "10px", display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
          <span>{savings.error}</span>
          <button type="button" onClick={() => void savings.refresh()} style={{ border: 0, background: "transparent", color: "#ffd6c1", cursor: "pointer", fontFamily: "inherit", fontSize: "9px", fontWeight: 900, textTransform: "uppercase" }}>
            Try Again
          </button>
        </div>
      )}

      <div style={{ marginTop: "12px" }}>
        <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.38)", fontSize: "8px", fontWeight: 900, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Active goals
        </p>

        {savings.loading ? (
          <div style={{ minHeight: "180px", borderRadius: "20px", border: "1px solid rgba(126,232,255,0.09)", background: "rgba(4,14,29,0.48)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.40)", fontSize: "11px" }}>
            Loading savings...
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: "10px", alignItems: "stretch" }}>
            {activeGoals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                movements={savings.movements}
                screenMode={screenMode}
                onDeposit={() => openTransfer(goal, "deposit")}
                onWithdraw={() => openTransfer(goal, "withdraw")}
                onEdit={() => openEdit(goal)}
              />
            ))}
            {Array.from({ length: Math.max(0, 3 - activeGoals.length) }).map((_, index) => (
              <EmptyGoalSlot key={`empty-${index}`} disabled={!savings.canCreateGoal || savings.mutating} onCreate={openCreate} screenMode={screenMode} />
            ))}
          </div>
        )}
      </div>

      {!savings.loading && completedGoals.length > 0 && (
        <section style={{ marginTop: "12px", borderRadius: "17px", border: "1px solid rgba(159,255,210,0.12)", background: "rgba(5,31,29,0.46)", overflow: "hidden" }}>
          <button
            type="button"
            onClick={() => setShowCompleted((value) => !value)}
            aria-expanded={showCompleted}
            style={{ width: "100%", minHeight: "48px", padding: "0 14px", border: 0, background: "transparent", color: "white", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#9fffd2" }}>✓</span>
              <strong style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Goals reached</strong>
              <small style={{ color: "rgba(255,255,255,0.34)", fontSize: "9px" }}>{completedGoals.length}</small>
            </span>
            <span style={{ color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>
              {formatDt(completedSaved)} still saved · {showCompleted ? "Hide" : "View"}
            </span>
          </button>

          {showCompleted && (
            <div style={{ padding: "0 10px 10px", display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: "10px" }}>
              {completedGoals.map((goal) => (
                <SavingsGoalCard
                  key={goal.id}
                  goal={goal}
                  movements={savings.movements}
                  screenMode={screenMode}
                  onDeposit={() => openTransfer(goal, "deposit")}
                  onWithdraw={() => openTransfer(goal, "withdraw")}
                  onEdit={() => openEdit(goal)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!savings.loading && (
        <div style={{ marginTop: "12px" }}>
          <SavingsActivity movements={savings.movements} goals={savings.goals} screenMode={screenMode} onOpenStatement={onOpenStatement} />
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
            if (!wasComplete && result.status === "completed") setCompletedGoal(result);
            return result;
          }
          return savings.withdraw(transferGoal.id, amount);
        }}
      />

      <SavingsCompletionModal goal={completedGoal} onClose={() => setCompletedGoal(null)} />
    </section>
  );
}
