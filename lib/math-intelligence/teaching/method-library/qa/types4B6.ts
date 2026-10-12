export type Phase4B6CandidateProbeResult = {
  probeId: string;
  expectedMethodId: string;
  candidateMethodIds: string[];
  passed: boolean;
};

export type Phase4B6ThemeGap = {
  familyId: string;
  requiredTheme: string;
};

export type Phase4B6LibraryRun = {
  schemaVersion: "4B-6-QA.1";
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
    duplicateMethodIdsWithin4B6: number;
    duplicateMethodIdsAcross4B3To4B6: number;
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
  themeGaps: Phase4B6ThemeGap[];
  duplicateMethodIdsAcrossLibraries: string[];
  candidateProbes: Phase4B6CandidateProbeResult[];
  checks: {
    every4B6FamilyHasProductionMethod: boolean;
    every4B6RequiredThemeCovered: boolean;
    allMethodsValidate: boolean;
    allMethodIdsUniqueWithin4B6: boolean;
    noMethodIdCollisionWithEarlierLibraries: boolean;
    variantsUniqueWithinFamily: boolean;
    allMethodsDeepFrozen: boolean;
    sourceManifestValid: boolean;
    allCandidateProbesPass: boolean;
    noGenericFallbackFamily: boolean;
    noLunaOrPersistenceEscapeHatch: boolean;
    allVisualEssentialMethodsDeclareVisuals: boolean;
  };
  passed: boolean;
};
