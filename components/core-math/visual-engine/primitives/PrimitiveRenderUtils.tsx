import type {
  MathCoordinate,
  MathPositionRef,
  MathVisualObject,
  MathVisualStyle,
} from "../MathVisualTypes";
import type { MathVisualObjectRuntimeState } from "../MathVisualState";

export type PrimitivePointMap = Map<string, MathCoordinate>;
export type PrimitiveObjectMap = Map<string, MathVisualObject>;

export type PrimitiveCommonProps<T extends MathVisualObject> = {
  object: T;
  visualId: string;
  points: PrimitivePointMap;
  objectsById?: PrimitiveObjectMap;
  runtimeState?: MathVisualObjectRuntimeState;
};

type Palette = {
  stroke: string;
  fill: string;
  light: string;
  text: string;
};

const PALETTES: Record<string, Palette> = {
  default: {
    stroke: "#0f172a",
    fill: "#dbeafe",
    light: "#eff6ff",
    text: "#0f172a",
  },
  muted: {
    stroke: "#64748b",
    fill: "#e2e8f0",
    light: "#f8fafc",
    text: "#475569",
  },
  accent: {
    stroke: "#2563eb",
    fill: "#93c5fd",
    light: "#dbeafe",
    text: "#1d4ed8",
  },
  success: {
    stroke: "#15803d",
    fill: "#86efac",
    light: "#dcfce7",
    text: "#166534",
  },
  warning: {
    stroke: "#b45309",
    fill: "#fcd34d",
    light: "#fef3c7",
    text: "#92400e",
  },
  danger: {
    stroke: "#b91c1c",
    fill: "#fca5a5",
    light: "#fee2e2",
    text: "#991b1b",
  },
};

export type ResolvedPrimitiveStyle = {
  stroke: string;
  fill: string;
  text: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
};

export function sanitiseSvgId(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

export function hatchPatternId(visualId: string, objectId: string) {
  return `mv-hatch-${sanitiseSvgId(visualId)}-${sanitiseSvgId(objectId)}`;
}

export function resolvePrimitiveStyle(
  style: MathVisualStyle | undefined,
  runtimeState: MathVisualObjectRuntimeState | undefined,
  options: { fillable?: boolean; textOnly?: boolean } = {},
): ResolvedPrimitiveStyle {
  const tone = style?.tone ?? "default";
  const palette = PALETTES[tone] ?? PALETTES.default;
  const baseStrokeWidth = Math.max(1, Number(style?.stroke_width ?? 3));
  const baseOpacity = clamp(Number(style?.opacity ?? 1), 0, 1);

  const highlighted = runtimeState?.highlighted === true;
  const emphasised = runtimeState?.emphasised === true;
  const traced = runtimeState?.traced === true;
  const dimmed = runtimeState?.dimmed === true;
  const runtimeShaded = runtimeState?.shaded === true;

  const stroke = highlighted || emphasised || traced ? PALETTES.accent.stroke : palette.stroke;
  const text = highlighted || emphasised ? PALETTES.accent.text : palette.text;

  let fill = "none";
  if (!options.textOnly && options.fillable) {
    if (runtimeShaded) {
      fill = PALETTES.accent.light;
    } else {
      switch (style?.fill ?? "none") {
        case "solid":
          fill = palette.fill;
          break;
        case "light":
          fill = palette.light;
          break;
        case "hatched":
          fill = "hatched";
          break;
        case "none":
        default:
          fill = "none";
          break;
      }
    }
  }

  let strokeDasharray: string | undefined;
  if (traced) strokeDasharray = "10 7";
  else if (style?.stroke === "dashed") strokeDasharray = "9 7";
  else if (style?.stroke === "dotted") strokeDasharray = "2 7";

  const strokeWidth = highlighted
    ? Math.max(4.5, baseStrokeWidth * 1.65)
    : emphasised
      ? Math.max(4, baseStrokeWidth * 1.4)
      : traced
        ? Math.max(3.5, baseStrokeWidth * 1.25)
        : baseStrokeWidth;

  return {
    stroke,
    fill,
    text,
    strokeWidth,
    strokeDasharray,
    opacity: baseOpacity * (dimmed ? 0.28 : 1),
  };
}

export function isRuntimeHidden(state?: MathVisualObjectRuntimeState) {
  return state?.visibility === "hidden";
}

export function resolvePosition(
  ref: MathPositionRef,
  points: PrimitivePointMap,
): MathCoordinate | null {
  if ("point_id" in ref) return points.get(ref.point_id) ?? null;
  return { x: Number(ref.x), y: Number(ref.y) };
}

export function positionPair(
  from: MathPositionRef,
  to: MathPositionRef,
  points: PrimitivePointMap,
) {
  const a = resolvePosition(from, points);
  const b = resolvePosition(to, points);
  return a && b ? { a, b } : null;
}

export function distance(a: MathCoordinate, b: MathCoordinate) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function normalisedVector(a: MathCoordinate, b: MathCoordinate) {
  const length = distance(a, b) || 1;
  return {
    x: (b.x - a.x) / length,
    y: (b.y - a.y) / length,
  };
}

export function perpendicularVector(a: MathCoordinate, b: MathCoordinate) {
  const unit = normalisedVector(a, b);
  return { x: -unit.y, y: unit.x };
}

export function midpoint(a: MathCoordinate, b: MathCoordinate) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export function offsetPoint(
  point: MathCoordinate,
  direction: MathCoordinate,
  amount: number,
): MathCoordinate {
  return {
    x: point.x + direction.x * amount,
    y: point.y + direction.y * amount,
  };
}

export function polarPoint(
  center: MathCoordinate,
  radius: number,
  angleDegrees: number,
): MathCoordinate {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: center.x + Math.cos(radians) * radius,
    y: center.y + Math.sin(radians) * radius,
  };
}

