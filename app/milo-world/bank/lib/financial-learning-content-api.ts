import { supabase } from "@/lib/supabase";
import type { FinancialLessonDefinition, FinancialLessonResponseMap } from "./financial-learning-engine-types";
import type {
  MiloFinanceCourse,
  MiloFinanceLessonBlockRow,
  MiloFinanceLessonCompletion,
  MiloFinanceLessonSummary,
  MiloFinanceLoadedLesson,
  MiloFinanceLessonProgress,
  MiloFinanceModule,
} from "./financial-learning-content-types";

function contentError(error: unknown, fallback: string): Error {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return new Error(message);
  }
  return new Error(fallback);
}

export async function listMiloFinanceCourses(): Promise<MiloFinanceCourse[]> {
  const { data, error } = await supabase
    .from("milo_finance_courses")
    .select("id,title,description,access_tier,sort_order,status,metadata")
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw contentError(error, "Could not load Milo Finance courses.");
  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    accessTier: row.access_tier,
    sortOrder: Number(row.sort_order ?? 0),
    status: row.status,
    metadata: row.metadata ?? {},
  }));
}

export async function listMiloFinanceModules(courseId: string): Promise<MiloFinanceModule[]> {
  const { data, error } = await supabase
    .from("milo_finance_modules")
    .select("id,course_id,module_key,title,description,access_tier,sort_order,status")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw contentError(error, "Could not load Milo Finance modules.");
  return (data ?? []).map((row: any) => ({
    id: row.id,
    courseId: row.course_id,
    moduleKey: row.module_key,
    title: row.title,
    description: row.description ?? "",
    accessTier: row.access_tier,
    sortOrder: Number(row.sort_order ?? 0),
    status: row.status,
  }));
}

function mapLesson(row: any): MiloFinanceLessonSummary {
  return {
    id: row.id,
    lessonKey: row.lesson_key,
    courseId: row.course_id,
    moduleId: row.module_id ?? null,
    legacyLessonKey: row.legacy_lesson_key ?? null,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description ?? "",
    durationMinutes: Number(row.duration_minutes ?? 5),
    rewardDt: Number(row.reward_dt ?? 0),
    accessTier: row.access_tier,
    sortOrder: Number(row.sort_order ?? 0),
    concepts: row.concepts ?? [],
    skillKeys: row.skill_keys ?? [],
    schemaVersion: Number(row.schema_version ?? 2) as 1 | 2,
    startBlockId: row.start_block_id ?? null,
    variableDefinitions: row.variable_definitions ?? [],
    status: row.status,
    version: Number(row.version ?? 1),
    contentSource: row.content_source ?? "database",
  };
}

export async function listMiloFinanceLessons(courseId: string): Promise<MiloFinanceLessonSummary[]> {
  const { data, error } = await supabase
    .from("milo_finance_lessons")
    .select("id,lesson_key,course_id,module_id,legacy_lesson_key,title,short_title,description,duration_minutes,reward_dt,access_tier,sort_order,concepts,skill_keys,schema_version,start_block_id,variable_definitions,status,version,content_source")
    .eq("course_id", courseId)
    .eq("status", "published")
    .order("sort_order", { ascending: true });
  if (error) throw contentError(error, "Could not load Milo Finance lessons.");
  return (data ?? []).map(mapLesson);
}

