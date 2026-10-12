import type {
  TeachingContract,
  TeachingContractBuildDiagnostic,
  TeachingContractBuildResult,
} from "../types";
import {
  stableStringify,
  validateTeachingContract,
} from "../validateTeachingContract";
import {
  TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION,
  type DeepReadonly,
  type TeachingContractConsumerBlocker,
  type TeachingContractConsumerEnvelope,
  type TeachingContractConsumerEnvelopeValidationResult,
  type TeachingContractConsumerKind,
  type TeachingContractConsumerResult,
  type TeachingContractPedagogyPayload,
} from "./types";

const ALLOWED_CONSUMERS = new Set<TeachingContractConsumerKind>([
  "phase_4b_method_library",
  "phase_4c_strategy_selector",
]);

const PREMATURE_METHOD_KEYS = new Set([
  "methodid",
  "method_id",
  "teachingmethod",
  "teaching_method",
  "teachingplan",
  "teaching_plan",
  "teachingsteps",
  "teaching_steps",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[-\s]/g, "_");
}

function cloneJsonLike<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => cloneJsonLike(item)) as T;
  }

  if (!value || typeof value !== "object") return value;

  const output: Record<string, unknown> = {};
  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    output[key] = cloneJsonLike(child);
  });
  return output as T;
}

function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (!value || typeof value !== "object") return value as DeepReadonly<T>;

  if (Array.isArray(value)) {
    value.forEach((item) => deepFreeze(item));
    return Object.freeze(value) as DeepReadonly<T>;
  }

  Object.values(value as Record<string, unknown>).forEach((child) =>
    deepFreeze(child),
  );
  return Object.freeze(value) as DeepReadonly<T>;
}

function fnv1a32(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function addBlocker(
  blockers: TeachingContractConsumerBlocker[],
  blocker: TeachingContractConsumerBlocker,
): void {
  if (
    blockers.some(
      (item) => item.code === blocker.code && item.path === blocker.path,
    )
  ) {
    return;
  }
  blockers.push(blocker);
}

function blocked(
  questionId: string | null,
  blockers: TeachingContractConsumerBlocker[],
  sourceBuildBlockers: TeachingContractBuildDiagnostic[] = [],
): TeachingContractConsumerResult {
  return {
    status: "blocked",
    schemaVersion: TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION,
    questionId,
    blockers,
    sourceBuildBlockers: sourceBuildBlockers.map((item) => ({ ...item })),
  };
}

function findForbiddenConsumerField(
  value: unknown,
  path = "contract",
): TeachingContractConsumerBlocker | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenConsumerField(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    const normalized = normalizeKey(key);
    const compact = normalized.replace(/_/g, "");

    if (normalized === "internal_validation" || compact === "internalvalidation") {
      return {
        code: "INTERNAL_VALIDATION_LEAK",
        message:
          "The pedagogy consumer boundary may not expose internalValidation or canonical-answer data.",
        path: childPath,
      };
    }

    if (
      PREMATURE_METHOD_KEYS.has(normalized) ||
      PREMATURE_METHOD_KEYS.has(compact)
    ) {
      return {
        code: "CONSUMER_ENVELOPE_INVALID",
        message:
          "Phase 4A-3 consumer exports must remain method-agnostic; a teaching-method field was found prematurely.",
        path: childPath,
      };
    }

    const nested = findForbiddenConsumerField(child, childPath);
    if (nested) return nested;
  }

  return null;
}

function isConsumerKind(value: unknown): value is TeachingContractConsumerKind {
  return (
    typeof value === "string" &&
    ALLOWED_CONSUMERS.has(value as TeachingContractConsumerKind)
  );
}

/**
 * Runtime inspection shared by the public pedagogy boundary and the explicit
 * internal-validation entry point. This function is intentionally not
 * re-exported from the consumer barrel.
 */
