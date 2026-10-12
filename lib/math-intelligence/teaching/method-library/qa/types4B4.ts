export type Phase4B4CandidateProbeResult = {
  probeId: string;
  expectedMethodId: string;
  candidateMethodIds: string[];
  passed: boolean;
};

export type Phase4B4ThemeGap = {
  familyId: string;
  requiredTheme: string;
};

export type Phase4B4LibraryRun = {
  schemaVersion: "4B-4-QA.1";
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
    duplicateMethodIdsWithin4B4: number;
    duplicateMethodIdsAcross4B3And4B4: number;
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
  themeGaps: Phase4B4ThemeGap[];
  duplicateMethodIdsAcrossLibraries: string[];
  candidateProbes: Phase4B4CandidateProbeResult[];
  checks: {
    every4B4FamilyHasProductionMethod: boolean;
    every4B4RequiredThemeCovered: boolean;
    allMethodsValidate: boolean;
    allMethodIdsUniqueWithin4B4: boolean;
    noMethodIdCollisionWith4B3: boolean;
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
