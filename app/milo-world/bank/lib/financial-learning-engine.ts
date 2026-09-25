import type {
  AllocationBlock,
  DecisionBlock,
  FinancialBlockResponse,
  FinancialCondition,
  FinancialLearningBlock,
  FinancialLessonDefinition,
  FinancialLessonResponseMap,
  FinancialLessonRuntime,
  FinancialLessonVariableMap,
  FinancialVariableEffect,
  NumberInputBlock,
  SortBlock,
} from "./financial-learning-engine-types";

export function isResponseComplete(
  block: FinancialLearningBlock,
  response: FinancialBlockResponse | undefined,
): boolean {
  if (block.type === "explain" || block.type === "scenario" || block.type === "comparison") {
    return true;
  }
  if (!response) return false;

  if (block.type === "allocation") {
    const values = response.value as Record<string, number>;
    const allocated = Object.values(values).reduce((sum, value) => sum + Number(value || 0), 0);
    return block.allowUnallocated ? allocated <= block.total : allocated === block.total;
  }

  if (block.type === "sort") {
    const values = response.value as Record<string, string>;
    return block.items.every((item) => Boolean(values[item.id]));
  }

  if (block.type === "number_input") {
    return typeof response.value === "number" && Number.isFinite(response.value);
  }

  if (block.type === "cashflow_timeline") {
    const values = response.value as Record<string, string>;
    return block.events.every((event) => Boolean(values[event.id]));
  }

  if (block.type === "inventory_simulator") {
    const values = response.value as Record<string, number>;
    return Number.isFinite(Number(values.orderQuantity)) && Number.isFinite(Number(values.demand));
  }

  if (block.type === "capacity_simulator") {
    const values = response.value as Record<string, number>;
    return Number.isFinite(Number(values.optionIndex));
  }

  if (block.type === "business_risk_map") {
    const values = response.value as Record<string, number>;
    return Number.isFinite(Number(values.totalSpend));
  }

  if (block.type === "business_strategy_simulator") {
    const values = response.value as Record<string, number>;
    return Number(values.completedStages ?? 0) >= block.stages.length;
  }

  return response.value !== undefined && response.value !== null && response.value !== "";
}

export function evaluateNumberInput(block: NumberInputBlock, value: number): boolean | undefined {
  if (typeof block.expectedValue === "number") return value === block.expectedValue;
  if (typeof block.acceptableMin === "number" || typeof block.acceptableMax === "number") {
    const min = block.acceptableMin ?? Number.NEGATIVE_INFINITY;
    const max = block.acceptableMax ?? Number.POSITIVE_INFINITY;
    return value >= min && value <= max;
  }
  return undefined;
}

export function evaluateSort(block: SortBlock, values: Record<string, string>): boolean | undefined {
  const keyed = block.items.filter((item) => item.correctGroupId);
  if (!keyed.length) return undefined;
  return keyed.every((item) => values[item.id] === item.correctGroupId);
}

export function normaliseAllocationDefaults(block: AllocationBlock): Record<string, number> {
  return Object.fromEntries(
    block.buckets.map((bucket) => [bucket.id, Math.max(bucket.min ?? 0, bucket.defaultValue ?? 0)]),
  );
}

export function createInitialVariables(lesson: FinancialLessonDefinition): FinancialLessonVariableMap {
  return Object.fromEntries((lesson.variables ?? []).map((item) => [item.key, item.initialValue]));
}

function applyEffect(
  variables: FinancialLessonVariableMap,
  effect: FinancialVariableEffect,
): FinancialLessonVariableMap {
  const current = Number(variables[effect.key] ?? 0);
  const next = { ...variables };

  switch (effect.operation) {
    case "set":
      next[effect.key] = effect.value;
      break;
    case "add":
      next[effect.key] = current + effect.value;
      break;
    case "subtract":
      next[effect.key] = current - effect.value;
      break;
    case "multiply":
      next[effect.key] = current * effect.value;
      break;
  }

  return next;
}

function selectedDecisionChoice(
  block: DecisionBlock,
  response: FinancialBlockResponse | undefined,
) {
  const selectedId = typeof response?.value === "string" ? response.value : null;
  return block.choices.find((choice) => choice.id === selectedId);
}

