export type OrbitPoint = {
  x: number;
  y: number;
};

export function polarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number,
): OrbitPoint {
  const radians = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  };
}

export function donutSegmentPath(
  centerX: number,
  centerY: number,
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const safeEnd = endAngle <= startAngle ? startAngle + 0.01 : endAngle;
  const outerStart = polarPoint(centerX, centerY, outerRadius, startAngle);
  const outerEnd = polarPoint(centerX, centerY, outerRadius, safeEnd);
  const innerEnd = polarPoint(centerX, centerY, innerRadius, safeEnd);
  const innerStart = polarPoint(centerX, centerY, innerRadius, startAngle);
  const largeArc = safeEnd - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function radialOffset(angleDegrees: number, distance: number) {
  const point = polarPoint(0, 0, distance, angleDegrees);
  return { x: point.x, y: point.y };
}

export function splitOrbitLabel(
  value: string,
  maxCharacters = 17,
  maxLines = 2,
) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharacters || current.length === 0) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length >= maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const consumed = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumed < words.length && lines.length > 0) {
    const lastIndex = Math.min(lines.length, maxLines) - 1;
    const last = lines[lastIndex] || "";
    lines[lastIndex] = `${last.slice(0, Math.max(1, maxCharacters - 1)).trim()}…`;
  }

  return lines.slice(0, maxLines);
}
