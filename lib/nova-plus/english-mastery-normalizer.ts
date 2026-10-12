import type {
  EnglishEvidenceConfidence,
  EnglishMasteryItem,
  EnglishMasteryProfilePayload,
  EnglishMasteryStage,
  EnglishMasterySummary,
} from "@/lib/nova-plus/english-mastery-types";

const STAGES = new Set<EnglishMasteryStage>([
  "Not Yet Assessed",
  "Starting",
  "Building",
  "Progressing",
  "Developing",
  "Consolidating",
  "Strong",
]);

const CONFIDENCE = new Set<EnglishEvidenceConfidence>([
  "Low",
  "Moderate",
  "High",
]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item)).filter(Boolean);
}

function asNumberArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function asStage(value: unknown): EnglishMasteryStage {
  const stage = asString(value) as EnglishMasteryStage;
  return STAGES.has(stage) ? stage : "Not Yet Assessed";
}

function asConfidence(value: unknown): EnglishEvidenceConfidence {
  const label = asString(value) as EnglishEvidenceConfidence;
  return CONFIDENCE.has(label) ? label : "Low";
}

function normaliseSummary(value: unknown): EnglishMasterySummary {
  const row = asRecord(value);
  return {
    masteries: asNumber(row.masteries),
    assessed: asNumber(row.assessed),
    not_yet_assessed: asNumber(row.not_yet_assessed),
    starting: asNumber(row.starting),
    building: asNumber(row.building),
    progressing: asNumber(row.progressing),
    developing: asNumber(row.developing),
    consolidating: asNumber(row.consolidating),
    strong: asNumber(row.strong),
    low_evidence_confidence: asNumber(row.low_evidence_confidence),
    moderate_evidence_confidence: asNumber(
      row.moderate_evidence_confidence,
    ),
    high_evidence_confidence: asNumber(row.high_evidence_confidence),
  };
}

function normaliseMastery(value: unknown): EnglishMasteryItem | null {
  const row = asRecord(value);
  const masteryCode = asString(row.mastery_code);
  const masteryName = asString(row.mastery_name);
  const level = asNumber(row.primary_level);

  if (!masteryCode || !masteryName || level < 1 || level > 6) {
    return null;
  }

  return {
    primary_level: level,
    mastery_family: asString(row.mastery_family),
    progression_key: asString(row.progression_key),
    mastery_code: masteryCode,
    mastery_name: masteryName,
    score: asNullableNumber(row.score),
    stage: asStage(row.stage),
    evidence_confidence: asConfidence(row.evidence_confidence),
    evidence_confidence_score: asNumber(row.evidence_confidence_score),
    unique_questions: asNumber(row.unique_questions),
    effective_evidence_weight: asNumber(row.effective_evidence_weight),
    bands_encountered: asNumberArray(row.bands_encountered),
    contexts_seen: asStringArray(row.contexts_seen),
    hard_correct_questions: asNumber(row.hard_correct_questions),
    hard_accuracy_pct: asNullableNumber(row.hard_accuracy_pct),
    recent_90_unique: asNumber(row.recent_90_unique),
    recent_90_share_pct: asNumber(row.recent_90_share_pct),
    last_evidence_at: asNullableString(row.last_evidence_at),
    calibrated_question_count: asNumber(row.calibrated_question_count),
    available_difficulty_bands: asNumberArray(
      row.available_difficulty_bands,
    ),
    available_contexts: asStringArray(row.available_contexts),
  };
}

export function normaliseEnglishMasteryProfile(
  value: unknown,
): EnglishMasteryProfilePayload {
  const row = asRecord(value);
  const masteryRows = Array.isArray(row.masteries) ? row.masteries : [];

  return {
    model_version: asString(row.model_version, "english-mastery-c1b-v1"),
    registry_version: asString(
      row.registry_version,
      "english-nova-plus-mastery-v1",
    ),
    learner_user_id: asString(row.learner_user_id),
    viewer_relationship: asString(row.viewer_relationship, "linked"),
    primary_level: asNullableNumber(row.primary_level),
    generated_at: asString(row.generated_at, new Date(0).toISOString()),
    summary: normaliseSummary(row.summary),
    masteries: masteryRows
      .map(normaliseMastery)
      .filter((item): item is EnglishMasteryItem => Boolean(item)),
  };
}
