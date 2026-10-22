-- ============================================================================
-- !!!  NOT APPROVED / DO NOT RUN  !!!
-- Phase 2B-2D-B2 ENFORCEMENT: patches the three live functions in place. Deploy ONLY after the additive SQL AND the compatible NOVA+ client are live.
-- This is a REVIEW DRAFT. It aborts unless the operator explicitly sets the
-- approval token inside the transaction, AFTER independent review and written
-- approval:   set local nova.release_approval = 'APPROVED-NOVA-2B2DB2-ENFORCEMENT';
-- ============================================================================
--
-- How this works (no production body is stored in this file):
--   1. Reads the LIVE definition with pg_get_functiondef.
--   2. Aborts unless its md5 equals the audited original.
--   3. Applies small reviewed anchor replacements; each anchor must match
--      exactly once (anchors are normalised to the CRLF bodies stored live).
--   4. Aborts unless the patched text has the predicted md5.
--   5. CREATE OR REPLACE with the same signature/return type, so owner and
--      grants are preserved; re-verifies the md5 afterwards.
--
-- Semantics added (R1, learner-based access, scores/lanes/thresholds unchanged):
--   start_nova_learning_cycle: advisory lock + accessible published primary-mapped
--     practice at the skill's level is required BEFORE an existing cycle is
--     returned or a new one inserted ('PRACTICE_QUIZ_NOT_ACCESSIBLE').
--   get_nova_plus_recommendations: picked quiz and alternatives restricted to the
--     LEARNER's accessible set and the skill's level; alternatives also need
--     primary coverage; CROSS -> LEFT lateral keeps needs without a mission;
--     'alternatives' never null; new per-item 'practice_status'.
--   get_nova_learning_cycles: practice link restricted the same way; rows are
--     never changed by this patch; new per-cycle 'practice_status'.
--     (Its pre-existing call to refresh_nova_learning_cycles is unchanged.)
--
-- Predicted md5 after enforcement:
--   start   3d4cf5cb26b43b5e251c5f9cdca04946
--   recs    6875b17975e5b084fe289e34b038f87f
--   cycles  f39fb79dc301b1a0ffe93e36130d9cb9

begin;

do $gate$
begin
  if coalesce(current_setting('nova.release_approval', true), '') <> 'APPROVED-NOVA-2B2DB2-ENFORCEMENT' then
    raise exception 'NOT APPROVED / DO NOT RUN: set local nova.release_approval = ''APPROVED-NOVA-2B2DB2-ENFORCEMENT'' after written approval.';
  end if;
end
$gate$;

do $requires_additive$
declare
  v_helper regprocedure := to_regprocedure('public.nova_learner_practice_quizzes(uuid)');
  v_start regprocedure := to_regprocedure('public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid)');
begin
  if v_helper is null or v_start is null then
    raise exception 'ADDITIVE SQL IS NOT DEPLOYED';
  end if;
  if has_function_privilege('authenticated', v_helper, 'EXECUTE')
     or has_function_privilege('anon', v_helper, 'EXECUTE') then
    raise exception 'HELPER IS CLIENT-EXECUTABLE: stop';
  end if;
end
$requires_additive$;

