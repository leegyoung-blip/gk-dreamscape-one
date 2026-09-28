export type TeachingAuthoringSubject = "english" | "math";
export type TeachingDraft = Record<string, any>;

export type TeachingAuthoringOption = {
  id: string;
  text: string;
};

export type TeachingStatus = "legacy" | "enhanced" | "full" | "empty";

export type TeachingValidationContext = {
  subject: TeachingAuthoringSubject;
  prompt: string;
  options: TeachingAuthoringOption[];
  correctOptionIds: string[];
  allowMisconceptions: boolean;
  teaching: TeachingDraft;
  /** Optional V2 Math visual for cross-validating teaching visual_steps. */
  mathVisual?: unknown;
};
