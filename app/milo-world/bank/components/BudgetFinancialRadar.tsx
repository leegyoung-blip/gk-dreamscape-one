"use client";

import type { BudgetRadarValues } from "../lib/budget-simulator-types";

const axes = [
  { key: "liquidity" as const, label: "Liquidity" },
  { key: "resilience" as const, label: "Resilience" },
  { key: "goalProgress" as const, label: "Goals" },
  { key: "flexibility" as const, label: "Flexibility" },
  { key: "longTermGrowth" as const, label: "Growth" },
];

export default function BudgetFinancialRadar({ values }: { values: BudgetRadarValues }) {
  const cx = 150;
  const cy = 142;
  const maxRadius = 88;
  const axisPoints = axes.map((axis, index) => point(cx, cy, maxRadius, index, axes.length));
  const dataPoints = axes.map((axis, index) =>
    point(cx, cy, (maxRadius * Math.max(0, Math.min(100, values[axis.key]))) / 100, index, axes.length),
  );

  return (
    <div>
      <svg viewBox="0 0 300 286" role="img" aria-label="Financial health radar" style={{ width: "100%", maxWidth: "430px", display: "block", margin: "0 auto" }}>
        {[25, 50, 75, 100].map((level) => {
          const radius = (maxRadius * level) / 100;
          const polygon = axes.map((_, index) => point(cx, cy, radius, index, axes.length));
          return (
            <polygon
              key={level}
              points={polygon.map((item) => `${item.x},${item.y}`).join(" ")}
              fill="none"
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
            />
          );
        })}

        {axisPoints.map((axisPoint, index) => (
          <line key={axes[index].key} x1={cx} y1={cy} x2={axisPoint.x} y2={axisPoint.y} stroke="rgba(255,255,255,.07)" strokeWidth="1" />
        ))}

        <polygon
          points={dataPoints.map((item) => `${item.x},${item.y}`).join(" ")}
          fill="rgba(126,232,255,.16)"
          stroke="#7ee8ff"
          strokeWidth="2"
        />
        {dataPoints.map((dataPoint, index) => (
          <circle key={axes[index].key} cx={dataPoint.x} cy={dataPoint.y} r="3.2" fill="#ffd18a" stroke="rgba(3,9,21,.9)" strokeWidth="1.5" />
        ))}

        {axes.map((axis, index) => {
          const labelPoint = point(cx, cy, maxRadius + 27, index, axes.length);
          return (
            <g key={axis.key}>
              <text x={labelPoint.x} y={labelPoint.y - 2} textAnchor="middle" fill="rgba(255,255,255,.58)" fontSize="14" fontWeight="800">
                {axis.label}
              </text>
              <text x={labelPoint.x} y={labelPoint.y + 10} textAnchor="middle" fill="rgba(255,209,138,.72)" fontSize="13" fontWeight="900">
                {Math.round(values[axis.key])}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function point(cx: number, cy: number, radius: number, index: number, count: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}