export function angleDegrees(from: MathCoordinate, to: MathCoordinate) {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

export function normaliseAngle(angle: number) {
  const value = angle % 360;
  return value < 0 ? value + 360 : value;
}

export function shortestArc(
  start: number,
  end: number,
): { start: number; end: number; delta: number; sweep: 0 | 1 } {
  let s = normaliseAngle(start);
  let e = normaliseAngle(end);
  let delta = e - s;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  e = s + delta;
  return { start: s, end: e, delta, sweep: delta >= 0 ? 1 : 0 };
}

export function pointsAttribute(points: MathCoordinate[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function arrowHeadPoints(
  tip: MathCoordinate,
  tail: MathCoordinate,
  size = 13,
) {
  const unit = normalisedVector(tail, tip);
  const normal = { x: -unit.y, y: unit.x };
  const base = {
    x: tip.x - unit.x * size,
    y: tip.y - unit.y * size,
  };
  const half = size * 0.52;
  return [
    tip,
    { x: base.x + normal.x * half, y: base.y + normal.y * half },
    { x: base.x - normal.x * half, y: base.y - normal.y * half },
  ];
}

export function runtimeDataAttributes(state?: MathVisualObjectRuntimeState) {
  return {
    "data-highlighted": state?.highlighted ? "true" : undefined,
    "data-dimmed": state?.dimmed ? "true" : undefined,
    "data-shaded": state?.shaded ? "true" : undefined,
    "data-emphasised": state?.emphasised ? "true" : undefined,
    "data-traced": state?.traced ? "true" : undefined,
    "data-revealed": state?.revealed ? "true" : undefined,
  };
}

export function PrimitivePatternDefs({
  visualId,
  objectId,
  stroke,
}: {
  visualId: string;
  objectId: string;
  stroke: string;
}) {
  const id = hatchPatternId(visualId, objectId);
  return (
    <defs>
      <pattern id={id} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="10" height="10" fill="#ffffff" />
        <line x1="0" y1="0" x2="0" y2="10" stroke={stroke} strokeWidth="3" opacity="0.55" />
      </pattern>
    </defs>
  );
}

export function resolvedFill(
  resolved: ResolvedPrimitiveStyle,
  visualId: string,
  objectId: string,
) {
  return resolved.fill === "hatched"
    ? `url(#${hatchPatternId(visualId, objectId)})`
    : resolved.fill;
}

export function PrimitiveAnnotation({
  text,
  anchor,
}: {
  text?: string | null;
  anchor: MathCoordinate;
}) {
  const value = String(text ?? "").trim();
  if (!value) return null;

  return (
    <g data-math-annotation="true" pointerEvents="none">
      <rect
        x={anchor.x - 6}
        y={anchor.y - 24}
        width={Math.max(44, value.length * 8.5 + 12)}
        height="28"
        rx="8"
        fill="#0f172a"
        opacity="0.92"
      />
      <text
        x={anchor.x}
        y={anchor.y - 5}
        fill="#ffffff"
        fontSize="14"
        fontWeight="700"
      >
        {value}
      </text>
    </g>
  );
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
