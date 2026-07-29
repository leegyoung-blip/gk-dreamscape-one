import type {
  ScienceMissionType,
  ScienceQuizStatus,
} from "@/lib/science/types";

export const SCIENCE_MISSION_META: Record<
  ScienceMissionType,
  { label: string; shortLabel: string; icon: string; description: string }
> = {
  learn: {
    label: "Learn Missions",
    shortLabel: "Learn",
    icon: "📘",
    description: "Build the idea with short visual concept checks.",
  },
  practice: {
    label: "Practice Missions",
    shortLabel: "Practise",
    icon: "🧩",
    description: "Strengthen the topic using familiar question formats.",
  },
  investigate: {
    label: "Investigation Missions",
    shortLabel: "Investigate",
    icon: "🔬",
    description: "Observe, compare, predict and interpret simple evidence.",
  },
  mastery: {
    label: "Mastery Missions",
    shortLabel: "Master",
    icon: "🏆",
    description: "Apply ideas across mixed and cumulative questions.",
  },
  assessment: {
    label: "Assessment Missions",
    shortLabel: "Assessment",
    icon: "📝",
    description: "Complete a longer mixed-topic checkpoint.",
  },
};

export const SCIENCE_STATUS_META: Record<
  ScienceQuizStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "border-slate-400/25 bg-slate-300/10 text-slate-200",
  },
  in_review: {
    label: "In review",
    className: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  },
  approved: {
    label: "Approved",
    className: "border-cyan-300/25 bg-cyan-300/10 text-cyan-100",
  },
  published: {
    label: "Published",
    className: "border-emerald-300/25 bg-emerald-300/10 text-emerald-100",
  },
  archived: {
    label: "Archived",
    className: "border-rose-300/25 bg-rose-300/10 text-rose-100",
  },
};

export function normaliseRole(value: string | null | undefined) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");
}

export function canAccessScience(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);

  return (
    cleanRole === "admin" ||
    cleanRole === "teacher" ||
    cleanRole === "curriculum-lead"
  );
}

export function canEditScience(role: string | null | undefined) {
  const cleanRole = normaliseRole(role);
  return cleanRole === "admin" || cleanRole === "curriculum-lead";
}

export function csvToArray(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function makeOptionKey(index: number) {
  return String.fromCharCode(65 + index);
}
