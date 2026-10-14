-- DREAMSCAPE ONE 4C-4D-5B-2 (1/2)
-- READ ONLY: catalog inspection of the exact remaining result/access helpers.
-- Returns function definitions (review for accidental embedded secrets before sharing).
-- No student rows or grants are changed.
SELECT
  n.nspname AS schema_name,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_userbyid(p.proowner) AS function_owner,
  owner_role.rolbypassrls AS function_owner_bypass_rls,
  p.prosecdef AS security_definer,
  p.proconfig::text AS routine_settings,
  p.proacl::text AS explicit_grants,
  EXISTS (
    SELECT 1
    FROM aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) acl
    WHERE acl.grantee = 0 AND acl.privilege_type = 'EXECUTE'
  ) AS public_execute_granted,
  has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') AS service_role_can_execute,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_roles owner_role ON owner_role.oid = p.proowner
WHERE n.nspname = 'public'
  AND p.proname IN (
    'build_math_quiz_attempt_result',
    'core_mark_response',
    'core_user_has_access',
    'require_complete_learning_profile'
  )
ORDER BY p.proname, pg_get_function_identity_arguments(p.oid);
