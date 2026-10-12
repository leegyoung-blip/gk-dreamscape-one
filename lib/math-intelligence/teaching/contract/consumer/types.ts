import type { TeachingContract, TeachingContractBuildDiagnostic } from "../types";

export const TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION =
  "4A-3-CONSUMER.1" as const;

export type TeachingContractConsumerSchemaVersion =
  typeof TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION;

export type TeachingContractConsumerKind =
  | "phase_4b_method_library"
  | "phase_4c_strategy_selector";

export type DeepReadonly<T> =
  T extends (...args: never[]) => unknown
    ? T
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : T extends object
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T;

/**
 * Consumer-safe view of a Teaching Contract.
 *
 * `internalValidation` is deliberately absent. Phase 4B/4C code must never
 * receive the canonical answer or answer-validation payload through the
 * ordinary pedagogy boundary.
 */
export type TeachingContractPedagogyPayload = Omit<
  TeachingContract,
  "internalValidation"
>;

export type TeachingContractConsumerEnvelope = {
  schemaVersion: TeachingContractConsumerSchemaVersion;
  contractSchemaVersion: "4A-3.1";
  consumer: TeachingContractConsumerKind;
  questionId: string;
  payloadFingerprint: string;
  contract: DeepReadonly<TeachingContractPedagogyPayload>;
};

export type TeachingContractConsumerBlockCode =
  | "RAW_PHASE_4A_INPUT_REJECTED"
  | "SOURCE_CONTRACT_BLOCKED"
  | "BUILD_RESULT_SHAPE_INVALID"
  | "UNSUPPORTED_BUILD_RESULT_SCHEMA"
  | "UNSUPPORTED_CONTRACT_SCHEMA"
  | "QUESTION_ID_MISMATCH"
  | "CONTRACT_INVALID"
  | "INTERNAL_VALIDATION_LEAK"
  | "CONSUMER_KIND_INVALID"
  | "CONSUMER_ENVELOPE_INVALID"
  | "CONSUMER_ENVELOPE_SCHEMA_INVALID"
  | "CONSUMER_ENVELOPE_KIND_MISMATCH";

export type TeachingContractConsumerBlocker = {
  code: TeachingContractConsumerBlockCode;
  message: string;
  path: string | null;
};

export type TeachingContractConsumerReadyResult = {
  status: "ready";
  schemaVersion: TeachingContractConsumerSchemaVersion;
  questionId: string;
  envelope: DeepReadonly<TeachingContractConsumerEnvelope>;
};

export type TeachingContractConsumerBlockedResult = {
  status: "blocked";
  schemaVersion: TeachingContractConsumerSchemaVersion;
  questionId: string | null;
  blockers: TeachingContractConsumerBlocker[];
  sourceBuildBlockers: TeachingContractBuildDiagnostic[];
};

export type TeachingContractConsumerResult =
  | TeachingContractConsumerReadyResult
  | TeachingContractConsumerBlockedResult;

export type TeachingContractConsumerEnvelopeValidationResult = {
  valid: boolean;
  blockers: TeachingContractConsumerBlocker[];
};
