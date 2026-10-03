"use client";



import { supabase } from "@/lib/supabase";

import {

  classifyMathQASampleStratum,

  selectMathQASample,

} from "@/lib/math-intelligence/MathQASampling";

import type {

  MathQACandidate,

  MathQAIssueCode,

  MathQASampleSelection,

  MathQAVerdict,

} from "@/lib/math-intelligence/MathQATypes";

import type { MathAuthoringBatchItem } from "@/lib/math-intelligence/MathBatchGenerationTypes";



const PAGE_SIZE = 1000;



async function loadAllRows(table: string, select: string, configure?: (query: any) => any) {

  const rows: any[] = [];

  const client = supabase as any;

  for (let from = 0; ; from += PAGE_SIZE) {

    let query = client.from(table).select(select);

    if (configure) query = configure(query);

    query = query.range(from, from + PAGE_SIZE - 1);

    const { data, error } = await query;

    if (error) throw error;

    const page = data || [];

    rows.push(...page);

    if (page.length < PAGE_SIZE) break;

  }

  return rows;

}



function chunk<T>(items: T[], size: number) {

  const output: T[][] = [];

  for (let index = 0; index < items.length; index += size) {

    output.push(items.slice(index, index + size));

  }

  return output;

}


type MathSkillMappingForQA = {
  skill_id: string;
  skill_code: string | null;
  skill_name: string;
  domain: string | null;
  topic: string | null;
  primary_level: number | null;
  weight: number;
  is_primary_skill: boolean;
  mapping_version: number;
  review_status: string;
};