-- public.start_nova_learning_cycle(uuid, uuid): FORWARD (enforcement)
do $patch_start$
declare
  v_target regprocedure := to_regprocedure('public.start_nova_learning_cycle(uuid, uuid)');
  v_def text;
  v_text text;
  v_find text;
  v_put text;
  v_count integer;
  v_old text[] := array[
      $starto1$  if v_skill.id is null then
    raise exception 'CANONICAL_SKILL_NOT_FOUND';
  end if;
$starto1$
  ];
  v_new_parts text[] := array[
      $startn1$  if v_skill.id is null then
    raise exception 'CANONICAL_SKILL_NOT_FOUND';
  end if;

  /*
   * Phase 2B-2D-B2: a cycle needs practice the learner can actually open.
   * Checked BEFORE an existing cycle is returned or a new one inserted, and
   * serialised per learner+skill so concurrent starts cannot duplicate.
   */
  perform pg_advisory_xact_lock(
    hashtextextended(p_student_user_id::text || ':' || p_skill_id::text, 0)
  );

  if not exists (
    select 1
    from public.learning_quiz_skill_coverage coverage
    join public.nova_learner_practice_quizzes(p_student_user_id) accessible
      on accessible.subject = coverage.subject
     and accessible.quiz_id = coverage.quiz_id
    where coverage.subject = v_skill.subject
      and coverage.skill_id = p_skill_id
      and coverage.primary_level = v_skill.primary_level
      and coverage.is_published = true
      and coalesce(coverage.primary_question_count, 0) > 0
  ) then
    raise exception 'PRACTICE_QUIZ_NOT_ACCESSIBLE';
  end if;
$startn1$
  ];
