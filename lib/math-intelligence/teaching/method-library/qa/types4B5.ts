export type Phase4B5CandidateProbeResult = {
  probeId: string;
  expectedMethodId: string;
  candidateMethodIds: string[];
  passed: boolean;
};

export type Phase4B5ThemeGap = {
  familyId: string;
  requiredTheme: string;
};

export type Phase4B5LibraryRun = {
  schemaVersion: "4B-5-QA.1";
  methodSchemaVersion: "4B.1";
  taxonomySchemaVersion: "4B-1.1";
  summary: {
    methods: number;
    activeMethods: number;
    familiesRequired: number;
    familiesRepresented: number;
    requiredThemes: number;
    coveredThemes: number;
    decimalMethods: number;
    decimalThemesRequired: number;
    decimalThemesCovered: number;
    invalidMethods: number;
    duplicateMethodIdsWithin4B5: number;
    duplicateMethodIdsAcross4B3To4B5: number;
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
  decimalCoverage: {
    methodIds: string[];
    requiredThemes: string[];
    coveredThemes: string[];
    missingThemes: string[];
  };
  invalidMethods: Array<{
    methodId: string;
    blockerCodes: string[];
  }>;
  themeGaps: Phase4B5ThemeGap[];
  duplicateMethodIdsAcrossLibraries: string[];
  candidateProbes: Phase4B5CandidateProbeResult[];
  checks: {
    every4B5FamilyHasProductionMethod: boolean;
    every4B5RequiredThemeCovered: boolean;
    decimalTeachingCoverageComplete: boolean;
    allMethodsValidate: boolean;
    allMethodIdsUniqueWithin4B5: boolean;
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
