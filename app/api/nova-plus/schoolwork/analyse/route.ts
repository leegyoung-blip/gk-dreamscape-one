import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  analysisStartDecision,
  detectHintConflict,
  hintConflictMessage,
  isCanonicalSchoolworkObject,
  neutralAiFilename,
  publicSchoolworkError,
} from "@/lib/nova-plus/schoolwork-guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const ANALYSIS_VERSION = "schoolwork_v2";

const DEFAULT_SETTINGS = {
  enabled: true,
  max_file_size_mb: 20,
  max_pages: 20,
  max_questions: 80,
  daily_upload_limit: 10,
  automatic_retry_count: 1,
  extraction_model: "gpt-5.6-luna",
  reasoning_model: "gpt-5.6-sol",
  fallback_enabled: true,
  fallback_model: "gpt-5.6-terra",
};

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
]);

type SchoolworkUploadRow = {
  id: string;
  student_user_id: string;
  uploaded_by_user_id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
  subject_hint: "english" | "math" | null;
  primary_level_hint: number | null;
  file_sha256: string | null;
  analysis_revision: number;
  production_page_limit: number;
  status: string;
  analysis_started_at: string | null;
};

type TaxonomyRow = {
  id: string;
  skill_code: string;
  skill_name: string;
  domain: string;
  topic: string;
  public_explanation: string | null;
};

type ExtractionQuestion = {
  item_index: number;
  page_number: number;
  question_number: string;
  prompt: string;
  student_answer: string;
  expected_answer_visible: string;
  teacher_mark: "correct" | "incorrect" | "partial" | "unmarked" | "unclear";
  teacher_feedback: string;
  model_correctness: "correct" | "incorrect" | "partial" | "uncertain";
  extraction_confidence: number;
  correctness_confidence: number;
  notes: string;
};

type ExtractionResult = {
  assignment_title: string;
  subject: "english" | "math" | "uncertain";
  primary_level: number;
  document_quality: "high" | "medium" | "low";
  teacher_marked: boolean;
  pages_detected: number;
  overall_notes: string;
  questions: ExtractionQuestion[];
};

type ReasonedItem = {
  item_index: number;
  page_number: number;
  question_number: string;
  prompt: string;
  student_answer: string;
  expected_answer: string;
  teacher_mark: "correct" | "incorrect" | "partial" | "unmarked" | "unclear";
  teacher_feedback: string;
  final_correctness: "correct" | "incorrect" | "partial" | "uncertain";
  correctness_source: "teacher_mark" | "model" | "combined" | "unknown";
  extraction_confidence: number;
  correctness_confidence: number;
  primary_skill_code: string;
  supporting_skill_codes: string[];
  mapping_confidence: number;
  reasoning_note: string;
  needs_review: boolean;
  evidence_recommendation: "include" | "review" | "exclude";
};

type ReasonedResult = {
  assignment_title: string;
  subject: "english" | "math";
  primary_level: number;
  overall_summary: string;
  strength_skill_codes: string[];
  support_skill_codes: string[];
  items: ReasonedItem[];
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function clamp01(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(1, parsed));
}

function cleanText(value: unknown) {
  return String(value ?? "").trim();
}


function uniqueSkillCodes(
  values: unknown,
  validCodes: Set<string>,
  limit: number,
) {
  const source = Array.isArray(values) ? values : [];
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of source) {
    const code = cleanText(value);

    if (!code || !validCodes.has(code) || seen.has(code)) {
      continue;
    }

    seen.add(code);
    result.push(code);

    if (result.length >= limit) {
      break;
    }
  }

  return result;
}

async function requireCurrentUser(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";

  if (!token) {
    throw new Error("AUTH_REQUIRED");
  }

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("SUPABASE_AUTH_CONFIG_MISSING");
  }

  const client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  const {
    data: { user },
    error,
  } = await client.auth.getUser(token);

  if (error || !user) {
    throw new Error("AUTH_REQUIRED");
  }

  return {
    user,
    token,
    client,
  };
}

function fileContentPart(params: {
  mimeType: string;
  signedUrl: string;
  filename: string;
}) {
  if (params.mimeType === "application/pdf") {
    return {
      type: "input_file",
      file_url: params.signedUrl,
      filename: params.filename,
    };
  }

  return {
    type: "input_image",
    image_url: params.signedUrl,
    detail: "high",
  };
}

function responseText(response: any) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text;
  }

  for (const item of response?.output ?? []) {
    if (item?.type !== "message") continue;

    for (const content of item?.content ?? []) {
      if (
        content?.type === "output_text" &&
        typeof content.text === "string"
      ) {
        return content.text;
      }

      if (
        content?.type === "refusal" &&
        typeof content.refusal === "string"
      ) {
        throw new Error(`MODEL_REFUSAL: ${content.refusal}`);
      }
    }
  }

  throw new Error("MODEL_OUTPUT_MISSING");
}

type UsageLike = {
  input_tokens?: number;
  output_tokens?: number;
};

function modelPricing(model: string) {
  const prefix =
    model === "gpt-5.6-luna"
      ? "NOVA_SCHOOLWORK_LUNA"
      : model === "gpt-5.6-sol"
        ? "NOVA_SCHOOLWORK_SOL"
        : "";

  const envInput = prefix
    ? Number(process.env[`${prefix}_INPUT_USD_PER_MTOK`])
    : Number.NaN;

  const envOutput = prefix
    ? Number(process.env[`${prefix}_OUTPUT_USD_PER_MTOK`])
    : Number.NaN;

  if (Number.isFinite(envInput) && Number.isFinite(envOutput)) {
    return { input: envInput, output: envOutput };
  }

  if (model === "gpt-5.6-luna") {
    return { input: 0.2, output: 1.2 };
  }

  if (model === "gpt-5.6-sol") {
    return { input: 4, output: 20 };
  }

  if (model === "gpt-5.6-terra") {
    return { input: 2, output: 12 };
  }

  return null;
}

function estimateCostUsd(model: string, usage: UsageLike) {
  const pricing = modelPricing(model);
  if (!pricing) return null;

  const inputTokens = Number(usage?.input_tokens || 0);
  const outputTokens = Number(usage?.output_tokens || 0);

  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

function retryableOpenAIStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function friendlyAnalysisError(error: unknown) {
  const raw =
    error instanceof Error
      ? error.message
      : String(error || "");

  if (
    raw.includes(
      "Invalid schema for response_format",
    )
  ) {
    return "The worksheet analysis format was rejected. Retry after the latest system update.";
  }

  if (
    raw.includes("OPENAI_API_KEY_MISSING")
  ) {
    return "The worksheet analysis service is not configured yet.";
  }

  if (
    raw.includes("PAGE_LIMIT_EXCEEDED")
  ) {
    return "This upload has more pages than Nova can review at once. Please split it into smaller uploads.";
  }

  if (
    raw.includes("QUESTION_LIMIT_EXCEEDED")
  ) {
    return publicSchoolworkError("QUESTION_LIMIT_EXCEEDED");
  }

  if (
    raw.includes("OPENAI_API_ERROR")
  ) {
    return "The worksheet analysis service returned an error. Please retry.";
  }

  // Raw database / storage / model text is never shown to users.
  return publicSchoolworkError("ANALYSIS_FAILED");
}

function analysisErrorCode(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "");

  if (message.includes("PAGE_LIMIT_EXCEEDED")) {
    return "PAGE_LIMIT_EXCEEDED";
  }

  if (message.includes("QUESTION_LIMIT_EXCEEDED")) {
    return "QUESTION_LIMIT_EXCEEDED";
  }

  if (message.includes("SIGNED_URL_FAILED")) {
    return "SIGNED_URL_FAILED";
  }

  if (message.includes("OPENAI")) {
    return "OPENAI_API";
  }

  if (message.includes("MODEL_JSON_PARSE_FAILED")) {
    return "MODEL_JSON_PARSE_FAILED";
  }

  if (message.includes("NO_CANONICAL_TAXONOMY")) {
    return "NO_CANONICAL_TAXONOMY";
  }

  return "ANALYSIS_FAILED";
}

