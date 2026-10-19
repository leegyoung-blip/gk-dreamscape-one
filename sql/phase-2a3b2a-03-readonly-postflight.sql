-- DREAMSCAPE Phase 2A-3B-2A. READ ONLY post-flight verification. Returns no learner rows.

-- 1. Function security posture. Expect: security_definer = true, routine_settings
--    contains search_path="", anon/authenticated/public = false, service_role = true,
--    and the result columns (duplicate boolean, ledger_transaction_id text, new_balance text).
select
  p.oid::regprocedure::text as routine,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig::text as routine_settings,
  pg_get_function_result(p.oid) as result_columns,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as service_role_can_execute,
  (select coalesce(bool_or(x.grantee = 0 and x.privilege_type = 'EXECUTE'), false)
   from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) x) as public_execute_granted
from pg_proc p
where p.oid = to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)');

-- 2. Audit table posture (expect RLS on, no anon/authenticated privileges).
select
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as anon_any_privilege,
  has_table_privilege('authenticated', c.oid, 'SELECT,INSERT,UPDATE,DELETE') as authenticated_any_privilege
from pg_class c
where c.oid = 'public.admin_dream_token_adjustments'::regclass;

-- 3. Balance trigger unchanged: compare tgenabled and function_definition_md5
--    with preflight query 3 (expect identical rows).
select t.tgname, t.tgenabled, p.oid::regprocedure::text as trigger_function,
       md5(pg_get_functiondef(p.oid)) as function_definition_md5
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_token_transactions'::regclass and not t.tgisinternal
order by t.tgname;

-- 4. Ledger and balances unchanged by the migration itself
--    (compare with preflight query 6; expect identical values and audit_rows = 0).
select
  (select count(*) from public.dream_token_transactions) as ledger_rows,
  (select coalesce(sum(amount), 0) from public.dream_token_transactions where token_kind = 'virtual') as ledger_virtual_sum,
  (select coalesce(sum(dream_token_balance), 0) from public.profiles) as profile_dt_sum,
  (select count(*) from public.admin_dream_token_adjustments) as audit_rows;
