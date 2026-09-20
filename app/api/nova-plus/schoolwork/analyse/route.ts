import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

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

function analysisErrorCode(error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "");

  if (message.includes("PAGE_LIMIT_EXCEEDED")) {
    return "PAGE_LIMIT_EXCEEDED";
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

function extractionSchema() {
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
        maxItems: 80,
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

function reasoningSchema(skillCodes: string[]) {
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
        uniqueItems: true,
        maxItems: 8,
        items: {
          type: "string",
          enum: skillCodes,
        },
      },
      support_skill_codes: {
        type: "array",
        uniqueItems: true,
        maxItems: 8,
        items: {
          type: "string",
          enum: skillCodes,
        },
      },
      items: {
        type: "array",
        maxItems: 80,
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
              uniqueItems: true,
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

async function markFailed(uploadId: string, error: unknown) {
  const message =
    error instanceof Error ? error.message : String(error || "Unexpected error");

  await supabaseAdmin
    .from("nova_schoolwork_uploads")
    .update({
      status: "failed",
      error_message: message.slice(0, 4000),
      analysis_completed_at: new Date().toISOString(),
    })
    .eq("id", uploadId);

  // Best-effort secondary failure logging. Supabase's query builder is
  // PromiseLike, not a full Promise, so chaining .catch() is not type-safe.
  try {
    await supabaseAdmin
      .from("nova_schoolwork_analyses")
      .update({
        error_message: message.slice(0, 4000),
        completed_at: new Date().toISOString(),
      })
      .eq("upload_id", uploadId);
  } catch {
    // Do not mask the original analysis failure if this logging update fails.
  }
}

export async function POST(request: Request) {
  let uploadId = "";

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

    uploadId = cleanText(body.upload_id);

    if (!uploadId) {
      return json({ error: "upload_id is required." }, 400);
    }

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .from("nova_schoolwork_uploads")
      .select("*")
      .eq("id", uploadId)
      .maybeSingle();

    if (uploadError) throw uploadError;

    if (!uploadData) {
      return json({ error: "Schoolwork upload not found." }, 404);
    }

    let upload = uploadData as SchoolworkUploadRow;

    const requestedSubjectHint = cleanText(body.subject_hint);
    const requestedLevelHint = Number(body.primary_level_hint);

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

    const { data: canView, error: accessError } = await userClient.rpc(
      "nova_plus_can_view_student",
      {
        p_student_user_id: upload.student_user_id,
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

    const run = await createAnalysisRun({
      uploadId,
      triggerSource,
      extractionModel,
      reasoningModel,
    });

    const runStartedMs = Date.now();

    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({ stage: "extracting" })
      .eq("id", run.id);

    const { error: startError } = await supabaseAdmin
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
      .eq("id", uploadId);

    if (startError) throw startError;

    const { data: signedData, error: signedError } =
      await supabaseAdmin.storage
        .from(upload.storage_bucket)
        .createSignedUrl(upload.storage_path, 15 * 60);

    if (signedError || !signedData?.signedUrl) {
      throw new Error(
        `SIGNED_URL_FAILED: ${signedError?.message || "No signed URL returned."}`,
      );
    }

    const filePart = fileContentPart({
      mimeType: upload.mime_type,
      signedUrl: signedData.signedUrl,
      filename: upload.original_filename,
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
      schema: extractionSchema(),
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

      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .update({
          status: "needs_input",
          page_count: Number(extraction.pages_detected || 0),
          error_message:
            `Please upload up to ${settings.max_pages} pages at a time.`,
          analysis_completed_at: new Date().toISOString(),
        })
        .eq("id", uploadId);

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
      extraction.questions =
        extraction.questions.slice(0, settings.max_questions);
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

    await supabaseAdmin
      .from("nova_schoolwork_analyses")
      .upsert(
        {
          upload_id: uploadId,
          extraction_model: extractionCall.modelUsed,
          reasoning_model: reasoningModel,
          extraction_response_id: extractionCall.responseId,
          extraction_raw: extraction,
          extraction_usage: extractionCall.usage,
          started_at: startedAt,
          error_message: null,
        },
        {
          onConflict: "upload_id",
        },
      );

    await supabaseAdmin
      .from("nova_schoolwork_uploads")
      .update({
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
      })
      .eq("id", uploadId);

    if (!resolvedSubject || !resolvedLevel) {
      await supabaseAdmin
        .from("nova_schoolwork_uploads")
        .update({
          status: "needs_input",
          analysis_completed_at: new Date().toISOString(),
          error_message:
            "Choose the subject and Primary level, then continue analysis.",
        })
        .eq("id", uploadId);

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
      schema: reasoningSchema(taxonomy.map((skill) => skill.skill_code)),
      reasoningEffort: "medium",
      maxAutomaticRetries:
        settings.automatic_retry_count,
      fallbackEnabled:
        settings.fallback_enabled,
      fallbackModel:
        settings.fallback_model,
    });

    const reasoned = reasoningCall.parsed as ReasonedResult;

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

    const validItems = [...(reasoned.items ?? [])]
      .sort((a, b) => Number(a.item_index) - Number(b.item_index))
      .slice(0, settings.max_questions);

    const confidenceValues = validItems
      .map((item) => clamp01(item.mapping_confidence))
      .filter((value) => value > 0);

    const analysisConfidence = confidenceValues.length
      ? confidenceValues.reduce((sum, value) => sum + value, 0) /
        confidenceValues.length
      : 0;

    const { error: deleteItemsError } = await supabaseAdmin
      .from("nova_schoolwork_items")
      .delete()
      .eq("upload_id", uploadId);

    if (deleteItemsError) throw deleteItemsError;

    const insertedItems: Array<{
      id: string;
      item_index: number;
      primary_skill_code: string;
      supporting_skill_codes: string[];
      mapping_confidence: number;
      evidence_weight: number;
    }> = [];

    for (const item of validItems) {
      const primarySkill = taxonomyByCode.get(item.primary_skill_code);
      const evidenceWeight = proposedEvidenceWeight(item);

      const { data: inserted, error: itemError } = await supabaseAdmin
        .from("nova_schoolwork_items")
        .insert({
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
          needs_review:
            Boolean(item.needs_review) ||
            !primarySkill ||
            clamp01(item.mapping_confidence) < 0.78 ||
            clamp01(item.extraction_confidence) < 0.78,
          evidence_recommendation: item.evidence_recommendation,
          proposed_evidence_weight: evidenceWeight,
          reasoning_note: cleanText(item.reasoning_note),
          raw_item: item,
        })
        .select("id,item_index")
        .single();

      if (itemError) throw itemError;

      insertedItems.push({
        id: String(inserted.id),
        item_index: Number(inserted.item_index),
        primary_skill_code: item.primary_skill_code,
        supporting_skill_codes: item.supporting_skill_codes ?? [],
        mapping_confidence: clamp01(item.mapping_confidence),
        evidence_weight: evidenceWeight,
      });
    }

    for (const inserted of insertedItems) {
      const skillCodes = [
        inserted.primary_skill_code,
        ...(inserted.supporting_skill_codes || []),
      ].filter(Boolean);

      const uniqueCodes = [...new Set(skillCodes)];

      if (!uniqueCodes.length) continue;

      const mappingRows = uniqueCodes.flatMap((skillCode) => {
        const skill = taxonomyByCode.get(skillCode);
        if (!skill) return [];

        return [
          {
            item_id: inserted.id,
            skill_id: skill.id,
            is_primary_skill:
              skillCode === inserted.primary_skill_code,
            mapping_confidence: inserted.mapping_confidence,
            proposed_evidence_weight:
              inserted.evidence_weight,
            mapping_reason:
              skillCode === inserted.primary_skill_code
                ? "AI-proposed primary canonical concept from schoolwork analysis."
                : "AI-proposed supporting canonical concept from schoolwork analysis.",
            approved: false,
          },
        ];
      });

      if (mappingRows.length) {
        const { error: mappingError } = await supabaseAdmin
          .from("nova_schoolwork_item_skills")
          .insert(mappingRows);

        if (mappingError) throw mappingError;
      }
    }

    const completedAt = new Date().toISOString();

    const { error: analysisUpdateError } = await supabaseAdmin
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
      .eq("upload_id", uploadId);

    if (analysisUpdateError) throw analysisUpdateError;

    const { error: uploadUpdateError } = await supabaseAdmin
      .from("nova_schoolwork_uploads")
      .update({
        status: "review_ready",
        analysis_revision:
          Number(upload.analysis_revision || 0) + 1,
        detected_subject: resolvedSubject,
        detected_primary_level: resolvedLevel,
        assignment_title:
          cleanText(reasoned.assignment_title) ||
          cleanText(extraction.assignment_title) ||
          null,
        analysis_confidence: analysisConfidence,
        analysis_completed_at: completedAt,
        error_message: null,
      })
      .eq("id", uploadId);

    if (uploadUpdateError) throw uploadUpdateError;

    const extractionCost = estimateCostUsd(
      extractionCall.modelUsed,
      extractionCall.usage,
    );

    const reasoningCost = estimateCostUsd(
      reasoningCall.modelUsed,
      reasoningCall.usage,
    );

    await supabaseAdmin
      .from("nova_schoolwork_analysis_runs")
      .update({
        status: "succeeded",
        stage: "complete",
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
        question_count: validItems.length,
        duration_ms: Date.now() - runStartedMs,
        completed_at: completedAt,
        error_code: null,
        error_message: null,
      })
      .eq("id", run.id);

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
    if (uploadId) {
      await markFailed(uploadId, error).catch(() => undefined);

      try {
        const { data: latestRun } = await supabaseAdmin
          .from("nova_schoolwork_analysis_runs")
          .select("id,started_at")
          .eq("upload_id", uploadId)
          .eq("status", "running")
          .order("run_number", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestRun?.id) {
          const startedMs =
            new Date(latestRun.started_at).getTime();

          await supabaseAdmin
            .from("nova_schoolwork_analysis_runs")
            .update({
              status: "failed",
              stage: "failed",
              duration_ms: Number.isFinite(startedMs)
                ? Math.max(0, Date.now() - startedMs)
                : null,
              error_code: analysisErrorCode(error),
              error_message:
                error instanceof Error
                  ? error.message.slice(0, 4000)
                  : String(error).slice(0, 4000),
              completed_at: new Date().toISOString(),
            })
            .eq("id", latestRun.id);
        }
      } catch {
        // Preserve the original analysis failure.
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
            "OPENAI_API_KEY is not configured on the server.",
        },
        500,
      );
    }

    console.error("NOVA+ schoolwork analysis failed", error);

    return json(
      {
        error: message,
      },
      500,
    );
  }
}