export function inspectReadyTeachingContractBuildResult(
  input: unknown,
):
  | { ready: true; contract: TeachingContract; questionId: string }
  | {
      ready: false;
      questionId: string | null;
      blockers: TeachingContractConsumerBlocker[];
      sourceBuildBlockers: TeachingContractBuildDiagnostic[];
    } {
  if (!isRecord(input)) {
    return {
      ready: false,
      questionId: null,
      blockers: [
        {
          code: "BUILD_RESULT_SHAPE_INVALID",
          message:
            "Downstream teaching code must receive a Phase 4A-3 TeachingContractBuildResult, not a raw object.",
          path: null,
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  const apparentSchema = input.schemaVersion;
  if (apparentSchema === "4A-1.1" || apparentSchema === "4A-2.4") {
    return {
      ready: false,
      questionId:
        typeof input.questionId === "string" ? input.questionId : null,
      blockers: [
        {
          code: "RAW_PHASE_4A_INPUT_REJECTED",
          message:
            "Phase 4B/4C may not consume raw Phase 4A-1 canonical inputs or Phase 4A-2 understandings. Build a 4A-3.1 Teaching Contract first.",
          path: "schemaVersion",
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  if (input.status === "blocked") {
    const sourceBlockers = Array.isArray(input.blockers)
      ? (input.blockers as TeachingContractBuildDiagnostic[])
      : [];
    return {
      ready: false,
      questionId: typeof input.questionId === "string" ? input.questionId : null,
      blockers: [
        {
          code: "SOURCE_CONTRACT_BLOCKED",
          message:
            "The Phase 4A-3 builder blocked this question. A blocked result cannot be coerced into a pedagogy consumer contract.",
          path: "status",
        },
      ],
      sourceBuildBlockers: sourceBlockers,
    };
  }

  if (input.status !== "ready" || !isRecord(input.contract)) {
    return {
      ready: false,
      questionId: typeof input.questionId === "string" ? input.questionId : null,
      blockers: [
        {
          code: "BUILD_RESULT_SHAPE_INVALID",
          message:
            "Expected a ready Phase 4A-3 TeachingContractBuildResult with a contract payload.",
          path: "status",
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  if (input.schemaVersion !== "4A-3.1") {
    return {
      ready: false,
      questionId: typeof input.questionId === "string" ? input.questionId : null,
      blockers: [
        {
          code: "UNSUPPORTED_BUILD_RESULT_SCHEMA",
          message:
            "The consumer boundary supports Teaching Contract build-result schema 4A-3.1 only.",
          path: "schemaVersion",
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  const contract = input.contract as unknown as TeachingContract;
  if (contract.schemaVersion !== "4A-3.1") {
    return {
      ready: false,
      questionId: typeof input.questionId === "string" ? input.questionId : null,
      blockers: [
        {
          code: "UNSUPPORTED_CONTRACT_SCHEMA",
          message:
            "The consumer boundary supports Teaching Contract schema 4A-3.1 only.",
          path: "contract.schemaVersion",
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  const questionId = typeof input.questionId === "string" ? input.questionId : null;
  if (!questionId || questionId !== contract.identity?.questionId) {
    return {
      ready: false,
      questionId,
      blockers: [
        {
          code: "QUESTION_ID_MISMATCH",
          message:
            "The build-result question ID must match the Teaching Contract identity question ID.",
          path: "questionId",
        },
      ],
      sourceBuildBlockers: [],
    };
  }

  const validation = validateTeachingContract(contract);
  if (!validation.valid) {
    return {
      ready: false,
      questionId,
      blockers: validation.blockers.map((issue) => ({
        code: "CONTRACT_INVALID" as const,
        message: `${issue.code}: ${issue.message}`,
        path: issue.path,
      })),
      sourceBuildBlockers: [],
    };
  }

  return { ready: true, contract, questionId };
}

/**
 * Creates the ONLY ordinary downstream view intended for Phase 4B and 4C.
 *
 * The function accepts a TeachingContractBuildResult at compile time and also
 * fails closed at runtime if callers attempt to pass raw 4A-1/4A-2 data,
 * unsupported schemas, invalid contracts, or blocked build results.
 */
export function createTeachingContractConsumerEnvelope(
  result: TeachingContractBuildResult,
  consumer: TeachingContractConsumerKind,
): TeachingContractConsumerResult {
  if (!isConsumerKind(consumer)) {
    return blocked(null, [
      {
        code: "CONSUMER_KIND_INVALID",
        message:
          "Only the locked Phase 4B method-library and Phase 4C strategy-selector consumers are allowed at this boundary.",
        path: "consumer",
      },
    ]);
  }

  const inspected = inspectReadyTeachingContractBuildResult(result);
  if (!inspected.ready) {
    return blocked(
      inspected.questionId,
      inspected.blockers,
      inspected.sourceBuildBlockers,
    );
  }

  const { internalValidation: _internalValidation, ...pedagogyPayload } =
    inspected.contract;

  const copiedPayload = cloneJsonLike(
    pedagogyPayload,
  ) as TeachingContractPedagogyPayload;

  const forbidden = findForbiddenConsumerField(copiedPayload);
  if (forbidden) {
    return blocked(inspected.questionId, [forbidden]);
  }

  const payloadFingerprint = fnv1a32(
    stableStringify({ consumer, contract: copiedPayload }),
  );

  const envelope: TeachingContractConsumerEnvelope = {
    schemaVersion: TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION,
    contractSchemaVersion: "4A-3.1",
    consumer,
    questionId: inspected.questionId,
    payloadFingerprint,
    contract: copiedPayload,
  };

  return {
    status: "ready",
    schemaVersion: TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION,
    questionId: inspected.questionId,
    envelope: deepFreeze(envelope),
  };
}

export function createPhase4BMethodLibraryContractView(
  result: TeachingContractBuildResult,
): TeachingContractConsumerResult {
  return createTeachingContractConsumerEnvelope(
    result,
    "phase_4b_method_library",
  );
}

export function createPhase4CStrategySelectorContractView(
  result: TeachingContractBuildResult,
): TeachingContractConsumerResult {
  return createTeachingContractConsumerEnvelope(
    result,
    "phase_4c_strategy_selector",
  );
}

export function serializeTeachingContractConsumerEnvelope(
  envelope: TeachingContractConsumerEnvelope,
): string {
  return stableStringify(envelope);
}

export function validateTeachingContractConsumerEnvelope(
  value: unknown,
  expectedConsumer?: TeachingContractConsumerKind,
): TeachingContractConsumerEnvelopeValidationResult {
  const blockers: TeachingContractConsumerBlocker[] = [];

  if (!isRecord(value)) {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_INVALID",
      message: "Consumer export must be a JSON object.",
      path: null,
    });
    return { valid: false, blockers };
  }

  if (value.schemaVersion !== TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION) {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_SCHEMA_INVALID",
      message:
        "Consumer export must use schema 4A-3-CONSUMER.1.",
      path: "schemaVersion",
    });
  }

  if (value.contractSchemaVersion !== "4A-3.1") {
    addBlocker(blockers, {
      code: "UNSUPPORTED_CONTRACT_SCHEMA",
      message: "Consumer export must reference Teaching Contract 4A-3.1.",
      path: "contractSchemaVersion",
    });
  }

  if (!isConsumerKind(value.consumer)) {
    addBlocker(blockers, {
      code: "CONSUMER_KIND_INVALID",
      message: "Consumer export contains an unsupported consumer kind.",
      path: "consumer",
    });
  } else if (expectedConsumer && value.consumer !== expectedConsumer) {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_KIND_MISMATCH",
      message: `Expected consumer '${expectedConsumer}' but received '${value.consumer}'.`,
      path: "consumer",
    });
  }

  if (typeof value.questionId !== "string" || value.questionId.trim() === "") {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_INVALID",
      message: "Consumer export requires a stable question ID.",
      path: "questionId",
    });
  }

  if (!isRecord(value.contract)) {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_INVALID",
      message: "Consumer export requires a contract payload.",
      path: "contract",
    });
  } else {
    if (value.contract.schemaVersion !== "4A-3.1") {
      addBlocker(blockers, {
        code: "UNSUPPORTED_CONTRACT_SCHEMA",
        message: "Consumer payload must use Teaching Contract schema 4A-3.1.",
        path: "contract.schemaVersion",
      });
    }

    const identity = value.contract.identity;
    const contractQuestionId =
      isRecord(identity) && typeof identity.questionId === "string"
        ? identity.questionId
        : null;

    if (
      typeof value.questionId === "string" &&
      contractQuestionId !== value.questionId
    ) {
      addBlocker(blockers, {
        code: "QUESTION_ID_MISMATCH",
        message:
          "Consumer envelope question ID must match the contract payload identity.",
        path: "questionId",
      });
    }

    if (value.contract.readyForMethodSelection !== true) {
      addBlocker(blockers, {
        code: "CONSUMER_ENVELOPE_INVALID",
        message:
          "A pedagogy consumer payload must remain approved for method selection.",
        path: "contract.readyForMethodSelection",
      });
    }

    const forbidden = findForbiddenConsumerField(value.contract);
    if (forbidden) addBlocker(blockers, forbidden);
  }

  if (
    typeof value.payloadFingerprint !== "string" ||
    !/^fnv1a32:[0-9a-f]{8}$/.test(value.payloadFingerprint)
  ) {
    addBlocker(blockers, {
      code: "CONSUMER_ENVELOPE_INVALID",
      message: "Consumer export payload fingerprint is missing or invalid.",
      path: "payloadFingerprint",
    });
  } else if (
    isConsumerKind(value.consumer) &&
    isRecord(value.contract)
  ) {
    const expectedFingerprint = fnv1a32(
      stableStringify({ consumer: value.consumer, contract: value.contract }),
    );
    if (expectedFingerprint !== value.payloadFingerprint) {
      addBlocker(blockers, {
        code: "CONSUMER_ENVELOPE_INVALID",
        message:
          "Consumer export payload fingerprint does not match the serialized payload.",
        path: "payloadFingerprint",
      });
    }
  }

  return { valid: blockers.length === 0, blockers };
}

export function parseTeachingContractConsumerExport(
  serialized: string,
  expectedConsumer?: TeachingContractConsumerKind,
): TeachingContractConsumerResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch {
    return blocked(null, [
      {
        code: "CONSUMER_ENVELOPE_INVALID",
        message: "Consumer export is not valid JSON.",
        path: null,
      },
    ]);
  }

  const validation = validateTeachingContractConsumerEnvelope(
    parsed,
    expectedConsumer,
  );
  if (!validation.valid || !isRecord(parsed) || !isRecord(parsed.contract)) {
    return blocked(
      isRecord(parsed) && typeof parsed.questionId === "string"
        ? parsed.questionId
        : null,
      validation.blockers,
    );
  }

  const copied = cloneJsonLike(parsed) as TeachingContractConsumerEnvelope;
  return {
    status: "ready",
    schemaVersion: TEACHING_CONTRACT_CONSUMER_SCHEMA_VERSION,
    questionId: copied.questionId,
    envelope: deepFreeze(copied),
  };
}
