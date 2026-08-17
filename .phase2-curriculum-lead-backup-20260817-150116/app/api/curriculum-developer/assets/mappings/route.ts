import { NextResponse } from "next/server";
import { checkAdminFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKET = "core-question-assets";
const MAX_MAPPINGS_PER_REQUEST = 250;

type DeploymentMapping = {
  mapping_id: string;
  question_id: string;
  question_code: string;
  quiz_code?: string;
  image_role: "prompt" | "option";
  option_index?: number | string | null;
  storage_bucket: string;
  storage_path: string;
  public_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  qc_status?: string;
};

type QuestionRow = {
  id: string;
  code: string;
  primary_level: number;
  content: Record<string, unknown> | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function mappingKey(questionId: string, storagePath: string) {
  return `${questionId}::${storagePath}`;
}

function optionIndex(mapping: DeploymentMapping) {
  const value = Number(mapping.option_index);
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function validateMappings(
  mappings: DeploymentMapping[],
  subject: string,
  level: number,
) {
  const expectedCodePrefix = `${subject.toUpperCase()}-P${level}-`;
  for (const mapping of mappings) {
    if (!mapping.question_id || !mapping.question_code || !mapping.storage_path) {
      throw new Error("A mapping is missing its question or storage identifier.");
    }
    if (!mapping.question_code.startsWith(expectedCodePrefix)) {
      throw new Error(`Question ${mapping.question_code} does not belong to ${subject.toUpperCase()} P${level}.`);
    }
    if (!['prompt', 'option'].includes(mapping.image_role)) {
      throw new Error(`Unsupported image role in ${mapping.mapping_id}.`);
    }
    if (mapping.image_role === "option" && optionIndex(mapping) === null) {
      throw new Error(`Invalid option index in ${mapping.mapping_id}.`);
    }
    if (mapping.storage_bucket !== STORAGE_BUCKET) {
      throw new Error(`Unsupported bucket in ${mapping.mapping_id}.`);
    }
    if (!mapping.storage_path.startsWith(`${subject}/p${level}/`) || mapping.storage_path.includes("..")) {
      throw new Error(`Invalid storage path in ${mapping.mapping_id}.`);
    }
    if (mapping.qc_status && mapping.qc_status !== "PASS") {
      throw new Error(`Mapping ${mapping.mapping_id} has not passed QC.`);
    }
  }
}

async function loadQuestions(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
) {
  const rows: QuestionRow[] = [];
  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await admin
      .from("math_questions")
      .select("id,code,primary_level,content")
      .in("id", idChunk);
    if (error) throw new Error(error.message);
    rows.push(...((data || []) as QuestionRow[]));
  }
  return rows;
}

async function applyMappings({
  admin,
  mappings,
  questions,
  batch,
  supabaseUrl,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  questions: QuestionRow[];
  batch: string;
  supabaseUrl: string;
}) {
  const promptMappings = mappings.filter((item) => item.image_role === "prompt");
  const questionIds = [...new Set(promptMappings.map((item) => item.question_id))];
  const existingRows: Array<{
    id: string;
    question_id: string;
    storage_bucket: string;
    storage_path: string;
  }> = [];

  for (const idChunk of chunk(questionIds, 100)) {
    if (!idChunk.length) continue;
    const { data, error } = await admin
      .from("math_question_assets")
      .select("id,question_id,storage_bucket,storage_path")
      .eq("storage_bucket", STORAGE_BUCKET)
      .in("question_id", idChunk);
    if (error) throw new Error(error.message);
    existingRows.push(...(data || []));
  }

  const existingByKey = new Map(
    existingRows.map((row) => [mappingKey(row.question_id, row.storage_path), row]),
  );

  const assetRows = promptMappings.map((mapping) => {
    const existing = existingByKey.get(
      mappingKey(mapping.question_id, mapping.storage_path),
    );
    return {
      id: existing?.id || crypto.randomUUID(),
      question_id: mapping.question_id,
      asset_type: mapping.storage_path.toLowerCase().endsWith(".svg") ? "svg" : "image",
      storage_bucket: STORAGE_BUCKET,
      storage_path: mapping.storage_path,
      alt_text: mapping.alt_text || "Question image",
      caption: null,
      width: Number.isFinite(Number(mapping.width)) ? Number(mapping.width) : null,
      height: Number.isFinite(Number(mapping.height)) ? Number(mapping.height) : null,
      metadata: {
        migration_batch: batch,
        object_fit: "contain",
      },
      sort_order: 1,
    };
  });

  for (const rows of chunk(assetRows, 100)) {
    if (!rows.length) continue;
    const { error } = await admin.from("math_question_assets").upsert(rows);
    if (error) throw new Error(error.message);
  }

  const optionsByQuestion = new Map<string, DeploymentMapping[]>();
  for (const mapping of mappings.filter((item) => item.image_role === "option")) {
    const list = optionsByQuestion.get(mapping.question_id) || [];
    list.push(mapping);
    optionsByQuestion.set(mapping.question_id, list);
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  let optionCount = 0;

  for (const entries of chunk([...optionsByQuestion.entries()], 8)) {
    await Promise.all(
      entries.map(async ([questionId, optionMappings]) => {
        const question = questionById.get(questionId);
        if (!question) throw new Error(`Question ${questionId} was not found.`);
        const content = { ...(question.content || {}) } as Record<string, unknown>;
        const rawOptions = Array.isArray(content.options) ? content.options : [];
        const options: Array<Record<string, unknown>> = rawOptions.map(
          (value, index): Record<string, unknown> => {
            if (value && typeof value === "object" && !Array.isArray(value)) {
              return { ...(value as Record<string, unknown>) };
            }
            return { id: String(index), text: String(value ?? "") };
          },
        );

        for (const mapping of optionMappings) {
          const index = optionIndex(mapping);
          if (index === null || !options[index]) {
            throw new Error(`Option ${mapping.option_index} is missing from ${question.code}.`);
          }
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${mapping.storage_path}`;
          options[index] = {
            ...options[index],
            image_url: publicUrl,
            image_bucket: STORAGE_BUCKET,
            image_path: mapping.storage_path,
            image_alt: mapping.alt_text || "Answer option image",
            show_text_with_image: false,
          };
          optionCount++;
        }

        const { error } = await admin
          .from("math_questions")
          .update({ content: { ...content, options } })
          .eq("id", questionId);
        if (error) throw new Error(error.message);
      }),
    );
  }

  return { prompt_applied: promptMappings.length, option_applied: optionCount };
}

async function verifyMappings({
  admin,
  mappings,
  questions,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  questions: QuestionRow[];
}) {
  const failures: string[] = [];
  const promptMappings = mappings.filter((item) => item.image_role === "prompt");
  const promptQuestionIds = [...new Set(promptMappings.map((item) => item.question_id))];
  const existing = new Set<string>();

  for (const idChunk of chunk(promptQuestionIds, 100)) {
    if (!idChunk.length) continue;
    const { data, error } = await admin
      .from("math_question_assets")
      .select("question_id,storage_path")
      .eq("storage_bucket", STORAGE_BUCKET)
      .in("question_id", idChunk);
    if (error) throw new Error(error.message);
    for (const row of data || []) existing.add(mappingKey(row.question_id, row.storage_path));
  }

  let promptVerified = 0;
  for (const mapping of promptMappings) {
    if (existing.has(mappingKey(mapping.question_id, mapping.storage_path))) {
      promptVerified++;
    } else {
      failures.push(`${mapping.question_code}: prompt mapping missing`);
    }
  }

  const questionById = new Map(questions.map((question) => [question.id, question]));
  let optionVerified = 0;
  for (const mapping of mappings.filter((item) => item.image_role === "option")) {
    const question = questionById.get(mapping.question_id);
    const options = Array.isArray(question?.content?.options)
      ? (question?.content?.options as Array<Record<string, unknown>>)
      : [];
    const index = optionIndex(mapping);
    const option = index === null ? null : options[index];
    if (option && option.image_path === mapping.storage_path) {
      optionVerified++;
    } else {
      failures.push(`${mapping.question_code}: option ${mapping.option_index} mapping missing`);
    }
  }

  return {
    prompt_verified: promptVerified,
    option_verified: optionVerified,
    failures,
  };
}

export async function POST(request: Request) {
  const access = await checkAdminFromRequest(request);
  if (!access.isAdmin) return json({ error: access.error }, 403);

  try {
    const body = (await request.json()) as {
      action?: "apply" | "verify";
      subject?: string;
      level?: number;
      batch?: string;
      bucket?: string;
      mappings?: DeploymentMapping[];
    };

    const action = body.action;
    const subject = String(body.subject || "").toLowerCase();
    const level = Number(body.level);
    const batch = String(body.batch || "").trim();
    const bucket = String(body.bucket || "").trim();
    const mappings = Array.isArray(body.mappings) ? body.mappings : [];

    if (!['apply', 'verify'].includes(String(action))) return json({ error: "Invalid mapping action." }, 400);
    if (subject !== "math") return json({ error: "This first release supports Mathematics packages. Science can be enabled after its mapping schema is confirmed." }, 400);
    if (!Number.isInteger(level) || level < 1 || level > 6) return json({ error: "Invalid primary level." }, 400);
    if (!/^p[1-6]-math-[a-z0-9-]+$/i.test(batch)) return json({ error: "Invalid deployment batch." }, 400);
    if (bucket !== STORAGE_BUCKET) return json({ error: "Unsupported storage bucket." }, 400);
    if (!mappings.length || mappings.length > MAX_MAPPINGS_PER_REQUEST) return json({ error: `Each request must contain 1 to ${MAX_MAPPINGS_PER_REQUEST} mappings.` }, 400);

    validateMappings(mappings, subject, level);

    const admin = createAdminClient();
    const questionIds = [...new Set(mappings.map((item) => item.question_id))];
    const questions = await loadQuestions(admin, questionIds);
    const questionById = new Map(questions.map((question) => [question.id, question]));

    for (const mapping of mappings) {
      const question = questionById.get(mapping.question_id);
      if (!question) throw new Error(`Question ${mapping.question_code} was not found.`);
      if (question.code !== mapping.question_code) throw new Error(`Question code mismatch for ${mapping.question_id}.`);
      if (Number(question.primary_level) !== level) throw new Error(`${question.code} is not a P${level} question.`);
    }

    const supabaseUrl = String(process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
    if (!supabaseUrl) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured.");

    if (action === "apply") {
      const result = await applyMappings({ admin, mappings, questions, batch, supabaseUrl });
      return json({ ok: true, ...result });
    }

    const result = await verifyMappings({ admin, mappings, questions });
    return json({ ok: result.failures.length === 0, ...result });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Mapping operation failed." },
      500,
    );
  }
}
