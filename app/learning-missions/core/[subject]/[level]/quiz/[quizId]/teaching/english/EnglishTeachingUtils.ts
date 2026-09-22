import type {
  NormalisedTeachingEvidence,
  NormalisedTeachingLesson,
  TeachingMatrix,
  TeachingMatrixAxisItem,
  TeachingMatrixCell,
} from "../TeachingTypes";
import {
  isTeachingRecord,
  normaliseTeachingEvidence,
  teachingString,
} from "../TeachingUtils";

export function lessonSource(lesson: NormalisedTeachingLesson) {
  return lesson.source;
}

export function sourceText(
  lesson: NormalisedTeachingLesson,
  key: string,
) {
  const source = lesson.source as Record<string, unknown> | null;
  return teachingString(source?.[key]);
}

export function sourceEvidence(
  lesson: NormalisedTeachingLesson,
): NormalisedTeachingEvidence[] {
  const raw = lesson.source;
  if (!raw) return [];
  return normaliseTeachingEvidence(
    Array.isArray(raw.evidence) ? raw.evidence : raw.clues,
  );
}

export type NormalisedMatrixAxisItem = {
  key: string;
  label: string;
};

export type NormalisedMatrixCell = {
  text: string;
  emphasis: boolean;
};

export type NormalisedMatrix = {
  columns: NormalisedMatrixAxisItem[];
  rows: NormalisedMatrixAxisItem[];
  cells: Record<string, Record<string, NormalisedMatrixCell>>;
  highlight: { row: string; column: string } | null;
};

function normaliseAxisItem(
  value: TeachingMatrixAxisItem,
  index: number,
): NormalisedMatrixAxisItem | null {
  if (typeof value === "string") {
    const label = value.trim();
    return label
      ? { key: label.toLocaleLowerCase().replace(/\s+/g, "_"), label }
      : null;
  }

  if (!isTeachingRecord(value)) return null;

  const label = teachingString(value.label) || teachingString(value.text);
  if (!label) return null;

  return {
    key:
      teachingString(value.key) ||
      label.toLocaleLowerCase().replace(/\s+/g, "_") ||
      String(index),
    label,
  };
}

function normaliseCell(value: TeachingMatrixCell | undefined): NormalisedMatrixCell | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? { text, emphasis: false } : null;
  }

  if (!isTeachingRecord(value)) return null;

  const text = teachingString(value.text) || teachingString(value.label);
  if (!text) return null;

  return {
    text,
    emphasis: value.emphasis === true,
  };
}

export function readTeachingMatrix(
  lesson: NormalisedTeachingLesson,
): NormalisedMatrix | null {
  const raw = lesson.source?.matrix;
  if (!isTeachingRecord(raw)) return null;

  const matrix = raw as TeachingMatrix;
  const columns = Array.isArray(matrix.columns)
    ? matrix.columns
        .map((item, index) => normaliseAxisItem(item, index))
        .filter(Boolean) as NormalisedMatrixAxisItem[]
    : [];
  const rows = Array.isArray(matrix.rows)
    ? matrix.rows
        .map((item, index) => normaliseAxisItem(item, index))
        .filter(Boolean) as NormalisedMatrixAxisItem[]
    : [];

  if (columns.length === 0 || rows.length === 0) return null;

  const cells: NormalisedMatrix["cells"] = {};
  const rawCells = isTeachingRecord(matrix.cells) ? matrix.cells : {};

  rows.forEach((row) => {
    const rawRow = isTeachingRecord(rawCells[row.key])
      ? (rawCells[row.key] as Record<string, TeachingMatrixCell>)
      : {};

    cells[row.key] = {};

    columns.forEach((column) => {
      const cell = normaliseCell(rawRow[column.key]);
      if (cell) cells[row.key][column.key] = cell;
    });
  });

  let highlight: NormalisedMatrix["highlight"] = null;
  if (typeof matrix.highlight === "string") {
    const [row, column] = matrix.highlight.split(/[.:/]/).map((part) => part.trim());
    if (row && column) highlight = { row, column };
  } else if (isTeachingRecord(matrix.highlight)) {
    const row = teachingString(matrix.highlight.row);
    const column = teachingString(matrix.highlight.column);
    if (row && column) highlight = { row, column };
  }

  return { columns, rows, cells, highlight };
}

export type HighlightSegment = {
  text: string;
  evidence: NormalisedTeachingEvidence | null;
};

function nthIndexOf(source: string, target: string, occurrence: number) {
  const sourceLower = source.toLocaleLowerCase();
  const targetLower = target.toLocaleLowerCase();
  let searchFrom = 0;
  let found = -1;

  for (let count = 0; count < occurrence; count += 1) {
    found = sourceLower.indexOf(targetLower, searchFrom);
    if (found < 0) return -1;
    searchFrom = found + targetLower.length;
  }

  return found;
}

export function buildEvidenceSegments(
  sentence: string,
  evidence: NormalisedTeachingEvidence[],
): HighlightSegment[] {
  if (!sentence || evidence.length === 0) {
    return [{ text: sentence, evidence: null }];
  }

  const ranges = evidence
    .map((item) => {
      const start = nthIndexOf(sentence, item.text, item.occurrence);
      if (start < 0) return null;
      return {
        start,
        end: start + item.text.length,
        evidence: item,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left!.start - right!.start) as Array<{
    start: number;
    end: number;
    evidence: NormalisedTeachingEvidence;
  }>;

  const accepted: typeof ranges = [];
  let lastEnd = -1;
  for (const range of ranges) {
    if (range.start < lastEnd) continue;
    accepted.push(range);
    lastEnd = range.end;
  }

  if (accepted.length === 0) return [{ text: sentence, evidence: null }];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  accepted.forEach((range) => {
    if (range.start > cursor) {
      segments.push({
        text: sentence.slice(cursor, range.start),
        evidence: null,
      });
    }

    segments.push({
      text: sentence.slice(range.start, range.end),
      evidence: range.evidence,
    });
    cursor = range.end;
  });

  if (cursor < sentence.length) {
    segments.push({ text: sentence.slice(cursor), evidence: null });
  }

  return segments;
}
