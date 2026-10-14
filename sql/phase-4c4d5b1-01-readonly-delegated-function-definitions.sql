-- DREAMSCAPE ONE — 4C-4D-5B-1, Query 1 of 2.
-- READ ONLY. Retrieves definitions of the FIVE functions the 3 public RPCs delegate to.
-- This reads PostgreSQL system catalogs, NOT student data.
-- IMPORTANT: Function source can contain literal private values. Inspect/redact
-- any credentials locally before uploading this CSV. Never share `.env` files.
-- Execute in Supabase SQL Editor, then export the results to CSV.
SELECT
  n.nspname AS schema_name,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS function_owner,
  owner_role.rolbypassrls AS function_owner_bypass_rls,
  p.prosecdef AS security_definer,
  COALESCE(array_to_string(p.proconfig, ';'), '') AS routine_settings,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
JOIN pg_roles AS owner_role ON owner_role.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'core_assert_quiz_topic_access',
    'core_assert_attempt_topic_access',
    'get_math_quiz_payload_unlocked',
    'save_math_quiz_answer_unlocked',
    'submit_math_quiz_attempt_unlocked'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
