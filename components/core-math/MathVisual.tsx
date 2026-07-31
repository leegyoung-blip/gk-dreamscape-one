"use client";

import type { CSSProperties } from "react";

export type MathVisualData =
  | { type: "none" }
  | {
      type: "number_line";
      min: number;
      max: number;
      step: number;
      highlight?: number | null;
    }
  | {
      type: "rectangle";
      length: number;
      width: number;
      unit?: string;
      show_dimensions?: boolean;
    }
  | {
      type: "fraction_bar";
      numerator: number;
      denominator: number;
    }
  | {
      type: "clock";
      hour: number;
      minute: number;
    }
  | {
      type: "bar_model";
      segments: Array<{ label: string; value: number }>;
    }
  | {
      type: "table";
      columns: string[];
      rows: string[][];
    }
  | {
      type: "bar_graph";
      items: Array<{ label: string; value: number }>;
      y_label?: string;
    };

export function normaliseMathVisual(value: unknown): MathVisualData {
  if (!value || typeof value !== "object") return { type: "none" };

  const raw = value as Record<string, unknown>;
  const type = String(raw.type || "none");

  if (type === "number_line") {
    return {
      type,
      min: Number(raw.min ?? 0),
      max: Number(raw.max ?? 10),
      step: Math.max(0.0001, Number(raw.step ?? 1)),
      highlight:
        raw.highlight === null || raw.highlight === undefined || raw.highlight === ""
          ? null
          : Number(raw.highlight),
    };
  }

  if (type === "rectangle") {
    return {
      type,
      length: Number(raw.length ?? 8),
      width: Number(raw.width ?? 5),
      unit: String(raw.unit ?? "cm"),
      show_dimensions: raw.show_dimensions !== false,
    };
  }

  if (type === "fraction_bar") {
    return {
      type,
      numerator: Math.max(0, Number(raw.numerator ?? 1)),
      denominator: Math.max(1, Number(raw.denominator ?? 2)),
    };
  }

  if (type === "clock") {
    return {
      type,
      hour: Number(raw.hour ?? 3),
      minute: Number(raw.minute ?? 0),
    };
  }

  if (type === "bar_model") {
    const segments = Array.isArray(raw.segments)
      ? raw.segments
          .map((item) => {
            const row = item as Record<string, unknown>;
            return {
              label: String(row.label ?? ""),
              value: Number(row.value ?? 0),
            };
          })
          .filter((item) => item.label || Number.isFinite(item.value))
      : [];
    return { type, segments };
  }

  if (type === "table") {
    const columns = Array.isArray(raw.columns)
      ? raw.columns.map((item) => String(item))
      : [];
    const rows = Array.isArray(raw.rows)
      ? raw.rows.map((row) =>
          Array.isArray(row) ? row.map((item) => String(item)) : [],
        )
      : [];
    return { type, columns, rows };
  }

  if (type === "bar_graph") {
    const items = Array.isArray(raw.items)
      ? raw.items
          .map((item) => {
            const row = item as Record<string, unknown>;
            return {
              label: String(row.label ?? ""),
              value: Number(row.value ?? 0),
            };
          })
          .filter((item) => item.label || Number.isFinite(item.value))
      : [];
    return { type, items, y_label: String(raw.y_label ?? "") };
  }

  return { type: "none" };
}

export default function MathVisual({
  visual,
  compact = false,
}: {
  visual: unknown;
  compact?: boolean;
}) {
  const data = normaliseMathVisual(visual);

  if (data.type === "none") return null;

  return (
    <div style={{ ...shell, minHeight: compact ? 150 : 210 }}>
      {data.type === "number_line" && <NumberLine data={data} />}
      {data.type === "rectangle" && <RectangleDiagram data={data} />}
      {data.type === "fraction_bar" && <FractionBar data={data} />}
      {data.type === "clock" && <ClockDiagram data={data} />}
      {data.type === "bar_model" && <BarModel data={data} />}
      {data.type === "table" && <TableDiagram data={data} />}
      {data.type === "bar_graph" && <BarGraph data={data} />}
    </div>
  );
}

