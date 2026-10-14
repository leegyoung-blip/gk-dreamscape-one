-- DREAMSCAPE ONE — Phase 4C-4D-5A / Query 1
-- READ-ONLY. No student rows or API keys are queried.
-- Run separately in the Supabase SQL Editor. Export result as CSV.
-- CAUTION: This returns actual PostgreSQL function source; review your CSV
-- locally before sharing it, and remove any hard-coded secrets if present.
-- Function source may also call other functions that require separate review.
SELECT
  n.nspname AS schema_name,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS function_owner,
  owner_role.rolbypassrls AS function_owner_bypass_rls,
  p.prosecdef AS security_definer,
  p.proconfig AS routine_settings,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles owner_role ON owner_role.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_math_quiz_payload',
    'save_math_quiz_answer',
    'submit_math_quiz_attempt'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
