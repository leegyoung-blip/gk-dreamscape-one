"use client";

import { useMemo } from "react";
import {
  budgetAllocationKeys,
  budgetPool,
  formatBudgetAllocationLabel,
} from "../lib/budget-simulator-financial-model";
import type {
  BudgetAllocation,
  BudgetAllocationKey,
  BudgetFinancialProfile,
} from "../lib/budget-simulator-types";

const palette: Record<BudgetAllocationKey, string> = {
  essentials: "#7ee8ff",
  savings: "#ffd18a",
  emergency: "#9cf0c7",
  investing: "#c3b5ff",
  goals: "#ffb7d8",
  lifestyle: "#9db7ff",
  unallocated: "#596477",
};

export default function BudgetAllocationWheel({
  profile,
  allocation,
  selected,
  onSelect,
}: {
  profile: BudgetFinancialProfile;
  allocation: BudgetAllocation;
  selected: BudgetAllocationKey;
  onSelect: (key: BudgetAllocationKey) => void;
}) {
  const total = budgetPool(profile);
  const keys: BudgetAllocationKey[] = [...budgetAllocationKeys(), "unallocated"];

  const arcs = useMemo(() => {
    let cursor = -90;
    return keys.map((key) => {
      const value = allocation[key];
      const sweep = total > 0 ? (value / total) * 360 : 0;
      const start = cursor;
      const end = cursor + sweep;
      cursor = end;
      return { key, value, start, end, sweep };
    });
  }, [allocation, total]);

  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ position: "relative", width: "min(100%, 460px)", margin: "0 auto" }}>
        <svg viewBox="0 0 320 320" role="img" aria-label="Budget allocation wheel" style={{ width: "100%", display: "block" }}>
          <circle cx="160" cy="160" r="116" fill="rgba(255,255,255,.018)" stroke="rgba(255,255,255,.06)" strokeWidth="2" />
          {arcs.map((arc) => {
            if (arc.sweep <= 0.1) return null;
            const path = describeDonutArc(160, 160, 118, 72, arc.start, arc.end);
            const active = selected === arc.key;
            return (
              <path
                key={arc.key}
                d={path}
                fill={palette[arc.key]}
                fillOpacity={active ? 0.95 : arc.key === "unallocated" ? 0.36 : 0.7}
                stroke={active ? "rgba(255,255,255,.92)" : "rgba(3,9,21,.78)"}
                strokeWidth={active ? 4 : 2}
                style={{ cursor: "pointer", transition: "all .16s ease" }}
                onClick={() => onSelect(arc.key)}
              />
            );
          })}
          <circle cx="160" cy="160" r="66" fill="rgba(3,10,25,.97)" stroke="rgba(255,255,255,.07)" />
          <text x="160" y="145" textAnchor="middle" fill="rgba(255,255,255,.38)" fontSize="14" fontWeight="800" letterSpacing="1.2">
            {formatBudgetAllocationLabel(selected).toUpperCase()}
          </text>
          <text x="160" y="169" textAnchor="middle" fill={selected === "unallocated" ? "#c7ced8" : "#ffffff"} fontSize="25" fontWeight="900">
            {allocation[selected].toLocaleString()}
          </text>
          <text x="160" y="185" textAnchor="middle" fill="#ffd18a" fontSize="14" fontWeight="900">
            DT
          </text>
        </svg>
      </div>

      <div
        style={{
          marginTop: "4px",
          display: "grid",
          gridTemplateColumns: "repeat(2,minmax(0,1fr))",
          gap: "5px",
        }}
      >
        {keys.map((key) => {
          const active = selected === key;
          const pct = total > 0 ? Math.round((allocation[key] / total) * 100) : 0;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              style={{
                minHeight: "44px",
                borderRadius: "10px",
                border: active ? `1px solid ${palette[key]}` : "1px solid rgba(255,255,255,.06)",
                background: active ? "rgba(255,255,255,.045)" : "rgba(255,255,255,.015)",
                color: "white",
                padding: "6px 8px",
                display: "grid",
                gridTemplateColumns: "8px minmax(0,1fr) auto",
                alignItems: "center",
                gap: "6px",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <span style={{ width: "7px", height: "7px", borderRadius: "999px", background: palette[key] }} />
              <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "14px", fontWeight: 850 }}>
                {formatBudgetAllocationLabel(key)}
              </span>
              <span style={{ color: "rgba(255,255,255,.38)", fontSize: "14px" }}>{pct}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = (angle * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function describeDonutArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const safeEnd = Math.min(endAngle, startAngle + 359.999);
  const outerStart = polar(cx, cy, outerRadius, startAngle);
  const outerEnd = polar(cx, cy, outerRadius, safeEnd);
  const innerEnd = polar(cx, cy, innerRadius, safeEnd);
  const innerStart = polar(cx, cy, innerRadius, startAngle);
  const large = safeEnd - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${large} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${large} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}
