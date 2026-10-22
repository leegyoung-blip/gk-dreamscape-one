-- ============================================================================
-- !!!  NOT APPROVED / DO NOT RUN  !!!
-- Phase 2B-2D-B2 ADDITIVE: new internal helper + new quiz-specific start RPC. No existing function is changed.
-- This is a REVIEW DRAFT. It aborts unless the operator explicitly sets the
-- approval token inside the transaction, AFTER independent review and written
-- approval:   set local nova.release_approval = 'APPROVED-NOVA-2B2DB2-ADDITIVE';
-- ============================================================================
--
-- Creates:
--   public.nova_learner_practice_quizzes(uuid)            INTERNAL (service_role only)
--   public.start_nova_learning_cycle_for_quiz(uuid,uuid,uuid)  authenticated + service_role
-- Does NOT modify start_nova_learning_cycle, get_nova_plus_recommendations or
-- get_nova_learning_cycles. Run 02-post-additive-readonly.sql afterwards.
--
-- Concurrency guarantees of the new RPC (precise):
--   * pg_advisory_xact_lock(learner, skill) serialises calls of THIS RPC (and,
--     after enforcement, of the legacy start) for the same learner+skill, so
--     they cannot create duplicate open cycles. Until enforcement is deployed,
--     a direct legacy call is NOT serialised against it.
--   * FOR SHARE locks the exact quiz row and its topic row until commit, so a
--     concurrent visibility/publication/topic UPDATE waits; the guard is
--     evaluated under that lock.
--   * Entitlement rows (subscriptions, Founding 50 windows, zone unlocks,
--     profile role/DOB) are NOT locked; a change committed concurrently may or
--     may not be seen. The protected quiz payload guard remains the final
--     authority when the quiz is opened.

begin;

do $gate$
begin
  if coalesce(current_setting('nova.release_approval', true), '') <> 'APPROVED-NOVA-2B2DB2-ADDITIVE' then
    raise exception 'NOT APPROVED / DO NOT RUN: set local nova.release_approval = ''APPROVED-NOVA-2B2DB2-ADDITIVE'' after written approval.';
  end if;
end
$gate$;

do $fingerprints_additive$
declare
  r record;
begin
  for r in
    select t.sig, t.expected, to_regprocedure(t.sig) as oid
    from (values
    ('public.start_nova_learning_cycle(uuid, uuid)', 'e77d65e9caa8631cb4d3aa93b484b7f5'),
    ('public.core_assert_quiz_topic_access(text, uuid, uuid)', 'd05b94332dcc74b4cc73d8bb89404d52'),
    ('public.core_user_has_access(uuid)', 'cc2fe5e564d31051d3381f640ae026e7'),
    ('public.learning_user_has_zone_access(uuid, text)', 'bdc91d0757ee9085bfa0b740ff39c6ac'),
    ('public.has_complete_learning_profile(uuid)', '838c2d118a0d92861bf236326fdfeb22'),
    ('public.is_simulation_user(uuid)', 'd61ebcbb7230f1d31b0cc943e6924f15'),
    ('public.learning_profile_actor_is_staff(uuid)', '2e95c79bc8f2b2137471b491d5b33035'),
    ('public.current_user_has_nova_plus()', 'ac3abe6a24c37f91aa53190094bf5f84'),
    ('public.f50_selected_student_has_active_beta(uuid)', 'd22b27192bc38453ee23ed2a94def0a8'),
    ('public.require_complete_learning_profile(uuid)', '502e163ccc8b66aab472f300d6dd7914')
    ) as t(sig, expected)
  loop
    if r.oid is null then
      raise exception 'MISSING FUNCTION %', r.sig;
    end if;
    if md5(pg_get_functiondef(r.oid)) <> r.expected then
      raise exception 'DRIFT %: expected %, found %', r.sig, r.expected, md5(pg_get_functiondef(r.oid));
    end if;
  end loop;
  if md5(pg_get_viewdef('public.learning_quiz_skill_coverage'::regclass, true)) <> '568955253afea87acfcbbfc50404d41d' then
    raise exception 'DRIFT public.learning_quiz_skill_coverage view definition';
  end if;
end
$fingerprints_additive$;

do $absent$
begin
  if to_regprocedure('public.nova_learner_practice_quizzes(uuid)') is not null
     or to_regprocedure('public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid)') is not null then
    raise exception 'ADDITIVE OBJECTS ALREADY EXIST: review before re-running.';
  end if;
end
$absent$;

