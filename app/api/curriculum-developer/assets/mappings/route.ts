import { NextResponse } from "next/server";
import { checkCurriculumDeveloperFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKETS = {
  math: "core-question-assets",
  science: "quiz-assets",
} as const;

type DeploymentSubject = keyof typeof STORAGE_BUCKETS;

const MAX_MAPPINGS_PER_REQUEST = 250;

type DeploymentMapping = {
  mapping_id: string;
  question_id: string;
  question_code?: string;
  quiz_code?: string;
  image_role: "prompt" | "option";
  option_index?: number | string | null;
  option_key?: string | null;
  storage_bucket: string;
  storage_path: string;
  public_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  qc_status?: string;
};

type MathQuestionRow = {
  id: string;
  code: string;
  primary_level: number;
  content: Record<string, unknown> | null;
};

type ScienceQuestionRow = {
  id: string;
  question_image: string | null;
};

type ScienceOptionRow = {
  id: string;
  question_id: string;
  option_key: string;
  asset_path: string | null;
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function chunk<T>(items: T[], size: number) {
  const output: T[][] = [];

  for (
    let index = 0;
    index < items.length;
    index += size
  ) {
    output.push(items.slice(index, index + size));
  }

  return output;
}

function isDeploymentSubject(
  value: string,
): value is DeploymentSubject {
  return value === "math" || value === "science";
}

function mappingKey(
  questionId: string,
  storagePath: string,
) {
  return `${questionId}::${storagePath}`;
}

function mappingLabel(mapping: DeploymentMapping) {
  return (
    String(mapping.question_code || "").trim() ||
    String(mapping.mapping_id || "").trim() ||
    mapping.question_id
  );
}

function optionIndex(mapping: DeploymentMapping) {
  const value = Number(mapping.option_index);

  return Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function scienceOptionKey(
  mapping: DeploymentMapping,
) {
  const value = String(
    mapping.option_key || "",
  )
    .trim()
    .toUpperCase();

  return /^[A-Z]$/.test(value) ? value : null;
}

function publicAssetUrl(
  supabaseUrl: string,
  bucket: string,
  storagePath: string,
) {
  return (
    `${supabaseUrl}/storage/v1/object/public/` +
    `${bucket}/${storagePath}`
  );
}

function validateCommonMapping(
  mapping: DeploymentMapping,
  subject: DeploymentSubject,
  level: number,
) {
  if (
    !mapping.mapping_id ||
    !mapping.question_id ||
    !mapping.storage_path
  ) {
    throw new Error(
      "A mapping is missing its mapping, question or storage identifier.",
    );
  }

  if (
    !["prompt", "option"].includes(
      mapping.image_role,
    )
  ) {
    throw new Error(
      `Unsupported image role in ${mapping.mapping_id}.`,
    );
  }

  const expectedBucket =
    STORAGE_BUCKETS[subject];

  if (
    mapping.storage_bucket !== expectedBucket
  ) {
    throw new Error(
      `Unsupported bucket in ${mapping.mapping_id}. ` +
        `Expected ${expectedBucket}.`,
    );
  }

  if (
    !mapping.storage_path.startsWith(
      `${subject}/p${level}/`,
    ) ||
    mapping.storage_path.includes("..") ||
    mapping.storage_path.startsWith("/")
  ) {
    throw new Error(
      `Invalid storage path in ${mapping.mapping_id}.`,
    );
  }

  if (
    mapping.qc_status &&
    mapping.qc_status !== "PASS"
  ) {
    throw new Error(
      `Mapping ${mapping.mapping_id} has not passed QC.`,
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Mathematics — preserve existing deployment behaviour                       */
/* -------------------------------------------------------------------------- */

function validateMathMappings(
  mappings: DeploymentMapping[],
  level: number,
) {
  const expectedCodePrefix =
    `MATH-P${level}-`;

  for (const mapping of mappings) {
    validateCommonMapping(
      mapping,
      "math",
      level,
    );

    if (!mapping.question_code) {
      throw new Error(
        `Math mapping ${mapping.mapping_id} is missing question_code.`,
      );
    }

    if (
      !mapping.question_code.startsWith(
        expectedCodePrefix,
      )
    ) {
      throw new Error(
        `Question ${mapping.question_code} does not belong to Mathematics P${level}.`,
      );
    }

    if (
      mapping.image_role === "option" &&
      optionIndex(mapping) === null
    ) {
      throw new Error(
        `Invalid option index in ${mapping.mapping_id}.`,
      );
    }
  }
}

async function loadMathQuestions(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
) {
  const rows: MathQuestionRow[] = [];

  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await admin
      .from("math_questions")
      .select(
        "id,code,primary_level,content",
      )
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(
      ...((data || []) as MathQuestionRow[]),
    );
  }

  return rows;
}

async function applyMathMappings({
  admin,
  mappings,
  questions,
  batch,
  supabaseUrl,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  questions: MathQuestionRow[];
  batch: string;
  supabaseUrl: string;
}) {
  const promptMappings = mappings.filter(
    (item) => item.image_role === "prompt",
  );

  const questionIds = [
    ...new Set(
      promptMappings.map(
        (item) => item.question_id,
      ),
    ),
  ];

  const existingRows: Array<{
    id: string;
    question_id: string;
    storage_bucket: string;
    storage_path: string;
  }> = [];

  for (const idChunk of chunk(
    questionIds,
    100,
  )) {
    if (!idChunk.length) {
      continue;
    }

    const { data, error } = await admin
      .from("math_question_assets")
      .select(
        "id,question_id,storage_bucket,storage_path",
      )
      .eq(
        "storage_bucket",
        STORAGE_BUCKETS.math,
      )
      .in("question_id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    existingRows.push(...(data || []));
  }

  const existingByKey = new Map(
    existingRows.map((row) => [
      mappingKey(
        row.question_id,
        row.storage_path,
      ),
      row,
    ]),
  );

  const assetRows = promptMappings.map(
    (mapping) => {
      const existing = existingByKey.get(
        mappingKey(
          mapping.question_id,
          mapping.storage_path,
        ),
      );

      return {
        id:
          existing?.id ||
          crypto.randomUUID(),
        question_id: mapping.question_id,
        asset_type: mapping.storage_path
          .toLowerCase()
          .endsWith(".svg")
          ? "svg"
          : "image",
        storage_bucket:
          STORAGE_BUCKETS.math,
        storage_path:
          mapping.storage_path,
        alt_text:
          mapping.alt_text ||
          "Question image",
        caption: null,
        width: Number.isFinite(
          Number(mapping.width),
        )
          ? Number(mapping.width)
          : null,
        height: Number.isFinite(
          Number(mapping.height),
        )
          ? Number(mapping.height)
          : null,
        metadata: {
          migration_batch: batch,
          object_fit: "contain",
        },
        sort_order: 1,
      };
    },
  );

  for (const rows of chunk(
    assetRows,
    100,
  )) {
    if (!rows.length) {
      continue;
    }

    const { error } = await admin
      .from("math_question_assets")
      .upsert(rows);

    if (error) {
      throw new Error(error.message);
    }
  }

  const optionsByQuestion =
    new Map<
      string,
      DeploymentMapping[]
    >();

  for (const mapping of mappings.filter(
    (item) =>
      item.image_role === "option",
  )) {
    const list =
      optionsByQuestion.get(
        mapping.question_id,
      ) || [];

    list.push(mapping);

    optionsByQuestion.set(
      mapping.question_id,
      list,
    );
  }

  const questionById = new Map(
    questions.map((question) => [
      question.id,
      question,
    ]),
  );

  let optionCount = 0;

  for (const entries of chunk(
    [...optionsByQuestion.entries()],
    8,
  )) {
    await Promise.all(
      entries.map(
        async ([
          questionId,
          optionMappings,
        ]) => {
          const question =
            questionById.get(questionId);

          if (!question) {
            throw new Error(
              `Question ${questionId} was not found.`,
            );
          }

          const content = {
            ...(question.content || {}),
          } as Record<string, unknown>;

          const rawOptions =
            Array.isArray(content.options)
              ? content.options
              : [];

          const options: Array<
            Record<string, unknown>
          > = rawOptions.map(
            (
              value,
              index,
            ): Record<string, unknown> => {
              if (
                value &&
                typeof value === "object" &&
                !Array.isArray(value)
              ) {
                return {
                  ...(value as Record<
                    string,
                    unknown
                  >),
                };
              }

              return {
                id: String(index),
                text: String(value ?? ""),
              };
            },
          );

          for (
            const mapping of optionMappings
          ) {
            const index =
              optionIndex(mapping);

            if (
              index === null ||
              !options[index]
            ) {
              throw new Error(
                `Option ${mapping.option_index} is missing from ${question.code}.`,
              );
            }

            const publicUrl =
              publicAssetUrl(
                supabaseUrl,
                STORAGE_BUCKETS.math,
                mapping.storage_path,
              );

            options[index] = {
              ...options[index],
              image_url: publicUrl,
              image_bucket:
                STORAGE_BUCKETS.math,
              image_path:
                mapping.storage_path,
              image_alt:
                mapping.alt_text ||
                "Answer option image",
              show_text_with_image: false,
            };

            optionCount++;
          }

          const { error } = await admin
            .from("math_questions")
            .update({
              content: {
                ...content,
                options,
              },
            })
            .eq("id", questionId);

          if (error) {
            throw new Error(
              error.message,
            );
          }
        },
      ),
    );
  }

  return {
    prompt_applied:
      promptMappings.length,
    option_applied: optionCount,
  };
}

async function verifyMathMappings({
  admin,
  mappings,
  questions,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  questions: MathQuestionRow[];
}) {
  const failures: string[] = [];

  const promptMappings = mappings.filter(
    (item) => item.image_role === "prompt",
  );

  const promptQuestionIds = [
    ...new Set(
      promptMappings.map(
        (item) => item.question_id,
      ),
    ),
  ];

  const existing = new Set<string>();

  for (const idChunk of chunk(
    promptQuestionIds,
    100,
  )) {
    if (!idChunk.length) {
      continue;
    }

    const { data, error } = await admin
      .from("math_question_assets")
      .select(
        "question_id,storage_path",
      )
      .eq(
        "storage_bucket",
        STORAGE_BUCKETS.math,
      )
      .in("question_id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    for (const row of data || []) {
      existing.add(
        mappingKey(
          row.question_id,
          row.storage_path,
        ),
      );
    }
  }

  let promptVerified = 0;

  for (const mapping of promptMappings) {
    if (
      existing.has(
        mappingKey(
          mapping.question_id,
          mapping.storage_path,
        ),
      )
    ) {
      promptVerified++;
    } else {
      failures.push(
        `${mappingLabel(mapping)}: prompt mapping missing`,
      );
    }
  }

  const questionById = new Map(
    questions.map((question) => [
      question.id,
      question,
    ]),
  );

  let optionVerified = 0;

  for (const mapping of mappings.filter(
    (item) =>
      item.image_role === "option",
  )) {
    const question = questionById.get(
      mapping.question_id,
    );

    const options = Array.isArray(
      question?.content?.options,
    )
      ? (question?.content?.options as Array<
          Record<string, unknown>
        >)
      : [];

    const index = optionIndex(mapping);

    const option =
      index === null
        ? null
        : options[index];

    if (
      option &&
      option.image_path ===
        mapping.storage_path
    ) {
      optionVerified++;
    } else {
      failures.push(
        `${mappingLabel(mapping)}: option ${mapping.option_index} mapping missing`,
      );
    }
  }

  return {
    prompt_verified: promptVerified,
    option_verified: optionVerified,
    failures,
  };
}

/* -------------------------------------------------------------------------- */
/* Science                                                                    */
/* -------------------------------------------------------------------------- */

function validateScienceMappings(
  mappings: DeploymentMapping[],
  level: number,
) {
  const seenTargets =
    new Set<string>();

  for (const mapping of mappings) {
    validateCommonMapping(
      mapping,
      "science",
      level,
    );

    let target: string;

    if (mapping.image_role === "prompt") {
      target =
        `${mapping.question_id}::prompt`;
    } else {
      const key =
        scienceOptionKey(mapping);

      if (!key) {
        throw new Error(
          `Science option mapping ${mapping.mapping_id} must include option_key such as A, B, C or D.`,
        );
      }

      target =
        `${mapping.question_id}::option::${key}`;
    }

    if (seenTargets.has(target)) {
      throw new Error(
        `Duplicate Science mapping target detected for ${mappingLabel(mapping)}.`,
      );
    }

    seenTargets.add(target);
  }
}

async function loadScienceQuestions(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
) {
  const rows: ScienceQuestionRow[] = [];

  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await admin
      .from("science_questions")
      .select("id,question_image")
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(
      ...((data || []) as ScienceQuestionRow[]),
    );
  }

  return rows;
}

async function loadScienceOptions(
  admin: ReturnType<typeof createAdminClient>,
  ids: string[],
) {
  const rows: ScienceOptionRow[] = [];

  for (const idChunk of chunk(ids, 100)) {
    const { data, error } = await admin
      .from(
        "science_question_options",
      )
      .select(
        "id,question_id,option_key,asset_path",
      )
      .in("question_id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    rows.push(
      ...((data || []) as ScienceOptionRow[]),
    );
  }

  return rows;
}

async function loadScienceQuestionLevels(
  admin: ReturnType<typeof createAdminClient>,
  questionIds: string[],
) {
  const links: Array<{
    question_id: string;
    quiz_id: string;
  }> = [];

  for (const idChunk of chunk(
    questionIds,
    100,
  )) {
    const { data, error } = await admin
      .from("science_quiz_questions")
      .select("question_id,quiz_id")
      .in("question_id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    links.push(...(data || []));
  }

  const quizIds = [
    ...new Set(
      links.map((row) => row.quiz_id),
    ),
  ];

  const quizzes: Array<{
    id: string;
    topic_id: string;
  }> = [];

  for (const idChunk of chunk(
    quizIds,
    100,
  )) {
    if (!idChunk.length) {
      continue;
    }

    const { data, error } = await admin
      .from("science_quizzes")
      .select("id,topic_id")
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    quizzes.push(...(data || []));
  }

  const topicIds = [
    ...new Set(
      quizzes.map(
        (row) => row.topic_id,
      ),
    ),
  ];

  const topics: Array<{
    id: string;
    level_id: string;
  }> = [];

  for (const idChunk of chunk(
    topicIds,
    100,
  )) {
    if (!idChunk.length) {
      continue;
    }

    const { data, error } = await admin
      .from("science_topics")
      .select("id,level_id")
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    topics.push(...(data || []));
  }

  const levelIds = [
    ...new Set(
      topics.map(
        (row) => row.level_id,
      ),
    ),
  ];

  const levels: Array<{
    id: string;
    level_number: number;
  }> = [];

  for (const idChunk of chunk(
    levelIds,
    100,
  )) {
    if (!idChunk.length) {
      continue;
    }

    const { data, error } = await admin
      .from("science_levels")
      .select("id,level_number")
      .in("id", idChunk);

    if (error) {
      throw new Error(error.message);
    }

    levels.push(
      ...((data || []) as Array<{
        id: string;
        level_number: number;
      }>),
    );
  }

  const quizById = new Map(
    quizzes.map((row) => [
      row.id,
      row,
    ]),
  );

  const topicById = new Map(
    topics.map((row) => [
      row.id,
      row,
    ]),
  );

  const levelById = new Map(
    levels.map((row) => [
      row.id,
      Number(row.level_number),
    ]),
  );

  const questionLevels =
    new Map<string, Set<number>>();

  for (const link of links) {
    const quiz =
      quizById.get(link.quiz_id);

    const topic = quiz
      ? topicById.get(quiz.topic_id)
      : null;

    const levelNumber = topic
      ? levelById.get(topic.level_id)
      : null;

    if (!levelNumber) {
      continue;
    }

    const set =
      questionLevels.get(
        link.question_id,
      ) || new Set<number>();

    set.add(levelNumber);

    questionLevels.set(
      link.question_id,
      set,
    );
  }

  return questionLevels;
}

async function validateScienceTargets({
  admin,
  mappings,
  level,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  level: number;
}) {
  const questionIds = [
    ...new Set(
      mappings.map(
        (item) => item.question_id,
      ),
    ),
  ];

  const [
    questions,
    options,
    questionLevels,
  ] = await Promise.all([
    loadScienceQuestions(
      admin,
      questionIds,
    ),
    loadScienceOptions(
      admin,
      questionIds,
    ),
    loadScienceQuestionLevels(
      admin,
      questionIds,
    ),
  ]);

  const questionById = new Map(
    questions.map((question) => [
      question.id,
      question,
    ]),
  );

  const optionByTarget = new Map(
    options.map((option) => [
      `${option.question_id}::${String(
        option.option_key,
      )
        .trim()
        .toUpperCase()}`,
      option,
    ]),
  );

  for (const mapping of mappings) {
    if (
      !questionById.has(
        mapping.question_id,
      )
    ) {
      throw new Error(
        `Science question ${mappingLabel(mapping)} was not found.`,
      );
    }

    const levels =
      questionLevels.get(
        mapping.question_id,
      ) || new Set<number>();

    if (!levels.has(level)) {
      throw new Error(
        `Science question ${mappingLabel(mapping)} is not linked to Primary ${level}.`,
      );
    }

    if (levels.size > 1) {
      throw new Error(
        `Science question ${mappingLabel(mapping)} is linked to multiple Primary levels and cannot be deployed automatically.`,
      );
    }

    if (
      mapping.image_role === "option"
    ) {
      const key =
        scienceOptionKey(mapping)!;

      const option =
        optionByTarget.get(
          `${mapping.question_id}::${key}`,
        );

      if (!option) {
        throw new Error(
          `Option ${key} is missing from Science question ${mappingLabel(mapping)}.`,
        );
      }
    }
  }

  return {
    questions,
    options,
  };
}

async function applyScienceMappings({
  admin,
  mappings,
  options,
  supabaseUrl,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  options: ScienceOptionRow[];
  supabaseUrl: string;
}) {
  const optionByTarget = new Map(
    options.map((option) => [
      `${option.question_id}::${String(
        option.option_key,
      )
        .trim()
        .toUpperCase()}`,
      option,
    ]),
  );

  let promptApplied = 0;
  let optionApplied = 0;

  for (const mapping of mappings.filter(
    (item) =>
      item.image_role === "prompt",
  )) {
    const publicUrl =
      publicAssetUrl(
        supabaseUrl,
        STORAGE_BUCKETS.science,
        mapping.storage_path,
      );

    const { error } = await admin
      .from("science_questions")
      .update({
        question_image: publicUrl,
      })
      .eq("id", mapping.question_id);

    if (error) {
      throw new Error(error.message);
    }

    promptApplied++;
  }

  for (const mapping of mappings.filter(
    (item) =>
      item.image_role === "option",
  )) {
    const key =
      scienceOptionKey(mapping)!;

    const option =
      optionByTarget.get(
        `${mapping.question_id}::${key}`,
      );

    if (!option) {
      throw new Error(
        `Option ${key} is missing from Science question ${mappingLabel(mapping)}.`,
      );
    }

    const publicUrl =
      publicAssetUrl(
        supabaseUrl,
        STORAGE_BUCKETS.science,
        mapping.storage_path,
      );

    const { error } = await admin
      .from(
        "science_question_options",
      )
      .update({
        asset_path: publicUrl,
      })
      .eq("id", option.id);

    if (error) {
      throw new Error(error.message);
    }

    optionApplied++;
  }

  return {
    prompt_applied: promptApplied,
    option_applied: optionApplied,
  };
}

async function verifyScienceMappings({
  admin,
  mappings,
  supabaseUrl,
}: {
  admin: ReturnType<typeof createAdminClient>;
  mappings: DeploymentMapping[];
  supabaseUrl: string;
}) {
  const failures: string[] = [];

  const questionIds = [
    ...new Set(
      mappings.map(
        (item) => item.question_id,
      ),
    ),
  ];

  const [questions, options] =
    await Promise.all([
      loadScienceQuestions(
        admin,
        questionIds,
      ),
      loadScienceOptions(
        admin,
        questionIds,
      ),
    ]);

  const questionById = new Map(
    questions.map((question) => [
      question.id,
      question,
    ]),
  );

  const optionByTarget = new Map(
    options.map((option) => [
      `${option.question_id}::${String(
        option.option_key,
      )
        .trim()
        .toUpperCase()}`,
      option,
    ]),
  );

  let promptVerified = 0;
  let optionVerified = 0;

  for (const mapping of mappings) {
    const expectedUrl =
      publicAssetUrl(
        supabaseUrl,
        STORAGE_BUCKETS.science,
        mapping.storage_path,
      );

    if (
      mapping.image_role === "prompt"
    ) {
      const question =
        questionById.get(
          mapping.question_id,
        );

      if (
        question?.question_image ===
        expectedUrl
      ) {
        promptVerified++;
      } else {
        failures.push(
          `${mappingLabel(mapping)}: Science prompt mapping missing`,
        );
      }

      continue;
    }

    const key =
      scienceOptionKey(mapping)!;

    const option =
      optionByTarget.get(
        `${mapping.question_id}::${key}`,
      );

    if (
      option?.asset_path ===
      expectedUrl
    ) {
      optionVerified++;
    } else {
      failures.push(
        `${mappingLabel(mapping)}: Science option ${key} mapping missing`,
      );
    }
  }

  return {
    prompt_verified: promptVerified,
    option_verified: optionVerified,
    failures,
  };
}

/* -------------------------------------------------------------------------- */
/* Route                                                                      */
/* -------------------------------------------------------------------------- */

export async function POST(request: Request) {
  const access =
    await checkCurriculumDeveloperFromRequest(
      request,
    );

  if (!access.isCurriculumDeveloper) {
    return json(
      { error: access.error },
      403,
    );
  }

  try {
    const body =
      (await request.json()) as {
        action?: "apply" | "verify";
        subject?: string;
        level?: number;
        batch?: string;
        bucket?: string;
        mappings?: DeploymentMapping[];
      };

    const action = body.action;

    const subjectValue = String(
      body.subject || "",
    )
      .trim()
      .toLowerCase();

    const level = Number(body.level);

    const batch = String(
      body.batch || "",
    ).trim();

    const bucket = String(
      body.bucket || "",
    ).trim();

    const mappings = Array.isArray(
      body.mappings,
    )
      ? body.mappings
      : [];

    if (
      !["apply", "verify"].includes(
        String(action),
      )
    ) {
      return json(
        {
          error:
            "Invalid mapping action.",
        },
        400,
      );
    }

    if (
      !isDeploymentSubject(
        subjectValue,
      )
    ) {
      return json(
        {
          error:
            "Unsupported deployment subject.",
        },
        400,
      );
    }

    const subject = subjectValue;

    const expectedBucket =
      STORAGE_BUCKETS[subject];

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6
    ) {
      return json(
        {
          error:
            "Invalid primary level.",
        },
        400,
      );
    }

    const batchPattern =
      new RegExp(
        `^p${level}-${subject}-[a-z0-9-]+$`,
        "i",
      );

    if (!batchPattern.test(batch)) {
      return json(
        {
          error:
            `Invalid ${subject} deployment batch.`,
        },
        400,
      );
    }

    if (bucket !== expectedBucket) {
      return json(
        {
          error:
            `Unsupported storage bucket for ${subject}. ` +
            `Expected ${expectedBucket}.`,
        },
        400,
      );
    }

    if (
      !mappings.length ||
      mappings.length >
        MAX_MAPPINGS_PER_REQUEST
    ) {
      return json(
        {
          error:
            `Each request must contain 1 to ` +
            `${MAX_MAPPINGS_PER_REQUEST} mappings.`,
        },
        400,
      );
    }

    const admin =
      createAdminClient();

    const supabaseUrl = String(
      process.env
        .NEXT_PUBLIC_SUPABASE_URL ||
        "",
    ).replace(/\/$/, "");

    if (!supabaseUrl) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL is not configured.",
      );
    }

    if (subject === "math") {
      validateMathMappings(
        mappings,
        level,
      );

      const questionIds = [
        ...new Set(
          mappings.map(
            (item) =>
              item.question_id,
          ),
        ),
      ];

      const questions =
        await loadMathQuestions(
          admin,
          questionIds,
        );

      const questionById =
        new Map(
          questions.map(
            (question) => [
              question.id,
              question,
            ],
          ),
        );

      for (const mapping of mappings) {
        const question =
          questionById.get(
            mapping.question_id,
          );

        if (!question) {
          throw new Error(
            `Question ${mappingLabel(mapping)} was not found.`,
          );
        }

        if (
          question.code !==
          mapping.question_code
        ) {
          throw new Error(
            `Question code mismatch for ${mapping.question_id}.`,
          );
        }

        if (
          Number(
            question.primary_level,
          ) !== level
        ) {
          throw new Error(
            `${question.code} is not a P${level} question.`,
          );
        }
      }

      if (action === "apply") {
        const result =
          await applyMathMappings({
            admin,
            mappings,
            questions,
            batch,
            supabaseUrl,
          });

        return json({
          ok: true,
          subject,
          ...result,
        });
      }

      const result =
        await verifyMathMappings({
          admin,
          mappings,
          questions,
        });

      return json({
        ok:
          result.failures.length ===
          0,
        subject,
        ...result,
      });
    }

    validateScienceMappings(
      mappings,
      level,
    );

    const { options } =
      await validateScienceTargets({
        admin,
        mappings,
        level,
      });

    if (action === "apply") {
      const result =
        await applyScienceMappings({
          admin,
          mappings,
          options,
          supabaseUrl,
        });

      return json({
        ok: true,
        subject,
        ...result,
      });
    }

    const result =
      await verifyScienceMappings({
        admin,
        mappings,
        supabaseUrl,
      });

    return json({
      ok:
        result.failures.length === 0,
      subject,
      ...result,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Mapping operation failed.",
      },
      500,
    );
  }
}
