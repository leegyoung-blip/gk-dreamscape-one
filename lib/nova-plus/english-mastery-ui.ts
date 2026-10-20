import type {
  EnglishEvidenceConfidence,
  EnglishMasteryItem,
  EnglishMasteryProfilePayload,
  EnglishMasteryStage,
} from "@/lib/nova-plus/english-mastery-types";
import type { NovaPlusProfilePayload } from "@/lib/nova-plus/types";

export type EnglishMasteryDisplayGroup =
  | "strong"
  | "developing"
  | "attention"
  | "needs_evidence";

export const ENGLISH_STAGE_ORDER: EnglishMasteryStage[] = [
  "Starting",
  "Building",
  "Progressing",
  "Developing",
  "Consolidating",
  "Strong",
];

export const ENGLISH_STAGE_COLOURS: Record<EnglishMasteryStage, string> = {
  "Not Yet Assessed": "#8999ad",
  Starting: "#ff7a7f",
  Building: "#ff9f62",
  Progressing: "#ffc35b",
  Developing: "#7bc8ff",
  Consolidating: "#6ee7bd",
  Strong: "#4de2a1",
};

export function englishStageRank(stage: EnglishMasteryStage) {
  if (stage === "Not Yet Assessed") return -1;
  return ENGLISH_STAGE_ORDER.indexOf(stage);
}

export function confidenceRank(confidence: EnglishEvidenceConfidence) {
  if (confidence === "High") return 2;
  if (confidence === "Moderate") return 1;
  return 0;
}

export function inferCurrentEnglishLevel(
  mastery: EnglishMasteryProfilePayload | null,
  legacy: NovaPlusProfilePayload,
) {
  if (mastery) {
    const evidenceByLevel = new Map<number, number>();

    for (const item of mastery.masteries) {
      if (item.primary_level < 1 || item.primary_level > 6) continue;
      if (item.stage === "Not Yet Assessed") continue;

      evidenceByLevel.set(
        item.primary_level,
        (evidenceByLevel.get(item.primary_level) || 0) +
          Math.max(0.01, Number(item.effective_evidence_weight || 0)),
      );
    }

    const ranked = [...evidenceByLevel.entries()].sort(
      (a, b) => b[1] - a[1] || b[0] - a[0],
    );
    if (ranked[0]) return ranked[0][0];
  }

  // Same fallback principle already used by the current Mastery Map:
  // infer the likely learner level from historic English evidence only.
  const historicByLevel = new Map<number, number>();

  for (const skill of legacy.skills ?? []) {
    if (String(skill.subject || "").toLowerCase() !== "english") continue;

    const level = Number(skill.primary_level || 0);
    if (!Number.isFinite(level) || level < 1 || level > 6) continue;

    historicByLevel.set(
      level,
      (historicByLevel.get(level) || 0) +
        Math.max(1, Number(skill.questions_attempted || 0)),
    );
  }

  const historicRanked = [...historicByLevel.entries()].sort(
    (a, b) => b[1] - a[1] || b[0] - a[0],
  );
  if (historicRanked[0]) return historicRanked[0][0];

  return 1;
}

export function englishMasteriesAtLevel(
  mastery: EnglishMasteryProfilePayload | null,
  level: number,
) {
  if (!mastery) return [];
  return mastery.masteries.filter((item) => item.primary_level === level);
}

export function englishStageCounts(items: EnglishMasteryItem[]) {
  const counts: Record<EnglishMasteryStage, number> = {
    "Not Yet Assessed": 0,
    Starting: 0,
    Building: 0,
    Progressing: 0,
    Developing: 0,
    Consolidating: 0,
    Strong: 0,
  };

  for (const item of items) {
    counts[item.stage] += 1;
  }

  return counts;
}

export function englishMasteryDisplayGroup(
  item: EnglishMasteryItem,
): EnglishMasteryDisplayGroup {
  if (item.stage === "Not Yet Assessed") {
    return "needs_evidence";
  }

  // Evidence sufficiency comes before stage: the server's Low confidence
  // (unknown confidence is normalised to Low) never supports a Secure claim
  // or any other confirmed stage, however high the stage is.
  if (item.evidence_confidence === "Low") {
    return "needs_evidence";
  }

  if (["Strong", "Consolidating"].includes(item.stage)) {
    return "strong";
  }

  if (
    ["Starting", "Building"].includes(item.stage) &&
    ["Moderate", "High"].includes(item.evidence_confidence)
  ) {
    return "attention";
  }

  return "developing";
}

export function sortEnglishMasteries(
  group: EnglishMasteryDisplayGroup,
  items: EnglishMasteryItem[],
) {
  return [...items].sort((a, b) => {
    if (group === "strong") {
      return (
        englishStageRank(b.stage) - englishStageRank(a.stage) ||
        confidenceRank(b.evidence_confidence) -
          confidenceRank(a.evidence_confidence) ||
        b.unique_questions - a.unique_questions ||
        a.mastery_name.localeCompare(b.mastery_name)
      );
    }

    if (group === "attention") {
      return (
        englishStageRank(a.stage) - englishStageRank(b.stage) ||
        confidenceRank(b.evidence_confidence) -
          confidenceRank(a.evidence_confidence) ||
        (a.score ?? 999) - (b.score ?? 999) ||
        a.mastery_name.localeCompare(b.mastery_name)
      );
    }

    if (group === "needs_evidence") {
      return (
        a.unique_questions - b.unique_questions ||
        confidenceRank(a.evidence_confidence) -
          confidenceRank(b.evidence_confidence) ||
        a.mastery_name.localeCompare(b.mastery_name)
      );
    }

    return (
      englishStageRank(a.stage) - englishStageRank(b.stage) ||
      confidenceRank(b.evidence_confidence) -
        confidenceRank(a.evidence_confidence) ||
      a.mastery_name.localeCompare(b.mastery_name)
    );
  });
}

export function strongestEnglishMastery(items: EnglishMasteryItem[]) {
  return [...items]
    .filter((item) => item.stage !== "Not Yet Assessed")
    .sort(
      (a, b) =>
        englishStageRank(b.stage) - englishStageRank(a.stage) ||
        confidenceRank(b.evidence_confidence) -
          confidenceRank(a.evidence_confidence) ||
        b.unique_questions - a.unique_questions,
    )[0] ?? null;
}

export function priorityEnglishMastery(items: EnglishMasteryItem[]) {
  return [...items]
    .filter((item) => englishMasteryDisplayGroup(item) === "attention")
    .sort(
      (a, b) =>
        englishStageRank(a.stage) - englishStageRank(b.stage) ||
        confidenceRank(b.evidence_confidence) -
          confidenceRank(a.evidence_confidence) ||
        (a.score ?? 999) - (b.score ?? 999),
    )[0] ?? null;
}

export function evidenceLabel(item: EnglishMasteryItem) {
  return `${item.stage} · ${item.evidence_confidence} evidence`;
}