create function public.nova_learner_practice_quizzes(p_student_user_id uuid)
returns table (subject text, quiz_id uuid)
language sql
stable
security definer
set search_path = public, pg_temp
as $helper$
  /*
   * English/Math Core quizzes the SELECTED LEARNER may open. Rules mirror,
   * by role and state, public.core_assert_quiz_topic_access(subject, quiz,
   * learner) plus the learner's own Core zone (core_user_has_access, which
   * includes the Founding 50 selected learner) and the learner-specific form
   * of require_complete_learning_profile (staff or simulation users skip it).
   * Never uses the caller/viewer's role. INTERNAL: no client EXECUTE.
   */
  with learner as (
    select lower(
      replace(
        replace(trim(coalesce(profile.role, '')), '_', '-'),
        ' ',
        '-'
      )
    ) as role_clean
    from public.profiles profile
    where profile.id = p_student_user_id
    limit 1
  ),
  gate as (
    select coalesce((select learner.role_clean from learner), '') as role_clean
    where p_student_user_id is not null
      and public.core_user_has_access(p_student_user_id)
      and (
        public.learning_profile_actor_is_staff(p_student_user_id)
        or public.is_simulation_user(p_student_user_id)
        or public.has_complete_learning_profile(p_student_user_id)
      )
  ),
  quiz_rows as (
    select
      'english'::text as subject,
      quiz.id as quiz_id,
      coalesce(topic.review_status, 'reviewing') as topic_status,
      topic.is_active as topic_active,
      coalesce(quiz.student_visibility, 'reviewing') as visibility,
      quiz.is_published,
      quiz.status
    from public.english_quizzes quiz
    join public.english_topics topic on topic.id = quiz.topic_id
    union all
    select
      'math'::text,
      quiz.id,
      coalesce(topic.review_status, 'reviewing'),
      topic.is_active,
      coalesce(quiz.student_visibility, 'reviewing'),
      quiz.is_published,
      quiz.status
    from public.math_quizzes quiz
    join public.math_topics topic on topic.id = quiz.topic_id
  )
  select q.subject, q.quiz_id
  from quiz_rows q
  cross join gate g
  where (q.topic_status <> 'locked' or g.role_clean = 'admin')
    and (
      g.role_clean in ('admin', 'curriculum-lead')
      or (
        coalesce(q.topic_active, false)
        and coalesce(q.is_published, false)
        and coalesce(q.status, '') = 'published'
      )
    )
    and (
      case
        when g.role_clean = 'teacher' then q.visibility in ('reviewing', 'satisfied')
        when g.role_clean in ('admin', 'curriculum-lead') then true
        else q.visibility = 'satisfied'
      end
    );
$helper$;

revoke all on function public.nova_learner_practice_quizzes(uuid) from public;
revoke all on function public.nova_learner_practice_quizzes(uuid) from anon;
revoke all on function public.nova_learner_practice_quizzes(uuid) from authenticated;
grant execute on function public.nova_learner_practice_quizzes(uuid) to service_role;

