-- NOVA+ Phase 2B-2D-B2 — POST-ADDITIVE CHECKS (READ ONLY)
-- Metadata and anonymous catalogue aggregates only. Never calls the new RPC,
-- the helper with a real learner, a quiz payload RPC or a cycle RPC.
-- Record the md5 values below in the release log.

select
  p.oid::regprocedure::text as function_signature,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig as config,
  md5(pg_get_functiondef(p.oid)) as definition_md5,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_execute
from pg_proc p
where p.oid in (
  to_regprocedure('public.nova_learner_practice_quizzes(uuid)'),
  to_regprocedure('public.start_nova_learning_cycle_for_quiz(uuid, uuid, uuid)'),
  to_regprocedure('public.start_nova_learning_cycle(uuid, uuid)'),
  to_regprocedure('public.get_nova_plus_recommendations(uuid)'),
  to_regprocedure('public.get_nova_learning_cycles(uuid)'),
  to_regprocedure('public.core_assert_quiz_topic_access(text, uuid, uuid)'),
  to_regprocedure('public.core_user_has_access(uuid)')
)
order by 1;
-- Expected: helper anon/authenticated = false, service_role = true;
-- new start authenticated = true, anon = false; legacy start/recs/cycles md5
-- still e77d65e9caa8631cb4d3aa93b484b7f5 / fc205843600231b9c223e5e1ff899846 /
-- 2edc3451d19657dddf79499fce2fd869.

-- Impact preview of the level rule used by enforcement (catalogue only, no learners):
-- published primary-mapped (skill, quiz) links whose quiz topic level differs
-- from the canonical skill level. These links stop being offered after
-- enforcement (they are refused by the new start RPC already).
select
  coverage.subject,
  taxonomy.primary_level as skill_level,
  coverage.primary_level as quiz_topic_level,
  count(*) as links,
  count(distinct coverage.skill_id) as skills
from public.learning_quiz_skill_coverage coverage
join public.learning_skill_taxonomy taxonomy on taxonomy.id = coverage.skill_id
where coverage.subject in ('english', 'math')
  and coverage.is_published = true
  and coalesce(coverage.primary_question_count, 0) > 0
  and coverage.primary_level is distinct from taxonomy.primary_level
group by 1, 2, 3
order by 1, 2, 3;
