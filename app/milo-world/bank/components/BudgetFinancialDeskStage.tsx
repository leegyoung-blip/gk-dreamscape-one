"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import {
  getBudgetPlanningItems,
  totalKnownCommitments,
  totalGoalGap,
} from "../lib/budget-simulator-financial-model";
import type {
  BudgetFinancialProfile,
  BudgetPlanningItem,
} from "../lib/budget-simulator-types";
import BudgetPlanningBoard from "./BudgetPlanningBoard";

type DeskKey =
  | "income"
  | "commitments"
  | "goals"
  | "savings"
  | "optional"
  | "signals";

export default function BudgetFinancialDeskStage({
  profile,
  screenMode,
  inspectedItems,
  pinnedItems,
  saving,
  onInspectedChange,
  onPinnedChange,
  onContinue,
}: {
  profile: BudgetFinancialProfile;
  screenMode: BankScreenMode;
  inspectedItems: string[];
  pinnedItems: string[];
  saving: boolean;
  onInspectedChange: (next: string[]) => void;
  onPinnedChange: (next: string[]) => void;
  onContinue: () => Promise<void>;
}) {
  const isMobile = screenMode === "mobile";
  const [activeDesk, setActiveDesk] = useState<DeskKey>("income");
  const planningItems = useMemo(() => getBudgetPlanningItems(profile), [profile]);
  const required = ["income", "commitments", "goals"];
  const requiredDone = required.every((id) => inspectedItems.includes(id));

  useEffect(() => {
    if (!inspectedItems.includes("income")) {
      onInspectedChange([...inspectedItems, "income"]);
    }
    // The first Income panel is already visible when the desk opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function inspect(key: DeskKey) {
    setActiveDesk(key);
    if (!inspectedItems.includes(key)) {
      onInspectedChange([...inspectedItems, key]);
    }
  }

  function togglePin(id: string) {
    onPinnedChange(
      pinnedItems.includes(id)
        ? pinnedItems.filter((item) => item !== id)
        : [...pinnedItems, id],
    );
  }

  const cards: {
    id: DeskKey;
    number: string;
    title: string;
    summary: string;
    value: string;
  }[] = [
    {
      id: "income",
      number: "01",
      title: "Income",
      summary: "What enters the month and when.",
      value: `${profile.monthlyIncome.toLocaleString()} DT`,
    },
    {
      id: "commitments",
      number: "02",
      title: "Commitments",
      summary: "Known payments with dates attached.",
      value: `${totalKnownCommitments(profile).toLocaleString()} DT`,
    },
    {
      id: "goals",
      number: "03",
      title: "Goals",
      summary: "What future plans are competing for DT.",
      value: `${profile.goals.length} active`,
    },
    {
      id: "savings",
      number: "04",
      title: "Current savings",
      summary: "Protected money already outside this month's plan.",
      value: `${profile.currentSavings.toLocaleString()} DT`,
    },
    {
      id: "optional",
      number: "05",
      title: "Optional spending",
      summary: "Things you may want, but do not owe yet.",
      value: `${profile.optionalSpending.length} choices`,
    },
    {
      id: "signals",
      number: "06",
      title: "Signals",
      summary: "Useful clues without guaranteed outcomes.",
      value: `${profile.signals.length} signals`,
    },
  ];

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          gap: "10px",
          alignItems: isMobile ? "stretch" : "end",
        }}
      >
        <div>
          <p style={eyebrowStyle}>Stage 2 · Financial Desk</p>
          <h3
            style={{
              margin: "4px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "26px" : "32px",
              fontWeight: 500,
            }}
          >
            Investigate before you allocate.
          </h3>
        </div>
        <div
          style={{
            borderRadius: "12px",
            border: `1px solid ${requiredDone ? "rgba(111,255,184,.22)" : "rgba(255,209,138,.16)"}`,
            background: requiredDone ? "rgba(111,255,184,.06)" : "rgba(255,209,138,.05)",
            color: requiredDone ? "#a9ffd4" : "#ffd18a",
            padding: "8px 11px",
            fontSize: "8px",
            fontWeight: 850,
            lineHeight: 1.4,
          }}
        >
          {requiredDone
            ? "Core review complete"
            : "Review Income, Commitments and Goals to continue"}
        </div>
      </div>

      <div
        style={{
          marginTop: "13px",
          display: "grid",
          gridTemplateColumns:
            screenMode === "mobile"
              ? "repeat(2,minmax(0,1fr))"
              : screenMode === "compact"
                ? "repeat(3,minmax(0,1fr))"
                : "repeat(6,minmax(0,1fr))",
          gap: "7px",
        }}
      >
        {cards.map((card) => {
          const active = activeDesk === card.id;
          const inspected = inspectedItems.includes(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => inspect(card.id)}
              style={{
                minHeight: isMobile ? "92px" : "104px",
                borderRadius: "16px",
                border: active
                  ? "1px solid rgba(126,232,255,.38)"
                  : inspected
                    ? "1px solid rgba(111,255,184,.16)"
                    : "1px solid rgba(255,255,255,.065)",
                background: active
                  ? "rgba(83,215,255,.08)"
                  : inspected
                    ? "rgba(111,255,184,.035)"
                    : "rgba(255,255,255,.02)",
                color: "white",
                padding: "10px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span
                style={{
                  color: active ? "#8ee8ff" : "rgba(255,255,255,.26)",
                  fontSize: "7px",
                  fontWeight: 950,
                  letterSpacing: ".08em",
                }}
              >
                {card.number}
              </span>
              <strong style={{ display: "block", marginTop: "4px", fontSize: "10px" }}>
                {card.title}
              </strong>
              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "#ffd18a",
                  fontSize: "10px",
                  fontWeight: 900,
                }}
              >
                {card.value}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  color: "rgba(255,255,255,.32)",
                  fontSize: "7px",
                  lineHeight: 1.35,
                }}
              >
                {card.summary}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          marginTop: "10px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.45fr) minmax(250px,.55fr)",
          gap: "10px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: "19px",
            border: "1px solid rgba(255,255,255,.07)",
            background: "rgba(4,12,30,.72)",
            padding: isMobile ? "13px" : "15px",
          }}
        >
          <DeskDetail
            activeDesk={activeDesk}
            profile={profile}
            planningItems={planningItems}
            pinnedItems={pinnedItems}
            onTogglePin={togglePin}
          />
        </section>

        <BudgetPlanningBoard
          screenMode={screenMode}
          items={planningItems}
          pinnedIds={pinnedItems}
          onRemove={(id) => onPinnedChange(pinnedItems.filter((item) => item !== id))}
        />
      </div>

      <div
        style={{
          marginTop: "11px",
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          justifyContent: "space-between",
          alignItems: isMobile ? "stretch" : "center",
          gap: "10px",
        }}
      >
        <p style={{ margin: 0, color: "rgba(255,255,255,.34)", fontSize: "8px" }}>
          Goal gap: {totalGoalGap(profile).toLocaleString()} DT · {pinnedItems.length} item{pinnedItems.length === 1 ? "" : "s"} pinned
        </p>
        <button
          type="button"
          disabled={!requiredDone || saving}
          onClick={() => void onContinue()}
          style={{
            ...primaryButtonStyle,
            opacity: !requiredDone || saving ? .42 : 1,
            cursor: !requiredDone || saving ? "not-allowed" : "pointer",
          }}
        >
          Build my budget →
        </button>
      </div>
    </div>
  );
}

