import type { MethodProvenanceClass } from "../taxonomy/types";

export type Phase4BSourceClaimTag =
  | "curriculum_scope"
  | "curriculum_learning_experience"
  | "cpa_guidance"
  | "learning_phases"
  | "problem_solving_heuristics"
  | "representation_selection"
  | "conceptual_understanding"
  | "singapore_primary_pedagogy";

export type Phase4BSourceLocator = {
  label: string;
  locator: string;
};

export type Phase4BSourceRecord = {
  sourceId: string;
  title: string;
  publisher: string;
  sourceClass: Exclude<MethodProvenanceClass, "dreamscape_method">;
  url: string;
  allowedClaimTags: Phase4BSourceClaimTag[];
  locators: Phase4BSourceLocator[];
  supports: string[];
  cautions: string[];
};

export type Phase4BSourceManifestIssueCode =
  | "DUPLICATE_SOURCE_ID"
  | "MISSING_SOURCE_ID"
  | "MISSING_TITLE"
  | "MISSING_PUBLISHER"
  | "INVALID_SOURCE_CLASS"
  | "INVALID_URL"
  | "NO_ALLOWED_CLAIM_TAGS"
  | "NO_SUPPORT_STATEMENTS"
  | "OFFICIAL_SOURCE_NON_GOVERNMENT_PUBLISHER";

export type Phase4BSourceManifestIssue = {
  code: Phase4BSourceManifestIssueCode;
  sourceId: string | null;
  message: string;
};
