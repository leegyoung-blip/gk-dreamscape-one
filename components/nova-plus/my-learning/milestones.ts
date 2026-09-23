export type MilestoneLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type Milestone = {
  level: MilestoneLevel;
  label: "Starting" | "Building" | "Progressing" | "Developing" | "Consolidating" | "Strong";
};

export const MILESTONES: Milestone[] = [
  { level: 1, label: "Starting" },
  { level: 2, label: "Building" },
  { level: 3, label: "Progressing" },
  { level: 4, label: "Developing" },
  { level: 5, label: "Consolidating" },
  { level: 6, label: "Strong" },
];

export function milestoneFromScore(score: number): Milestone {
  const safeScore = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));

  if (safeScore >= 85) return MILESTONES[5];
  if (safeScore >= 78) return MILESTONES[4];
  if (safeScore >= 70) return MILESTONES[3];
  if (safeScore >= 55) return MILESTONES[2];
  if (safeScore >= 40) return MILESTONES[1];
  return MILESTONES[0];
}

export function milestoneForEvidence(
  score: number | null | undefined,
  questionsAttempted: number | null | undefined,
): Milestone | null {
  if (Number(questionsAttempted ?? 0) < 5) return null;
  return milestoneFromScore(Number(score ?? 0));
}

export function milestoneText(milestone: Milestone | null) {
  return milestone ? `Milestone ${milestone.level} · ${milestone.label}` : "Building Picture";
}
