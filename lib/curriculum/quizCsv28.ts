export const UNIVERSAL_QUIZ_CSV_HEADERS = [
  "image_flag",
  "image_reference",
  "primary_level",
  "topic_slug",
  "topic_title",
  "quiz_id",
  "quiz_code",
  "quiz_title",
  "quiz_type",
  "quiz_order",
  "quiz_question_count",
  "question_id",
  "question_code",
  "question_order",
  "question_type",
  "difficulty",
  "marks",
  "instruction",
  "prompt",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "correct_option",
  "correct_answer",
  "explanation",
  "skill",
  "skill_tags",
] as const;

export type UniversalQuizCsvHeader =
  (typeof UNIVERSAL_QUIZ_CSV_HEADERS)[number];

export type UniversalQuizCsvRow = Record<string, string | number> & {
  row_number: number;
};

export type ParsedUniversalQuizCsv = {
  rows: UniversalQuizCsvRow[];
  imageRowCount: number;
};

type ParseOptions = {
  /**
   * Core's existing server importer does not need image_reference and historically
   * strips it before staging. Science can retain it as lightweight metadata.
   * The CSV header is required either way.
   */
  includeImageReference?: boolean;
};

export function parseUniversalQuizCsv(
  text: string,
  options: ParseOptions = {},
): ParsedUniversalQuizCsv {
  const matrix = parseCsvMatrix(text.replace(/^\uFEFF/, ""));

  if (matrix.length === 0) {
    throw new Error("The CSV is empty.");
  }

  const headers = matrix[0].map((value) => value.trim());

  if (headers.length !== UNIVERSAL_QUIZ_CSV_HEADERS.length) {
    throw new Error(
      `Dreamscape quiz CSVs must contain exactly ${UNIVERSAL_QUIZ_CSV_HEADERS.length} columns. This file contains ${headers.length}.`,
    );
  }

  const duplicateHeaders = headers.filter(
    (header, index) => headers.indexOf(header) !== index,
  );

  if (duplicateHeaders.length > 0) {
    throw new Error(`Duplicate CSV header: ${duplicateHeaders[0]}`);
  }

  for (let index = 0; index < UNIVERSAL_QUIZ_CSV_HEADERS.length; index += 1) {
    const expected = UNIVERSAL_QUIZ_CSV_HEADERS[index];
    const received = headers[index];

    if (received !== expected) {
      throw new Error(
        `28-column Dreamscape format expected. Column ${index + 1} must be "${expected}" but this file contains "${received || "(blank)"}". Do not add, remove or reorder columns.`,
      );
    }
  }

  const rows: UniversalQuizCsvRow[] = [];
  let imageRowCount = 0;

  for (let rowIndex = 1; rowIndex < matrix.length; rowIndex += 1) {
    const values = matrix[rowIndex];

    if (values.every((value) => value.trim() === "")) {
      continue;
    }

    if (values.length !== UNIVERSAL_QUIZ_CSV_HEADERS.length) {
      throw new Error(
        `CSV row ${rowIndex + 1} contains ${values.length} cells. Exactly 28 cells are required on every non-empty row.`,
      );
    }

    const row: UniversalQuizCsvRow = {
      row_number: rowIndex + 1,
    };

    UNIVERSAL_QUIZ_CSV_HEADERS.forEach((header, columnIndex) => {
      if (header === "image_reference" && options.includeImageReference === false) {
        return;
      }

      row[header] = values[columnIndex] ?? "";
    });

    if (
      ["HAS_IMAGE", "LIKELY_NEEDS_IMAGE"].includes(
        String(row.image_flag || "").trim().toUpperCase(),
      )
    ) {
      imageRowCount += 1;
    }

    rows.push(row);
  }

  return { rows, imageRowCount };
}

function parseCsvMatrix(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.length === 0) {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new Error("The CSV contains an unclosed quoted field.");
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}
