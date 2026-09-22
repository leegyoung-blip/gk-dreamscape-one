import type {
  NormalisedTeachingLesson,
  TeachingFraction,
  TeachingGeometry,
  TeachingLessonItem,
  TeachingPlaceValue,
  TeachingUnitConversion,
  TeachingVerticalWorking,
  TeachingWordProblem,
} from "../TeachingTypes";
import { isTeachingRecord, teachingString } from "../TeachingUtils";

export function sourceText(
  lesson: NormalisedTeachingLesson,
  key: string,
) {
  const source = lesson.source as Record<string, unknown> | null;
  return teachingString(source?.[key]);
}

export function normaliseLessonItems(
  value: unknown,
): TeachingLessonItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item): TeachingLessonItem | null => {
      if (typeof item === "string") {
        const text = item.trim();
        return text ? { text } : null;
      }

      if (!isTeachingRecord(item)) return null;
      const text = teachingString(item.text) || teachingString(item.body);
      if (!text) return null;

      const title = teachingString(item.title);

      return {
        ...(title ? { title } : {}),
        text,
      };
    })
    .filter((item): item is TeachingLessonItem => item !== null);
}

export function sourceItems(
  lesson: NormalisedTeachingLesson,
  key: string,
) {
  const source = lesson.source as Record<string, unknown> | null;
  return normaliseLessonItems(source?.[key]);
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => teachingString(item))
    .filter(Boolean) as string[];
}

export function readVerticalWorking(
  lesson: NormalisedTeachingLesson,
): TeachingVerticalWorking | null {
  const raw = lesson.source?.vertical_working;
  if (!isTeachingRecord(raw)) return null;

  const operands = stringArray(raw.operands);
  const carries = stringArray(raw.carries);
  const operator = teachingString(raw.operator);
  const result = teachingString(raw.result);
  const note = teachingString(raw.note);

  if (operands.length === 0 && !result && !operator && carries.length === 0) {
    return null;
  }

  return {
    operator: operator || undefined,
    operands,
    carries,
    result: result || undefined,
    note: note || undefined,
  };
}

export function readPlaceValue(
  lesson: NormalisedTeachingLesson,
): TeachingPlaceValue | null {
  const raw = lesson.source?.place_value;
  if (!isTeachingRecord(raw)) return null;

  const columns = stringArray(raw.columns);
  const highlightColumns = stringArray(raw.highlight_columns);
  const rows = Array.isArray(raw.rows)
    ? raw.rows
        .map((row) => {
          if (!isTeachingRecord(row)) return null;
          const values = stringArray(row.values);
          if (values.length === 0) return null;
          return {
            label: teachingString(row.label) || undefined,
            values,
            emphasis: row.emphasis === true,
          };
        })
        .filter(Boolean) as NonNullable<TeachingPlaceValue["rows"]>
    : [];

  if (columns.length === 0 || rows.length === 0) return null;

  return {
    columns,
    rows,
    highlight_columns: highlightColumns,
  };
}

export function readFraction(
  lesson: NormalisedTeachingLesson,
): TeachingFraction | null {
  const raw = lesson.source?.fraction;
  if (!isTeachingRecord(raw)) return null;

  const result: TeachingFraction = {
    left: teachingString(raw.left) || undefined,
    operator: teachingString(raw.operator) || undefined,
    right: teachingString(raw.right) || undefined,
    common_denominator:
      teachingString(raw.common_denominator) || undefined,
    equivalent_left: teachingString(raw.equivalent_left) || undefined,
    equivalent_right: teachingString(raw.equivalent_right) || undefined,
    working: teachingString(raw.working) || undefined,
    result: teachingString(raw.result) || undefined,
    simplified: teachingString(raw.simplified) || undefined,
    note: teachingString(raw.note) || undefined,
  };

  return Object.values(result).some(Boolean) ? result : null;
}

export function readGeometry(
  lesson: NormalisedTeachingLesson,
): TeachingGeometry | null {
  const raw = lesson.source?.geometry;
  if (!isTeachingRecord(raw)) return null;

  const known = normaliseLessonItems(raw.known);
  const result: TeachingGeometry = {
    known,
    rule: teachingString(raw.rule) || undefined,
    formula: teachingString(raw.formula) || undefined,
    substitution: teachingString(raw.substitution) || undefined,
    working: teachingString(raw.working) || undefined,
    answer: teachingString(raw.answer) || undefined,
    unit: teachingString(raw.unit) || undefined,
  };

  return known.length > 0 || Object.entries(result).some(([key, value]) => key !== "known" && Boolean(value))
    ? result
    : null;
}

export function readConversion(
  lesson: NormalisedTeachingLesson,
): TeachingUnitConversion | null {
  const raw = lesson.source?.conversion;
  if (!isTeachingRecord(raw)) return null;

  const result: TeachingUnitConversion = {
    from: teachingString(raw.from) || undefined,
    to: teachingString(raw.to) || undefined,
    relationship: teachingString(raw.relationship) || undefined,
    calculation: teachingString(raw.calculation) || undefined,
    result: teachingString(raw.result) || undefined,
  };

  return Object.values(result).some(Boolean) ? result : null;
}

export function readWordProblem(
  lesson: NormalisedTeachingLesson,
): TeachingWordProblem | null {
  const raw = lesson.source?.word_problem;
  if (!isTeachingRecord(raw)) return null;

  const known = normaliseLessonItems(raw.known);
  const working = normaliseLessonItems(raw.working);
  const result: TeachingWordProblem = {
    known,
    find: teachingString(raw.find) || undefined,
    strategy: teachingString(raw.strategy) || undefined,
    working,
    answer: teachingString(raw.answer) || undefined,
    unit: teachingString(raw.unit) || undefined,
    check: teachingString(raw.check) || undefined,
  };

  return known.length > 0 || working.length > 0 || Object.entries(result).some(([key, value]) => !["known", "working"].includes(key) && Boolean(value))
    ? result
    : null;
}

export function readKnownItems(lesson: NormalisedTeachingLesson) {
  const source = lesson.source;
  if (!source) return [];
  return normaliseLessonItems(source.known as TeachingLessonItem[] | undefined);
}