create function public.start_nova_learning_cycle_for_quiz(
  p_student_user_id uuid,
  p_skill_id uuid,
  p_quiz_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $start$
declare
  v_user_id uuid := auth.uid();
  v_skill public.learning_skill_taxonomy%rowtype;
  v_topic_id uuid;
  v_quiz_level smallint;
  v_result jsonb;
begin
  if v_user_id is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Learner actions only: a parent/teacher/admin viewer cannot start a learner's cycle.
  if p_student_user_id is null or v_user_id <> p_student_user_id then
    raise exception 'LEARNER_ACCOUNT_REQUIRED';
  end if;

  if p_skill_id is null or p_quiz_id is null then
    raise exception 'PRACTICE_QUIZ_REQUIRED';
  end if;

  if not (public.current_user_has_nova_plus()
    or public.f50_selected_student_has_active_beta(p_student_user_id)) then
    raise exception 'NOVA_PLUS_ACCESS_REQUIRED';
  end if;

  -- Subject and level come from the canonical skill, never from the client.
  select *
  into v_skill
  from public.learning_skill_taxonomy
  where id = p_skill_id
    and subject in ('english', 'math')
    and source = 'nova_curriculum_rollout_sql'
    and is_topic_level = false
    and is_active = true
    and review_status = 'approved';

  if v_skill.id is null then
    raise exception 'CANONICAL_SKILL_NOT_FOUND';
  end if;

  -- One start at a time per learner+skill (no duplicate open cycle).
  perform pg_advisory_xact_lock(
    hashtextextended(p_student_user_id::text || ':' || p_skill_id::text, 0)
  );

  -- Lock the exact quiz and topic rows until commit, then re-check under lock.
  if v_skill.subject = 'english' then
    select quiz.topic_id into v_topic_id
    from public.english_quizzes quiz
    where quiz.id = p_quiz_id
    for share;
    if v_topic_id is not null then
      select topic.primary_level into v_quiz_level
      from public.english_topics topic
      where topic.id = v_topic_id
      for share;
    end if;
  else
    select quiz.topic_id into v_topic_id
    from public.math_quizzes quiz
    where quiz.id = p_quiz_id
    for share;
    if v_topic_id is not null then
      select topic.primary_level into v_quiz_level
      from public.math_topics topic
      where topic.id = v_topic_id
      for share;
    end if;
  end if;

  if v_topic_id is null or v_quiz_level is null then
    raise exception 'PRACTICE_QUIZ_NOT_FOUND';
  end if;

  if v_quiz_level <> v_skill.primary_level then
    raise exception 'PRACTICE_QUIZ_NOT_FOR_SKILL';
  end if;

  -- The quiz must carry approved PRIMARY mapping to this exact skill.
  if not exists (
    select 1
    from public.learning_quiz_skill_coverage coverage
    where coverage.subject = v_skill.subject
      and coverage.quiz_id = p_quiz_id
      and coverage.skill_id = p_skill_id
      and coverage.primary_level = v_skill.primary_level
      and coverage.is_published = true
      and coalesce(coverage.primary_question_count, 0) > 0
  ) then
    raise exception 'PRACTICE_QUIZ_NOT_FOR_SKILL';
  end if;

  if not public.core_user_has_access(p_student_user_id) then
    raise exception 'CORE_ACCESS_REQUIRED';
  end if;

  -- Actor is the learner here, so the actor-bound profile guard is valid.
  perform public.require_complete_learning_profile(p_student_user_id);

  -- Authoritative quiz/topic guard, evaluated for the LEARNER.
  begin
    perform public.core_assert_quiz_topic_access(v_skill.subject, p_quiz_id, p_student_user_id);
  exception when insufficient_privilege then
    raise exception 'PRACTICE_QUIZ_NOT_ACCESSIBLE' using detail = sqlerrm;
  end;

  -- Belt and braces: the set-based helper must agree (fails closed if not).
  if not exists (
    select 1
    from public.nova_learner_practice_quizzes(p_student_user_id) accessible
    where accessible.subject = v_skill.subject
      and accessible.quiz_id = p_quiz_id
  ) then
    raise exception 'PRACTICE_QUIZ_NOT_ACCESSIBLE';
  end if;

  -- Existing mastery/focus rules, duplicate-cycle reuse and insert.
  v_result := public.start_nova_learning_cycle(p_student_user_id, p_skill_id);

  return v_result || jsonb_build_object(
    'quiz_id', p_quiz_id,
    'quiz_href',
      '/learning-missions/core/' || v_skill.subject
      || '/p' || v_quiz_level::text
      || '/quiz/' || p_quiz_id::text
  );
end;
$start$;

revoke all on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) from public;
revoke all on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) from anon;
grant execute on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) to authenticated;
grant execute on function public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid) to service_role;

do $post_additive$
declare
  v_helper regprocedure := to_regprocedure('public.nova_learner_practice_quizzes(uuid)');
  v_start regprocedure := to_regprocedure('public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid)');
begin
  if has_function_privilege('anon', v_helper, 'EXECUTE')
     or has_function_privilege('authenticated', v_helper, 'EXECUTE')
     or not has_function_privilege('service_role', v_helper, 'EXECUTE') then
    raise exception 'HELPER GRANTS WRONG';
  end if;
  if has_function_privilege('anon', v_start, 'EXECUTE')
     or not has_function_privilege('authenticated', v_start, 'EXECUTE')
     or not has_function_privilege('service_role', v_start, 'EXECUTE') then
    raise exception 'NEW START RPC GRANTS WRONG';
  end if;
  if not (select bool_and(p.prosecdef) from pg_proc p where p.oid in (v_helper, v_start)) then
    raise exception 'SECURITY DEFINER MISSING';
  end if;
  if exists (
    select 1 from pg_proc p
    where p.oid in (v_helper, v_start)
      and not coalesce(p.proconfig, array[]::text[]) @> array['search_path=public, pg_temp']
  ) then
    raise exception 'SEARCH_PATH NOT PINNED';
  end if;
  -- Existing protected routines keep their grants.
  if has_function_privilege('authenticated', 'public.core_assert_quiz_topic_access(text, uuid, uuid)'::regprocedure, 'EXECUTE')
     or has_function_privilege('authenticated', 'public.core_user_has_access(uuid)'::regprocedure, 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.start_nova_learning_cycle(uuid, uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'EXISTING GRANTS CHANGED';
  end if;
  -- The legacy start body is still the audited original.
  if md5(pg_get_functiondef('public.start_nova_learning_cycle(uuid, uuid)'::regprocedure)) <> 'e77d65e9caa8631cb4d3aa93b484b7f5' then
    raise exception 'LEGACY START CHANGED';
  end if;
end
$post_additive$;

notify pgrst, 'reload schema';

commit;
