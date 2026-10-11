import type { TeachingContract } from "./types";

export type TeachingContractValidationSeverity = "blocking" | "warning";

export type TeachingContractValidationCode =
  | "SCHEMA_VERSION_INVALID"
  | "QUESTION_ID_MISSING"
  | "LEARNER_LEVEL_INVALID"
  | "DOMAIN_NOT_SPECIFIC"
  | "STRUCTURE_NOT_SPECIFIC"
  | "TARGET_MISSING"
  | "REASONING_NOT_SPECIFIC"
  | "INTERNAL_VALIDATION_AUDIENCE_INVALID"
  | "PROVENANCE_SCHEMA_INVALID"
  | "PROVENANCE_STATUS_INVALID"
  | "METHOD_SELECTION_FLAG_INVALID"
  | "LEARNER_CONTENT_ANSWER_LEAK"
  | "TEACHING_METHOD_PREMATURELY_PRESENT"
  | "MULTIPART_CONTENT_MISMATCH"
  | "MULTIPART_PART_KEY_DUPLICATE"
  | "MULTIPART_DEPENDENCY_INVALID"
  | "MULTIPART_DEPENDENCY_CYCLE"
  | "MULTIPART_PART_NOT_SPECIFIC"
  | "GENERATED_V2_SPEC_FLAG_MISMATCH";

export type TeachingContractValidationIssue = {
  severity: TeachingContractValidationSeverity;
  code: TeachingContractValidationCode;
  message: string;
  path: string | null;
};

export type TeachingContractValidationResult = {
  valid: boolean;
  issues: TeachingContractValidationIssue[];
  blockers: TeachingContractValidationIssue[];
  warnings: TeachingContractValidationIssue[];
};

const FORBIDDEN_LEARNER_KEYS = new Set([
  "answer",
  "answerkey",
  "answer_key",
  "correct",
  "iscorrect",
  "is_correct",
  "correctanswer",
  "correct_answer",
  "canonicalanswer",
  "canonical_answer",
  "acceptableanswers",
  "acceptable_answers",
  "expectedanswer",
  "expected_answer",
  "computedanswer",
  "computed_answer",
]);

const FORBIDDEN_METHOD_KEYS = new Set([
  "methodid",
  "method_id",
  "teachingmethod",
  "teaching_method",
  "teachingplan",
  "teaching_plan",
  "teachingsteps",
  "teaching_steps",
]);

function pushIssue(
  issues: TeachingContractValidationIssue[],
  issue: TeachingContractValidationIssue,
): void {
  if (
    issues.some(
      (existing) =>
        existing.code === issue.code &&
        existing.path === issue.path &&
        existing.message === issue.message,
    )
  ) {
    return;
  }

  issues.push(issue);
}

function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[-\s]/g, "_");
}

function walkObject(
  value: unknown,
  path: string,
  visitor: (key: string, child: unknown, childPath: string) => void,
): void {
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      const childPath = `${path}[${index}]`;
      walkObject(child, childPath, visitor);
    });
    return;
  }

  if (!value || typeof value !== "object") return;

  Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
    const childPath = path ? `${path}.${key}` : key;
    visitor(key, child, childPath);
    walkObject(child, childPath, visitor);
  });
}

function hasMultipartDependencyCycle(
  partKeys: string[],
  dependencies: TeachingContract["multipart"]["dependencies"],
): boolean {
  const graph = new Map<string, string[]>();
  partKeys.forEach((key) => graph.set(key, []));

  dependencies.forEach((dependency) => {
    const edges = graph.get(dependency.fromPartKey);
    if (edges) edges.push(dependency.dependsOnPartKey);
  });

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function visit(node: string): boolean {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const next of graph.get(node) ?? []) {
      if (visit(next)) return true;
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  }

  return partKeys.some((key) => visit(key));
}