async function callOpenAI(params: {
  model: string;
  instructions: string;
  inputText: string;
  filePart: Record<string, unknown>;
  schemaName: string;
  schema: Record<string, unknown>;
  reasoningEffort: "low" | "medium";
  maxAutomaticRetries: number;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }

  let automaticRetryCount = 0;
  let lastError: unknown = null;

  for (
    let attempt = 0;
    attempt <= params.maxAutomaticRetries;
    attempt += 1
  ) {
    try {
      const response = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: params.model,
            store: false,
            reasoning: {
              effort: params.reasoningEffort,
            },
            instructions: params.instructions,
            input: [
              {
                role: "user",
                content: [
                  params.filePart,
                  {
                    type: "input_text",
                    text: params.inputText,
                  },
                ],
              },
            ],
            text: {
              verbosity: "low",
              format: {
                type: "json_schema",
                name: params.schemaName,
                strict: true,
                schema: params.schema,
              },
            },
            max_output_tokens: 16000,
          }),
        },
      );

      const body = await response.json().catch(() => null);

      if (!response.ok) {
        const detail =
          body?.error?.message ||
          body?.error ||
          `OpenAI request failed with status ${response.status}.`;

        if (
          attempt < params.maxAutomaticRetries &&
          retryableOpenAIStatus(response.status)
        ) {
          automaticRetryCount += 1;
          await new Promise((resolve) => setTimeout(resolve, 1250));
          continue;
        }

        throw new Error(`OPENAI_API_ERROR: ${String(detail)}`);
      }

      if (body?.status === "failed") {
        throw new Error(
          `OPENAI_RESPONSE_FAILED: ${String(
            body?.error?.message ||
              body?.error ||
              "Unknown response failure",
          )}`,
        );
      }

      const output = responseText(body);

      try {
        return {
          parsed: JSON.parse(output),
          responseId: String(body?.id || ""),
          usage: body?.usage || {},
          automaticRetryCount,
        };
      } catch {
        if (attempt < params.maxAutomaticRetries) {
          automaticRetryCount += 1;
          continue;
        }

        throw new Error("MODEL_JSON_PARSE_FAILED");
      }
    } catch (error) {
      lastError = error;

      if (attempt >= params.maxAutomaticRetries) {
        throw error;
      }

      const message =
        error instanceof Error ? error.message : String(error);

      if (
        !message.includes("OPENAI") &&
        !message.includes("MODEL_JSON_PARSE_FAILED") &&
        !message.toLowerCase().includes("fetch")
      ) {
        throw error;
      }

      automaticRetryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 1250));
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("OPENAI_ANALYSIS_FAILED");
}

type SchoolworkSettings = typeof DEFAULT_SETTINGS;

async function loadSchoolworkSettings(): Promise<SchoolworkSettings> {
  const { data, error } = await supabaseAdmin
    .from("nova_schoolwork_settings")
    .select(
      "enabled,max_file_size_mb,max_pages,max_questions,daily_upload_limit,automatic_retry_count,extraction_model,reasoning_model,fallback_enabled,fallback_model",
    )
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: Boolean(data.enabled),
    max_file_size_mb:
      Number(data.max_file_size_mb || 20),
    max_pages:
      Number(data.max_pages || 20),
    max_questions:
      Number(data.max_questions || 80),
    daily_upload_limit:
      Number(data.daily_upload_limit || 10),
    automatic_retry_count:
      Number(data.automatic_retry_count || 0),
    extraction_model:
      String(
        data.extraction_model ||
          DEFAULT_SETTINGS.extraction_model,
      ),
    reasoning_model:
      String(
        data.reasoning_model ||
          DEFAULT_SETTINGS.reasoning_model,
      ),
    fallback_enabled:
      Boolean(data.fallback_enabled),
    fallback_model:
      String(
        data.fallback_model ||
          DEFAULT_SETTINGS.fallback_model,
      ),
  };
}

async function callOpenAIWithFallback(
  params: Parameters<typeof callOpenAI>[0] & {
    fallbackEnabled: boolean;
    fallbackModel: string;
  },
) {
  try {
    const primary = await callOpenAI(params);

    return {
      ...primary,
      modelUsed: params.model,
      fallbackUsed: false,
    };
  } catch (primaryError) {
    const fallbackModel =
      params.fallbackModel.trim();

    if (
      !params.fallbackEnabled ||
      !fallbackModel ||
      fallbackModel === params.model
    ) {
      throw primaryError;
    }

    const fallback = await callOpenAI({
      ...params,
      model: fallbackModel,
      maxAutomaticRetries: 0,
    });

    return {
      ...fallback,
      modelUsed: fallbackModel,
      fallbackUsed: true,
    };
  }
}

/*
 * maxItems is one above the configured limit so an over-long worksheet is
 * detected and refused rather than silently truncated by the schema.
 */
function extractionSchema(maxQuestions: number) {
  return {
    type: "object",
    properties: {
      assignment_title: { type: "string" },
      subject: {
        type: "string",
        enum: ["english", "math", "uncertain"],
      },
      primary_level: {
        type: "integer",
        minimum: 0,
        maximum: 6,
      },
      document_quality: {
        type: "string",
        enum: ["high", "medium", "low"],
      },
      teacher_marked: { type: "boolean" },
      pages_detected: {
        type: "integer",
        minimum: 1,
        maximum: 100,
      },
      overall_notes: { type: "string" },
      questions: {
        type: "array",
        maxItems: Math.max(1, Math.min(200, maxQuestions)) + 1,
        items: {
          type: "object",
          properties: {
            item_index: {
              type: "integer",
              minimum: 1,
              maximum: 500,
            },
            page_number: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
            question_number: { type: "string" },
            prompt: { type: "string" },
            student_answer: { type: "string" },
            expected_answer_visible: { type: "string" },
            teacher_mark: {
              type: "string",
              enum: [
                "correct",
                "incorrect",
                "partial",
                "unmarked",
                "unclear",
              ],
            },
            teacher_feedback: { type: "string" },
            model_correctness: {
              type: "string",
              enum: ["correct", "incorrect", "partial", "uncertain"],
            },
            extraction_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            correctness_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            notes: { type: "string" },
          },
          required: [
            "item_index",
            "page_number",
            "question_number",
            "prompt",
            "student_answer",
            "expected_answer_visible",
            "teacher_mark",
            "teacher_feedback",
            "model_correctness",
            "extraction_confidence",
            "correctness_confidence",
            "notes",
          ],
          additionalProperties: false,
        },
      },
    },
    required: [
      "assignment_title",
      "subject",
      "primary_level",
      "document_quality",
      "teacher_marked",
      "pages_detected",
      "overall_notes",
      "questions",
    ],
    additionalProperties: false,
  };
}

