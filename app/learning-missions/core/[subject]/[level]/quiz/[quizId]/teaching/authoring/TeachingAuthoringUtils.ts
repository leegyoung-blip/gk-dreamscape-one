import type {
  TeachingAuthoringOption,
  TeachingAuthoringSubject,
  TeachingDraft,
  TeachingStatus,
  TeachingValidationContext,
} from "./TeachingAuthoringTypes";

export function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function cloneTeaching(value: unknown): TeachingDraft {
  if (!isRecord(value)) return {};
  try {
    return JSON.parse(JSON.stringify(value)) as TeachingDraft;
  } catch {
    return { ...value };
  }
}

export function textValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function blockText(value: unknown) {
  if (typeof value === "string") return value;
  if (!isRecord(value)) return "";
  return textValue(value.text) || textValue(value.summary) || textValue(value.body);
}

export function normaliseSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function patchTextBlock(
  current: unknown,
  patch: Record<string, any>,
): Record<string, any> {
  const base = isRecord(current)
    ? { ...current }
    : typeof current === "string" && current.trim()
      ? { text: current }
      : {};
  return { ...base, ...patch };
}

export function patchLesson(
  current: unknown,
  patch: Record<string, any>,
): Record<string, any> {
  return {
    ...(isRecord(current) ? current : {}),
    ...patch,
  };
}

function hasMeaningfulValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.some(hasMeaningfulValue);
  if (isRecord(value)) return Object.values(value).some(hasMeaningfulValue);
  return false;
}

export function hasTeachingContent(teaching: TeachingDraft) {
  return hasMeaningfulValue(teaching);
}

export function teachingStatus(
  teaching: TeachingDraft,
  legacyExplanation: string,
): TeachingStatus {
  const hasLesson = hasMeaningfulValue(teaching.lesson) || hasMeaningfulValue(teaching.teach_me);
  const hasMisconception = hasMeaningfulValue(teaching.misconceptions);
  if (hasLesson || hasMisconception) return "full";

  if (
    hasMeaningfulValue(teaching.hint) ||
    hasMeaningfulValue(teaching.correct) ||
    hasMeaningfulValue(teaching.incorrect)
  ) {
    return "enhanced";
  }

  if (legacyExplanation.trim()) return "legacy";
  return "empty";
}

export function mergeTeachingIntoContent(
  content: Record<string, any>,
  teaching: TeachingDraft,
) {
  const next = { ...(content || {}) };
  if (hasTeachingContent(teaching)) next.teaching = teaching;
  else delete next.teaching;
  return next;
}

function nthIndexOf(source: string, target: string, occurrence: number) {
  const haystack = source.toLocaleLowerCase();
  const needle = target.toLocaleLowerCase();
  let from = 0;
  let index = -1;
  for (let count = 0; count < occurrence; count += 1) {
    index = haystack.indexOf(needle, from);
    if (index < 0) return -1;
    from = index + needle.length;
  }
  return index;
}

function evidenceErrors(value: unknown, prompt: string, label: string) {
  if (!Array.isArray(value)) return [] as string[];
  const errors: string[] = [];
  value.forEach((item, index) => {
    if (!isRecord(item)) return;
    const text = textValue(item.text).trim();
    if (!text) return;
    const occurrence = Math.max(1, Number(item.occurrence) || 1);
    if (nthIndexOf(prompt, text, occurrence) < 0) {
      errors.push(`${label} clue ${index + 1} (“${text}”) was not found in the current question prompt.`);
    }
  });
  return errors;
}

function lessonType(value: unknown) {
  return isRecord(value) ? textValue(value.type).trim().toLowerCase() : "";
}

