import type {
  MathematicalDomain,
  TeachingTarget,
  TeachingTargetKind,
} from "../types";

import {
  lower,
  normalizeSpace,
} from "./text";

function lastQuestionClause(
  text: string,
): string | null {
  const normalized = normalizeSpace(text);

  const questionMatches =
    normalized.match(/[^.!?]*\?/g);

  if (
    questionMatches &&
    questionMatches.length > 0
  ) {
    return questionMatches[
      questionMatches.length - 1
    ].trim();
  }

  const command = normalized.match(
    /\b(?:find|calculate|work out|simplify|evaluate|determine|state|identify|write|express|convert|arrange|order|complete|fill|choose)\b.*$/i,
  );

  if (command?.[0]) {
    return command[0].trim();
  }

  if (/_{2,}|\bblank\b/i.test(normalized)) {
    return normalized;
  }

  return null;
}

function inferKind(
  clause: string,
  domain: MathematicalDomain,
): TeachingTargetKind {
  const t = lower(clause);

  if (
    /\bhow old\b/.test(t)
  ) {
    return "value";
  }

  if (
    /\bhow far\b|\bdistance\b/.test(t)
  ) {
    return domain === "speed_rate"
      ? "speed"
      : "measurement";
  }

  if (
    /\bwhich number\b|\bwhat number\b|\bnumber code\b/.test(t)
  ) {
    return "value";
  }

  if (
    /\barrange\b|\border\b|\bascending\b|\bincreasing order\b|\bdecreasing order\b/.test(t)
  ) {
    return "value";
  }

  if (
    /\bwhich result\b|\bwhich choice\b|\bwhich option\b|\bwhich direction\b|\bwhich piece\b|\bwhich lines?\b|\bwhich faces?\b/.test(t)
  ) {
    return "category";
  }

  if (
    /\bmissing number\b|\bunknown\b|\bvalue of\b.*(?:□|★|\bx\b|\by\b|\ba\b)/.test(
      t,
    )
  ) {
    return "unknown_value";
  }

  if (
    /\barea\b/.test(t)
  ) {
    return "area";
  }

  if (
    /\bperimeter\b/.test(t)
  ) {
    return "perimeter";
  }

  if (
    /\bangle\b|∠/.test(clause)
  ) {
    return "angle";
  }

  if (
    /\baverage\b|\bmean\b/.test(t)
  ) {
    return "average";
  }

  if (
    /\bspeed\b/.test(t)
  ) {
    return "speed";
  }

  if (
    /\bpercentage\b|\bpercent\b/.test(t)
  ) {
    return "percentage";
  }

  if (
    /\bratio\b/.test(t)
  ) {
    return "ratio";
  }

  if (
    /\bfraction\b/.test(t)
  ) {
    return "fraction";
  }

  if (
    /\bhow much\b/.test(t) &&
    domain === "money"
  ) {
    return "money";
  }

  if (
    /\bhow long\b|\blength\b|\bmass\b|\bcapacity\b|\bvolume\b|\bheight\b|\bweight\b/.test(
      t,
    )
  ) {
    return "measurement";
  }

  if (
    /\bwhat time\b|\bhow long\b.*\b(?:hour|minute)\b/.test(
      t,
    )
  ) {
    return "time";
  }

  if (
    /\bwhich solid\b/.test(t)
  ) {
    return "solid";
  }

  if (
    /\bwhich shape\b|\bwhat shape\b/.test(t)
  ) {
    return "shape";
  }

  if (
    /\bwhich statement\b|\bwhich of the following\b/.test(
      t,
    )
  ) {
    return "statement";
  }

  if (
    /\bwhich (?:object|item|category|group)\b/.test(
      t,
    )
  ) {
    return "category";
  }

  if (
    /\bproperty\b|\bproperties\b/.test(t)
  ) {
    return "property";
  }

  if (
    /\bhow many\b/.test(t)
  ) {
    return "count";
  }

  if (
    /\bsimplify\b|\bexpression\b/.test(t)
  ) {
    return "expression";
  }

  if (
    /\bwhat number\b|\bfind the number\b|\bcalculate\b|\bwhat is\b|\bfind\b|\bevaluate\b|\bwork out\b/.test(
      t,
    )
  ) {
    return "value";
  }

  if (
    domain === "data"
  ) {
    return "data_value";
  }

  if (
    domain === "money"
  ) {
    return "money";
  }

  if (
    domain === "measurement"
  ) {
    return "measurement";
  }

  if (
    domain === "fractions"
  ) {
    return "fraction";
  }

  if (
    domain === "percentage"
  ) {
    return "percentage";
  }

  if (
    domain === "ratio"
  ) {
    return "ratio";
  }

  if (
    domain === "geometry"
  ) {
    return "property";
  }

  if (
    domain === "time"
  ) {
    return "time";
  }

  if (
    domain === "average"
  ) {
    return "average";
  }

  if (
    [
      "whole_numbers",
      "arithmetic",
      "algebra",
      "patterns",
      "logic",
      "decimals",
    ].includes(domain)
  ) {
    return "value";
  }

  return "unknown";
}

export function extractTarget(
  text: string,
  domain: MathematicalDomain,
): TeachingTarget | null {
  const clause =
    lastQuestionClause(text);

  if (!clause) {
    const fallbackKind = inferKind(
      text,
      domain,
    );

    if (fallbackKind === "unknown") {
      return null;
    }

    return {
      kind: fallbackKind,
      label: normalizeSpace(text),
      quantityId: null,
      sourceText: normalizeSpace(text),
    };
  }

  return {
    kind: inferKind(
      clause,
      domain,
    ),
    label: clause
      .replace(/[?]+$/, "")
      .trim(),
    quantityId: null,
    sourceText: clause,
  };
}