function reasoningSchema(skillCodes: string[], maxQuestions: number) {
  const skillEnum = ["", ...skillCodes];

  return {
    type: "object",
    properties: {
      assignment_title: { type: "string" },
      subject: {
        type: "string",
        enum: ["english", "math"],
      },
      primary_level: {
        type: "integer",
        minimum: 1,
        maximum: 6,
      },
      overall_summary: { type: "string" },
      strength_skill_codes: {
        type: "array",
        maxItems: 8,
        items: {
          type: "string",
          enum: skillCodes,
        },
      },
      support_skill_codes: {
        type: "array",
        maxItems: 8,
        items: {
          type: "string",
          enum: skillCodes,
        },
      },
      items: {
        type: "array",
        maxItems: Math.max(1, Math.min(200, maxQuestions)),
        items: {
          type: "object",
          properties: {
            item_index: {
              type: "integer",
              minimum: 1,
              maximum: 500,
            },
            page_number: {
              type: "integer",
              minimum: 0,
              maximum: 100,
            },
            question_number: { type: "string" },
            prompt: { type: "string" },
            student_answer: { type: "string" },
            expected_answer: { type: "string" },
            teacher_mark: {
              type: "string",
              enum: [
                "correct",
                "incorrect",
                "partial",
                "unmarked",
                "unclear",
              ],
            },
            teacher_feedback: { type: "string" },
            final_correctness: {
              type: "string",
              enum: ["correct", "incorrect", "partial", "uncertain"],
            },
            correctness_source: {
              type: "string",
              enum: ["teacher_mark", "model", "combined", "unknown"],
            },
            extraction_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            correctness_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            primary_skill_code: {
              type: "string",
              enum: skillEnum,
            },
            supporting_skill_codes: {
              type: "array",
                    maxItems: 2,
              items: {
                type: "string",
                enum: skillCodes,
              },
            },
            mapping_confidence: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
            reasoning_note: { type: "string" },
            needs_review: { type: "boolean" },
            evidence_recommendation: {
              type: "string",
              enum: ["include", "review", "exclude"],
            },
          },
          required: [
            "item_index",
            "page_number",
            "question_number",
            "prompt",
            "student_answer",
            "expected_answer",
            "teacher_mark",
            "teacher_feedback",
            "final_correctness",
            "correctness_source",
            "extraction_confidence",
            "correctness_confidence",
            "primary_skill_code",
            "supporting_skill_codes",
            "mapping_confidence",
            "reasoning_note",
            "needs_review",
            "evidence_recommendation",
          ],
          additionalProperties: false,
        },
      },
    },
    required: [
      "assignment_title",
      "subject",
      "primary_level",
      "overall_summary",
      "strength_skill_codes",
      "support_skill_codes",
      "items",
    ],
    additionalProperties: false,
  };
}

function extractionInstructions() {
  return `
You are the first-stage NOVA+ schoolwork extraction model.

The uploaded file is a child's school worksheet, school assignment, test paper,
homework page or marked schoolwork.

Your job is faithful extraction, not educational diagnosis.

Rules:
1. Read the visual document carefully, including handwriting, ticks, crosses,
   circles, written scores and teacher comments.
2. Separate the work into individual assessable questions/items.
3. Preserve the student's actual answer. Do not silently rewrite it into a
   corrected answer.
4. Teacher markings are evidence. Record them exactly as correct, incorrect,
   partial, unmarked or unclear.
5. If work is unmarked, you may make a preliminary correctness judgement, but
   use "uncertain" whenever the answer cannot be checked confidently.
6. Do not invent missing question text, student answers, teacher feedback or marks.
7. Determine English vs Mathematics and Primary 1–6 only when supported by the
   work. Use subject "uncertain" or primary_level 0 when not reliable.
8. page_number 0 means the page could not be determined.
9. expected_answer_visible is only for an answer/key visibly present in the
   uploaded work; otherwise return an empty string.
10. Confidence values must reflect actual visual certainty, especially for
    handwriting and small print.
11. Return only the structured response required by the schema.
`;
}

function reasoningInstructions() {
  return `
You are the second-stage NOVA+ schoolwork reasoning model.

You will receive:
- the original schoolwork file,
- a first-stage extraction,
- the learner's resolved English or Mathematics Primary level,
- the ONLY canonical Dreamscape concepts you are allowed to use.

Your job is to verify the extraction, judge correctness conservatively, and map
each assessable question to the existing canonical concept taxonomy.

Rules:
1. Re-check the original file. Correct first-stage extraction errors when you can
   see the document clearly.
2. Teacher marking is authoritative when it is clearly attached to the question.
   Do not override a clear teacher tick/cross simply because you would mark it
   differently.
3. For unmarked work, judge correctness only when the answer is determinable from
   the question. For open-ended or ambiguous work, use "uncertain".
4. Never invent a concept. primary_skill_code and supporting_skill_codes must
   come only from the allowed concept list.
5. Choose ONE primary concept only when the question genuinely assesses it.
   Supporting concepts are optional and should be conservative.
6. If no allowed concept fits confidently, return an empty primary_skill_code,
   no supporting codes, evidence_recommendation "exclude", and needs_review true.
7. One poor answer is not itself a confirmed learner gap. The support list should
   describe concepts evidenced in this document, not make a long-term diagnosis.
8. evidence_recommendation:
   - include: extraction, correctness and concept mapping are all sufficiently clear
   - review: useful but a parent/teacher should confirm something before profile use
   - exclude: not assessable, unreadable, irrelevant, or no reliable canonical mapping
9. Keep reasoning_note brief and factual.
10. Return only the structured response required by the schema.
`;
}

/**
 * Review flag stored with the item AND returned to the reviewer. The model's
 * own needs_review is only one input; missing concepts, low mapping /
 * extraction / correctness confidence, uncertain or unclear marking, and blank
 * answers always require an explicit human decision. Model confidence is a
 * triage signal only, not a validated measure of educational reliability.
 */
function storedNeedsReview(item: ReasonedItem, hasPrimarySkill: boolean) {
  return (
    Boolean(item.needs_review) ||
    !hasPrimarySkill ||
    clamp01(item.mapping_confidence) < 0.78 ||
    clamp01(item.extraction_confidence) < 0.78 ||
    clamp01(item.correctness_confidence) < 0.78 ||
    item.final_correctness === "uncertain" ||
    item.teacher_mark === "unclear" ||
    !String(item.student_answer ?? "").trim()
  );
}

function proposedEvidenceWeight(item: ReasonedItem) {
  const mapping = clamp01(item.mapping_confidence);
  const correctness = clamp01(item.correctness_confidence);

  if (
    item.evidence_recommendation === "exclude" ||
    !item.primary_skill_code ||
    item.final_correctness === "uncertain" ||
    mapping < 0.72
  ) {
    return 0;
  }

  if (
    item.correctness_source === "teacher_mark" ||
    item.correctness_source === "combined"
  ) {
    if (correctness >= 0.75 && mapping >= 0.8) {
      return item.final_correctness === "partial" ? 0.6 : 0.8;
    }

    return 0.5;
  }

  if (
    item.correctness_source === "model" &&
    correctness >= 0.9 &&
    mapping >= 0.85
  ) {
    return item.final_correctness === "partial" ? 0.35 : 0.5;
  }

  return 0;
}

