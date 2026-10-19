-- DREAMSCAPE Phase 2A-3B-2A. READ ONLY post-flight verification. Returns no learner rows.

-- 1. Function security posture (expect security_definer = true, search_path set,
--    anon/authenticated/public = false, service_role = true).
select
  p.oid::regprocedure::text as routine,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig::text as routine_settings,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute
from pg_proc p
where p.oid = to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)');

-- 2. Audit table posture (expect RLS on, no anon/authenticated privileges).
select
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as anon_any_privilege,
  has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as authenticated_any_privilege
from pg_class c
where c.oid = 'public.admin_dream_token_adjustments'::regclass;

-- 3. Ledger and balances unchanged by the migration itself
--    (compare with preflight query 6; expect identical values).
select
  (select count(*) from public.dream_token_transactions) as ledger_rows,
  (select coalesce(sum(amount), 0) from public.dream_token_transactions where token_kind = 'virtual') as ledger_virtual_sum,
  (select coalesce(sum(dream_token_balance), 0) from public.profiles) as profile_dt_sum,
  (select count(*) from public.admin_dream_token_adjustments) as audit_rows;
