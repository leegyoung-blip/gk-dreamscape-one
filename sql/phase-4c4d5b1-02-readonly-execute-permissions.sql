-- DREAMSCAPE ONE — 4C-4D-5B-1, Query 2 of 2.
-- READ ONLY. Checks effective EXECUTE permissions on the original THREE public
-- quiz RPCs and their FIVE helper/delegated functions. No student data queried.
-- If `_unlocked` functions are callable by anon/authenticated, this requires
-- URGENT manual review; this metadata does not alone prove an exploit.
-- Run in Supabase SQL Editor; export this query separately as CSV.
SELECT
  n.nspname AS schema_name,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS function_owner,
  owner_role.rolbypassrls AS function_owner_bypass_rls,
  p.prosecdef AS security_definer,
  p.proacl::text AS explicit_grants,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) AS acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) AS public_execute_granted,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
JOIN pg_roles AS owner_role ON owner_role.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'get_math_quiz_payload',
    'save_math_quiz_answer',
    'submit_math_quiz_attempt',
    'core_assert_quiz_topic_access',
    'core_assert_attempt_topic_access',
    'get_math_quiz_payload_unlocked',
    'save_math_quiz_answer_unlocked',
    'submit_math_quiz_attempt_unlocked'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
