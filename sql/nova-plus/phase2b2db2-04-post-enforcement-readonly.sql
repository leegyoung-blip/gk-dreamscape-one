-- NOVA+ Phase 2B-2D-B2 — POST-ENFORCEMENT CHECKS (READ ONLY)
-- Metadata only. Does not call recommendation/cycle RPCs (get_nova_learning_cycles
-- WRITES through refresh_nova_learning_cycles) and reads no learner data.
with expected(sig, expected_md5) as (
  values
  ('public.start_nova_learning_cycle(uuid, uuid)', '3d4cf5cb26b43b5e251c5f9cdca04946'),
  ('public.get_nova_plus_recommendations(uuid)', '6875b17975e5b084fe289e34b038f87f'),
  ('public.get_nova_learning_cycles(uuid)', 'f39fb79dc301b1a0ffe93e36130d9cb9')
)
select
  e.sig,
  e.expected_md5,
  md5(pg_get_functiondef(to_regprocedure(e.sig))) as current_md5,
  md5(pg_get_functiondef(to_regprocedure(e.sig))) = e.expected_md5 as matches,
  pg_get_function_result(to_regprocedure(e.sig)) as return_type,
  has_function_privilege('anon', to_regprocedure(e.sig), 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', to_regprocedure(e.sig), 'EXECUTE') as authenticated_execute,
  has_function_privilege('service_role', to_regprocedure(e.sig), 'EXECUTE') as service_role_execute
from expected e
order by 1;
-- Expected: matches = true, return_type = jsonb, anon = false, authenticated = true.

select
  has_function_privilege('authenticated', to_regprocedure('public.nova_learner_practice_quizzes(uuid)'), 'EXECUTE') as helper_authenticated_execute,
  has_function_privilege('anon', to_regprocedure('public.nova_learner_practice_quizzes(uuid)'), 'EXECUTE') as helper_anon_execute,
  has_function_privilege('authenticated', to_regprocedure('public.core_assert_quiz_topic_access(text, uuid, uuid)'), 'EXECUTE') as guard_authenticated_execute;
-- Expected: all false.
