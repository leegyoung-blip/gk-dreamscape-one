export type MilestoneLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type MilestoneDefinition = {
  level: MilestoneLevel;
  label: string;
  minScore: number;
};

export const MILESTONES: MilestoneDefinition[] = [
  { level: 1, label: "Starting", minScore: 0 },
  { level: 2, label: "Building", minScore: 40 },
  { level: 3, label: "Progressing", minScore: 55 },
  { level: 4, label: "Developing", minScore: 70 },
  { level: 5, label: "Consolidating", minScore: 78 },
  { level: 6, label: "Strong", minScore: 85 },
];

export function milestoneFromScore(score: number): MilestoneDefinition {
  const normalized = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));

  for (let index = MILESTONES.length - 1; index >= 0; index -= 1) {
    if (normalized >= MILESTONES[index].minScore) {
      return MILESTONES[index];
    }
  }

  return MILESTONES[0];
}