function NumberLine({
  data,
}: {
  data: Extract<MathVisualData, { type: "number_line" }>;
}) {
  const min = Math.min(data.min, data.max - data.step);
  const max = Math.max(data.max, min + data.step);
  const span = max - min;
  const count = Math.min(20, Math.floor(span / data.step) + 1);
  const values = Array.from({ length: Math.max(2, count) }, (_, index) =>
    Number((min + index * data.step).toFixed(6)),
  ).filter((value) => value <= max + 1e-9);

  return (
    <svg viewBox="0 0 720 180" role="img" aria-label="Number line" style={svg}>
      <line x1="55" y1="90" x2="665" y2="90" stroke="#102a43" strokeWidth="4" />
      <polygon points="665,90 650,82 650,98" fill="#102a43" />
      {values.map((value) => {
        const x = 55 + ((value - min) / span) * 600;
        const highlighted =
          data.highlight !== null &&
          data.highlight !== undefined &&
          Math.abs(value - data.highlight) < data.step / 100;
        return (
          <g key={value}>
            <line
              x1={x}
              y1={highlighted ? 66 : 74}
              x2={x}
              y2={highlighted ? 114 : 106}
              stroke={highlighted ? "#2563eb" : "#102a43"}
              strokeWidth={highlighted ? 6 : 3}
            />
            <text x={x} y="140" textAnchor="middle" fontSize="24" fill="#102a43">
              {value}
            </text>
            {highlighted && <circle cx={x} cy="90" r="11" fill="#2563eb" />}
          </g>
        );
      })}
    </svg>
  );
}

function RectangleDiagram({
  data,
}: {
  data: Extract<MathVisualData, { type: "rectangle" }>;
}) {
  const unit = data.unit || "";
  return (
    <svg viewBox="0 0 720 360" role="img" aria-label="Rectangle diagram" style={svg}>
      <rect x="170" y="80" width="380" height="200" fill="#e0f2fe" stroke="#0f172a" strokeWidth="5" />
      {data.show_dimensions !== false && (
        <>
          <text x="360" y="55" textAnchor="middle" fontSize="30" fill="#0f172a">
            {data.length} {unit}
          </text>
          <text x="595" y="188" textAnchor="middle" fontSize="30" fill="#0f172a" transform="rotate(90 595 188)">
            {data.width} {unit}
          </text>
        </>
      )}
    </svg>
  );
}

function FractionBar({
  data,
}: {
  data: Extract<MathVisualData, { type: "fraction_bar" }>;
}) {
  const denominator = Math.min(12, Math.max(1, Math.round(data.denominator)));
  const numerator = Math.min(denominator, Math.max(0, Math.round(data.numerator)));
  const width = 560 / denominator;

  return (
    <svg viewBox="0 0 720 240" role="img" aria-label={`${numerator} out of ${denominator} parts shaded`} style={svg}>
      {Array.from({ length: denominator }, (_, index) => (
        <rect
          key={index}
          x={80 + index * width}
          y="70"
          width={width}
          height="100"
          fill={index < numerator ? "#60a5fa" : "#f8fafc"}
          stroke="#0f172a"
          strokeWidth="3"
        />
      ))}
      <text x="360" y="215" textAnchor="middle" fontSize="30" fill="#0f172a">
        {numerator}/{denominator}
      </text>
    </svg>
  );
}

function ClockDiagram({
  data,
}: {
  data: Extract<MathVisualData, { type: "clock" }>;
}) {
  const hour = ((data.hour % 12) + 12) % 12;
  const minute = ((data.minute % 60) + 60) % 60;
  const minuteAngle = minute * 6;
  const hourAngle = hour * 30 + minute * 0.5;
  const hand = (angle: number, length: number) => {
    const radians = ((angle - 90) * Math.PI) / 180;
    return { x: 360 + Math.cos(radians) * length, y: 180 + Math.sin(radians) * length };
  };
  const minuteEnd = hand(minuteAngle, 118);
  const hourEnd = hand(hourAngle, 82);

  return (
    <svg viewBox="0 0 720 360" role="img" aria-label="Analogue clock" style={svg}>
      <circle cx="360" cy="180" r="145" fill="#f8fafc" stroke="#0f172a" strokeWidth="5" />
      {Array.from({ length: 12 }, (_, index) => {
        const angle = ((index * 30 - 60) * Math.PI) / 180;
        const x = 360 + Math.cos(angle) * 116;
        const y = 180 + Math.sin(angle) * 116 + 8;
        return (
          <text key={index} x={x} y={y} textAnchor="middle" fontSize="25" fill="#0f172a">
            {index + 1}
          </text>
        );
      })}
      <line x1="360" y1="180" x2={hourEnd.x} y2={hourEnd.y} stroke="#0f172a" strokeWidth="10" strokeLinecap="round" />
      <line x1="360" y1="180" x2={minuteEnd.x} y2={minuteEnd.y} stroke="#2563eb" strokeWidth="7" strokeLinecap="round" />
      <circle cx="360" cy="180" r="10" fill="#0f172a" />
    </svg>
  );
}

