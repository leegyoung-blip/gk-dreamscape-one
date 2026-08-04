export type CsvRow = Record<string, string>;

function normaliseHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (character === "," && !quoted) {
      cells.push(value);
      value = "";
      continue;
    }

    value += character;
  }

  cells.push(value);
  return cells;
}

function logicalLines(text: string) {
  const lines: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        current += '""';
        index += 1;
        continue;
      }
      quoted = !quoted;
      current += character;
      continue;
    }

    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      if (current.trim()) lines.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  if (current.trim()) lines.push(current);
  return lines;
}

export function parseCsv(text: string): CsvRow[] {
  const lines = logicalLines(text.replace(/^\uFEFF/, ""));
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normaliseHeader);

  return lines
    .slice(1)
    .map((line) => {
      const values = parseCsvLine(line);
      const row: CsvRow = {};
      headers.forEach((header, index) => {
        row[header] = String(values[index] || "").trim();
      });
      return row;
    })
    .filter((row) => Object.values(row).some((value) => value !== ""));
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  const text = typeof value === "object" ? JSON.stringify(value) : String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function rowsToCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((keys, row) => {
      Object.keys(row).forEach((key) => keys.add(key));
      return keys;
    }, new Set<string>()),
  );
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(",")),
  ].join("\n");
}

export function downloadCsv(
  filename: string,
  rows: Array<Record<string, unknown>>,
) {
  const blob = new Blob([rowsToCsv(rows)], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const SKILL_TEMPLATE: CsvRow[] = [{
  subject: "english",
  primary_level: "3",
  domain: "Grammar",
  topic: "Subject-Verb Agreement",
  skill_name: "Match plural subjects with plural verbs",
  skill_code: "ENG-P3-GRAMMAR-SVA-PLURAL",
  description: "Choose the correct verb form for a plural subject",
  public_explanation: "Use a plural verb with a plural subject",
  internal_mapping_guidance:
    "Map only questions where agreement is the main assessed outcome",
  parent_skill_code: "",
  review_status: "reviewed",
}];

export const MAPPING_TEMPLATE: CsvRow[] = [{
  question_source: "english_questions",
  question_id: "00000000-0000-0000-0000-000000000000",
  primary_skill_code: "ENG-P3-GRAMMAR-SVA-PLURAL",
  secondary_1_skill_code: "",
  secondary_1_weight: "",
  secondary_2_skill_code: "",
  secondary_2_weight: "",
  mapping_reason:
    "The question directly tests plural subject-verb agreement",
  review_status: "reviewed",
}];
