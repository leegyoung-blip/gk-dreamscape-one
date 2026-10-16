/**
 * DREAMSCAPE ONE - Phase 4E-2A-3: authenticated STAFF-ONLY Mathematics source resolver.
 *
 * INTERNAL SERVER USE ONLY. This obtains answer_data, which must NEVER be sent to
 * a client, used in a learner API, logged, or placed in React server-component props.
 *
 * No HTTP route, learner-facing teaching, method selection, database writes, or
 * grant changes are implemented here. Approval and student release remain disabled.
 */
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import {
  requireCurriculumDeveloperApiAccess,
} from '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth';
import {
  prepareMathTeachingSourceFromDbRows,
} from './phase4E2A2TrustedSource.server';

type DbRecord = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuid = (x: unknown): x is string => typeof x === 'string' && UUID.test(x);
const isRecord = (x: unknown): x is DbRecord => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const blocked = (reason: 'INVALID_QUERY' | 'NOT_AUTHORIZED' | 'NOT_FOUND_OR_INCONSISTENT' | 'SOURCE_NOT_READY') =>
  ({ status: 'blocked' as const, reason });

/**
 * `source` includes the authoritative answer key. Never stringify/return the
 * ready object in a route. Only pass it to server-only 4A/4C staff processing.
 */
export type StaffMathSourceResult =
  | ReturnType<typeof blocked>
  | Readonly<{
      status: 'ready';
      source: NonNullable<Extract<ReturnType<typeof prepareMathTeachingSourceFromDbRows>, {status:'ready'}>['source']>;
      sourceIdentity: Readonly<{quizId:string; questionId:string; questionVersion:number|null}>;
      staffReview: Readonly<{
        quizStatus: string;
        questionStatus: string;
        quizPublished: boolean;
        studentReleased: false;
      }>;
    }>;

function bearerToken(request: Request): string | null {
  const value = request.headers.get('authorization') || '';
  const match = /^Bearer\s+([^\s]+)$/i.exec(value.trim());
  return match?.[1] ?? null;
}


/**
 * Authentication and DB roles are verified freshly on EVERY invocation.
 * Uses only the public ANON/PUBLISHABLE key plus the verified caller's JWT,
 * never a service-role/secret key. RLS provides an additional database gate.
 *
 * This function must only be called from a server-only staff operation.
 * There is deliberately no corresponding browser API or route in this phase.
 */
export async function resolveStaffMathTeachingSource(
  request: Request,
  ids: Readonly<{ quizId: unknown; questionId: unknown }>,
): Promise<StaffMathSourceResult> {
  if (!ids || !validUuid(ids.quizId) || !validUuid(ids.questionId)) {
    return blocked('INVALID_QUERY');
  }

  try {
    // Existing Dreamscape API authorization validates the token, and allows
    // ONLY admin/curriculum_lead roles. No teacher or learner bypass.
    const actor = await requireCurriculumDeveloperApiAccess(request);
    if (!actor || (actor.role !== 'admin' && actor.role !== 'curriculum_lead') || !validUuid(actor.user_id)) {
      return blocked('NOT_AUTHORIZED');
    }
    const token = bearerToken(request);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !url || !publicKey) return blocked('NOT_AUTHORIZED');

    // IMPORTANT: No SUPABASE_SERVICE_ROLE_KEY or secret-admin client.
    const supabase = createClient(url, publicKey, {
      auth: { persistSession:false, autoRefreshToken:false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    // Close over this exact client instance instead of describing it with
    // ReturnType<typeof createClient>, whose generic instantiation can differ
    // from the inferred Supabase client type and produce TS2345 at call sites.
    const fetchOne = async (
      table: string,
      columns: string,
      filters: ReadonlyArray<readonly [string, string]>,
    ): Promise<DbRecord | null> => {
      let query = supabase.from(table).select(columns);
      for (const [field, value] of filters) query = query.eq(field, value);
      const result = await query.maybeSingle();
      if (result.error || !isRecord(result.data)) return null;
      return result.data;
    };

    const userResult = await supabase.auth.getUser(token);
    if (userResult.error || !userResult.data.user || userResult.data.user.id !== actor.user_id) {
      return blocked('NOT_AUTHORIZED');
    }

    const quiz = await fetchOne('math_quizzes',
      'id,topic_id,status,is_published,student_visibility,version', [['id',ids.quizId]]);
    if (!quiz || quiz.id !== ids.quizId || !validUuid(quiz.topic_id)) {
      return blocked('NOT_FOUND_OR_INCONSISTENT');
    }
    const topic = await fetchOne('math_topics',
      'id,subject,primary_level,title', [['id',quiz.topic_id]]);
    if (!topic || topic.id !== quiz.topic_id || topic.subject !== 'math' ||
        typeof topic.primary_level !== 'number' ||
        !Number.isInteger(topic.primary_level) ||
        topic.primary_level < 1 || topic.primary_level > 6) {
      return blocked('NOT_FOUND_OR_INCONSISTENT');
    }
    const link = await fetchOne('math_quiz_questions',
      'quiz_id,question_id,question_order', [['quiz_id',ids.quizId],['question_id',ids.questionId]]);
    if (!link || link.quiz_id !== ids.quizId || link.question_id !== ids.questionId) {
      return blocked('NOT_FOUND_OR_INCONSISTENT');
    }
    const question = await fetchOne('math_questions',
      'id,subject,primary_level,topic_id,code,question_type,instruction,prompt,content,answer_data,skill,skill_tags,difficulty,status,version',
      [['id',ids.questionId]]);
    if (!question || question.id !== ids.questionId ||
        question.subject !== 'math' ||
        question.primary_level !== topic.primary_level ||
        question.topic_id !== quiz.topic_id ||
        typeof question.status !== 'string') {
      return blocked('NOT_FOUND_OR_INCONSISTENT');
    }
    // The 2A-2 adapter only prepares a server-side canonical source. It does
    // NOT certify answer semantics or Gold teaching approval.
    const prepared = prepareMathTeachingSourceFromDbRows({quiz,link,question,topic});
    if (prepared.status !== 'ready') return blocked('SOURCE_NOT_READY');
    return {
      status: 'ready', source: prepared.source,
      sourceIdentity: prepared.sourceIdentity,
      staffReview: {
        quizStatus: typeof quiz.status === 'string' ? quiz.status : 'unknown',
        questionStatus: question.status,
        quizPublished: quiz.is_published === true,
        studentReleased: false,
      },
    };
  } catch {
    // Fail closed. No database contents, JWTs or internal exception messages
    // are reflected to any potential caller.
    return blocked('NOT_AUTHORIZED');
  }
}
