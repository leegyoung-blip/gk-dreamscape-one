-- DREAMSCAPE ONE — Phase 4C-4D-5A / Query 2
-- READ-ONLY. Returns only metadata: table ownership, columns, policy rules.
-- Run separately in Supabase SQL Editor. Export result as CSV.
-- The policies alone do not certify SECURITY DEFINER function safety.
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  pg_get_userbyid(c.relowner) AS table_owner,
  owner_role.rolbypassrls AS table_owner_bypass_rls,
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', pol.policyname,
        'command', pol.cmd,
        'permissive', pol.permissive,
        'roles', pol.roles,
        'using', pol.qual,
        'with_check', pol.with_check
      ) ORDER BY pol.policyname
    ), '[]'::jsonb)
    FROM pg_policies pol
    WHERE pol.schemaname = n.nspname
      AND pol.tablename = c.relname
  ) AS policies,
  (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'name', a.attname,
        'type', format_type(a.atttypid, a.atttypmod),
        'not_null', a.attnotnull,
        'has_default', a.atthasdef
      ) ORDER BY a.attnum
    ), '[]'::jsonb)
    FROM pg_attribute a
    WHERE a.attrelid = c.oid
      AND a.attnum > 0
      AND NOT a.attisdropped
  ) AS columns
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles owner_role ON owner_role.oid = c.relowner
WHERE n.nspname = 'public'
  AND c.relkind IN ('r','p')
  AND c.relname IN (
    'math_attempt_answers',
    'math_quiz_attempts',
    'math_quiz_questions',
    'math_quiz_reward_claims',
    'math_quizzes'
  )
ORDER BY c.relname;
