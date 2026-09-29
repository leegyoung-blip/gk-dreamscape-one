import {
  MATH_QA_SCHEMA_VERSION,
  MATH_QA_SAMPLING_VERSION,
  type MathQACandidate,
  type MathQALevelSummary,
  type MathQASampleItem,
  type MathQASampleSelection,
  type MathQASampleStratum,
} from "./MathQATypes";

export type MathQASamplingOptions = {
  targetSize: number;
  seed?: string;
  levels?: number[];
};

const STRATA: MathQASampleStratum[] = [
  "legacy_visual",
  "text_word_problem",
  "text_direct",
  "existing_v2",
];

function stableHash(input: string) {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededCompare(seed: string, left: MathQACandidate, right: MathQACandidate) {
  const leftHash = stableHash(`${seed}|${left.question_id}`);
  const rightHash = stableHash(`${seed}|${right.question_id}`);
  if (leftHash !== rightHash) return leftHash - rightHash;
  return left.question_code.localeCompare(right.question_code);
}

function allocateQuota(total: number, keys: string[], capacities: Map<string, number>) {
  const output = new Map<string, number>();
  for (const key of keys) output.set(key, 0);
  if (total <= 0 || keys.length === 0) return output;

  let remaining = total;
  let active = keys.filter((key) => (capacities.get(key) || 0) > 0);

  while (remaining > 0 && active.length > 0) {
    const share = Math.max(1, Math.floor(remaining / active.length));
    let assignedThisRound = 0;

    for (const key of active) {
      if (remaining <= 0) break;
      const already = output.get(key) || 0;
      const capacity = capacities.get(key) || 0;
      const available = Math.max(0, capacity - already);
      if (available <= 0) continue;
      const assign = Math.min(share, available, remaining);
      if (assign <= 0) continue;
      output.set(key, already + assign);
      remaining -= assign;
      assignedThisRound += assign;
    }

    if (assignedThisRound === 0) break;
    active = active.filter((key) => (output.get(key) || 0) < (capacities.get(key) || 0));
  }

  return output;
}

function pickTopicItems(
  candidates: MathQACandidate[],
  quota: number,
  seed: string,
) {
  if (quota <= 0) return [];

  const byStratum = new Map<MathQASampleStratum, MathQACandidate[]>();
  for (const stratum of STRATA) byStratum.set(stratum, []);
  for (const candidate of candidates) {
    const bucket = byStratum.get(candidate.sample_stratum) || [];
    bucket.push(candidate);
    byStratum.set(candidate.sample_stratum, bucket);
  }
  for (const [stratum, rows] of byStratum) {
    rows.sort((left, right) => seededCompare(`${seed}|${stratum}`, left, right));
  }

  const selected: MathQACandidate[] = [];
  let cursor = stableHash(seed) % STRATA.length;
  let safety = candidates.length * 3 + 20;

  while (selected.length < quota && safety > 0) {
    safety -= 1;
    let found = false;
    for (let offset = 0; offset < STRATA.length; offset += 1) {
      const stratum = STRATA[(cursor + offset) % STRATA.length];
      const rows = byStratum.get(stratum) || [];
      const next = rows.shift();
      if (!next) continue;
      selected.push(next);
      cursor = (cursor + offset + 1) % STRATA.length;
      found = true;
      break;
    }
    if (!found) break;
  }

  return selected;
}

export function selectMathQASample(
  candidates: MathQACandidate[],
  options: MathQASamplingOptions,
): MathQASampleSelection {
  const seed = (options.seed || "phase-2i-v1").trim() || "phase-2i-v1";
  const requestedLevels = (options.levels?.length ? options.levels : [1, 2, 3, 4, 5, 6])
    .filter((level) => Number.isInteger(level) && level >= 1 && level <= 6)
    .filter((level, index, list) => list.indexOf(level) === index)
    .sort((left, right) => left - right);
  const targetSize = Math.max(1, Math.floor(options.targetSize));

  const eligible = candidates.filter((candidate) => requestedLevels.includes(candidate.primary_level));
  const levelKeys = requestedLevels.map(String);
  const levelCapacities = new Map<string, number>();
  for (const level of requestedLevels) {
    levelCapacities.set(
      String(level),
      eligible.filter((candidate) => candidate.primary_level === level).length,
    );
  }
  const levelQuotas = allocateQuota(targetSize, levelKeys, levelCapacities);

  const selected: MathQACandidate[] = [];

  for (const level of requestedLevels) {
    const levelRows = eligible.filter((candidate) => candidate.primary_level === level);
    const levelQuota = levelQuotas.get(String(level)) || 0;
    if (levelQuota <= 0 || levelRows.length === 0) continue;

    const topicIds = [...new Set(levelRows.map((candidate) => candidate.topic_id))].sort();
    const topicCapacities = new Map<string, number>();
    for (const topicId of topicIds) {
      topicCapacities.set(
        topicId,
        levelRows.filter((candidate) => candidate.topic_id === topicId).length,
      );
    }
    const topicQuotas = allocateQuota(levelQuota, topicIds, topicCapacities);

    for (const topicId of topicIds) {
      const topicRows = levelRows.filter((candidate) => candidate.topic_id === topicId);
      const topicQuota = topicQuotas.get(topicId) || 0;
      selected.push(...pickTopicItems(topicRows, topicQuota, `${seed}|p${level}|${topicId}`));
    }
  }

  if (selected.length < targetSize) {
    const selectedIds = new Set(selected.map((candidate) => candidate.question_id));
    const fallback = eligible
      .filter((candidate) => !selectedIds.has(candidate.question_id))
      .sort((left, right) => seededCompare(`${seed}|fallback`, left, right));
    selected.push(...fallback.slice(0, targetSize - selected.length));
  }

  const items: MathQASampleItem[] = selected
    .slice(0, targetSize)
    .map((candidate, index) => ({ ...candidate, sample_rank: index + 1 }));

  const levels: MathQALevelSummary[] = requestedLevels.map((primaryLevel) => {
    const rows = items.filter((item) => item.primary_level === primaryLevel);
    const strata: Record<MathQASampleStratum, number> = {
      existing_v2: 0,
      legacy_visual: 0,
      text_word_problem: 0,
      text_direct: 0,
    };
    for (const row of rows) strata[row.sample_stratum] += 1;
    return {
      primary_level: primaryLevel,
      selected: rows.length,
      topic_count: new Set(rows.map((row) => row.topic_id)).size,
      strata,
    };
  });

  return {
    schema_version: MATH_QA_SCHEMA_VERSION,
    sampling_version: MATH_QA_SAMPLING_VERSION,
    seed,
    target_size: targetSize,
    actual_size: items.length,
    generated_at: new Date().toISOString(),
    levels,
    items,
  };
}

export function classifyMathQASampleStratum({
  content,
  prompt,
  hasStimulus,
  hasQuestionAsset,
}: {
  content: unknown;
  prompt: string;
  hasStimulus: boolean;
  hasQuestionAsset: boolean;
}): MathQASampleStratum {
  const record =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};

  if (record.math_visual && typeof record.math_visual === "object") {
    return "existing_v2";
  }

  const serialised = JSON.stringify(record).toLowerCase();
  const hasLegacyVisual =
    hasStimulus ||
    hasQuestionAsset ||
    serialised.includes("<svg") ||
    serialised.includes("data:image") ||
    serialised.includes("image_url") ||
    serialised.includes("image_path") ||
    serialised.includes("inline_diagram") ||
    serialised.includes(".svg");
  if (hasLegacyVisual) return "legacy_visual";

  const text = prompt.toLowerCase();
  const wordSignals = [
    " has ",
    " have ",
    " had ",
    " more than ",
    " fewer ",
    " less than ",
    " altogether ",
    " left ",
    " remaining ",
    " each ",
    " shared ",
    " gave ",
    " bought ",
    " sold ",
    " difference ",
    " total ",
    " how many ",
    " how much ",
  ];
  const numberCount = (text.match(/\d+(?:[.,]\d+)?/g) || []).length;
  if (prompt.length >= 95 || (numberCount >= 2 && wordSignals.some((signal) => text.includes(signal)))) {
    return "text_word_problem";
  }

  return "text_direct";
}
