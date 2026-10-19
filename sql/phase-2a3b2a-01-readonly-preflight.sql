-- DREAMSCAPE Phase 2A-3B-2A: Admin Dream Token adjustments. READ ONLY.
-- Runs no DDL and returns no learner rows (schema, grants and aggregate counts only).
-- Review every result before applying phase-2a3b2a-02-admin-dream-token-adjustments.sql.

-- 1. Ledger columns the migration relies on (expect user_id, amount, token_kind, type, title, id, created_at).
select column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'dream_token_transactions'
order by ordinal_position;

-- 2. Ledger constraints (CHECK constraints on type / token_kind / amount must accept
--    token_kind = 'virtual', type in ('earn','spend') and the amount range used).
select conname, contype, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.dream_token_transactions'::regclass
order by conname;

-- 3. Balance synchronization trigger(s) on the ledger (must exist and stay unchanged).
select t.tgname, t.tgenabled, p.oid::regprocedure::text as trigger_function, p.prosecdef as security_definer
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_token_transactions'::regclass and not t.tgisinternal
order by t.tgname;

-- 4. Profile columns used by the function.
select column_name, data_type, udt_name
from information_schema.columns
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('id', 'role', 'dream_token_balance', 'is_simulation_user')
order by column_name;

-- 5. Objects this phase creates must not already exist (expect two NULLs).
select
  to_regclass('public.admin_dream_token_adjustments') as existing_table,
  to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)') as existing_function;

-- 6. Aggregate baseline for the post-flight comparison (no per-user data).
select
  (select count(*) from public.dream_token_transactions) as ledger_rows,
  (select coalesce(sum(amount), 0) from public.dream_token_transactions where token_kind = 'virtual') as ledger_virtual_sum,
  (select coalesce(sum(dream_token_balance), 0) from public.profiles) as profile_dt_sum;
