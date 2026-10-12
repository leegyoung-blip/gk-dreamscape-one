import {
  getPhase4BReasoningCoverageRule,
  getPhase4BStructureCoverageRule,
  isKnownPhase4BMethodFamilyId,
} from "../taxonomy/methodFamilyTaxonomy";
import { getPhase4BSourceRecord } from "../sources/sourceManifest";
import {
  PHASE4B_METHOD_SCHEMA_VERSION,
  type TeachingMethod,
  type TeachingMethodValidationIssue,
  type TeachingMethodValidationResult,
} from "./types";

const METHOD_ID_RE = /^[a-z][a-z0-9]*(?:\.[a-z0-9][a-z0-9_-]*){2,}$/;
const VARIANT_ID_RE = /^[a-z][a-z0-9_-]*$/;
const VALID_LEVELS = new Set([1, 2, 3, 4, 5, 6]);
const FORBIDDEN_KEYS = new Set([
  "questionId",
  "question_id",
  "canonicalAnswer",
  "correctAnswer",
  "answer",
  "answerKey",
  "isCorrect",
  "diagramCoordinates",
  "runtimeReveal",
  "revealAnswer",
  "teachingPlan",
  "lunaOutput",
  "openaiOutput",
]);

function issue(
  code: TeachingMethodValidationIssue["code"],
  message: string,
  path: string | null,
  severity: TeachingMethodValidationIssue["severity"] = "blocker",
): TeachingMethodValidationIssue {
  return { code, message, path, severity };
}

function hasForbiddenKey(value: unknown, path = "method"): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = hasForbiddenKey(value[index], `${path}[${index}]`);
      if (found) return found;
    }
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key)) return `${path}.${key}`;
    const found = hasForbiddenKey(child, `${path}.${key}`);
    if (found) return found;
  }
  return null;
}

function overlaps<T>(left: readonly T[], right: readonly T[]): boolean {
  const set = new Set(left);
  return right.some((item) => set.has(item));
}