function DeskDetail({
  activeDesk,
  profile,
  planningItems,
  pinnedItems,
  onTogglePin,
}: {
  activeDesk: DeskKey;
  profile: BudgetFinancialProfile;
  planningItems: BudgetPlanningItem[];
  pinnedItems: string[];
  onTogglePin: (id: string) => void;
}) {
  if (activeDesk === "income") {
    return (
      <>
        <DetailHeader title="Income & timing" detail="Separate what is available now from what is expected later." />
        <div style={detailGridStyle}>
          <DataRow
            title="Available now"
            value={`${profile.availableNow.toLocaleString()} DT`}
            detail="Already in your wallet before this month's income arrives."
            pinned={pinnedItems.includes("income-available")}
            onPin={() => onTogglePin("income-available")}
          />
          <DataRow
            title="Expected monthly income"
            value={`${profile.monthlyIncome.toLocaleString()} DT`}
            detail={profile.nextIncomeWindow ?? `Expected on Day ${profile.nextIncomeDay}.`}
            pinned={pinnedItems.includes("income-monthly")}
            onPin={() => onTogglePin("income-monthly")}
          />
        </div>
      </>
    );
  }

  if (activeDesk === "commitments") {
    return (
      <>
        <DetailHeader title="Known commitments" detail="Dates matter. A budget can look balanced overall and still run short at the wrong time." />
        <div style={detailGridStyle}>
          {profile.commitments.map((item) => (
            <DataRow
              key={item.id}
              title={item.title}
              value={`${item.amount.toLocaleString()} DT`}
              detail={`Day ${item.dueDay} · ${item.description}`}
              pinned={pinnedItems.includes(item.id)}
              onPin={() => onTogglePin(item.id)}
            />
          ))}
        </div>
      </>
    );
  }

  if (activeDesk === "goals") {
    return (
      <>
        <DetailHeader title="Competing goals" detail="Every goal may be worthwhile. The constraint is that they share the same DT." />
        <div style={detailGridStyle}>
          {profile.goals.map((goal) => (
            <DataRow
              key={goal.id}
              title={goal.title}
              value={`${Math.max(0, goal.targetAmount - goal.currentAmount).toLocaleString()} DT left`}
              detail={`${goal.currentAmount.toLocaleString()} / ${goal.targetAmount.toLocaleString()} DT · target in ${goal.desiredMonths} month${goal.desiredMonths === 1 ? "" : "s"}. ${goal.description}`}
              pinned={pinnedItems.includes(goal.id)}
              onPin={() => onTogglePin(goal.id)}
            />
          ))}
        </div>
      </>
    );
  }

  if (activeDesk === "savings") {
    return (
      <>
        <DetailHeader title="Current savings" detail="This is already protected and is not automatically part of the month's spending pool." />
        <DataRow
          title="Protected savings"
          value={`${profile.currentSavings.toLocaleString()} DT`}
          detail="You can choose to add to this buffer, but using it later would reduce your resilience."
          pinned={pinnedItems.includes("savings-current")}
          onPin={() => onTogglePin("savings-current")}
        />
      </>
    );
  }

  if (activeDesk === "optional") {
    return (
      <>
        <DetailHeader title="Optional spending" detail="These are real choices, not automatically bad choices. They simply compete with other priorities." />
        <div style={detailGridStyle}>
          {profile.optionalSpending.map((item) => (
            <DataRow
              key={item.id}
              title={item.title}
              value={`${item.amount.toLocaleString()} DT`}
              detail={item.description}
              pinned={pinnedItems.includes(item.id)}
              onPin={() => onTogglePin(item.id)}
            />
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <DetailHeader title="Signals" detail="These clues may matter later, but none of them is guaranteed." />
      <div style={detailGridStyle}>
        {profile.signals.map((signal) => (
          <DataRow
            key={signal.id}
            title={signal.title}
            value="Uncertain"
            detail={signal.detail}
            pinned={pinnedItems.includes(signal.id)}
            onPin={() => onTogglePin(signal.id)}
          />
        ))}
      </div>
    </>
  );
}

function DetailHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <strong style={{ display: "block", fontSize: "13px" }}>{title}</strong>
      <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,.36)", fontSize: "8px", lineHeight: 1.5 }}>
        {detail}
      </p>
    </div>
  );
}

function DataRow({
  title,
  value,
  detail,
  pinned,
  onPin,
}: {
  title: string;
  value: string;
  detail: string;
  pinned: boolean;
  onPin: () => void;
}) {
  return (
    <article
      style={{
        minWidth: 0,
        borderRadius: "14px",
        border: pinned ? "1px solid rgba(126,232,255,.20)" : "1px solid rgba(255,255,255,.06)",
        background: pinned ? "rgba(83,215,255,.045)" : "rgba(255,255,255,.018)",
        padding: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: "9px", lineHeight: 1.3 }}>{title}</strong>
          <span style={{ display: "block", marginTop: "3px", color: "#ffd18a", fontSize: "10px", fontWeight: 900 }}>
            {value}
          </span>
        </div>
        <button
          type="button"
          onClick={onPin}
          style={{
            minHeight: "28px",
            borderRadius: "9px",
            border: pinned ? "1px solid rgba(126,232,255,.26)" : "1px solid rgba(255,255,255,.08)",
            background: pinned ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)",
            color: pinned ? "#a9f1ff" : "rgba(255,255,255,.44)",
            padding: "0 8px",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "7px",
            fontWeight: 900,
            whiteSpace: "nowrap",
          }}
        >
          {pinned ? "Pinned ✓" : "Pin to plan"}
        </button>
      </div>
      <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.34)", fontSize: "7px", lineHeight: 1.5 }}>
        {detail}
      </p>
    </article>
  );
}

const detailGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
  gap: "7px",
};

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "7px",
  fontWeight: 950,
  letterSpacing: ".13em",
  textTransform: "uppercase" as const,
};

const primaryButtonStyle = {
  minHeight: "40px",
  padding: "0 15px",
  borderRadius: "12px",
  border: "1px solid rgba(126,232,255,.32)",
  background: "linear-gradient(180deg,rgba(83,215,255,.18),rgba(83,215,255,.09))",
  color: "#dffaff",
  fontFamily: "inherit",
  fontSize: "8px",
  fontWeight: 950,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
};