async function nextRunNumber(uploadId: string) {
  const { data, error } = await supabaseAdmin
    .from("nova_schoolwork_analysis_runs")
    .select("run_number")
    .eq("upload_id", uploadId)
    .order("run_number", { ascending: false })
    .limit(1);

  if (error) throw error;
  return Number(data?.[0]?.run_number || 0) + 1;
}

async function createAnalysisRun(params: {
  uploadId: string;
  triggerSource: string;
  extractionModel: string;
  reasoningModel: string;
}) {
  const runNumber = await nextRunNumber(params.uploadId);

  const { data, error } = await supabaseAdmin
    .from("nova_schoolwork_analysis_runs")
    .insert({
      upload_id: params.uploadId,
      run_number: runNumber,
      trigger_source: params.triggerSource,
      status: "running",
      stage: "starting",
      extraction_model: params.extractionModel,
      reasoning_model: params.reasoningModel,
      started_at: new Date().toISOString(),
    })
    .select("id,run_number,started_at")
    .single();

  if (error) throw error;
  return data;
}

/*
 * Every upload write after the claim is scoped to this request's own claim
 * token (analysis_started_at), so a superseded or failed request can never
 * overwrite a newer analysis, a review or an archive.
 */
function updateClaimedUpload(
  uploadId: string,
  claimToken: string,
  values: Record<string, unknown>,
) {
  return supabaseAdmin
    .from("nova_schoolwork_uploads")
    .update(values)
    .eq("id", uploadId)
    .eq("status", "analysing")
    .eq("analysis_started_at", claimToken);
}

/*
 * A request that never claimed the upload (claimToken null) does not own it
 * and writes nothing: it must not mark another request's analysis failed.
 */
async function markFailed(
  uploadId: string,
  error: unknown,
  claimToken: string | null,
) {
  if (!claimToken) return;

  const friendlyMessage =
    friendlyAnalysisError(error);

  await updateClaimedUpload(uploadId, claimToken, {
    status: "failed",
    error_message:
      friendlyMessage.slice(0, 1000),
    analysis_completed_at:
      new Date().toISOString(),
  });

  // Analyses rows are readable by learner viewers (RLS SELECT), so only the
  // error code and safe message are stored; raw text goes to server logs.
  try {
    await supabaseAdmin
      .from("nova_schoolwork_analyses")
      .update({
        error_message:
          `${analysisErrorCode(error)}: ${friendlyMessage}`.slice(0, 4000),
        completed_at:
          new Date().toISOString(),
      })
      .eq("upload_id", uploadId)
      // The shared analyses row belongs to the newest claim (started_at).
      .eq("started_at", claimToken);
  } catch {
    // Do not mask the original analysis failure if logging fails.
  }
}

