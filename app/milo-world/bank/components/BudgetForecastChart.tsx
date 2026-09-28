"use client";

import type { BudgetForecast } from "../lib/budget-simulator-types";

export default function BudgetForecastChart({
  forecast,
  selectedDay,
}: {
  forecast: BudgetForecast;
  selectedDay: number;
}) {
  const width = 900;
  const height = 290;
  const left = 54;
  const right = 20;
  const top = 24;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;

  const allValues = forecast.points.flatMap((point) => [point.available, point.protected]);
  const rawMin = Math.min(0, ...allValues);
  const rawMax = Math.max(100, ...allValues);
  const padding = Math.max(100, (rawMax - rawMin) * 0.12);
  const minY = Math.floor((rawMin - padding) / 100) * 100;
  const maxY = Math.ceil((rawMax + padding) / 100) * 100;
  const span = Math.max(1, maxY - minY);

  const x = (day: number) => left + ((day - 1) / 29) * plotWidth;
  const y = (value: number) => top + ((maxY - value) / span) * plotHeight;

  const availablePath = forecast.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.day).toFixed(1)} ${y(point.available).toFixed(1)}`)
    .join(" ");
  const protectedPath = forecast.points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.day).toFixed(1)} ${y(point.protected).toFixed(1)}`)
    .join(" ");

  const selected = forecast.points[Math.max(0, Math.min(29, selectedDay - 1))];
  const yTicks = [maxY, Math.round((maxY + minY) / 2), minY];
  const xTicks = [1, 5, 10, 15, 20, 25, 30];

  return (
    <div style={{ width: "100%", minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "8px",
          color: "rgba(255,255,255,.55)",
          fontSize: "8px",
          fontWeight: 850,
        }}
      >
        <LegendDot colour="#7ee8ff" label="Available DT" />
        <LegendDot colour="#d9b7ff" label="Protected DT" />
        <LegendDot colour="#ffd18a" label="Known payment" />
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Thirty-day Budget Simulator forecast showing Available DT, Protected DT and known payment dates"
        style={{ display: "block", width: "100%", height: "auto", minHeight: "190px" }}
      >
        <defs>
          <linearGradient id="availableFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7ee8ff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#7ee8ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick}>
            <line
              x1={left}
              x2={width - right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
            />
            <text
              x={left - 9}
              y={y(tick) + 4}
              textAnchor="end"
              fill="rgba(255,255,255,.30)"
              fontSize="10"
            >
              {tick.toLocaleString()}
            </text>
          </g>
        ))}

        {xTicks.map((day) => (
          <text
            key={day}
            x={x(day)}
            y={height - 13}
            textAnchor="middle"
            fill="rgba(255,255,255,.30)"
            fontSize="10"
          >
            {day}
          </text>
        ))}

        {minY < 0 && maxY > 0 && (
          <line
            x1={left}
            x2={width - right}
            y1={y(0)}
            y2={y(0)}
            stroke="rgba(255,120,120,.30)"
            strokeDasharray="5 5"
          />
        )}

        <path
          d={`${availablePath} L ${x(30)} ${y(minY)} L ${x(1)} ${y(minY)} Z`}
          fill="url(#availableFill)"
        />

        {forecast.points
          .filter((point) => point.commitmentOutflow > 0)
          .map((point) => (
            <g key={`commitment-${point.day}`}>
              <line
                x1={x(point.day)}
                x2={x(point.day)}
                y1={top}
                y2={top + plotHeight}
                stroke="rgba(255,209,138,.14)"
                strokeDasharray="3 5"
              />
              <circle
                cx={x(point.day)}
                cy={y(point.available)}
                r="5"
                fill="#ffd18a"
                stroke="#071225"
                strokeWidth="2"
              />
            </g>
          ))}

        <path
          d={protectedPath}
          fill="none"
          stroke="#d9b7ff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={availablePath}
          fill="none"
          stroke="#7ee8ff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {selected && (
          <g>
            <line
              x1={x(selected.day)}
              x2={x(selected.day)}
              y1={top}
              y2={top + plotHeight}
              stroke="rgba(255,255,255,.30)"
              strokeWidth="2"
            />
            <circle
              cx={x(selected.day)}
              cy={y(selected.available)}
              r="7"
              fill="#7ee8ff"
              stroke="#071225"
              strokeWidth="3"
            />
            <circle
              cx={x(selected.day)}
              cy={y(selected.protected)}
              r="6"
              fill="#d9b7ff"
              stroke="#071225"
              strokeWidth="3"
            />
          </g>
        )}
      </svg>
    </div>
  );
}

function LegendDot({ colour, label }: { colour: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
      <span
        aria-hidden="true"
        style={{ width: "8px", height: "8px", borderRadius: "999px", background: colour }}
      />
      {label}
    </span>
  );
}
