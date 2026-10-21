import { CORE_TABLES } from "@/lib/core-missions/catalogue";
import { normaliseRole, roleHasStaffLearningAccess } from "@/lib/learning-access";

/* --------------------------------------------------------------------------
 * NOVA+ practice access check (read-only, client-side defence in depth).
 *
 * Mirrors the existing learner-facing Core Missions rules so NOVA+ does not
 * offer, or open a learning cycle for, a quiz the signed-in account cannot
 * open:
 * - Core zone (hooks/useCoreMissionAccess.ts): staff role or is_staff, OR
 *   dreamscape_get_my_learning_access().core, OR a manual core zone unlock.
 * - Quiz (CoreTopicClient.tsx): is_published, status 'published', and
 *   student_visibility 'satisfied' for learners ('reviewing' | 'satisfied'
 *   for teachers; no visibility filter for admin / curriculum lead).
 * - Topic (CoreTopicClient.tsx): is_active, and not review_status 'locked'
 *   unless admin.
 *
 * Only table reads and the existing read-only access RPC are used. It never
 * calls quiz payload, attempt, *_unlocked or cycle functions. Anything that
 * cannot be verified (errors, missing rows hidden by RLS, unknown ids, no
 * session) is treated as NOT accessible. This is not authoritative: the
 * server must still enforce access when a cycle starts.
 * -------------------------------------------------------------------------- */

export type PracticeSubject = "english" | "math";

export type PracticeQuizRef = {
  subject: string | null | undefined;
  quizId: string | null | undefined;
};

export type CoreZoneDecision = "allowed" | "locked" | "unverified";

export type PracticeAccessResult = {
  zone: CoreZoneDecision;
  /** Keys (`subject:quizId`) that passed every check. */
  accessible: Set<string>;
  /** Keys whose quiz/topic data could not be read; never "blocked" claims. */
  unverified: Set<string>;
};

export type PracticeAccessState = "allowed" | "checking" | "blocked" | "unverified";

type QuizRow = {
  id: string;
  topic_id: string | null;
  is_published: boolean | null;
  status: string | null;
  student_visibility: string | null;
};