export async function POST(request: Request) {
  let uploadId = "";
  // Set only once this request owns the analysis (claim) and its run row.
  let claimToken: string | null = null;
  let runId: string | null = null;
  // Once this request has finalized its analysis, a later error (for example
  // while building the response) must not mark anything failed.
  let finalized = false;

  try {
    const { user, client: userClient } = await requireCurrentUser(request);

    const settings =
      await loadSchoolworkSettings();

    if (!settings.enabled) {
      return json(
        {
          error_code: "SCHOOLWORK_AI_PAUSED",
          error:
            "Schoolwork analysis is temporarily paused.",
        },
        503,
      );
    }

    const body = (await request.json().catch(() => ({}))) as {
      upload_id?: unknown;
      subject_hint?: unknown;
      primary_level_hint?: unknown;
      trigger_source?: unknown;
    };

    const requestedUploadId = cleanText(body.upload_id);

    if (!requestedUploadId) {
      return json({ error: "upload_id is required." }, 400);
    }

    // Authorise the caller before any privileged write or full-row read.
    // Only the owner column is loaded until access is confirmed.
    const { data: ownerData, error: ownerError } = await supabaseAdmin
      .from("nova_schoolwork_uploads")
      .select("id,student_user_id")
      .eq("id", requestedUploadId)
      .maybeSingle();

    if (ownerError) throw ownerError;

    if (!ownerData) {
      return json({ error: "Schoolwork upload not found." }, 404);
    }

    const ownerStudentUserId = String(
      (ownerData as { student_user_id: unknown }).student_user_id,
    );

    const { data: canView, error: accessError } = await userClient.rpc(
      "nova_plus_can_view_student",
      {
        p_student_user_id: ownerStudentUserId,
      },
    );

    if (accessError || !canView) {
      return json(
        {
          error:
            "You do not have access to this learner.",
        },
        403,
      );
    }

    // Only set after authorisation: the catch handler uses uploadId to mark
    // the upload as failed, so it must never point at an unauthorised row.
    uploadId = requestedUploadId;

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .from("nova_schoolwork_uploads")
      .select("*")
      .eq("id", uploadId)
      .eq("student_user_id", ownerStudentUserId)
      .maybeSingle();

    if (uploadError) throw uploadError;

    if (!uploadData) {
      return json({ error: "Schoolwork upload not found." }, 404);
    }

    let upload = uploadData as SchoolworkUploadRow;

    // Storage metadata is browser-supplied: never sign, fetch or send an
    // object that is not this upload's canonical private key. Fail closed
    // without echoing the stored path.
    if (
      !isCanonicalSchoolworkObject({
        bucket: upload.storage_bucket,
        path: upload.storage_path,
        studentUserId: upload.student_user_id,
        uploadId: upload.id,
      })
    ) {
      console.error("NOVA+ schoolwork upload has non-canonical storage metadata", {
        upload_id: uploadId,
      });

      return json(
        {
          error_code: "STORAGE_OBJECT_INVALID",
          error: publicSchoolworkError("STORAGE_OBJECT_INVALID"),
        },
        422,
      );
    }

    // Approved / archived uploads hold reviewed evidence: never re-analyse
    // (that would delete and re-insert reviewed items).
    const startDecision = analysisStartDecision({
      status: upload.status,
      analysisStartedAt: upload.analysis_started_at,
      nowMs: Date.now(),
    });

    if (!startDecision.ok) {
      return json(
        {
          error_code: startDecision.code,
          error: publicSchoolworkError(startDecision.code),
        },
        409,
      );
    }

    const requestedSubjectHint = cleanText(body.subject_hint);
    const requestedLevelHint = Number(body.primary_level_hint);

    if (!ALLOWED_MIME_TYPES.has(upload.mime_type)) {
      return json(
        {
          error:
            "Unsupported schoolwork file type.",
        },
        400,
      );
    }

    const maxFileBytes =
      Math.max(
        1,
        Number(
          settings.max_file_size_mb ||
            20,
        ),
      ) *
      1024 *
      1024;

    if (
      Number(upload.file_size_bytes) <= 0 ||
      Number(upload.file_size_bytes) >
        maxFileBytes
    ) {
      return json(
        {
          error_code: "FILE_TOO_LARGE",
          error:
            `The current schoolwork limit is ${settings.max_file_size_mb} MB per file.`,
        },
        413,
      );
    }

    if (
      ["english", "math"].includes(requestedSubjectHint) ||
      (
        Number.isInteger(requestedLevelHint) &&
        requestedLevelHint >= 1 &&
        requestedLevelHint <= 6
      )
    ) {
      const updates: Record<string, unknown> = {};

      if (["english", "math"].includes(requestedSubjectHint)) {
        updates.subject_hint = requestedSubjectHint;
      }

      if (
        Number.isInteger(requestedLevelHint) &&
        requestedLevelHint >= 1 &&
        requestedLevelHint <= 6
      ) {
        updates.primary_level_hint = requestedLevelHint;
      }

      const { data: updatedUpload, error: hintError } =
        await supabaseAdmin
          .from("nova_schoolwork_uploads")
          .update(updates)
          .eq("id", uploadId)
          .select("*")
          .single();

      if (hintError) throw hintError;
      upload = updatedUpload as SchoolworkUploadRow;
    }

    // Hints sent with an explicit needs_input retry are the reviewer's
    // confirmation of the curriculum scope after a contradiction.
    const hintsConfirmed =
      cleanText(body.trigger_source) === "needs_input_retry" &&
      (
        ["english", "math"].includes(requestedSubjectHint) ||
        (
          Number.isInteger(requestedLevelHint) &&
          requestedLevelHint >= 1 &&
          requestedLevelHint <= 6
        )
      );

    const rollingDayStart =
      new Date(
        Date.now() -
          24 * 60 * 60 * 1000,
      ).toISOString();

    const { count: recentUploadCount } =
      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq(
          "student_user_id",
          upload.student_user_id,
        )
        .gte(
          "created_at",
          rollingDayStart,
        );

    if (
      Number(recentUploadCount || 0) >
      Number(
        settings.daily_upload_limit ||
          10,
      )
    ) {
      return json(
        {
          error_code:
            "DAILY_UPLOAD_LIMIT",
          error:
            `This learner has reached the current ${settings.daily_upload_limit}-upload limit for the last 24 hours.`,
        },
        429,
      );
    }

    const extractionModel =
      process.env.NOVA_SCHOOLWORK_EXTRACT_MODEL ||
      settings.extraction_model;

    const reasoningModel =
      process.env.NOVA_SCHOOLWORK_REASON_MODEL ||
      settings.reasoning_model;

    const startedAt = new Date().toISOString();

    const triggerSource = [
      "initial",
      "manual_retry",
      "needs_input_retry",
      "reanalyse",
    ].includes(cleanText(body.trigger_source))
      ? cleanText(body.trigger_source)
      : "initial";

    // Compare-and-set claim: only one request can move this upload into
    // `analysing` from the status it was read in (a stale claim is reclaimed
    // only if it is still the exact claim that was observed).
    let claimQuery = supabaseAdmin
      .from("nova_schoolwork_uploads")
      .update({
        status: "analysing",
        extraction_model: extractionModel,
        analysis_model: reasoningModel,
        analysis_version: ANALYSIS_VERSION,
        analysis_started_at: startedAt,
        analysis_completed_at: null,
        error_message: null,
      })
      .eq("id", uploadId)
      .eq("status", upload.status);

    if (startDecision.reclaimStale) {
      claimQuery = claimQuery.eq(
        "analysis_started_at",
        upload.analysis_started_at,
      );
    }

    const { data: claimedRows, error: startError } =
      await claimQuery.select("id");

    if (startError) throw startError;

    if (!Array.isArray(claimedRows) || claimedRows.length !== 1) {
      return json(
        {
          error_code: "ANALYSIS_IN_PROGRESS",
          error: publicSchoolworkError("ANALYSIS_IN_PROGRESS"),
        },
        409,
      );
    }

    claimToken = startedAt;

    // Only the newest claim holder reaches this point (the compare-and-set
    // above), so it takes the shared analyses row for this claim and clears
    // the previous summary. Every later analyses write filters on
    // started_at = this claim token, so a superseded request can no longer
    // change it, and anything it wrote earlier is cleared here.
    const { error: analysisClaimError } = await supabaseAdmin
      .from("nova_schoolwork_analyses")
      .upsert(
        {
          upload_id: uploadId,
          started_at: startedAt,
          completed_at: null,
          error_message: null,
          overall_summary: "",
          strength_skill_codes: [],
          support_skill_codes: [],
        },
        { onConflict: "upload_id" },
      );

    if (analysisClaimError) throw analysisClaimError;

    const run = await createAnalysisRun({
      uploadId,
      triggerSource,
      extractionModel,
      reasoningModel,
    });

    runId = String(run.id);

    // Terminal "needs_input" exits write the upload only if this request
    // still owns the claim; otherwise the caller is told it was superseded.
    const claimedExit = async (values: Record<string, unknown>) => {
      const { data: exitRows, error: exitError } = await updateClaimedUpload(
        uploadId,
        startedAt,
        values,
      ).select("id");

      if (exitError) throw exitError;
      return Array.isArray(exitRows) && exitRows.length === 1;
    };

    // Stops this request without touching the upload: its claim was lost or
    // reviewed evidence appeared. Only its own run row is closed.
    const stopAnalysis = async (
      code: "ANALYSIS_SUPERSEDED" | "UPLOAD_LOCKED",
    ) => {
      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "failed",
          stage: "failed",
          duration_ms: Date.now() - runStartedMs,
          error_code: code,
          error_message: publicSchoolworkError(code),
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json(
        { error_code: code, error: publicSchoolworkError(code) },
        409,
      );
    };

    const runStartedMs = Date.now();

    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({ stage: "extracting" })
      .eq("id", run.id);

    // Signs only the canonical key validated above (constant bucket).
    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from(upload.storage_bucket)
        .createSignedUrl(upload.storage_path, 15 * 60);

    if (signedError || !signedData?.signedUrl) {
      throw new Error("SIGNED_URL_FAILED");
    }

    const filePart = fileContentPart({
      mimeType: upload.mime_type,
      signedUrl: signedData.signedUrl,
      // The original filename may identify the learner; never send it.
      filename: neutralAiFilename(upload.mime_type),
    });

    const extractionCall = await callOpenAIWithFallback({
      model: extractionModel,
      instructions: extractionInstructions(),
      inputText: `
Analyse this uploaded schoolwork.

Uploader hints:
- subject_hint: ${upload.subject_hint || "auto"}
- primary_level_hint: ${
        upload.primary_level_hint
          ? `Primary ${upload.primary_level_hint}`
          : "auto"
      }

Hints are context only. Do not force them when the document clearly contradicts them.
`,
      filePart,
      schemaName: "nova_schoolwork_extraction_v1",
      schema: extractionSchema(settings.max_questions),
      reasoningEffort: "low",
      maxAutomaticRetries:
        settings.automatic_retry_count,
      fallbackEnabled:
        settings.fallback_enabled,
      fallbackModel:
        settings.fallback_model,
    });

    const extraction = extractionCall.parsed as ExtractionResult;

    if (Number(extraction.pages_detected || 0) > settings.max_pages) {
      const message =
        `PAGE_LIMIT_EXCEEDED: This upload appears to contain ` +
        `${extraction.pages_detected} pages. Please upload up to ` +
        `${settings.max_pages} pages at a time.`;

      if (
        !(await claimedExit({
          status: "needs_input",
          page_count: Number(extraction.pages_detected || 0),
          error_message:
            `Please upload up to ${settings.max_pages} pages at a time.`,
          analysis_completed_at: new Date().toISOString(),
        }))
      ) {
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "needs_input",
          stage: "failed",
          extraction_response_id: extractionCall.responseId,
          extraction_raw: extraction,
          extraction_usage: extractionCall.usage,
          extraction_cost_usd: estimateCostUsd(
            extractionCall.modelUsed,
            extractionCall.usage,
          ),
          automatic_retry_count:
            extractionCall.automaticRetryCount,
          page_count: Number(extraction.pages_detected || 0),
          question_count: extraction.questions?.length || 0,
          duration_ms: Date.now() - runStartedMs,
          error_code: "PAGE_LIMIT_EXCEEDED",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json(
        {
          status: "needs_input",
          upload_id: uploadId,
          error_code: "PAGE_LIMIT_EXCEEDED",
          message:
            `Please upload up to ${settings.max_pages} pages at a time.`,
        },
        422,
      );
    }

    if ((extraction.questions?.length || 0) > settings.max_questions) {
      const message = publicSchoolworkError("QUESTION_LIMIT_EXCEEDED");

      if (
        !(await claimedExit({
          status: "needs_input",
          error_message: message,
          analysis_completed_at: new Date().toISOString(),
        }))
      ) {
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "needs_input",
          stage: "failed",
          extraction_response_id: extractionCall.responseId,
          extraction_usage: extractionCall.usage,
          extraction_cost_usd: estimateCostUsd(
            extractionCall.modelUsed,
            extractionCall.usage,
          ),
          automatic_retry_count:
            extractionCall.automaticRetryCount,
          question_count: extraction.questions.length,
          duration_ms: Date.now() - runStartedMs,
          error_code: "QUESTION_LIMIT_EXCEEDED",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json(
        {
          status: "needs_input",
          upload_id: uploadId,
          error_code: "QUESTION_LIMIT_EXCEEDED",
          max_questions: settings.max_questions,
          message,
        },
        422,
      );
    }

    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({
        extraction_response_id: extractionCall.responseId,
        extraction_raw: extraction,
        extraction_usage: extractionCall.usage,
        extraction_cost_usd: estimateCostUsd(
          extractionCall.modelUsed,
          extractionCall.usage,
        ),
        automatic_retry_count:
          extractionCall.automaticRetryCount,
        page_count: Math.max(
          1,
          Number(extraction.pages_detected || 1),
        ),
        question_count: extraction.questions?.length || 0,
        stage: "reasoning",
      })
      .eq("id", run.id);

    const hintConflict = detectHintConflict({
      subjectHint: upload.subject_hint,
      levelHint: upload.primary_level_hint,
      detectedSubject: extraction.subject,
      detectedLevel: extraction.primary_level,
    });

    if (hintConflict && !hintsConfirmed) {
      const message = hintConflictMessage(hintConflict);

      if (
        !(await claimedExit({
          status: "needs_input",
          analysis_completed_at: new Date().toISOString(),
          error_message: message,
        }))
      ) {
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "needs_input",
          stage: "failed",
          duration_ms: Date.now() - runStartedMs,
          error_code: "HINT_CONFLICT",
          error_message: message,
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json(
        {
          status: "needs_input",
          upload_id: uploadId,
          error_code: "HINT_CONFLICT",
          message,
          conflict: hintConflict,
        },
        422,
      );
    }

    const resolvedSubject =
      upload.subject_hint ||
      (["english", "math"].includes(extraction.subject)
        ? extraction.subject
        : null);

    const resolvedLevel =
      upload.primary_level_hint ||
      (extraction.primary_level >= 1 && extraction.primary_level <= 6
        ? extraction.primary_level
        : null);

    const { data: extractionRows, error: extractionWriteError } =
      await supabaseAdmin
        .from("nova_schoolwork_analyses")
        .update({
          extraction_model: extractionCall.modelUsed,
          reasoning_model: reasoningModel,
          extraction_response_id: extractionCall.responseId,
          extraction_raw: extraction,
          extraction_usage: extractionCall.usage,
          error_message: null,
        })
        .eq("upload_id", uploadId)
        .eq("started_at", startedAt)
        .select("upload_id");

    if (extractionWriteError) throw extractionWriteError;

    if (!Array.isArray(extractionRows) || extractionRows.length !== 1) {
      return await stopAnalysis("ANALYSIS_SUPERSEDED");
    }

    const { data: detectedRows, error: detectedError } =
      await updateClaimedUpload(uploadId, startedAt, {
      assignment_title: cleanText(extraction.assignment_title) || null,
      detected_subject:
        extraction.subject === "uncertain"
          ? "uncertain"
          : extraction.subject,
      detected_primary_level:
        extraction.primary_level >= 1 && extraction.primary_level <= 6
          ? extraction.primary_level
          : null,
      document_quality: extraction.document_quality,
      teacher_marked: Boolean(extraction.teacher_marked),
      page_count: Math.max(1, Number(extraction.pages_detected || 1)),
    }).select("id");

    if (detectedError) throw detectedError;

    if (!Array.isArray(detectedRows) || detectedRows.length !== 1) {
      return await stopAnalysis("ANALYSIS_SUPERSEDED");
    }

    if (!resolvedSubject || !resolvedLevel) {
      if (
        !(await claimedExit({
          status: "needs_input",
          analysis_completed_at: new Date().toISOString(),
          error_message:
            "Choose the subject and Primary level, then continue analysis.",
        }))
      ) {
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "needs_input",
          stage: "failed",
          duration_ms: Date.now() - runStartedMs,
          error_code: "SUBJECT_LEVEL_REQUIRED",
          error_message:
            "Subject and Primary level could not both be resolved.",
          completed_at: new Date().toISOString(),
        })
        .eq("id", run.id);

      return json(
        {
          status: "needs_input",
          upload_id: uploadId,
          error_code: "SUBJECT_LEVEL_REQUIRED",
          message:
            "Nova could not confidently determine both the subject and Primary level. Choose them manually and continue analysis.",
          extraction,
        },
        422,
      );
    }

    let taxonomyQuery = supabaseAdmin
      .from("learning_skill_taxonomy")
      .select(
        "id,skill_code,skill_name,domain,topic,public_explanation",
      )
      .eq("subject", resolvedSubject)
      .eq("primary_level", resolvedLevel)
      .eq("source", "nova_curriculum_rollout_sql")
      .eq("is_topic_level", false)
      .eq("is_active", true)
      .eq("review_status", "approved")
      .order("topic")
      .order("skill_code");

    const { data: taxonomyData, error: taxonomyError } =
      await taxonomyQuery;

    if (taxonomyError) throw taxonomyError;

    const taxonomy = ((taxonomyData ?? []) as TaxonomyRow[]).filter(
      (skill) => {
        if (resolvedSubject !== "english") return true;
        const scope =
          `${skill.domain} ${skill.topic} ${skill.skill_name}`.toLowerCase();
        return !scope.includes("listening") && !scope.includes("viewing");
      },
    );

    if (!taxonomy.length) {
      throw new Error(
        `NO_CANONICAL_TAXONOMY: ${resolvedSubject} Primary ${resolvedLevel}`,
      );
    }

    const conceptList = taxonomy.map((skill) => ({
      skill_code: skill.skill_code,
      skill_name: skill.skill_name,
      domain: skill.domain,
      topic: skill.topic,
      public_explanation: skill.public_explanation || "",
    }));

    const reasoningCall = await callOpenAIWithFallback({
      model: reasoningModel,
      instructions: reasoningInstructions(),
      inputText: `
Resolved learner curriculum scope:
- Subject: ${resolvedSubject}
- Primary level: ${resolvedLevel}

FIRST-STAGE EXTRACTION:
${JSON.stringify(extraction)}

ALLOWED CANONICAL CONCEPTS:
${JSON.stringify(conceptList)}

Re-check the original file, then produce the final verified analysis.
`,
      filePart,
      schemaName: "nova_schoolwork_reasoned_analysis_v1",
      schema: reasoningSchema(
        taxonomy.map((skill) => skill.skill_code),
        settings.max_questions,
      ),
      reasoningEffort: "medium",
      maxAutomaticRetries:
        settings.automatic_retry_count,
      fallbackEnabled:
        settings.fallback_enabled,
      fallbackModel:
        settings.fallback_model,
    });

    const rawReasoned =
      reasoningCall.parsed as ReasonedResult;

    const validSkillCodes = new Set(
      taxonomy.map((skill) => skill.skill_code),
    );

    const reasoned: ReasonedResult = {
      ...rawReasoned,

      strength_skill_codes: uniqueSkillCodes(
        rawReasoned.strength_skill_codes,
        validSkillCodes,
        8,
      ),

      support_skill_codes: uniqueSkillCodes(
        rawReasoned.support_skill_codes,
        validSkillCodes,
        8,
      ),

      items: (rawReasoned.items ?? []).map((item) => {
        const primarySkillCode =
          validSkillCodes.has(
            cleanText(item.primary_skill_code),
          )
            ? cleanText(item.primary_skill_code)
            : "";

        const supportingSkillCodes =
          uniqueSkillCodes(
            item.supporting_skill_codes,
            validSkillCodes,
            2,
          ).filter(
            (code) =>
              code !== primarySkillCode,
          );

        return {
          ...item,
          primary_skill_code:
            primarySkillCode,
          supporting_skill_codes:
            supportingSkillCodes,
        };
      }),
    };

    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({
        reasoning_response_id: reasoningCall.responseId,
        analysis_raw: reasoned,
        reasoning_usage: reasoningCall.usage,
        reasoning_cost_usd: estimateCostUsd(
          reasoningCall.modelUsed,
          reasoningCall.usage,
        ),
        automatic_retry_count:
          extractionCall.automaticRetryCount +
          reasoningCall.automaticRetryCount,
        stage: "saving",
      })
      .eq("id", run.id);

    const taxonomyByCode = new Map(
      taxonomy.map((skill) => [skill.skill_code, skill]),
    );

    if ((reasoned.items?.length || 0) > settings.max_questions) {
      throw new Error("QUESTION_LIMIT_EXCEEDED");
    }

    const validItems = [...(reasoned.items ?? [])]
      .sort((a, b) => Number(a.item_index) - Number(b.item_index));

    const confidenceValues = validItems
      .map((item) => clamp01(item.mapping_confidence))
      .filter((value) => value > 0);

    const analysisConfidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length
      : 0;

    // Rows for this analysis, built once. They are written either atomically
    // by the finalize RPC (when enabled) or by single-statement bulk inserts,
    // never one REST request per item.
    const itemRows = validItems.map((item) => {
      const primarySkill = taxonomyByCode.get(item.primary_skill_code);
      const evidenceWeight = proposedEvidenceWeight(item);
      const skillCodes = [
        ...new Set(
          [
            item.primary_skill_code,
            ...(item.supporting_skill_codes || []),
          ].filter(Boolean),
        ),
      ];

      return {
        row: {
          upload_id: uploadId,
          item_index: Number(item.item_index),
          page_number:
            Number(item.page_number) > 0
              ? Number(item.page_number)
              : null,
          question_number: cleanText(item.question_number) || null,
          prompt: cleanText(item.prompt),
          student_answer: cleanText(item.student_answer),
          expected_answer: cleanText(item.expected_answer),
          teacher_mark: item.teacher_mark,
          teacher_feedback: cleanText(item.teacher_feedback),
          final_correctness: item.final_correctness,
          correctness_source: item.correctness_source,
          extraction_confidence: clamp01(item.extraction_confidence),
          correctness_confidence: clamp01(item.correctness_confidence),
          mapping_confidence: clamp01(item.mapping_confidence),
          needs_review: storedNeedsReview(item, Boolean(primarySkill)),
          evidence_recommendation: item.evidence_recommendation,
          proposed_evidence_weight: evidenceWeight,
          reasoning_note: cleanText(item.reasoning_note),
          raw_item: item,
        },
        skills: skillCodes.flatMap((skillCode) => {
          const skill = taxonomyByCode.get(skillCode);
          if (!skill) return [];

          return [
            {
              skill_id: skill.id,
              is_primary_skill: skillCode === item.primary_skill_code,
              mapping_confidence: clamp01(item.mapping_confidence),
              proposed_evidence_weight: evidenceWeight,
              mapping_reason:
                skillCode === item.primary_skill_code
                  ? "AI-proposed primary canonical concept from schoolwork analysis."
                  : "AI-proposed supporting canonical concept from schoolwork analysis.",
              approved: false,
            },
          ];
        }),
      };
    });

    const completedAt = new Date().toISOString();

    const { data: summaryRows, error: analysisUpdateError } =
      await supabaseAdmin
        .from("nova_schoolwork_analyses")
        .update({
          reasoning_model: reasoningCall.modelUsed,
          reasoning_response_id: reasoningCall.responseId,
          analysis_raw: reasoned,
          overall_summary: cleanText(reasoned.overall_summary),
          strength_skill_codes: reasoned.strength_skill_codes ?? [],
          support_skill_codes: reasoned.support_skill_codes ?? [],
          reasoning_usage: reasoningCall.usage,
          completed_at: completedAt,
          error_message: null,
        })
        .eq("upload_id", uploadId)
        .eq("started_at", startedAt)
        .select("upload_id");

    if (analysisUpdateError) throw analysisUpdateError;

    if (!Array.isArray(summaryRows) || summaryRows.length !== 1) {
      return await stopAnalysis("ANALYSIS_SUPERSEDED");
    }

    const extractionCost = estimateCostUsd(
      extractionCall.modelUsed,
      extractionCall.usage,
    );

    const reasoningCost = estimateCostUsd(
      reasoningCall.modelUsed,
      reasoningCall.usage,
    );

    // Run telemetry only; the run's success status is written together with
    // (atomic path) or immediately before (bulk path) the item rewrite.
    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({
        extraction_model:
          extractionCall.modelUsed,
        reasoning_model:
          reasoningCall.modelUsed,
        extraction_response_id: extractionCall.responseId,
        reasoning_response_id: reasoningCall.responseId,
        extraction_raw: extraction,
        analysis_raw: reasoned,
        extraction_usage: extractionCall.usage,
        reasoning_usage: reasoningCall.usage,
        extraction_cost_usd: extractionCost,
        reasoning_cost_usd: reasoningCost,
        total_cost_usd:
          extractionCost === null ||
          reasoningCost === null
            ? null
            : extractionCost + reasoningCost,
        automatic_retry_count:
          extractionCall.automaticRetryCount +
          reasoningCall.automaticRetryCount,
        page_count: Math.max(
          1,
          Number(extraction.pages_detected || 1),
        ),
        duration_ms: Date.now() - runStartedMs,
      })
      .eq("id", run.id);

    const uploadFields = {
      detected_subject: resolvedSubject,
      detected_primary_level: resolvedLevel,
      assignment_title:
        cleanText(reasoned.assignment_title) ||
        cleanText(extraction.assignment_title) ||
        null,
      analysis_confidence: analysisConfidence,
    };

    let analysisRevision = Number(upload.analysis_revision || 0) + 1;

    if (process.env.NOVA_SCHOOLWORK_ATOMIC_FINALIZE === "on") {
      // One transaction: claim check, item rewrite, run success, review_ready.
      const { data: finalizedResult, error: finalizeError } =
        await supabaseAdmin.rpc("finalize_nova_schoolwork_analysis", {
          p_upload_id: uploadId,
          p_claim_started_at: startedAt,
          p_run_id: run.id,
          p_items: itemRows.map((entry) => ({
            ...entry.row,
            skills: entry.skills,
          })),
          p_upload: uploadFields,
        });

      if (finalizeError) {
        const finalizeMessage = String(finalizeError.message || "");

        if (finalizeMessage.includes("ANALYSIS_CLAIM_LOST")) {
          return await stopAnalysis("ANALYSIS_SUPERSEDED");
        }

        if (finalizeMessage.includes("UPLOAD_HAS_REVIEWED_EVIDENCE")) {
          return await stopAnalysis("UPLOAD_LOCKED");
        }

        throw finalizeError;
      }

      analysisRevision = Number(
        (finalizedResult as { analysis_revision?: unknown } | null)
          ?.analysis_revision ?? analysisRevision,
      );
      finalized = true;
    } else {
      // Items are only rewritten while this request still holds its claim
      // and no reviewed evidence exists; otherwise stop without touching the
      // upload.
      const { data: claimRow, error: claimCheckError } = await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .select("status,analysis_started_at")
        .eq("id", uploadId)
        .maybeSingle();

      if (claimCheckError) throw claimCheckError;

      const { data: reviewedRows, error: reviewedError } = await supabaseAdmin
        .from("nova_schoolwork_items")
        .select("id")
        .eq("upload_id", uploadId)
        .eq("included_in_profile", true)
        .limit(1);

      if (reviewedError) throw reviewedError;

      const claimStillHeld =
        claimRow?.status === "analysing" &&
        new Date(String(claimRow.analysis_started_at || "")).getTime() ===
          new Date(startedAt).getTime();

      if (!claimStillHeld) {
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      if ((reviewedRows ?? []).length > 0) {
        return await stopAnalysis("UPLOAD_LOCKED");
      }

      const { error: deleteItemsError } = await supabaseAdmin
        .from("nova_schoolwork_items")
        .delete()
        .eq("upload_id", uploadId);

      if (deleteItemsError) throw deleteItemsError;

      if (itemRows.length) {
        // One statement: all items are inserted or none are.
        const { data: insertedRows, error: itemError } = await supabaseAdmin
          .from("nova_schoolwork_items")
          .insert(itemRows.map((entry) => entry.row))
          .select("id,item_index");

        if (itemError) throw itemError;

        const idByIndex = new Map(
          ((insertedRows ?? []) as Array<{ id: unknown; item_index: unknown }>)
            .map((row) => [Number(row.item_index), String(row.id)]),
        );

        if (idByIndex.size !== itemRows.length) {
          throw new Error("ITEM_INSERT_INCOMPLETE");
        }

        const mappingRows = itemRows.flatMap((entry) =>
          entry.skills.map((skill) => ({
            item_id: idByIndex.get(entry.row.item_index),
            ...skill,
          })),
        );

        if (mappingRows.length) {
          const { error: mappingError } = await supabaseAdmin
            .from("nova_schoolwork_item_skills")
            .insert(mappingRows);

          if (mappingError) throw mappingError;
        }
      }

      // Success is recorded before review_ready: the commit guard requires
      // the latest run to have succeeded with a matching question count.
      const { error: runSuccessError } = await supabaseAdmin
        .from("nova_schoolwork_analysis_runs")
        .update({
          status: "succeeded",
          stage: "complete",
          question_count: itemRows.length,
          completed_at: completedAt,
          error_code: null,
          error_message: null,
        })
        .eq("id", run.id);

      if (runSuccessError) throw runSuccessError;

      const { data: finalRows, error: uploadUpdateError } =
        await updateClaimedUpload(uploadId, startedAt, {
          status: "review_ready",
          analysis_revision: analysisRevision,
          ...uploadFields,
          analysis_completed_at: completedAt,
          error_message: null,
        }).select("id");

      if (uploadUpdateError) throw uploadUpdateError;

      if (!Array.isArray(finalRows) || finalRows.length !== 1) {
        // Claim lost after the items were written (e.g. archived meanwhile):
        // never report success. The run is closed as failed, so the commit
        // guard refuses these rows until a new analysis succeeds.
        return await stopAnalysis("ANALYSIS_SUPERSEDED");
      }

      finalized = true;
    }

    const skillDisplay = Object.fromEntries(
      taxonomy.map((skill) => [
        skill.skill_code,
        {
          skill_id: skill.id,
          skill_code: skill.skill_code,
          skill_name: skill.skill_name,
          domain: skill.domain,
          topic: skill.topic,
        },
      ]),
    );

    return json({
      status: "review_ready",
      upload: {
        id: uploadId,
        student_user_id: upload.student_user_id,
        assignment_title:
          cleanText(reasoned.assignment_title) ||
          cleanText(extraction.assignment_title),
        subject: resolvedSubject,
        primary_level: resolvedLevel,
        page_count: Math.max(1, Number(extraction.pages_detected || 1)),
        teacher_marked: Boolean(extraction.teacher_marked),
        document_quality: extraction.document_quality,
        analysis_confidence: analysisConfidence,
        analysis_revision: analysisRevision,
      },
      analysis: {
        overall_summary: reasoned.overall_summary,
        strength_skill_codes: reasoned.strength_skill_codes ?? [],
        support_skill_codes: reasoned.support_skill_codes ?? [],
        extraction_model: extractionModel,
        reasoning_model: reasoningModel,
      },
      skills: skillDisplay,
      items: validItems.map((item) => ({
        ...item,
        // Same stricter flag that was stored above, not the model's raw flag.
        needs_review: storedNeedsReview(
          item,
          taxonomyByCode.has(item.primary_skill_code),
        ),
        proposed_evidence_weight: proposedEvidenceWeight(item),
        primary_skill: item.primary_skill_code
          ? skillDisplay[item.primary_skill_code] || null
          : null,
        supporting_skills: (item.supporting_skill_codes || [])
          .map((code) => skillDisplay[code])
          .filter(Boolean),
      })),
    });
  } catch (error) {
    if (uploadId && !finalized) {
      await markFailed(uploadId, error, claimToken).catch(() => undefined);

      // Only this request's own run row (never "the latest running run",
      // which may belong to a newer request).
      if (runId) {
        try {
          await supabaseAdmin
            .from("nova_schoolwork_analysis_runs")
            .update({
              status: "failed",
              stage: "failed",
              error_code: analysisErrorCode(error),
              error_message: friendlyAnalysisError(error),
              completed_at: new Date().toISOString(),
            })
            .eq("id", runId);
        } catch {
          // Preserve the original analysis failure.
        }
      }
    }

    const message =
      error instanceof Error ? error.message : String(error);

    if (message === "AUTH_REQUIRED") {
      return json({ error: "Please sign in again." }, 401);
    }

    if (message === "OPENAI_API_KEY_MISSING") {
      return json(
        {
          error:
            "The worksheet analysis service is not configured yet.",
        },
        500,
      );
    }

    console.error("NOVA+ schoolwork analysis failed", error);

    return json(
      {
        error:
          friendlyAnalysisError(error),
      },
      500,
    );
  }
}
