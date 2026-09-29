"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { BudgetPlanningItem } from "../lib/budget-simulator-types";
import BudgetInfoButton from "./BudgetInfoButton";

export default function BudgetPlanningBoard({
  screenMode,
  items,
  pinnedIds,
  onRemove,
}: {
  screenMode: BankScreenMode;
  items: BudgetPlanningItem[];
  pinnedIds: string[];
  onRemove: (id: string) => void;
}) {
  const isMobile = screenMode === "mobile";
  const pinned = pinnedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is BudgetPlanningItem => Boolean(item));

  return (
    <aside
      style={{
        borderRadius: "18px",
        border: "1px solid rgba(126,232,255,0.14)",
        background: "rgba(5,18,40,0.72)",
        padding: isMobile ? "12px" : "14px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <p style={eyebrowStyle}>Planning board</p>
            <BudgetInfoButton title="Planning board">Pin the facts you think matter most. They stay visible while you build your budget, so you can check whether your decisions match your priorities.</BudgetInfoButton>
          </div>
          <strong style={{ display: "block", marginTop: "4px", fontSize: "19px" }}>
            Keep important facts in view
          </strong>
        </div>
        <span
          style={{
            height: "24px",
            minWidth: "24px",
            borderRadius: "999px",
            border: "1px solid rgba(126,232,255,0.16)",
            background: "rgba(126,232,255,0.06)",
            display: "grid",
            placeItems: "center",
            color: "#9ceeff",
            fontSize: "16px",
            fontWeight: 900,
          }}
        >
          {pinned.length}
        </span>
      </div>

      {pinned.length === 0 ? (
        <p
          style={{
            margin: "11px 0 0",
            color: "rgba(255,255,255,0.38)",
            fontSize: "16px",
            lineHeight: 1.55,
          }}
        >
          Nothing pinned yet.
        </p>
      ) : (
        <div
          style={{
            marginTop: "10px",
            display: "flex",
            flexDirection: isMobile ? "row" : "column",
            gap: "7px",
            overflowX: isMobile ? "auto" : "visible",
            paddingBottom: isMobile ? "2px" : 0,
          }}
        >
          {pinned.map((item) => (
            <div
              key={item.id}
              style={{
                minWidth: isMobile ? "220px" : 0,
                borderRadius: "13px",
                border: "1px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.025)",
                padding: "9px 10px",
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) auto",
                gap: "8px",
                alignItems: "start",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.82)",
                    fontSize: "16px",
                    lineHeight: 1.3,
                  }}
                >
                  {item.title}
                </strong>
                <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.amount != null && (
                    <span style={{ color: "#ffd18a", fontSize: "17px", fontWeight: 900 }}>
                      {`$${item.amount.toLocaleString()}`}
                    </span>
                  )}
                  <BudgetInfoButton title={item.title}>{item.detail}</BudgetInfoButton>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.title} from planning board`}
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.025)",
                  color: "rgba(255,255,255,0.42)",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#8ee8ff",
  fontSize: "14px",
  fontWeight: 950,
  letterSpacing: "0.12em",
  textTransform: "uppercase" as const,
};