export function validateTeachingMethod(
  method: TeachingMethod,
): TeachingMethodValidationResult {
  const issues: TeachingMethodValidationIssue[] = [];

  if (method.schemaVersion !== PHASE4B_METHOD_SCHEMA_VERSION) {
    issues.push(issue("UNSUPPORTED_SCHEMA_VERSION", `Expected ${PHASE4B_METHOD_SCHEMA_VERSION}.`, "schemaVersion"));
  }
  if (!METHOD_ID_RE.test(method.methodId)) {
    issues.push(issue("INVALID_METHOD_ID", "methodId must be a stable namespaced identifier with at least three dot-separated segments.", "methodId"));
  }
  if (!VARIANT_ID_RE.test(method.variantId)) {
    issues.push(issue("INVALID_VARIANT_ID", "variantId must be a stable lowercase slug.", "variantId"));
  }
  if (!isKnownPhase4BMethodFamilyId(String(method.familyId))) {
    issues.push(issue("UNKNOWN_METHOD_FAMILY", `Unknown method family: ${String(method.familyId)}`, "familyId"));
  }
  if (!method.title.trim()) issues.push(issue("MISSING_TITLE", "Method title is required.", "title"));
  if (!method.summary.trim()) issues.push(issue("MISSING_SUMMARY", "Method summary is required.", "summary"));

  if (method.applicability.levels.length === 0) {
    issues.push(issue("NO_LEVELS", "At least one learner level is required.", "applicability.levels"));
  }
  for (const level of method.applicability.levels) {
    if (!VALID_LEVELS.has(level)) {
      issues.push(issue("INVALID_LEVEL", `Unsupported primary level: ${String(level)}`, "applicability.levels"));
    }
  }
  if (method.applicability.domains.length === 0) issues.push(issue("NO_DOMAINS", "At least one mathematical domain is required.", "applicability.domains"));
  if (method.applicability.structures.length === 0) issues.push(issue("NO_STRUCTURES", "At least one specific problem structure is required.", "applicability.structures"));
  if (method.applicability.reasoning.length === 0) issues.push(issue("NO_REASONING", "At least one specific reasoning family is required.", "applicability.reasoning"));

  if (isKnownPhase4BMethodFamilyId(String(method.familyId))) {
    const structureSupportsFamily = method.applicability.structures.some((structure) => {
      const rule = getPhase4BStructureCoverageRule(structure);
      return Boolean(rule && [...rule.primaryFamilies, ...rule.supportingFamilies].includes(method.familyId));
    });
    const reasoningSupportsFamily = method.applicability.reasoning.some((reasoning) => {
      const rule = getPhase4BReasoningCoverageRule(reasoning);
      return Boolean(rule && rule.supportingFamilies.includes(method.familyId));
    });

    // 4B-1 mappings are candidate-coverage rules, not exclusive semantic labels.
    // A representation/model method can legitimately support arithmetic reasoning
    // even when the arithmetic family is listed as the reasoning coverage family.
    // We therefore require the method family to be anchored by at least one
    // declared structure or reasoning value, rather than forcing every declared
    // reasoning value to point back to the same family.
    if (!structureSupportsFamily && !reasoningSupportsFamily) {
      issues.push(issue(
        "FAMILY_STRUCTURE_MISMATCH",
        `${method.familyId} is not anchored by any declared structure or reasoning value in the locked 4B-1 taxonomy.`,
        "applicability",
      ));
    }
  }

  if (!method.pedagogy.learningObjectivePattern.trim()) {
    issues.push(issue("MISSING_LEARNING_OBJECTIVE", "A reusable learning-objective pattern is required.", "pedagogy.learningObjectivePattern"));
  }
  if (method.pedagogy.teachingSequence.length === 0) {
    issues.push(issue("NO_TEACHING_SEQUENCE", "At least one teaching-sequence stage is required.", "pedagogy.teachingSequence"));
  }
  const stageIds = new Set<string>();
  for (const stage of method.pedagogy.teachingSequence) {
    if (stageIds.has(stage.stageId)) {
      issues.push(issue("DUPLICATE_STAGE_ID", `Duplicate teaching stageId: ${stage.stageId}`, "pedagogy.teachingSequence"));
    }
    stageIds.add(stage.stageId);
  }

  const reps = method.pedagogy.representations;
  if (
    overlaps(reps.preferred, reps.discouraged) ||
    overlaps(reps.allowed, reps.discouraged)
  ) {
    issues.push(issue(
      "REPRESENTATION_POLICY_OVERLAP",
      "A representation cannot be both allowed/preferred and discouraged.",
      "pedagogy.representations",
    ));
  }

  const misconceptionIds = new Set<string>();
  for (const misconception of method.misconceptions) {
    if (misconceptionIds.has(misconception.misconceptionId)) {
      issues.push(issue("DUPLICATE_MISCONCEPTION_ID", `Duplicate misconceptionId: ${misconception.misconceptionId}`, "misconceptions"));
    }
    misconceptionIds.add(misconception.misconceptionId);
  }

  if (method.provenance.classifications.length === 0) {
    issues.push(issue("MISSING_PROVENANCE", "At least one provenance classification is required.", "provenance.classifications"));
  }
  if (method.provenance.claims.length === 0) {
    issues.push(issue("MISSING_PROVENANCE_CLAIM", "At least one provenance claim is required.", "provenance.claims"));
  }

  for (const claim of method.provenance.claims) {
    if (claim.classification === "dreamscape_method") {
      if (claim.sourceId !== null || claim.sourceClaimTag !== null) {
        issues.push(issue(
          "DREAMSCAPE_CLAIM_HAS_EXTERNAL_SOURCE",
          "dreamscape_method claims must identify themselves as Dreamscape design rather than borrowing an external source classification.",
          "provenance.claims",
        ));
      }
      continue;
    }

    if (!claim.sourceId || !claim.sourceClaimTag) {
      issues.push(issue(
        "EXTERNAL_CLASS_WITHOUT_SOURCE",
        `${claim.classification} claims require a sourceId and sourceClaimTag.`,
        "provenance.claims",
      ));
      continue;
    }

    const source = getPhase4BSourceRecord(claim.sourceId);
    if (!source) {
      issues.push(issue("UNKNOWN_SOURCE_ID", `Unknown provenance source: ${claim.sourceId}`, "provenance.claims"));
      continue;
    }
    if (source.sourceClass !== claim.classification) {
      issues.push(issue(
        "SOURCE_CLASS_MISMATCH",
        `Source ${claim.sourceId} is classified ${source.sourceClass}, not ${claim.classification}.`,
        "provenance.claims",
      ));
    }
    if (!source.allowedClaimTags.includes(claim.sourceClaimTag)) {
      issues.push(issue(
        "SOURCE_CLAIM_TAG_NOT_ALLOWED",
        `Source ${claim.sourceId} does not support claim tag ${claim.sourceClaimTag}.`,
        "provenance.claims",
      ));
    }
  }

  for (const classification of method.provenance.classifications) {
    if (!method.provenance.claims.some((claim) => claim.classification === classification)) {
      issues.push(issue(
        "CLASSIFICATION_NOT_EVIDENCED",
        `Provenance classification ${classification} has no matching provenance claim.`,
        "provenance.classifications",
      ));
    }
  }

  const forbiddenPath = hasForbiddenKey(method);
  if (forbiddenPath) {
    issues.push(issue(
      "FORBIDDEN_ANSWER_OR_RUNTIME_FIELD",
      `Teaching methods are question-, answer- and runtime-agnostic. Forbidden field found at ${forbiddenPath}.`,
      forbiddenPath,
    ));
  }

  const governance = method.governance;
  if (
    governance.deterministicOnly !== true ||
    governance.questionAgnostic !== true ||
    governance.answerAgnostic !== true ||
    governance.runtimeAgnostic !== true ||
    governance.lunaAllowed !== false ||
    governance.persistence !== "version_controlled_source"
  ) {
    issues.push(issue("GOVERNANCE_FLAGS_INVALID", "4B methods must remain deterministic, question/answer/runtime agnostic, Luna-free and version-controlled.", "governance"));
  }

  if (
    method.visualGuidance.visualUse === "never" &&
    method.visualGuidance.preferredVisualTypes.length > 0
  ) {
    issues.push(issue("VISUAL_POLICY_INCONSISTENT", "A method with visualUse='never' cannot declare preferred visual types.", "visualGuidance"));
  }
  if (
    method.visualGuidance.originalDiagramPolicy === "required" &&
    method.visualGuidance.visualUse === "never"
  ) {
    issues.push(issue("VISUAL_POLICY_INCONSISTENT", "A required original diagram is incompatible with visualUse='never'.", "visualGuidance"));
  }

  const blockers = issues.filter((item) => item.severity === "blocker");
  const warnings = issues.filter((item) => item.severity === "warning");
  return { valid: blockers.length === 0, blockers, warnings };
}