begin
  if v_target is null then
    raise exception 'MISSING FUNCTION public.start_nova_learning_cycle(uuid, uuid)';
  end if;
  v_def := pg_get_functiondef(v_target);
  if md5(v_def) <> 'e77d65e9caa8631cb4d3aa93b484b7f5' then
    raise exception 'DRIFT public.start_nova_learning_cycle(uuid, uuid): expected md5 e77d65e9caa8631cb4d3aa93b484b7f5, found %', md5(v_def);
  end if;
  v_text := v_def;
  for i in 1..array_length(v_old, 1) loop
    v_find := replace(replace(v_old[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_put := replace(replace(v_new_parts[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_count := (length(v_text) - length(replace(v_text, v_find, ''))) / greatest(length(v_find), 1);
    if v_count <> 1 then
      raise exception 'ANCHOR % for public.start_nova_learning_cycle(uuid, uuid) matched % times', i, v_count;
    end if;
    v_text := replace(v_text, v_find, v_put);
  end loop;
  if md5(v_text) <> '3d4cf5cb26b43b5e251c5f9cdca04946' then
    raise exception 'PATCH RESULT for public.start_nova_learning_cycle(uuid, uuid) is not the reviewed text: md5 %', md5(v_text);
  end if;
  execute v_text;
  if md5(pg_get_functiondef(v_target)) <> '3d4cf5cb26b43b5e251c5f9cdca04946' then
    raise exception 'POST-CHECK for public.start_nova_learning_cycle(uuid, uuid) failed';
  end if;
end
$patch_start$;

-- public.get_nova_plus_recommendations(uuid): FORWARD (enforcement)
do $patch_recs$
declare
  v_target regprocedure := to_regprocedure('public.get_nova_plus_recommendations(uuid)');
  v_def text;
  v_text text;
  v_find text;
  v_put text;
  v_count integer;
  v_old text[] := array[
      $recso1$  with
  insight_summary as ($recso1$,
      $recso2$                and coverage_alt.is_published = true
                and coverage_alt.quiz_id <> picked.quiz_id
$recso2$,
      $recso3$          and coverage.is_published = true
          and coalesce(coverage.primary_question_count, 0) > 0
          and (
            category.lane in ('reassess', 'stretch')$recso3$,
      $recso4$    cross join lateral (
      select
        picked.quiz_id,$recso4$,
      $recso5$      ) picked
    ) quiz

    where category.lane is not null$recso5$,
      $recso6$      quiz.alternatives
    from categorised category$recso6$,
      $recso7$            'alternatives', selected.alternatives
$recso7$
  ];
  v_new_parts text[] := array[
      $recsn1$  with
  accessible_quizzes as materialized (
    -- Phase 2B-2D-B2: practice the selected LEARNER can open (never the viewer's rights).
    select accessible.subject, accessible.quiz_id
    from public.nova_learner_practice_quizzes(p_student_user_id) accessible
  ),

  insight_summary as ($recsn1$,
      $recsn2$                and coverage_alt.is_published = true
                and coverage_alt.quiz_id <> picked.quiz_id
                and coverage_alt.primary_level = category.primary_level
                and coalesce(coverage_alt.primary_question_count, 0) > 0
                and exists (
                  select 1
                  from accessible_quizzes accessible
                  where accessible.subject = coverage_alt.subject
                    and accessible.quiz_id = coverage_alt.quiz_id
                )
$recsn2$,
      $recsn3$          and coverage.is_published = true
          and coalesce(coverage.primary_question_count, 0) > 0
          and coverage.primary_level = category.primary_level
          and exists (
            select 1
            from accessible_quizzes accessible
            where accessible.subject = coverage.subject
              and accessible.quiz_id = coverage.quiz_id
          )
          and (
            category.lane in ('reassess', 'stretch')$recsn3$,
      $recsn4$    left join lateral (
      select
        picked.quiz_id,$recsn4$,
      $recsn5$      ) picked
    ) quiz on true

    where category.lane is not null$recsn5$,
      $recsn6$      quiz.alternatives,
      -- R1: a learning need with no open mission stays visible with a status.
      case
        when quiz.quiz_id is not null then 'available'
        when exists (
          select 1
          from public.learning_quiz_skill_coverage status_coverage
          join accessible_quizzes accessible
            on accessible.subject = status_coverage.subject
           and accessible.quiz_id = status_coverage.quiz_id
          where status_coverage.subject = category.subject
            and status_coverage.skill_id = category.skill_id
            and status_coverage.primary_level = category.primary_level
            and status_coverage.is_published = true
            and coalesce(status_coverage.primary_question_count, 0) > 0
        ) then 'practice_completed'
        when exists (
          select 1
          from public.learning_quiz_skill_coverage status_coverage
          where status_coverage.subject = category.subject
            and status_coverage.skill_id = category.skill_id
            and status_coverage.primary_level = category.primary_level
            and status_coverage.is_published = true
            and coalesce(status_coverage.primary_question_count, 0) > 0
        ) then 'no_accessible_mission'
        else 'no_published_mission'
      end as practice_status
    from categorised category$recsn6$,
      $recsn7$            'alternatives', coalesce(selected.alternatives, '[]'::jsonb),
            'practice_status', selected.practice_status
$recsn7$
  ];
begin
  if v_target is null then
    raise exception 'MISSING FUNCTION public.get_nova_plus_recommendations(uuid)';
  end if;
  v_def := pg_get_functiondef(v_target);
  if md5(v_def) <> 'fc205843600231b9c223e5e1ff899846' then
    raise exception 'DRIFT public.get_nova_plus_recommendations(uuid): expected md5 fc205843600231b9c223e5e1ff899846, found %', md5(v_def);
  end if;
  v_text := v_def;
  for i in 1..array_length(v_old, 1) loop
    v_find := replace(replace(v_old[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_put := replace(replace(v_new_parts[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_count := (length(v_text) - length(replace(v_text, v_find, ''))) / greatest(length(v_find), 1);
    if v_count <> 1 then
      raise exception 'ANCHOR % for public.get_nova_plus_recommendations(uuid) matched % times', i, v_count;
    end if;
    v_text := replace(v_text, v_find, v_put);
  end loop;
  if md5(v_text) <> '6875b17975e5b084fe289e34b038f87f' then
    raise exception 'PATCH RESULT for public.get_nova_plus_recommendations(uuid) is not the reviewed text: md5 %', md5(v_text);
  end if;
  execute v_text;
  if md5(pg_get_functiondef(v_target)) <> '6875b17975e5b084fe289e34b038f87f' then
    raise exception 'POST-CHECK for public.get_nova_plus_recommendations(uuid) failed';
  end if;
end
$patch_recs$;

-- public.get_nova_learning_cycles(uuid): FORWARD (enforcement)
do $patch_cycles$
declare
  v_target regprocedure := to_regprocedure('public.get_nova_learning_cycles(uuid)');
  v_def text;
  v_text text;
  v_find text;
  v_put text;
  v_count integer;
  v_old text[] := array[
      $cycleso1$  with open_rows as ($cycleso1$,
      $cycleso2$        and coverage.is_published = true
        and coalesce(
          coverage.primary_question_count,
          0
        ) > 0
$cycleso2$,
      $cycleso3$              'recommended_quiz_href',
                row.recommended_quiz_href,
$cycleso3$
  ];
  v_new_parts text[] := array[
      $cyclesn1$  with accessible_quizzes as materialized (
    -- Phase 2B-2D-B2: practice the selected LEARNER can open (never the viewer's rights).
    select accessible.subject, accessible.quiz_id
    from public.nova_learner_practice_quizzes(p_student_user_id) accessible
  ),

  open_rows as ($cyclesn1$,
      $cyclesn2$        and coverage.is_published = true
        and coalesce(
          coverage.primary_question_count,
          0
        ) > 0
        and coverage.primary_level = cycle.primary_level
        and exists (
          select 1
          from accessible_quizzes accessible
          where accessible.subject = coverage.subject
            and accessible.quiz_id = coverage.quiz_id
        )
$cyclesn2$,
      $cyclesn3$              'recommended_quiz_href',
                row.recommended_quiz_href,
              'practice_status',
                case
                  when row.recommended_quiz_id is not null then 'available'
                  else 'unavailable'
                end,
$cyclesn3$
  ];
begin
  if v_target is null then
    raise exception 'MISSING FUNCTION public.get_nova_learning_cycles(uuid)';
  end if;
  v_def := pg_get_functiondef(v_target);
  if md5(v_def) <> '2edc3451d19657dddf79499fce2fd869' then
    raise exception 'DRIFT public.get_nova_learning_cycles(uuid): expected md5 2edc3451d19657dddf79499fce2fd869, found %', md5(v_def);
  end if;
  v_text := v_def;
  for i in 1..array_length(v_old, 1) loop
    v_find := replace(replace(v_old[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_put := replace(replace(v_new_parts[i], chr(13), ''), chr(10), chr(13) || chr(10));
    v_count := (length(v_text) - length(replace(v_text, v_find, ''))) / greatest(length(v_find), 1);
    if v_count <> 1 then
      raise exception 'ANCHOR % for public.get_nova_learning_cycles(uuid) matched % times', i, v_count;
    end if;
    v_text := replace(v_text, v_find, v_put);
  end loop;
  if md5(v_text) <> 'f39fb79dc301b1a0ffe93e36130d9cb9' then
    raise exception 'PATCH RESULT for public.get_nova_learning_cycles(uuid) is not the reviewed text: md5 %', md5(v_text);
  end if;
  execute v_text;
  if md5(pg_get_functiondef(v_target)) <> 'f39fb79dc301b1a0ffe93e36130d9cb9' then
    raise exception 'POST-CHECK for public.get_nova_learning_cycles(uuid) failed';
  end if;
end
$patch_cycles$;

do $post_enforcement$
begin
  if not has_function_privilege('authenticated', 'public.start_nova_learning_cycle(uuid, uuid)'::regprocedure, 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_nova_plus_recommendations(uuid)'::regprocedure, 'EXECUTE')
     or not has_function_privilege('authenticated', 'public.get_nova_learning_cycles(uuid)'::regprocedure, 'EXECUTE')
     or has_function_privilege('anon', 'public.start_nova_learning_cycle(uuid, uuid)'::regprocedure, 'EXECUTE')
     or has_function_privilege('anon', 'public.get_nova_plus_recommendations(uuid)'::regprocedure, 'EXECUTE')
     or has_function_privilege('anon', 'public.get_nova_learning_cycles(uuid)'::regprocedure, 'EXECUTE') then
    raise exception 'GRANT MATRIX CHANGED';
  end if;
end
$post_enforcement$;

notify pgrst, 'reload schema';

commit;