function BarModel({
  data,
}: {
  data: Extract<MathVisualData, { type: "bar_model" }>;
}) {
  const segments = data.segments.length > 0 ? data.segments : [{ label: "Part", value: 1 }];
  const total = segments.reduce((sum, item) => sum + Math.max(0, item.value), 0) || segments.length;
  let x = 70;

  return (
    <svg viewBox="0 0 720 300" role="img" aria-label="Bar model" style={svg}>
      {segments.map((segment, index) => {
        const width = (Math.max(0, segment.value) / total) * 580 || 580 / segments.length;
        const currentX = x;
        x += width;
        return (
          <g key={`${segment.label}-${index}`}>
            <rect x={currentX} y="95" width={width} height="90" fill={index % 2 === 0 ? "#bae6fd" : "#bfdbfe"} stroke="#0f172a" strokeWidth="3" />
            <text x={currentX + width / 2} y="135" textAnchor="middle" fontSize="22" fill="#0f172a">
              {segment.label}
            </text>
            <text x={currentX + width / 2} y="166" textAnchor="middle" fontSize="24" fontWeight="700" fill="#0f172a">
              {segment.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TableDiagram({
  data,
}: {
  data: Extract<MathVisualData, { type: "table" }>;
}) {
  return (
    <div style={tableWrap}>
      <table style={tableStyle}>
        {data.columns.length > 0 && (
          <thead>
            <tr>
              {data.columns.map((column, index) => (
                <th key={`${column}-${index}`} style={cellStyle}>{column}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {data.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} style={cellStyle}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BarGraph({
  data,
}: {
  data: Extract<MathVisualData, { type: "bar_graph" }>;
}) {
  const items = data.items.length > 0 ? data.items : [{ label: "A", value: 1 }];
  const max = Math.max(1, ...items.map((item) => item.value));
  const chartWidth = 560;
  const barWidth = Math.min(90, chartWidth / items.length - 18);

  return (
    <svg viewBox="0 0 720 380" role="img" aria-label="Bar graph" style={svg}>
      <line x1="80" y1="310" x2="660" y2="310" stroke="#0f172a" strokeWidth="4" />
      <line x1="80" y1="45" x2="80" y2="310" stroke="#0f172a" strokeWidth="4" />
      {items.map((item, index) => {
        const gap = chartWidth / items.length;
        const height = (Math.max(0, item.value) / max) * 230;
        const x = 90 + index * gap + (gap - barWidth) / 2;
        return (
          <g key={`${item.label}-${index}`}>
            <rect x={x} y={310 - height} width={barWidth} height={height} fill="#60a5fa" stroke="#1e3a8a" strokeWidth="2" />
            <text x={x + barWidth / 2} y={300 - height} textAnchor="middle" fontSize="22" fill="#0f172a">{item.value}</text>
            <text x={x + barWidth / 2} y="342" textAnchor="middle" fontSize="21" fill="#0f172a">{item.label}</text>
          </g>
        );
      })}
      {data.y_label && (
        <text x="25" y="180" textAnchor="middle" fontSize="21" fill="#0f172a" transform="rotate(-90 25 180)">{data.y_label}</text>
      )}
    </svg>
  );
}

const shell: CSSProperties = {
  width: "100%",
  marginTop: "12px",
  borderRadius: "16px",
  border: "1px solid rgba(15,23,42,0.18)",
  background: "white",
  color: "#0f172a",
  overflow: "hidden",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

const svg: CSSProperties = {
  width: "100%",
  maxHeight: "340px",
  display: "block",
};

const tableWrap: CSSProperties = {
  width: "100%",
  overflowX: "auto",
  padding: "20px",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: "18px",
};

const cellStyle: CSSProperties = {
  border: "2px solid #0f172a",
  padding: "10px 12px",
  textAlign: "center",
};