type TopicRow = {
  id: string;
  is_active: boolean | null;
  review_status: string | null;
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

type QueryBuilder<T> = PromiseLike<QueryResult<T>> & {
  select: (columns: string) => QueryBuilder<T>;
  eq: (column: string, value: unknown) => QueryBuilder<T>;
  in: (column: string, values: unknown[]) => QueryBuilder<T>;
  maybeSingle: () => PromiseLike<QueryResult<T>>;
};

/** The subset of the Supabase client this check uses. */
export type PracticeAccessClient = {
  auth: {
    getSession: () => PromiseLike<{
      data: { session: { user: { id: string } } | null };
      error: { message: string } | null;
    }>;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => QueryBuilder<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => PromiseLike<QueryResult<any>>;
};

export function practiceSubject(value: unknown): PracticeSubject | null {
  const subject = String(value ?? "").trim().toLowerCase();
  return subject === "english" || subject === "math" ? subject : null;
}

export function practiceQuizKey(subject: unknown, quizId: unknown) {
  const resolved = practiceSubject(subject);
  const id = String(quizId ?? "").trim();
  return resolved && id ? `${resolved}:${id}` : "";
}

/** Same visibility rule as the Core topic page, per viewer role. */
export function quizVisibilityAllowed(role: string | null | undefined, visibility: unknown) {
  const normalised = normaliseRole(role);
  if (normalised === "admin" || normalised === "curriculum-lead") return true;
  const value = String(visibility ?? "");
  if (normalised === "teacher") return value === "reviewing" || value === "satisfied";
  return value === "satisfied";
}

export function topicAllowed(role: string | null | undefined, topic: TopicRow | null | undefined) {
  if (!topic || topic.is_active !== true) return false;
  return topic.review_status !== "locked" || normaliseRole(role) === "admin";
}

export function quizRowAllowed(
  role: string | null | undefined,
  quiz: QuizRow | null | undefined,
  topic: TopicRow | null | undefined,
) {
  return Boolean(
    quiz &&
      quiz.is_published === true &&
      quiz.status === "published" &&
      quizVisibilityAllowed(role, quiz.student_visibility) &&
      topicAllowed(role, topic),
  );
}

/** Same Core zone decision as useCoreMissionAccess, without its listeners. */
export function coreZoneDecision(input: {
  role: string | null | undefined;
  access: { is_staff?: boolean; core?: boolean } | null;
  accessError: boolean;
  manualUnlocked: boolean;
  manualError: boolean;
}): CoreZoneDecision {
  if (roleHasStaffLearningAccess(input.role) || Boolean(input.access?.is_staff)) return "allowed";
  if (Boolean(input.access?.core) || input.manualUnlocked) return "allowed";
  if (input.accessError || input.manualError) return "unverified";
  return "locked";
}

export function practiceAccessState(
  result: PracticeAccessResult | null,
  subject: unknown,
  quizId: unknown,
): PracticeAccessState {
  if (!result) return "checking";
  const key = practiceQuizKey(subject, quizId);
  if (!key) return "unverified";
  if (result.zone === "unverified") return "unverified";
  if (result.zone === "locked") return "blocked";
  if (result.accessible.has(key)) return "allowed";
  return result.unverified.has(key) ? "unverified" : "blocked";
}

function emptyResult(zone: CoreZoneDecision, keys: string[]): PracticeAccessResult {
  return { zone, accessible: new Set(), unverified: new Set(zone === "unverified" ? keys : []) };
}

export async function checkPracticeAccess(
  client: PracticeAccessClient,
  refs: PracticeQuizRef[],
): Promise<PracticeAccessResult> {
  const bySubject = new Map<PracticeSubject, Set<string>>();
  for (const ref of refs) {
    const subject = practiceSubject(ref.subject);
    const id = String(ref.quizId ?? "").trim();
    if (!subject || !id) continue;
    if (!bySubject.has(subject)) bySubject.set(subject, new Set());
    bySubject.get(subject)!.add(id);
  }
  const keys = [...bySubject.entries()].flatMap(([subject, ids]) => [...ids].map((id) => `${subject}:${id}`));

  try {
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (sessionError || !userId) return emptyResult("unverified", keys);

    const [profileResult, accessResult, manualResult] = await Promise.all([
      client.from("profiles").select("role,tier").eq("id", userId).maybeSingle(),
      client.rpc("dreamscape_get_my_learning_access"),
      client
        .from("learning_mission_zone_access")
        .select("is_unlocked")
        .eq("user_id", userId)
        .eq("zone_key", "core")
        .maybeSingle(),
    ]);

    const access = (accessResult.data ?? null) as { is_staff?: boolean; core?: boolean; role?: string | null } | null;
    const role =
      (profileResult.data as { role?: string | null; tier?: string | null } | null)?.role ||
      (profileResult.data as { role?: string | null; tier?: string | null } | null)?.tier ||
      access?.role ||
      null;

    const zone = coreZoneDecision({
      role,
      access,
      accessError: Boolean(accessResult.error),
      manualUnlocked: !manualResult.error && Boolean((manualResult.data as { is_unlocked?: boolean } | null)?.is_unlocked),
      manualError: Boolean(manualResult.error),
    });

    if (zone !== "allowed") return emptyResult(zone, keys);

    const result: PracticeAccessResult = { zone, accessible: new Set(), unverified: new Set() };

    await Promise.all(
      [...bySubject.entries()].map(async ([subject, ids]) => {
        const tables = CORE_TABLES[subject];
        const markUnverified = () => ids.forEach((id) => result.unverified.add(`${subject}:${id}`));

        const quizResult = await client
          .from(tables.quizzes)
          .select("id,topic_id,is_published,status,student_visibility")
          .in("id", [...ids]);
        if (quizResult.error || !Array.isArray(quizResult.data)) return markUnverified();

        const quizzes = quizResult.data as QuizRow[];
        const topicIds = [...new Set(quizzes.map((quiz) => quiz.topic_id).filter((id): id is string => Boolean(id)))];

        let topics: TopicRow[] = [];
        if (topicIds.length) {
          const topicResult = await client
            .from(tables.topics)
            .select("id,is_active,review_status")
            .in("id", topicIds);
          if (topicResult.error || !Array.isArray(topicResult.data)) return markUnverified();
          topics = topicResult.data as TopicRow[];
        }

        const topicById = new Map(topics.map((topic) => [String(topic.id), topic]));
        for (const quiz of quizzes) {
          const topic = quiz.topic_id ? topicById.get(String(quiz.topic_id)) : null;
          if (quizRowAllowed(role, quiz, topic)) result.accessible.add(`${subject}:${quiz.id}`);
        }
        // Quizzes not returned (unknown id or hidden by RLS) stay not accessible.
      }),
    );

    return result;
  } catch {
    return emptyResult("unverified", keys);
  }
}
