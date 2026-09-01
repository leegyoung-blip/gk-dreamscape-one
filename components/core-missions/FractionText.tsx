import type { CSSProperties, ReactNode } from "react";

type FractionMatch = {
  start: number;
  end: number;
  numerator: string;
  denominator: string;
};

function findFractions(text: string): FractionMatch[] {
  const matches: FractionMatch[] = [];
  const pattern = /[-−]?\d+\s*\/\s*\d+/g;

  for (const match of text.matchAll(pattern)) {
    const raw = match[0];
    const start = match.index ?? 0;
    const end = start + raw.length;
    const before = start > 0 ? text[start - 1] : "";
    const after = end < text.length ? text[end] : "";

    // Do not transform dates, URLs, route-like strings, identifiers or the
    // second half of a decimal expression. Ordinary punctuation is allowed.
    if (before && /[A-Za-z0-9_/.]/.test(before)) continue;
    if (after && /[A-Za-z0-9_/]/.test(after)) continue;

    const slashIndex = raw.indexOf("/");
    if (slashIndex < 0) continue;

    const numerator = raw.slice(0, slashIndex).trim();
    const denominator = raw.slice(slashIndex + 1).trim();
    if (!numerator || !denominator) continue;

    matches.push({ start, end, numerator, denominator });
  }

  return matches;
}

export function hasRenderableFraction(text: string | null | undefined) {
  return findFractions(String(text ?? "")).length > 0;
}

export default function FractionText({
  text,
  style,
}: {
  text: string | number | null | undefined;
  style?: CSSProperties;
}) {
  const source = String(text ?? "");
  const fractions = findFractions(source);

  if (fractions.length === 0) {
    return <span style={style}>{source}</span>;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  fractions.forEach((fraction, index) => {
    if (fraction.start > cursor) {
      nodes.push(source.slice(cursor, fraction.start));
    }

    nodes.push(
      <span
        key={`fraction-${fraction.start}-${index}`}
        aria-label={`${fraction.numerator} over ${fraction.denominator}`}
        style={fractionShell}
      >
        <span style={fractionNumerator}>{fraction.numerator}</span>
        <span style={fractionDenominator}>{fraction.denominator}</span>
      </span>,
    );

    cursor = fraction.end;
  });

  if (cursor < source.length) {
    nodes.push(source.slice(cursor));
  }

  return (
    <span style={{ ...textShell, ...style }}>
      {nodes}
    </span>
  );
}

const textShell: CSSProperties = {
  whiteSpace: "pre-wrap",
};

const fractionShell: CSSProperties = {
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "stretch",
  justifyContent: "center",
  verticalAlign: "middle",
  minWidth: "1.15em",
  margin: "0 0.09em",
  lineHeight: 1,
  textAlign: "center",
  transform: "translateY(-0.03em)",
};

const fractionNumerator: CSSProperties = {
  display: "block",
  padding: "0 0.12em 0.07em",
  borderBottom: "1.5px solid currentColor",
  fontSize: "0.76em",
  lineHeight: 1,
};

const fractionDenominator: CSSProperties = {
  display: "block",
  padding: "0.07em 0.12em 0",
  fontSize: "0.76em",
  lineHeight: 1,
};
