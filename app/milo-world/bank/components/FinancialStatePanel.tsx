"use client";

import { formatFinancialVariable } from "../lib/financial-learning-engine";
import type {
  FinancialLessonVariableDefinition,
  FinancialLessonVariableMap,
} from "../lib/financial-learning-engine-types";

export default function FinancialStatePanel({
  definitions,
  values,
}: {
  definitions: FinancialLessonVariableDefinition[];
  values: FinancialLessonVariableMap;
}) {
  const visible = definitions.filter((item) => item.visible !== false);
  if (!visible.length) return null;

  return (
    <div
      aria-label="Current financial position"
      style={{
        marginTop: "14px",
        display: "grid",
        gridTemplateColumns: `repeat(${Math.min(visible.length, 4)}, minmax(0, 1fr))`,
        gap: "8px",
      }}
    >
      {visible.map((item) => (
        <div
          key={item.key}
          style={{
            borderRadius: "12px",
            border: "1px solid rgba(126,232,255,.10)",
            background: "rgba(255,255,255,.025)",
            padding: "9px 10px",
            minWidth: 0,
          }}
        >
          <div
            style={{
              color: "rgba(255,255,255,.38)",
              fontSize: "7px",
              fontWeight: 900,
              letterSpacing: ".11em",
              textTransform: "uppercase",
            }}
          >
            {item.label}
          </div>
          <div
            style={{
              marginTop: "4px",
              color: "#d8f7ff",
              fontSize: "13px",
              fontWeight: 900,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {formatFinancialVariable(Number(values[item.key] ?? item.initialValue), item)}
          </div>
        </div>
      ))}
    </div>
  );
}
