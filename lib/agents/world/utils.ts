import "server-only";

import type {
  WorldAdapterPayload,
  WorldObservationSourceKey,
} from "./types";

type SupabaseErrorLike = {
  message?: string | null;
};

type SupabaseResultLike<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

export type SafeQueryResult<T> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

export async function safeQuery<T>(
  label: string,
  query: PromiseLike<SupabaseResultLike<T>>,
): Promise<SafeQueryResult<T>> {
  try {
    const result = await query;

    if (result.error) {
      return {
        ok: false,
        data: result.data ?? null,
        error: `${label}: ${result.error.message || "Unknown Supabase error"}`,
      };
    }

    return {
      ok: true,
      data: result.data ?? null,
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: `${label}: ${
        error instanceof Error ? error.message : "Unknown query failure"
      }`,
    };
  }
}

export function rows<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

export function collectErrors(
  ...results: Array<SafeQueryResult<unknown>>
): string[] {
  return results
    .map((result) => result.error)
    .filter((value): value is string => Boolean(value));
}

export function buildPayload(args: {
  sourceKey: WorldObservationSourceKey;
  observedAt: string;
  requiredOk: boolean;
  errors: string[];
  data: Record<string, unknown>;
}): WorldAdapterPayload {
  return {
    sourceKey: args.sourceKey,
    schemaVersion: 1,
    observedAt: args.observedAt,
    available: args.requiredOk,
    partial: args.errors.length > 0,
    errors: args.errors,
    data: args.data,
  };
}

export function groupCount(
  values: Array<string | null | undefined>,
): Record<string, number> {
  const counts: Record<string, number> = {};

  for (const rawValue of values) {
    const value = String(rawValue || "unknown").trim() || "unknown";
    counts[value] = (counts[value] || 0) + 1;
  }

  return counts;
}

export function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