export function applyBlockEffects(
  block: FinancialLearningBlock,
  response: FinancialBlockResponse | undefined,
  variables: FinancialLessonVariableMap,
): FinancialLessonVariableMap {
  let next = { ...variables };

  for (const effect of block.effects ?? []) {
    next = applyEffect(next, effect);
  }

  if (block.type === "decision") {
    for (const effect of selectedDecisionChoice(block, response)?.effects ?? []) {
      next = applyEffect(next, effect);
    }
  }

  return next;
}

function valueAtPath(value: unknown, path?: string): unknown {
  if (!path) return value;
  return path.split(".").reduce<unknown>((current, segment) => {
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function compare(actual: unknown, condition: FinancialCondition): boolean {
  const expected = condition.value;
  switch (condition.operator) {
    case "exists":
      return actual !== undefined && actual !== null;
    case "eq":
      return actual === expected;
    case "neq":
      return actual !== expected;
    case "gt":
      return Number(actual) > Number(expected);
    case "gte":
      return Number(actual) >= Number(expected);
    case "lt":
      return Number(actual) < Number(expected);
    case "lte":
      return Number(actual) <= Number(expected);
    case "in":
      return Array.isArray(expected) && expected.includes(actual as never);
  }
}

export function conditionMatches(
  condition: FinancialCondition,
  responses: FinancialLessonResponseMap,
  variables: FinancialLessonVariableMap,
): boolean {
  if (condition.source === "variable") {
    return compare(variables[condition.key], condition);
  }

  const response = responses[condition.blockId];
  return compare(valueAtPath(response?.value, condition.path), condition);
}

export function resolveNextBlockId(
  lesson: FinancialLessonDefinition,
  block: FinancialLearningBlock,
  response: FinancialBlockResponse | undefined,
  responses: FinancialLessonResponseMap,
  variablesAfterCurrentBlock: FinancialLessonVariableMap,
): string | null {
  if (block.type === "decision") {
    const choiceNext = selectedDecisionChoice(block, response)?.nextBlockId;
    if (choiceNext) return validateTarget(lesson, choiceNext);
  }

  for (const rule of block.branchRules ?? []) {
    const match = rule.match ?? "all";
    const checks = rule.conditions.map((condition) =>
      conditionMatches(condition, responses, variablesAfterCurrentBlock),
    );
    const passed = match === "any" ? checks.some(Boolean) : checks.every(Boolean);
    if (passed) return validateTarget(lesson, rule.nextBlockId);
  }

  if (block.nextBlockId) return validateTarget(lesson, block.nextBlockId);

  const index = lesson.blocks.findIndex((item) => item.id === block.id);
  const sequential = index >= 0 ? lesson.blocks[index + 1]?.id : undefined;
  return sequential ?? null;
}

function validateTarget(lesson: FinancialLessonDefinition, blockId: string): string {
  if (!lesson.blocks.some((block) => block.id === blockId)) {
    throw new Error(`Lesson route points to missing block: ${blockId}`);
  }
  return blockId;
}

/**
 * Rebuilds state from the chosen route every time. This makes Back safe:
 * financial effects are never double-applied when a learner revisits a decision.
 */
export function deriveVariablesForPath(
  lesson: FinancialLessonDefinition,
  path: string[],
  responses: FinancialLessonResponseMap,
  includeLast = false,
): FinancialLessonVariableMap {
  let variables = createInitialVariables(lesson);
  const ids = includeLast ? path : path.slice(0, -1);

  for (const blockId of ids) {
    const block = lesson.blocks.find((item) => item.id === blockId);
    if (!block) continue;
    variables = applyBlockEffects(block, responses[blockId], variables);
  }
  return variables;
}

export function createLessonRuntime(lesson: FinancialLessonDefinition): FinancialLessonRuntime {
  const start = lesson.startBlockId ?? lesson.blocks[0]?.id;
  if (!start) throw new Error("Financial lesson has no blocks.");
  validateTarget(lesson, start);
  return {
    currentBlockId: start,
    path: [start],
    variables: createInitialVariables(lesson),
  };
}

export function formatFinancialVariable(
  value: number,
  options: { unit?: string; prefix?: string; decimals?: number },
): string {
  const formatted = value.toLocaleString("en-SG", {
    minimumFractionDigits: options.decimals ?? 0,
    maximumFractionDigits: options.decimals ?? 0,
  });
  return `${options.prefix ?? ""}${formatted}${options.unit ? ` ${options.unit}` : ""}`;
}