export async function loadMiloFinanceLesson(lessonKey: string): Promise<MiloFinanceLoadedLesson> {
  const { data: lessonData, error: lessonError } = await supabase
    .from("milo_finance_lessons")
    .select("id,lesson_key,course_id,module_id,legacy_lesson_key,title,short_title,description,duration_minutes,reward_dt,access_tier,sort_order,concepts,skill_keys,schema_version,start_block_id,variable_definitions,status,version,content_source")
    .eq("lesson_key", lessonKey)
    .eq("status", "published")
    .single();
  if (lessonError) throw contentError(lessonError, "Could not load this Milo Finance lesson.");

  const summary = mapLesson(lessonData);
  if (summary.contentSource === "legacy") {
    throw new Error("This lesson still uses the legacy Financial Foundations adapter and has not been migrated to database blocks yet.");
  }

  const { data: blockData, error: blockError } = await supabase
    .from("milo_finance_lesson_blocks")
    .select("block_key,block_type,sort_order,block_data")
    .eq("lesson_id", summary.id)
    .order("sort_order", { ascending: true });
  if (blockError) throw contentError(blockError, "Could not load the lesson activities.");

  const blocks: MiloFinanceLessonBlockRow[] = (blockData ?? []).map((row: any) => ({
    blockKey: row.block_key,
    blockType: row.block_type,
    sortOrder: Number(row.sort_order ?? 0),
    blockData: row.block_data,
  }));

  if (!blocks.length) throw new Error("This lesson has no published learning blocks yet.");

  const definition: FinancialLessonDefinition = {
    schemaVersion: summary.schemaVersion,
    id: summary.lessonKey,
    courseId: summary.courseId,
    moduleId: summary.moduleId ?? undefined,
    order: summary.sortOrder,
    title: summary.title,
    shortTitle: summary.shortTitle,
    description: summary.description,
    duration: `${summary.durationMinutes} min`,
    rewardDt: summary.rewardDt,
    accessTier: summary.accessTier,
    concepts: summary.concepts,
    startBlockId: summary.startBlockId ?? undefined,
    variables: summary.variableDefinitions,
    blocks: blocks.map((row) => ({ ...row.blockData, id: row.blockKey })),
  };

  return { summary, definition };
}

export async function saveMiloFinanceLessonCheckpoint(args: {
  lessonKey: string;
  advisorId: "nova" | "milo";
  lastBlockKey: string;
  responses: FinancialLessonResponseMap;
}): Promise<void> {
  const { error } = await supabase.rpc("save_milo_finance_lesson_checkpoint", {
    p_lesson_key: args.lessonKey,
    p_advisor: args.advisorId,
    p_last_block_key: args.lastBlockKey,
    p_responses: Object.values(args.responses),
  });
  if (error) throw contentError(error, "Could not save lesson progress.");
}

export async function completeMiloFinanceLesson(args: {
  lessonKey: string;
  advisorId: "nova" | "milo";
  responses: FinancialLessonResponseMap;
}): Promise<MiloFinanceLessonCompletion> {
  const { data, error } = await supabase.rpc("complete_milo_finance_lesson_v2", {
    p_lesson_key: args.lessonKey,
    p_advisor: args.advisorId,
    p_responses: Object.values(args.responses),
  });
  if (error) throw contentError(error, "Could not complete this lesson.");

  const row = (Array.isArray(data) ? data[0] : data) as any;
  if (!row) throw new Error("Lesson completion did not return a result.");
  return {
    lessonKey: row.lesson_key,
    completedAt: row.completed_at,
    rewardAmount: Number(row.reward_amount ?? 0),
    newlyCompleted: Boolean(row.newly_completed),
  };
}


export async function listMiloFinanceLessonProgress(): Promise<MiloFinanceLessonProgress[]> {
  const { data, error } = await supabase
    .from("milo_finance_lesson_progress")
    .select("lesson_id,status,selected_advisor,last_block_key,attempt_no,reward_issued,started_at,last_seen_at,completed_at");

  if (error) throw contentError(error, "Could not load Milo Finance lesson progress.");

  return ((data ?? []) as any[]).map((row) => ({
    lessonId: row.lesson_id,
    status: row.status,
    selectedAdvisor: row.selected_advisor,
    lastBlockKey: row.last_block_key ?? null,
    attemptNo: Number(row.attempt_no ?? 1),
    rewardIssued: Number(row.reward_issued ?? 0),
    startedAt: row.started_at,
    lastSeenAt: row.last_seen_at,
    completedAt: row.completed_at ?? null,
  }));
}