export function stableStringify(value: unknown): string {
  function normalize(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(normalize);

    if (!input || typeof input !== "object") return input;

    return Object.keys(input as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize((input as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return JSON.stringify(normalize(value));
}

export function teachingContractFingerprint(contract: TeachingContract): string {
  const text = stableStringify(contract);
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function validateTeachingContract(
  contract: TeachingContract,
): TeachingContractValidationResult {
  const issues: TeachingContractValidationIssue[] = [];

  if (contract.schemaVersion !== "4A-3.1") {
    pushIssue(issues, {
      severity: "blocking",
      code: "SCHEMA_VERSION_INVALID",
      message: "Teaching Contract QA requires schema 4A-3.1.",
      path: "schemaVersion",
    });
  }

  if (!contract.identity.questionId.trim()) {
    pushIssue(issues, {
      severity: "blocking",
      code: "QUESTION_ID_MISSING",
      message: "A ready Teaching Contract must contain a stable question ID.",
      path: "identity.questionId",
    });
  }

  if (
    !Number.isInteger(contract.curriculum.learnerLevel) ||
    contract.curriculum.learnerLevel < 1 ||
    contract.curriculum.learnerLevel > 6
  ) {
    pushIssue(issues, {
      severity: "blocking",
      code: "LEARNER_LEVEL_INVALID",
      message: "Learner level must be Primary 1-6.",
      path: "curriculum.learnerLevel",
    });
  }

  if ((contract.mathematics.domain as string) === "unknown") {
    pushIssue(issues, {
      severity: "blocking",
      code: "DOMAIN_NOT_SPECIFIC",
      message: "A ready Teaching Contract may not contain an unknown domain.",
      path: "mathematics.domain",
    });
  }

  if ((contract.mathematics.problemStructure as string) === "unknown") {
    pushIssue(issues, {
      severity: "blocking",
      code: "STRUCTURE_NOT_SPECIFIC",
      message: "A ready Teaching Contract may not contain an unknown problem structure.",
      path: "mathematics.problemStructure",
    });
  }

  if (!contract.mathematics.target) {
    pushIssue(issues, {
      severity: "blocking",
      code: "TARGET_MISSING",
      message: "A ready Teaching Contract must contain a resolved mathematical target.",
      path: "mathematics.target",
    });
  }

  if (
    contract.mathematics.requiredReasoning.length === 0 ||
    contract.mathematics.requiredReasoning.some((reasoning) => (reasoning as string) === "unknown")
  ) {
    pushIssue(issues, {
      severity: "blocking",
      code: "REASONING_NOT_SPECIFIC",
      message: "Required reasoning must contain at least one specific reasoning family and no unknown values.",
      path: "mathematics.requiredReasoning",
    });
  }

  if (contract.internalValidation.audience !== "internal_only") {
    pushIssue(issues, {
      severity: "blocking",
      code: "INTERNAL_VALIDATION_AUDIENCE_INVALID",
      message: "Canonical answers must remain explicitly internal-only.",
      path: "internalValidation.audience",
    });
  }

  if (
    contract.provenance.canonicalSchemaVersion !== "4A-1.1" ||
    contract.provenance.understandingSchemaVersion !== "4A-2.4"
  ) {
    pushIssue(issues, {
      severity: "blocking",
      code: "PROVENANCE_SCHEMA_INVALID",
      message: "Teaching Contract provenance must point to canonical 4A-1.1 and understanding 4A-2.4.",
      path: "provenance",
    });
  }

  if (contract.provenance.understandingStatus !== "ready") {
    pushIssue(issues, {
      severity: "blocking",
      code: "PROVENANCE_STATUS_INVALID",
      message: "A Teaching Contract may only originate from a ready understanding.",
      path: "provenance.understandingStatus",
    });
  }

  if (contract.readyForMethodSelection !== true) {
    pushIssue(issues, {
      severity: "blocking",
      code: "METHOD_SELECTION_FLAG_INVALID",
      message: "A ready Teaching Contract must be explicitly approved for method selection.",
      path: "readyForMethodSelection",
    });
  }

  walkObject(contract.content, "content", (key, _child, childPath) => {
    const normalized = normalizeKey(key);
    const compact = normalized.replace(/_/g, "");

    if (
      FORBIDDEN_LEARNER_KEYS.has(normalized) ||
      FORBIDDEN_LEARNER_KEYS.has(compact)
    ) {
      pushIssue(issues, {
        severity: "blocking",
        code: "LEARNER_CONTENT_ANSWER_LEAK",
        message: `Learner-facing content contains forbidden answer-bearing key '${key}'.`,
        path: childPath,
      });
    }
  });

  walkObject(contract, "", (key, _child, childPath) => {
    const normalized = normalizeKey(key);
    const compact = normalized.replace(/_/g, "");

    if (
      FORBIDDEN_METHOD_KEYS.has(normalized) ||
      FORBIDDEN_METHOD_KEYS.has(compact)
    ) {
      pushIssue(issues, {
        severity: "blocking",
        code: "TEACHING_METHOD_PREMATURELY_PRESENT",
        message: `Phase 4A-3 must remain method-agnostic; found forbidden key '${key}'.`,
        path: childPath,
      });
    }
  });

  const contentPartKeys = contract.content.parts.map((part) => part.key);
  const contractPartKeys = contract.multipart.parts.map((part) => part.key);

  if (contract.multipart.hasParts) {
    const contentSet = new Set(contentPartKeys);
    const contractSet = new Set(contractPartKeys);

    if (
      contentPartKeys.length === 0 ||
      contractPartKeys.length === 0 ||
      contentSet.size !== contractSet.size ||
      [...contentSet].some((key) => !contractSet.has(key))
    ) {
      pushIssue(issues, {
        severity: "blocking",
        code: "MULTIPART_CONTENT_MISMATCH",
        message: "Multipart content keys and multipart teaching-understanding keys must match exactly.",
        path: "multipart",
      });
    }
  } else if (contract.multipart.parts.length > 0 || contract.multipart.dependencies.length > 0) {
    pushIssue(issues, {
      severity: "blocking",
      code: "MULTIPART_CONTENT_MISMATCH",
      message: "A non-multipart Teaching Contract may not contain multipart parts or dependencies.",
      path: "multipart",
    });
  }

  if (new Set(contractPartKeys).size !== contractPartKeys.length) {
    pushIssue(issues, {
      severity: "blocking",
      code: "MULTIPART_PART_KEY_DUPLICATE",
      message: "Multipart part keys must be unique.",
      path: "multipart.parts",
    });
  }

  const validPartKeys = new Set(contractPartKeys);
  contract.multipart.parts.forEach((part, index) => {
    if (
      (part.mathematics.domain as string) === "unknown" ||
      (part.mathematics.problemStructure as string) === "unknown" ||
      !part.mathematics.target ||
      part.mathematics.requiredReasoning.length === 0 ||
      part.mathematics.requiredReasoning.some((reasoning) => (reasoning as string) === "unknown")
    ) {
      pushIssue(issues, {
        severity: "blocking",
        code: "MULTIPART_PART_NOT_SPECIFIC",
        message: "Every multipart part must contain specific mathematics before method selection.",
        path: `multipart.parts[${index}].mathematics`,
      });
    }
  });

  contract.multipart.dependencies.forEach((dependency, index) => {
    if (
      !validPartKeys.has(dependency.fromPartKey) ||
      !validPartKeys.has(dependency.dependsOnPartKey) ||
      dependency.fromPartKey === dependency.dependsOnPartKey
    ) {
      pushIssue(issues, {
        severity: "blocking",
        code: "MULTIPART_DEPENDENCY_INVALID",
        message: "Multipart dependencies must reference two distinct existing part keys.",
        path: `multipart.dependencies[${index}]`,
      });
    }
  });

  if (
    contract.multipart.hasParts &&
    hasMultipartDependencyCycle(contractPartKeys, contract.multipart.dependencies)
  ) {
    pushIssue(issues, {
      severity: "blocking",
      code: "MULTIPART_DEPENDENCY_CYCLE",
      message: "Multipart teaching dependencies may not contain a cycle.",
      path: "multipart.dependencies",
    });
  }

  if (
    contract.visual.generatedV2 &&
    contract.visual.generatedV2.hasSpec !== (contract.visual.generatedV2.spec != null)
  ) {
    pushIssue(issues, {
      severity: "blocking",
      code: "GENERATED_V2_SPEC_FLAG_MISMATCH",
      message: "generatedV2.hasSpec must agree with whether a generated-V2 spec is actually present.",
      path: "visual.generatedV2",
    });
  }

  const blockers = issues.filter((issue) => issue.severity === "blocking");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    valid: blockers.length === 0,
    issues,
    blockers,
    warnings,
  };
}
