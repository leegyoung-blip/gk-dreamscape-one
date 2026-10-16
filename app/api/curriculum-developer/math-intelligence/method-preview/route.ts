/**
 * DREAMSCAPE ONE / 4E-2B-2
 * Staff-only, read-only Math Teaching Intelligence preview boundary.
 * GET: bounded quiz/question pickers (no prompts, answers or teaching JSON).
 * POST: sanitized 4E-2B-1 method metadata, never answer-bearing source.
 * No student release, Gold verification, authoring, or database writes.
 */
import 'server-only';

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  CurriculumDeveloperApiAccessError,
  requireCurriculumDeveloperApiAccess,
} from '@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth';
import { previewStaffMathMethod } from '@/lib/math/teaching/student-serving/phase4E2B1StaffMethodPreview.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_BODY_BYTES = 2048;

type TopicRow = { id: string };
type QuizRow = { id: string; title: string | null; status: string | null };
type QuestionLinkRow = { question_id: string; question_order: number | null };
type QuestionRow = { id: string; code: string | null; question_type: string | null };
const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID.test(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

function json(value: unknown, status = 200) {
  return NextResponse.json(value, {
    status,
    headers: {
      'Cache-Control': 'private, no-store, max-age=0',
      'Vary': 'Authorization',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
function error(code: string, status: number) {
  return json({ ok: false, error: { code } }, status);
}
function authError(exception: unknown) {
  if (exception instanceof CurriculumDeveloperApiAccessError) {
    return error(exception.code, exception.status);
  }
  return error('PREVIEW_UNAVAILABLE', 503);
}
function staffClient(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  const match = /^Bearer\s+([^\s]+)$/i.exec(request.headers.get('authorization')?.trim() || '');
  if (!url || !key || !match) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${match[1]}` } },
  });
}

export async function GET(request: Request) {
  try {
    await requireCurriculumDeveloperApiAccess(request);
    const db = staffClient(request);
    if (!db) return error('AUTH_REQUIRED', 401);
    const params = new URL(request.url).searchParams;
    const mode = params.get('mode');

    if (mode === 'quizzes') {
      const levelText = params.get('level');
      if (!levelText || !/^[1-6]$/.test(levelText)) return error('INVALID_LEVEL', 400);
      const level = Number(levelText);
      const topics = await db.from('math_topics').select('id')
        .eq('subject', 'math').eq('primary_level', level).limit(500);
      if (topics.error) return error('QUIZ_LIST_UNAVAILABLE', 503);
      const ids = ((topics.data || []) as TopicRow[]).map((item) => item.id).filter(isUuid);
      if (!ids.length) return json({ ok: true, mode: 'quizzes', level, quizzes: [] });
      const quizzes = await db.from('math_quizzes')
        .select('id,title,status,is_published,topic_id')
        .in('topic_id', ids).order('title', { ascending: true }).limit(100);
      if (quizzes.error) return error('QUIZ_LIST_UNAVAILABLE', 503);
      return json({
        ok: true, mode: 'quizzes', level,
        quizzes: ((quizzes.data || []) as QuizRow[]).filter((q) => isUuid(q.id)).map((q) => ({
          id: q.id,
          title: String(q.title || 'Untitled quiz').slice(0, 160),
          status: String(q.status || 'unknown').slice(0, 40),
        })),
      });
    }

    if (mode === 'questions') {
      const quizId = params.get('quizId');
      if (!isUuid(quizId)) return error('INVALID_QUIZ_ID', 400);
      // Verify parent visibility and Math topic before returning children.
      const quiz = await db.from('math_quizzes').select('id,topic_id')
        .eq('id', quizId).maybeSingle();
      if (quiz.error || !quiz.data || !isUuid(quiz.data.topic_id)) {
        return error('QUIZ_NOT_AVAILABLE', 404);
      }
      const topic = await db.from('math_topics').select('id,subject,primary_level')
        .eq('id', quiz.data.topic_id).maybeSingle();
      if (topic.error || topic.data?.subject !== 'math' ||
          !Number.isInteger(topic.data?.primary_level) ||
          topic.data!.primary_level < 1 || topic.data!.primary_level > 6) {
        return error('QUIZ_NOT_AVAILABLE', 404);
      }
      const links = await db.from('math_quiz_questions')
        .select('question_id,question_order').eq('quiz_id', quizId)
        .order('question_order', { ascending: true }).limit(40);
      if (links.error) return error('QUESTION_LIST_UNAVAILABLE', 503);
      const linkedRows = (links.data || []) as QuestionLinkRow[];
      const questionIds = linkedRows.map((link) => link.question_id).filter(isUuid);
      if (!questionIds.length) return json({ ok: true, mode: 'questions', quizId, questions: [] });
      const questions = await db.from('math_questions')
        .select('id,code,question_type').in('id', questionIds).limit(40);
      if (questions.error) return error('QUESTION_LIST_UNAVAILABLE', 503);
      const questionRows = (questions.data || []) as QuestionRow[];
      const byId = new Map<string, QuestionRow>(questionRows.map((q) => [q.id, q]));
      return json({
        ok: true, mode: 'questions', quizId,
        questions: linkedRows.flatMap((link, index) => {
          const question = byId.get(link.question_id);
          if (!question) return [];
          return [{
            id: question.id,
            label: String(question.code || `Question ${index + 1}`).slice(0, 100),
            type: String(question.question_type || 'unknown').slice(0, 32),
            order: Number.isInteger(link.question_order) ? link.question_order : index + 1,
          }];
        }),
      });
    }
    return error('INVALID_MODE', 400);
  } catch (exception) {
    return authError(exception);
  }
}

export async function POST(request: Request) {
  try {
    await requireCurriculumDeveloperApiAccess(request);
    const length = Number(request.headers.get('content-length') || 0);
    if (Number.isFinite(length) && length > MAX_BODY_BYTES) {
      return error('REQUEST_TOO_LARGE', 413);
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return error('REQUEST_TOO_LARGE', 413);
    let body: unknown;
    try { body = JSON.parse(raw); } catch { return error('INVALID_JSON', 400); }
    if (!isRecord(body) || !isUuid(body.quizId) || !isUuid(body.questionId)) {
      return error('INVALID_SELECTION', 400);
    }
    const preview = await previewStaffMathMethod(request, {
      quizId: body.quizId, questionId: body.questionId,
    });
    // 4E-2B-1 only returns bounded statuses, reason codes, and method metadata.
    // Do not spread source, canonical, answer_data, question content, or other DB rows here.
    return json({ ok: true, preview });
  } catch (exception) {
    return authError(exception);
  }
}
