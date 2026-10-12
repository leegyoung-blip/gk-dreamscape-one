import { PHASE4B_METHOD_FAMILIES } from "../taxonomy/methodFamilyTaxonomy";
import { PHASE4B_SOURCE_MANIFEST } from "../sources/sourceManifest";
import { validatePhase4BSourceManifest } from "../sources/validateSourceGovernance";
import { defineTeachingMethod } from "../schema/defineTeachingMethod";
import { validateTeachingMethod } from "../schema/validateTeachingMethod";
import type {
  TeachingMethod,
  TeachingMethodValidationIssueCode,
} from "../schema/types";
import { PHASE4B2_VALID_METHOD_FIXTURES } from "./phase4B2Fixtures";
import {
  PHASE4B2_QA_SCHEMA_VERSION,
  type Phase4B2NegativeProbeResult,
  type Phase4B2SchemaGovernanceRun,
} from "./types4B2";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function runNegativeProbe(
  probeId: string,
  expectedCode: TeachingMethodValidationIssueCode,
  mutate: (method: any) => void,
): Phase4B2NegativeProbeResult {
  const candidate = clone(PHASE4B2_VALID_METHOD_FIXTURES[0]) as any;
  mutate(candidate);
  const validation = validateTeachingMethod(candidate as TeachingMethod);
  const observedCodes = validation.blockers.map((item) => item.code);
  return {
    probeId,
    expectedCode,
    observedCodes,
    passed: !validation.valid && observedCodes.includes(expectedCode),
  };
}

export function runPhase4B2SchemaGovernanceAudit(): Phase4B2SchemaGovernanceRun {
  const sourceIssues = validatePhase4BSourceManifest();
  const fixtureResults = PHASE4B2_VALID_METHOD_FIXTURES.map((method) => ({
    methodId: method.methodId,
    result: validateTeachingMethod(method),
  }));

  const negativeProbes: Phase4B2NegativeProbeResult[] = [
    runNegativeProbe("unsupported_schema", "UNSUPPORTED_SCHEMA_VERSION", (method) => {
      method.schemaVersion = "4B.0";
    }),
    runNegativeProbe("unknown_family", "UNKNOWN_METHOD_FAMILY", (method) => {
      method.familyId = "generic.explain_everything";
    }),
    runNegativeProbe("invalid_level", "INVALID_LEVEL", (method) => {
      method.applicability.levels = [7];
    }),
    runNegativeProbe("family_structure_mismatch", "FAMILY_STRUCTURE_MISMATCH", (method) => {
      method.applicability.structures = ["fraction_representation"];
      method.applicability.reasoning = ["fraction_representation"];
    }),
    runNegativeProbe("duplicate_stage", "DUPLICATE_STAGE_ID", (method) => {
      method.pedagogy.teachingSequence[1].stageId = method.pedagogy.teachingSequence[0].stageId;
    }),
    runNegativeProbe("representation_overlap", "REPRESENTATION_POLICY_OVERLAP", (method) => {
      method.pedagogy.representations.discouraged = [method.pedagogy.representations.preferred[0]];
    }),
    runNegativeProbe("unknown_source", "UNKNOWN_SOURCE_ID", (method) => {
      const claim = method.provenance.claims.find((item: any) => item.classification === "official_curriculum");
      claim.sourceId = "unknown-source";
    }),
    runNegativeProbe("source_class_mismatch", "SOURCE_CLASS_MISMATCH", (method) => {
      const claim = method.provenance.claims.find((item: any) => item.classification === "official_curriculum");
      claim.sourceId = "nie-singapore-primary-math-cpa";
    }),
    runNegativeProbe("claim_tag_not_allowed", "SOURCE_CLAIM_TAG_NOT_ALLOWED", (method) => {
      const claim = method.provenance.claims.find((item: any) => item.classification === "common_singapore_pedagogy");
      claim.sourceClaimTag = "problem_solving_heuristics";
    }),
    runNegativeProbe("dreamscape_claim_with_source", "DREAMSCAPE_CLAIM_HAS_EXTERNAL_SOURCE", (method) => {
      const claim = method.provenance.claims.find((item: any) => item.classification === "dreamscape_method");
      claim.sourceId = "moe-primary-math-syllabus-2021-updated-oct-2025";
      claim.sourceClaimTag = "curriculum_scope";
    }),
    runNegativeProbe("forbidden_answer_field", "FORBIDDEN_ANSWER_OR_RUNTIME_FIELD", (method) => {
      method.correctAnswer = 42;
    }),
    runNegativeProbe("invalid_governance", "GOVERNANCE_FLAGS_INVALID", (method) => {
      method.governance.lunaAllowed = true;
    }),
  ];

  let deepFreezePass = false;
  try {
    const frozen = defineTeachingMethod(clone(PHASE4B2_VALID_METHOD_FIXTURES[0]));
    deepFreezePass =
      Object.isFrozen(frozen) &&
      Object.isFrozen(frozen.pedagogy) &&
      Object.isFrozen(frozen.pedagogy.teachingSequence) &&
      Object.isFrozen(frozen.provenance.claims);
  } catch {
    deepFreezePass = false;
  }

  const checks = {
    sourceManifestValid: sourceIssues.length === 0,
    allValidFixturesPass: fixtureResults.every((item) => item.result.valid),
    allNegativeProbesFailClosed: negativeProbes.every((item) => item.passed),
    defineTeachingMethodDeepFreezes: deepFreezePass,
    taxonomyContainsNoGenericFallback: PHASE4B_METHOD_FAMILIES.every((family) => family.genericFallback === false),
    everyTaxonomyFamilyDeclaresProvenance: PHASE4B_METHOD_FAMILIES.every((family) => family.provenance.length > 0),
    officialClaimsAreSourceBound: PHASE4B2_VALID_METHOD_FIXTURES.every((method) =>
      method.provenance.claims
        .filter((claim) => claim.classification === "official_curriculum")
        .every((claim) => Boolean(claim.sourceId && claim.sourceClaimTag)),
    ),
    noLunaOrPersistenceEscapeHatch: PHASE4B2_VALID_METHOD_FIXTURES.every(
      (method) =>
        method.governance.lunaAllowed === false &&
        method.governance.persistence === "version_controlled_source" &&
        method.governance.deterministicOnly === true,
    ),
  };

  return {
    schemaVersion: PHASE4B2_QA_SCHEMA_VERSION,
    methodSchemaVersion: "4B.1",
    taxonomySchemaVersion: "4B-1.1",
    sourceManifest: {
      sourceCount: PHASE4B_SOURCE_MANIFEST.length,
      issueCount: sourceIssues.length,
      issueCodes: sourceIssues.map((item) => item.code),
    },
    validFixtures: {
      total: fixtureResults.length,
      passed: fixtureResults.filter((item) => item.result.valid).length,
      failedMethodIds: fixtureResults.filter((item) => !item.result.valid).map((item) => item.methodId),
    },
    negativeProbes,
    checks,
    passed: Object.values(checks).every(Boolean),
  };
}
