import type {
  AllocationBlock,
  FinancialBlockResponse,
  FinancialLearningBlock,
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
