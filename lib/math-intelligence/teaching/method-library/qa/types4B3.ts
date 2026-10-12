
export type Phase4B3CandidateProbeResult = {
  probeId: string;
  expectedMethodId: string;
  candidateMethodIds: string[];
  passed: boolean;
};

export type Phase4B3ThemeGap = {
  familyId: string;
  requiredTheme: string;
};

export type Phase4B3LibraryRun = {
  schemaVersion: "4B-3-QA.1";
  methodSchemaVersion: "4B.1";
  taxonomySchemaVersion: "4B-1.1";
  summary: {
    methods: number;
    activeMethods: number;
    familiesRequired: number;
    familiesRepresented: number;
    requiredThemes: number;
    coveredThemes: number;
    invalidMethods: number;
    duplicateMethodIds: number;
    duplicateVariantsWithinFamily: number;
    sourceManifestIssues: number;
    candidateProbesPassed: number;
    candidateProbesTotal: number;
  };
  byFamily: Record<string, {
    methodCount: number;
    methodIds: string[];
    requiredThemes: string[];
    coveredThemes: string[];
    missingThemes: string[];
  }>;
  invalidMethods: Array<{
    methodId: string;
    blockerCodes: string[];
  }>;
  themeGaps: Phase4B3ThemeGap[];
  candidateProbes: Phase4B3CandidateProbeResult[];
  checks: {
    every4B3FamilyHasProductionMethod: boolean;
    every4B3RequiredThemeCovered: boolean;
    allMethodsValidate: boolean;
    allMethodIdsUnique: boolean;
    variantsUniqueWithinFamily: boolean;
    allMethodsDeepFrozen: boolean;
    sourceManifestValid: boolean;
    allCandidateProbesPass: boolean;
    noGenericFallbackFamily: boolean;
    noLunaOrPersistenceEscapeHatch: boolean;
  };
  passed: boolean;
};
