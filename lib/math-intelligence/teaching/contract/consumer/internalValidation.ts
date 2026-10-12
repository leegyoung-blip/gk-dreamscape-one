import type { TeachingContractBuildResult } from "../types";
import { teachingContractFingerprint } from "../validateTeachingContract";
import { inspectReadyTeachingContractBuildResult } from "./boundary";
import type { DeepReadonly } from "./types";

export const INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE =
  "internal_contract_validation" as const;

export type InternalTeachingContractValidationView = {
  purpose: typeof INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE;
  contractSchemaVersion: "4A-3.1";
  questionId: string;
  contractFingerprint: string;
  internalValidation: {
    audience: "internal_only";
    answer: import("../types").TeachingContractInternalValidation["answer"];
    answerValidation: import("../types").TeachingContractInternalValidation["answerValidation"];
  };
};

function cloneAndFreeze<T>(value: T): DeepReadonly<T> {
  function clone(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(clone);
    if (!input || typeof input !== "object") return input;
    return Object.fromEntries(
      Object.entries(input as Record<string, unknown>).map(([key, child]) => [
        key,
        clone(child),
      ]),
    );
  }

  function freeze(input: unknown): void {
    if (!input || typeof input !== "object") return;
    Object.values(input as Record<string, unknown>).forEach(freeze);
    Object.freeze(input);
  }

  const copied = clone(value) as T;
  freeze(copied);
  return copied as DeepReadonly<T>;
}

/**
 * Explicit answer-bearing validation access.
 *
 * This file is intentionally NOT re-exported from `consumer/index.ts` or the
 * main contract barrel. Internal validators must import this path directly,
 * making answer access an explicit architectural choice rather than something
 * ordinary Phase 4B/4C code receives by default.
 */
export function createInternalTeachingContractValidationView(
  result: TeachingContractBuildResult,
  request: {
    purpose: typeof INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE;
  },
):
  | { status: "ready"; view: DeepReadonly<InternalTeachingContractValidationView> }
  | { status: "blocked"; questionId: string | null; reasons: string[] } {
  if (request.purpose !== INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE) {
    return {
      status: "blocked",
      questionId: null,
      reasons: ["Internal answer access requires the explicit validation purpose."],
    };
  }

  const inspected = inspectReadyTeachingContractBuildResult(result);
  if (!inspected.ready) {
    return {
      status: "blocked",
      questionId: inspected.questionId,
      reasons: inspected.blockers.map((item) => `${item.code}: ${item.message}`),
    };
  }

  return {
    status: "ready",
    view: cloneAndFreeze({
      purpose: INTERNAL_TEACHING_CONTRACT_VALIDATION_PURPOSE,
      contractSchemaVersion: "4A-3.1",
      questionId: inspected.questionId,
      contractFingerprint: teachingContractFingerprint(inspected.contract),
      internalValidation: inspected.contract.internalValidation,
    }),
  };
}