function lessonErrors(
  subject: TeachingAuthoringSubject,
  raw: unknown,
  label: string,
  prompt: string,
) {
  if (!isRecord(raw) || !hasMeaningfulValue(raw)) return [] as string[];
  const errors: string[] = [];
  const type = lessonType(raw) || "simple_explanation";

  errors.push(...evidenceErrors(raw.evidence || raw.clues, textValue(raw.sentence) || prompt, `${label}`));

  if (subject === "english") {
    if (type === "rule_matrix") {
      const matrix = isRecord(raw.matrix) ? raw.matrix : {};
      const rows = Array.isArray(matrix.rows) ? matrix.rows : [];
      const columns = Array.isArray(matrix.columns) ? matrix.columns : [];
      if (rows.length === 0 || columns.length === 0) {
        errors.push(`${label}: a Rule Matrix needs at least one row and one column.`);
      }
      if (isRecord(matrix.highlight)) {
        const row = textValue(matrix.highlight.row);
        const column = textValue(matrix.highlight.column);
        const rowKeys = rows.map((item: any) => (isRecord(item) ? textValue(item.key) : normaliseSlug(String(item))));
        const columnKeys = columns.map((item: any) => (isRecord(item) ? textValue(item.key) : normaliseSlug(String(item))));
        if ((row && !rowKeys.includes(row)) || (column && !columnKeys.includes(column))) {
          errors.push(`${label}: the highlighted Rule Matrix cell no longer exists.`);
        }
      }
    }
    if (type === "vocabulary") {
      if (!textValue(raw.word).trim() || !textValue(raw.meaning).trim()) {
        errors.push(`${label}: Vocabulary teaching needs both a word and a meaning.`);
      }
    }
    if (type === "editing_correction") {
      if (!textValue(raw.original).trim() || !textValue(raw.corrected).trim()) {
        errors.push(`${label}: Editing Correction needs both the original and corrected text.`);
      }
    }
  } else {
    if (type === "vertical_working") {
      const working = isRecord(raw.vertical_working) ? raw.vertical_working : {};
      const operands = Array.isArray(working.operands) ? working.operands.filter((item: any) => String(item).trim()) : [];
      if (operands.length < 2 || !textValue(working.result).trim()) {
        errors.push(`${label}: Vertical Working needs at least two operands and a result.`);
      }
    }
    if (type === "place_value") {
      const table = isRecord(raw.place_value) ? raw.place_value : {};
      const columns = Array.isArray(table.columns) ? table.columns : [];
      const rows = Array.isArray(table.rows) ? table.rows : [];
      if (columns.length === 0 || rows.length === 0) {
        errors.push(`${label}: Place Value needs columns and at least one row.`);
      } else {
        rows.forEach((row: any, index: number) => {
          const values = isRecord(row) && Array.isArray(row.values) ? row.values : [];
          if (values.length !== columns.length) {
            errors.push(`${label}: Place Value row ${index + 1} must contain ${columns.length} value(s).`);
          }
        });
      }
    }
    if (type === "fraction") {
      const fraction = isRecord(raw.fraction) ? raw.fraction : {};
      if (
        !textValue(fraction.working).trim() &&
        !textValue(fraction.result).trim() &&
        !textValue(fraction.simplified).trim()
      ) {
        errors.push(`${label}: Fraction teaching needs working or a result.`);
      }
    }
    if (type === "geometry") {
      const geometry = isRecord(raw.geometry) ? raw.geometry : {};
      if (
        !textValue(geometry.rule).trim() &&
        !textValue(geometry.working).trim() &&
        !textValue(geometry.answer).trim()
      ) {
        errors.push(`${label}: Geometry teaching needs a rule, working, or answer.`);
      }
    }
    if (type === "unit_conversion") {
      const conversion = isRecord(raw.conversion) ? raw.conversion : {};
      if (!textValue(conversion.from).trim() || !textValue(conversion.to).trim() || !textValue(conversion.result).trim()) {
        errors.push(`${label}: Unit Conversion needs From, To, and Result.`);
      }
    }
    if (type === "word_problem") {
      const problem = isRecord(raw.word_problem) ? raw.word_problem : {};
      if (!textValue(problem.find).trim() || !textValue(problem.answer).trim()) {
        errors.push(`${label}: Word Problem teaching needs “What are we finding?” and an answer.`);
      }
    }
  }

  return errors;
}

export function validateTeachingDraft(context: TeachingValidationContext) {
  const { subject, prompt, options, correctOptionIds, allowMisconceptions, teaching } = context;
  if (!hasTeachingContent(teaching)) return [] as string[];

  const errors: string[] = [];
  const hint = isRecord(teaching.hint) ? teaching.hint : null;
  if (hint) errors.push(...evidenceErrors(hint.evidence || hint.clues, prompt, "Hint"));

  if (allowMisconceptions && isRecord(teaching.misconceptions)) {
    const optionIds = new Set(options.map((option) => option.id));
    const correct = new Set(correctOptionIds);
    for (const [key, raw] of Object.entries(teaching.misconceptions)) {
      const optionId = key.replace(/^option[_-]/, "");
      if (!optionIds.has(optionId)) continue;
      if (correct.has(optionId)) {
        errors.push(`Answer-specific feedback is attached to correct option ${optionId.toUpperCase()}. Remove that misconception entry.`);
      }
      if (isRecord(raw) && !blockText(raw).trim()) {
        errors.push(`Answer-specific feedback for option ${optionId.toUpperCase()} needs a summary.`);
      }
    }
  }

  errors.push(...lessonErrors(subject, teaching.lesson, "Main teaching explanation", prompt));
  errors.push(...lessonErrors(subject, teaching.teach_me, "Teach Me", prompt));
  return errors;
}

export function currentOptionRows(
  options: TeachingAuthoringOption[],
  correctOptionIds: string[],
) {
  const correct = new Set(correctOptionIds);
  return options.map((option) => ({ ...option, correct: correct.has(option.id) }));
}
