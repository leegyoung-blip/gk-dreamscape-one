import type { TeachingMethodValidationIssueCode } from "../schema/types";
import type { Phase4BSourceManifestIssueCode } from "../sources/types";

export const PHASE4B2_QA_SCHEMA_VERSION = "4B-2-QA.1" as const;

export type Phase4B2NegativeProbeResult = {
  probeId: string;
  expectedCode: TeachingMethodValidationIssueCode;
  observedCodes: TeachingMethodValidationIssueCode[];
  passed: boolean;
};

export type Phase4B2SchemaGovernanceRun = {
  schemaVersion: typeof PHASE4B2_QA_SCHEMA_VERSION;
  methodSchemaVersion: "4B.1";
  taxonomySchemaVersion: "4B-1.1";
  sourceManifest: {
    sourceCount: number;
    issueCount: number;
    issueCodes: Phase4BSourceManifestIssueCode[];
  };
  validFixtures: {
    total: number;
    passed: number;
    failedMethodIds: string[];
  };
  negativeProbes: Phase4B2NegativeProbeResult[];
  checks: {
    sourceManifestValid: boolean;
    allValidFixturesPass: boolean;
    allNegativeProbesFailClosed: boolean;
    defineTeachingMethodDeepFreezes: boolean;
    taxonomyContainsNoGenericFallback: boolean;
    everyTaxonomyFamilyDeclaresProvenance: boolean;
    officialClaimsAreSourceBound: boolean;
    noLunaOrPersistenceEscapeHatch: boolean;
  };
  passed: boolean;
};