async function loadApprovedMathSkillMappings(
  questionIds: string[],
): Promise<Map<string, MathSkillMappingForQA[]>> {
  const mappingRows: any[] = [];

  for (const ids of chunk(questionIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("learning_question_skills")
      .select(
        "question_id,skill_id,weight,is_primary_skill,mapping_version,review_status",
      )
      .eq("question_source", "math_questions")
      .eq("review_status", "approved")
      .in("question_id", ids);

    if (error) throw error;
    mappingRows.push(...(data || []));
  }

  if (mappingRows.length === 0) {
    return new Map();
  }

  // A question can have historical mapping versions across different skills.
  // For Teaching QA we use only the latest approved mapping version per question.
  const latestVersionByQuestion = new Map<string, number>();

  for (const row of mappingRows) {
    const questionId = String(row.question_id || "");
    if (!questionId) continue;

    const version = Number(row.mapping_version || 1);
    const current = latestVersionByQuestion.get(questionId);

    if (current === undefined || version > current) {
      latestVersionByQuestion.set(questionId, version);
    }
  }

  const currentRows = mappingRows.filter((row) => {
    const questionId = String(row.question_id || "");
    const version = Number(row.mapping_version || 1);
    return latestVersionByQuestion.get(questionId) === version;
  });

  const skillIds = [
    ...new Set(
      currentRows
        .map((row) => String(row.skill_id || ""))
        .filter(Boolean),
    ),
  ];

  const taxonomyById = new Map<string, any>();

  for (const ids of chunk(skillIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("learning_skill_taxonomy")
      .select(
        "id,subject,primary_level,domain,topic,skill_name,skill_code,is_active,review_status",
      )
      .eq("subject", "math")
      .eq("is_active", true)
      .in("id", ids);

    if (error) throw error;

    for (const row of data || []) {
      taxonomyById.set(String(row.id), row);
    }
  }

  const mappingsByQuestion =
    new Map<string, MathSkillMappingForQA[]>();

  for (const row of currentRows) {
    const questionId = String(row.question_id || "");
    const skillId = String(row.skill_id || "");
    const skill = taxonomyById.get(skillId);

    if (!questionId || !skill) continue;

    const current =
      mappingsByQuestion.get(questionId) || [];

    current.push({
      skill_id: skillId,
      skill_code: skill.skill_code
        ? String(skill.skill_code)
        : null,
      skill_name: String(skill.skill_name || skillId),
      domain: skill.domain ? String(skill.domain) : null,
      topic: skill.topic ? String(skill.topic) : null,
      primary_level:
        skill.primary_level === null ||
        skill.primary_level === undefined
          ? null
          : Number(skill.primary_level),
      weight: Number(row.weight || 1),
      is_primary_skill: Boolean(row.is_primary_skill),
      mapping_version: Number(row.mapping_version || 1),
      review_status: String(row.review_status || "approved"),
    });

    mappingsByQuestion.set(questionId, current);
  }

  for (const [questionId, mappings] of mappingsByQuestion) {
    mappings.sort((left, right) => {
      if (left.is_primary_skill !== right.is_primary_skill) {
        return left.is_primary_skill ? -1 : 1;
      }

      if (left.weight !== right.weight) {
        return right.weight - left.weight;
      }

      return String(left.skill_code || left.skill_name).localeCompare(
        String(right.skill_code || right.skill_name),
      );
    });

    mappingsByQuestion.set(questionId, mappings);
  }

  return mappingsByQuestion;
}

async function loadCurrentMathSkillTags(
  questionIds: string[],
): Promise<Map<string, string[]>> {
  const tagsByQuestion = new Map<string, string[]>();

  for (const ids of chunk(questionIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("math_questions")
      .select("id,skill_tags")
      .in("id", ids);

    if (error) throw error;

    for (const row of data || []) {
      tagsByQuestion.set(
        String(row.id),
        Array.isArray(row.skill_tags)
          ? row.skill_tags.map((tag: unknown) => String(tag))
          : [],
      );
    }
  }

  return tagsByQuestion;
}



type LiveMathTeachingPayload = {
  content: Record<string, any> | null;
  stimulus_id: string | null;
  stimulus: Record<string, any> | null;
  assets: any[];
};

function objectRecord(value: unknown): Record<string, any> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, any>;
}

function mergeTeachingVisualContent(
  snapshotContentValue: unknown,
  liveContentValue: unknown,
): Record<string, any> {
  const snapshotContent = objectRecord(snapshotContentValue) || {};
  const liveContent = objectRecord(liveContentValue) || {};

  const visualKeys = [
    "image_reference",
    "stimulus_image_url",
    "stimulus_image_alt",
    "inline_diagram",
    "math_visual",
  ] as const;

  const merged: Record<string, any> = { ...snapshotContent };

  for (const key of visualKeys) {
    if (liveContent[key] !== undefined && liveContent[key] !== null) {
      merged[key] = liveContent[key];
    }
  }

  const storedOptions = Array.isArray(snapshotContent.options)
    ? snapshotContent.options
    : [];
  const liveOptions = Array.isArray(liveContent.options)
    ? liveContent.options
    : [];

  if (storedOptions.length > 0 || liveOptions.length > 0) {
    const liveById = new Map<string, any>();
    for (const raw of liveOptions) {
      const option = objectRecord(raw);
      if (!option) continue;
      const id = String(option.id || "");
      if (id) liveById.set(id, option);
    }

    const base = storedOptions.length > 0 ? storedOptions : liveOptions;
    merged.options = base.map((raw: any) => {
      const stored = objectRecord(raw) || {};
      const id = String(stored.id || "");
      const live = id ? liveById.get(id) || {} : {};

      return {
        ...stored,
        ...(live.image_url ? { image_url: live.image_url } : {}),
        ...(live.image_path ? { image_path: live.image_path } : {}),
        ...(live.image_alt ? { image_alt: live.image_alt } : {}),
        ...(live.show_text_with_image !== undefined
          ? { show_text_with_image: live.show_text_with_image }
          : {}),
      };
    });
  }

  return merged;
}

async function loadCurrentMathTeachingPayload(
  questionIds: string[],
): Promise<Map<string, LiveMathTeachingPayload>> {
  const questionsById = new Map<string, any>();

  for (const ids of chunk(questionIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("math_questions")
      .select("id,stimulus_id,content")
      .in("id", ids);

    if (error) throw error;
    for (const row of data || []) {
      questionsById.set(String(row.id), row);
    }
  }

  const stimulusIds = [
    ...new Set(
      [...questionsById.values()]
        .map((row) => String(row.stimulus_id || ""))
        .filter(Boolean),
    ),
  ];

  const stimulusById = new Map<string, any>();
  for (const ids of chunk(stimulusIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("math_stimuli")
      .select("id,stimulus_type,title,body,storage_bucket,storage_path,alt_text")
      .in("id", ids);

    if (error) throw error;
    for (const row of data || []) {
      stimulusById.set(String(row.id), row);
    }
  }

  const assetsByQuestion = new Map<string, any[]>();
  for (const ids of chunk(questionIds, 100)) {
    if (ids.length === 0) continue;

    const { data, error } = await supabase
      .from("math_question_assets")
      .select("id,question_id,asset_type,storage_bucket,storage_path,alt_text,caption,metadata")
      .in("question_id", ids);

    if (error) throw error;
    for (const row of data || []) {
      const questionId = String(row.question_id);
      const current = assetsByQuestion.get(questionId) || [];
      current.push(row);
      assetsByQuestion.set(questionId, current);
    }
  }

  const payloadByQuestion = new Map<string, LiveMathTeachingPayload>();
  for (const questionId of questionIds) {
    const live = questionsById.get(questionId) || null;
    const stimulusId = live?.stimulus_id ? String(live.stimulus_id) : null;

    payloadByQuestion.set(questionId, {
      content: objectRecord(live?.content),
      stimulus_id: stimulusId,
      stimulus: stimulusId ? stimulusById.get(stimulusId) || null : null,
      assets: assetsByQuestion.get(questionId) || [],
    });
  }

  return payloadByQuestion;
}



export async function loadRealBankMathQASample({

  targetSize,

  seed,

}: {

  targetSize: number;

  seed: string;

}): Promise<MathQASampleSelection> {

  const [topics, quizzes, links, questions, assetRows] = await Promise.all([

    loadAllRows(

      "math_topics",

      "id,title,slug,primary_level,is_active",

      (query) => query.eq("is_active", true).order("primary_level").order("sort_order"),

    ),

    loadAllRows(

      "math_quizzes",

      "id,topic_id,code,title,quiz_type,status,is_published",

      (query) => query.neq("status", "archived").order("code"),

    ),

    loadAllRows(

      "math_quiz_questions",

      "quiz_id,question_id,question_order",

      (query) => query.order("quiz_id").order("question_order"),

    ),

    loadAllRows(

      "math_questions",

      "id,subject,primary_level,topic_id,stimulus_id,code,question_type,instruction,prompt,content,answer_data,explanation,skill,skill_tags,difficulty,marks,status",

      (query) => query.neq("status", "archived").order("primary_level").order("code"),

    ),

    loadAllRows("math_question_assets", "question_id,asset_type"),

  ]);



  const topicById = new Map(

    topics.map((row) => [String(row.id), row as Record<string, any>]),

  );

  const quizById = new Map(

    quizzes.map((row) => [String(row.id), row as Record<string, any>]),

  );

  const assetQuestionIds = new Set(assetRows.map((row) => String(row.question_id)));



  const linksByQuestion = new Map<string, Array<Record<string, any>>>();

  for (const rawLink of links) {

    const link = rawLink as Record<string, any>;

    const quiz = quizById.get(String(link.quiz_id));

    if (!quiz || !topicById.has(String(quiz.topic_id))) continue;

    const questionId = String(link.question_id);

    const current = linksByQuestion.get(questionId) || [];

    current.push({ ...link, quiz });

    linksByQuestion.set(questionId, current);

  }



  const candidates: MathQACandidate[] = [];

  for (const rawQuestion of questions) {

    const question = rawQuestion as Record<string, any>;

    const questionId = String(question.id);

    const topic = topicById.get(String(question.topic_id));

    const questionLinks = linksByQuestion.get(questionId) || [];

    if (!topic || questionLinks.length === 0) continue;



    questionLinks.sort((left, right) => {

      const leftPublished = left.quiz?.is_published ? 1 : 0;

      const rightPublished = right.quiz?.is_published ? 1 : 0;

      if (leftPublished !== rightPublished) return rightPublished - leftPublished;

      return String(left.quiz?.code || "").localeCompare(String(right.quiz?.code || ""));

    });

    const primaryLink = questionLinks[0];

    const quiz = primaryLink?.quiz || null;

    const prompt = String(question.prompt || "");

    const hasQuestionAsset = assetQuestionIds.has(questionId);

    const hasStimulus = Boolean(question.stimulus_id);



    candidates.push({

      question_id: questionId,

      question_code: String(question.code || questionId),

      primary_level: Number(question.primary_level || topic.primary_level || 0),

      topic_id: String(question.topic_id || ""),

      topic_title: String(topic.title || ""),

      quiz_id: quiz ? String(quiz.id) : null,

      quiz_code: quiz ? String(quiz.code || "") : null,

      quiz_title: quiz ? String(quiz.title || "") : null,

      quiz_published: Boolean(quiz?.is_published),

      question_type: String(question.question_type || ""),

      prompt,

      sample_stratum: classifyMathQASampleStratum({

        content: question.content,

        prompt,

        hasStimulus,

        hasQuestionAsset,

      }),

      has_question_asset: hasQuestionAsset,

      has_stimulus: hasStimulus,

      question: {

        ...question,

        topic_title: String(topic.title || ""),

        quiz_code: quiz ? String(quiz.code || "") : null,

        quiz_title: quiz ? String(quiz.title || "") : null,

        quiz_published: Boolean(quiz?.is_published),

      },

    });

  }



  const selection = selectMathQASample(candidates, {

    targetSize,

    seed,

    levels: [1, 2, 3, 4, 5, 6],

  });



  const selectedIds = selection.items.map((item) => item.question_id);

  const skillMappingsByQuestion =
    await loadApprovedMathSkillMappings(selectedIds);

  const stimulusIds = [

    ...new Set(

      selection.items

        .map((item) => String((item.question as Record<string, any>).stimulus_id || ""))

        .filter(Boolean),

    ),

  ];



  const stimulusById = new Map<string, any>();

  for (const ids of chunk(stimulusIds, 100)) {

    if (ids.length === 0) continue;

    const { data, error } = await supabase

      .from("math_stimuli")

      .select("id,stimulus_type,title,body,storage_bucket,storage_path,alt_text")

      .in("id", ids);

    if (error) throw error;

    for (const row of data || []) stimulusById.set(String(row.id), row);

  }



  const assetsByQuestion = new Map<string, any[]>();

  for (const ids of chunk(selectedIds, 100)) {

    if (ids.length === 0) continue;

    const { data, error } = await supabase

      .from("math_question_assets")

      .select("id,question_id,asset_type,storage_bucket,storage_path,alt_text,caption,metadata")

      .in("question_id", ids);

    if (error) throw error;

    for (const row of data || []) {

      const key = String(row.question_id);

      const current = assetsByQuestion.get(key) || [];

      current.push(row);

      assetsByQuestion.set(key, current);

    }

  }



  return {

    ...selection,

    items: selection.items.map((item) => {

      const question = item.question as Record<string, any>;

      return {

        ...item,

        question: {

          ...question,

          stimulus: question.stimulus_id

            ? stimulusById.get(String(question.stimulus_id)) || null

            : null,

          assets: assetsByQuestion.get(item.question_id) || [],

          skill_mappings:
            skillMappingsByQuestion.get(item.question_id) || [],

        },

      };

    }),

  };

}



function compactQASnapshot(question: Record<string, unknown>) {

  const content = question.content && typeof question.content === "object" && !Array.isArray(question.content)

    ? (question.content as Record<string, any>)

    : {};

  const options = Array.isArray(content.options)

    ? content.options.map((raw: any) => ({

        id: String(raw?.id || ""),

        text: String(raw?.text || ""),

        has_image: Boolean(raw?.image_url || raw?.image_path),

        image_url: raw?.image_url || null,

        image_path: raw?.image_path || null,

        image_alt: raw?.image_alt || null,

        show_text_with_image: raw?.show_text_with_image ?? null,

      }))

    : [];

  const stimulus = question.stimulus && typeof question.stimulus === "object" && !Array.isArray(question.stimulus)

    ? (question.stimulus as Record<string, any>)

    : null;

  const assets = Array.isArray(question.assets)

    ? question.assets.map((asset: any) => ({

        id: String(asset?.id || ""),

        asset_type: String(asset?.asset_type || ""),

        storage_bucket: asset?.storage_bucket || null,

        storage_path: asset?.storage_path || null,

        alt_text: asset?.alt_text || null,

        caption: asset?.caption || null,

      }))

    : [];



  return {

    id: question.id || null,

    subject: question.subject || "math",

    primary_level: question.primary_level ?? null,

    topic_id: question.topic_id || null,

    topic_title: question.topic_title || null,

    code: question.code || null,

    question_type: question.question_type || null,

    instruction: question.instruction || null,

    prompt: question.prompt || "",

    answer_data: question.answer_data ?? null,

    explanation: question.explanation ?? null,

    skill: question.skill || null,

    skill_tags: Array.isArray(question.skill_tags)
      ? question.skill_tags
      : [],

    skill_mappings: Array.isArray(question.skill_mappings)
      ? question.skill_mappings
      : [],

    difficulty: question.difficulty ?? null,

    status: question.status || null,

    content: {

      options,

      math_visual: content.math_visual || null,

      image_reference: content.image_reference || null,

      stimulus_image_url: content.stimulus_image_url || null,

      stimulus_image_alt: content.stimulus_image_alt || null,

      inline_diagram: content.inline_diagram || null,

      has_legacy_inline_visual: Boolean(

        content.image_reference ||

        content.stimulus_image_url ||

        content.inline_diagram ||

        JSON.stringify(content).includes("data:image") ||

        JSON.stringify(content).includes("<svg"),

      ),

    },

    stimulus: stimulus

      ? {

          id: stimulus.id || null,

          stimulus_type: stimulus.stimulus_type || null,

          title: stimulus.title || null,

          alt_text: stimulus.alt_text || null,

          storage_bucket: stimulus.storage_bucket || null,

          storage_path: stimulus.storage_path || null,

        }

      : null,

    assets,

  };

}



export async function createMathQARun(sample: MathQASampleSelection) {

  const items = sample.items.map((item) => ({

    question_id: item.question_id,

    primary_level: item.primary_level,

    topic_id: item.topic_id,

    topic_title: item.topic_title,

    quiz_id: item.quiz_id,

    quiz_code: item.quiz_code,

    question_code: item.question_code,

    sample_stratum: item.sample_stratum,

    sample_rank: item.sample_rank,

    question_snapshot: compactQASnapshot(item.question),

  }));



  const { data, error } = await supabase.rpc("math_intelligence_create_qa_run", {

    p_seed: sample.seed,

    p_target_size: sample.target_size,

    p_sampling_version: sample.sampling_version,

    p_sample_summary: {

      actual_size: sample.actual_size,

      levels: sample.levels,

    },

    p_items: items,

  });

  if (error) throw error;

  return String((data as any)?.run_id || data || "");

}



export async function attachMathQAResults(

  runId: string,

  results: MathAuthoringBatchItem[],

) {

  for (const group of chunk(results, 10)) {

    const payload = group.map((item) => ({

      question_id: item.client_id,

      generation_status: item.status,

      question_fingerprint: item.proposal?.question_fingerprint || null,

      generation_error: item.error,

      proposal: item.proposal,

      strategy: item.proposal?.decision.strategy || null,

      interpretation_source: item.proposal?.sources.interpretation.source || null,

      teaching_source: item.proposal?.sources.teaching.source || null,

    }));

    const { error } = await supabase.rpc("math_intelligence_attach_qa_results", {

      p_run_id: runId,

      p_results: payload,

    });

    if (error) throw error;

  }

}



export async function saveMathQAReview({

  itemId,

  verdict,

  issueCodes,

  notes,

}: {

  itemId: string;

  verdict: MathQAVerdict;

  issueCodes: MathQAIssueCode[];

  notes: string;

}) {

  const { error } = await supabase.rpc("math_intelligence_review_qa_item", {

    p_item_id: itemId,

    p_verdict: verdict,

    p_issue_codes: issueCodes,

    p_notes: notes,

  });

  if (error) throw error;

}



export async function completeMathQARun(runId: string) {

  const { data, error } = await supabase.rpc("math_intelligence_complete_qa_run", {

    p_run_id: runId,

  });

  if (error) throw error;

  return data as Record<string, unknown>;

}



export async function loadMathQARunItems(runId: string) {

  const { data, error } = await supabase

    .from("math_intelligence_qa_items")

    .select(

      "id,run_id,question_id,primary_level,topic_id,topic_title,quiz_id,quiz_code,question_code,sample_stratum,sample_rank,question_snapshot,question_fingerprint,generation_status,generation_error,proposal,strategy,interpretation_source,teaching_source,verdict,issue_codes,reviewer_notes,reviewed_at",

    )

    .eq("run_id", runId)

    .order("sample_rank", { ascending: true });

  if (error) throw error;

  return data || [];

}





export async function loadRecentMathQARuns() {

  const { data, error } = await supabase

    .from("math_intelligence_qa_runs")

    .select("id,sampling_version,seed,target_size,actual_size,status,sample_summary,result_summary,review_summary,created_at,completed_at")

    .order("created_at", { ascending: false })

    .limit(12);

  if (error) throw error;

  return data || [];

}



export async function loadMathQARun(runId: string) {

  const [{ data: run, error: runError }, items] = await Promise.all([

    supabase

      .from("math_intelligence_qa_runs")

      .select("id,sampling_version,seed,target_size,actual_size,status,sample_summary,result_summary,review_summary,created_at,completed_at")

      .eq("id", runId)

      .single(),

    loadMathQARunItems(runId),

  ]);

  if (runError) throw runError;

  const questionIds = (items as any[])
    .map((row) => String(row.question_id || ""))
    .filter(Boolean);

  // Resume mode rehydrates only current teaching metadata and visual payloads.
  // Stored prompt/answer snapshots stay authoritative for the QA cohort.
  const [
    liveSkillMappingsByQuestion,
    liveSkillTagsByQuestion,
    liveTeachingPayloadByQuestion,
  ] = await Promise.all([
    loadApprovedMathSkillMappings(questionIds),
    loadCurrentMathSkillTags(questionIds),
    loadCurrentMathTeachingPayload(questionIds),
  ]);

  const levels = Array.isArray((run as any)?.sample_summary?.levels)

    ? (run as any).sample_summary.levels

    : [];

  const sample: MathQASampleSelection = {

    schema_version: 1,

    sampling_version: String((run as any).sampling_version || "2I.1") as any,

    seed: String((run as any).seed || "phase-2i-v1"),

    target_size: Number((run as any).target_size || items.length),

    actual_size: Number((run as any).actual_size || items.length),

    generated_at: String((run as any).created_at || new Date().toISOString()),

    levels,

    items: (items as any[]).map((row) => {
      const questionId = String(row.question_id);
      const snapshot =
        row.question_snapshot &&
        typeof row.question_snapshot === "object" &&
        !Array.isArray(row.question_snapshot)
          ? row.question_snapshot
          : {};

      const storedMappings = Array.isArray(snapshot.skill_mappings)
        ? snapshot.skill_mappings
        : [];

      const storedTags = Array.isArray(snapshot.skill_tags)
        ? snapshot.skill_tags
        : [];

      const skillMappings =
        storedMappings.length > 0
          ? storedMappings
          : liveSkillMappingsByQuestion.get(questionId) || [];

      const skillTags =
        storedTags.length > 0
          ? storedTags
          : liveSkillTagsByQuestion.get(questionId) || [];

      const liveTeaching = liveTeachingPayloadByQuestion.get(questionId);

      const question = {
        ...snapshot,
        id: snapshot.id || questionId,
        code: snapshot.code || String(row.question_code || questionId),
        primary_level:
          snapshot.primary_level ?? Number(row.primary_level),
        topic_id:
          snapshot.topic_id || String(row.topic_id || ""),
        topic_title:
          snapshot.topic_title || String(row.topic_title || ""),
        quiz_id:
          snapshot.quiz_id ||
          (row.quiz_id ? String(row.quiz_id) : null),
        quiz_code:
          snapshot.quiz_code ||
          (row.quiz_code ? String(row.quiz_code) : null),
        skill_tags: skillTags,
        skill_mappings: skillMappings,
        content: mergeTeachingVisualContent(
          snapshot.content,
          liveTeaching?.content,
        ),
        stimulus_id:
          snapshot.stimulus_id || liveTeaching?.stimulus_id || null,
        stimulus:
          snapshot.stimulus || liveTeaching?.stimulus || null,
        assets:
          Array.isArray(snapshot.assets) && snapshot.assets.length > 0
            ? snapshot.assets
            : liveTeaching?.assets || [],
      };

      return {

        question_id: questionId,

        question_code: String(row.question_code),

        primary_level: Number(row.primary_level),

        topic_id: String(row.topic_id),

        topic_title: String(row.topic_title || ""),

        quiz_id: row.quiz_id ? String(row.quiz_id) : null,

        quiz_code: row.quiz_code ? String(row.quiz_code) : null,

        quiz_title: null,

        quiz_published: false,

        question_type: String(question.question_type || ""),

        prompt: String(question.prompt || ""),

        sample_stratum: row.sample_stratum,

        has_question_asset:
          Array.isArray(question.assets) &&
          question.assets.length > 0,

        has_stimulus: Boolean(
          question.stimulus_id || question.stimulus,
        ),

        sample_rank: Number(row.sample_rank),

        question,

      };
    }),

  };



  const results: MathAuthoringBatchItem[] = (items as any[])

    .filter((row) => row.generation_status)

    .map((row) => ({

      client_id: String(row.question_id),

      status: row.generation_status,

      proposal: row.proposal || null,

      error: row.generation_error || null,

    }));



  return { run, items, sample, results };

}

