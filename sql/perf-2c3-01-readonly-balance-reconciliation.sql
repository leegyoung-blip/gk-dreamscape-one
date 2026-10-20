-- DREAMSCAPE PERF-2C-3: Dream Token (DT) and Dream Gem (DG) balance reconciliation. READ ONLY.
-- Runs no DDL or DML and returns no learner rows: only schema, definitions, grants and
-- aggregate counts. Run section by section in the Supabase SQL editor and keep the output.
--
-- Purpose: decide whether pages may stop summing the DT ledger in the browser and read a
-- stored balance instead. Nothing in the application changes until these results are reviewed.
-- DT and DG are checked separately: the DG ledger is NOT assumed to follow the DT rules.

-- ========================================================================================
-- DT 1. Ledger columns and token kinds (the browser currently sums token_kind = 'virtual').
-- ========================================================================================
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'dream_token_transactions'
order by ordinal_position;

select token_kind, count(*) as rows, coalesce(sum(amount), 0) as total
from public.dream_token_transactions
group by token_kind
order by token_kind;

-- ========================================================================================
-- DT 2. How profiles.dream_token_balance is maintained: every trigger on the ledger and the
--       full definition of each trigger function (check which events and token kinds it uses).
-- ========================================================================================
select t.tgname, t.tgenabled,
       (t.tgtype & 2) <> 0 as before_trigger,
       (t.tgtype & 4) <> 0 as on_insert,
       (t.tgtype & 8) <> 0 as on_delete,
       (t.tgtype & 16) <> 0 as on_update,
       p.oid::regprocedure::text as trigger_function,
       pg_get_functiondef(p.oid) as definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_token_transactions'::regclass and not t.tgisinternal
order by t.tgname;

-- ========================================================================================
-- DT 3. Per-user reconciliation: stored balance vs the browser's calculation
--       (sum of virtual rows). Expect mismatched_users = 0 for the switch to be safe.
-- ========================================================================================
with ledger as (
  select user_id, sum(amount) as virtual_sum, count(*) as virtual_rows
  from public.dream_token_transactions
  where token_kind = 'virtual'
  group by user_id
),
joined as (
  select p.id,
         coalesce(p.dream_token_balance, 0) as stored,
         coalesce(l.virtual_sum, 0) as ledger_sum,
         coalesce(l.virtual_rows, 0) as ledger_rows
  from public.profiles p
  left join ledger l on l.user_id = p.id
)
select
  count(*) as profiles,
  count(*) filter (where stored <> ledger_sum) as mismatched_users,
  coalesce(max(abs(stored - ledger_sum)), 0) as max_abs_difference,
  coalesce(sum(stored - ledger_sum), 0) as net_difference,
  count(*) filter (where stored < 0) as negative_stored_balances,
  count(*) filter (where ledger_rows > 1000) as users_over_1000_rows,
  coalesce(max(ledger_rows), 0) as max_rows_for_one_user
from joined;

-- Ledger rows whose user has no profile (would never show on a profile balance).
select count(*) as orphan_virtual_rows, coalesce(sum(amount), 0) as orphan_total
from public.dream_token_transactions t
where t.token_kind = 'virtual'
  and not exists (select 1 from public.profiles p where p.id = t.user_id);

-- ========================================================================================
-- DT 4. Existing balance RPCs used in production pages: definition, security and grants.
--       Check each uses auth.uid() (never a caller-supplied id) and what it sums.
-- ========================================================================================
select p.oid::regprocedure::text as routine,
       p.prosecdef as security_definer,
       p.proconfig::text as settings,
       has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_my_dreamscape_balances', 'get_my_virtual_dream_token_balance')
order by p.proname;

-- ========================================================================================
-- DG 1. Ledger columns (DG may have status/kind/source columns that change what counts).
-- ========================================================================================
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'dream_gem_transactions'
order by ordinal_position;

-- ========================================================================================
-- DG 2. How profiles.dream_gem_balance is maintained: triggers on the DG ledger, and any
--       function that writes dream_gem_balance (e.g. admin_adjust_dream_gems, redemptions).
-- ========================================================================================
select t.tgname, t.tgenabled,
       (t.tgtype & 4) <> 0 as on_insert,
       (t.tgtype & 8) <> 0 as on_delete,
       (t.tgtype & 16) <> 0 as on_update,
       p.oid::regprocedure::text as trigger_function,
       pg_get_functiondef(p.oid) as definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_gem_transactions'::regclass and not t.tgisinternal
order by t.tgname;

select p.oid::regprocedure::text as routine, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and pg_get_functiondef(p.oid) ilike '%dream_gem_balance%'
order by 1;

-- ========================================================================================
-- DG 3. Per-user reconciliation: stored DG balance vs the plain sum of DG ledger amounts.
--       A mismatch here may be legitimate if DG rows have statuses or kinds that do not
--       count (see DG 1/2) — interpret together with the trigger definitions above.
-- ========================================================================================
with ledger as (
  select user_id, sum(amount) as gem_sum, count(*) as gem_rows
  from public.dream_gem_transactions
  group by user_id
),
joined as (
  select p.id,
         coalesce(p.dream_gem_balance, 0) as stored,
         coalesce(l.gem_sum, 0) as ledger_sum
  from public.profiles p
  left join ledger l on l.user_id = p.id
)
select
  count(*) as profiles,
  count(*) filter (where stored <> ledger_sum) as mismatched_users,
  coalesce(max(abs(stored - ledger_sum)), 0) as max_abs_difference,
  coalesce(sum(stored - ledger_sum), 0) as net_difference,
  count(*) filter (where stored < 0) as negative_stored_balances
from joined;

-- ========================================================================================
-- ACCESS 1. Can a signed-in learner read their own balance columns under production RLS?
--           (Phase 2A-3A revoked INSERT/UPDATE only; confirm SELECT is still granted.)
-- ========================================================================================
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'profiles'
  and grantee in ('anon', 'authenticated')
order by grantee, privilege_type;

select grantee, column_name, privilege_type
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
  and column_name in ('dream_token_balance', 'dream_gem_balance')
  and grantee in ('anon', 'authenticated')
order by grantee, column_name, privilege_type;

select policyname, cmd, roles, qual
from pg_policies
where schemaname = 'public' and tablename = 'profiles' and cmd in ('SELECT', 'ALL')
order by policyname;

-- ========================================================================================
-- BANK 1. Milo Bank: does it use a separate "available" DT balance (reserved/locked DT)?
--         Pages must not show a different number from the bank without a decision.
-- ========================================================================================
select p.oid::regprocedure::text as routine, p.prosecdef as security_definer,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('get_milo_bank_account_summary', 'milo_bank_guard_locked_dt_spend')
order by p.proname;
