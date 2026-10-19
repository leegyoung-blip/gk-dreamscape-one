-- DREAMSCAPE Phase 2A-3B-2A: Admin Dream Token adjustments. READ ONLY.
-- Runs no DDL and returns no learner rows (schema, grants and aggregate values only).
-- Review every result before applying phase-2a3b2a-02-admin-dream-token-adjustments.sql.
-- The migration re-checks items 1, 3, 4 and 5 itself and aborts on any mismatch.

-- 1. Exact types of the columns the migration relies on.
--    Supported: amount and dream_token_balance must be smallint, integer, bigint or numeric.
--    Record the types: they set the database capacity for single adjustments and balances.
select table_name, column_name, data_type, udt_name, numeric_precision, numeric_scale,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and ((table_name = 'dream_token_transactions'
        and column_name in ('id', 'user_id', 'amount', 'token_kind', 'type', 'title', 'created_at'))
    or (table_name = 'profiles'
        and column_name in ('id', 'role', 'dream_token_balance')))
order by table_name, column_name;

-- 2. Ledger and profile constraints. CHECK constraints must accept token_kind = 'virtual',
--    type in ('earn','spend'), the amount sign used and the resulting balance
--    (e.g. a "dream_token_balance >= 0" check would make over-deductions fail safely).
select conrelid::regclass::text as table_name, conname, contype, convalidated,
       pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid in ('public.dream_token_transactions'::regclass, 'public.profiles'::regclass)
  and contype in ('c', 'f', 'u', 'p')
order by table_name, conname;

-- 3. Balance synchronisation trigger(s) on the ledger.
--    Expect an ENABLED row trigger (tgenabled 'O' or 'A') that fires on INSERT and calls
--    public.update_profile_dream_token_balance(). Keep the md5 to compare in the post-flight.
select t.tgname,
       t.tgenabled,
       (t.tgtype & 1) <> 0 as for_each_row,
       (t.tgtype & 2) <> 0 as before_trigger,
       (t.tgtype & 4) <> 0 as on_insert,
       (t.tgtype & 8) <> 0 as on_delete,
       (t.tgtype & 16) <> 0 as on_update,
       p.oid::regprocedure::text as trigger_function,
       p.prosecdef as security_definer,
       md5(pg_get_functiondef(p.oid)) as function_definition_md5
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_token_transactions'::regclass and not t.tgisinternal
order by t.tgname;

-- 4. Objects this phase creates must not already exist (expect two NULLs).
select
  to_regclass('public.admin_dream_token_adjustments') as existing_table,
  to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)') as existing_function;

-- 5. Roles used by the grants must exist (expect three trues).
select
  exists (select 1 from pg_roles where rolname = 'service_role') as has_service_role,
  exists (select 1 from pg_roles where rolname = 'authenticated') as has_authenticated,
  exists (select 1 from pg_roles where rolname = 'anon') as has_anon;

-- 5b. RLS posture for the function owner. The function runs as the role applying the
--     migration (current_user below). That role must own the ledger and profiles tables
--     or have BYPASSRLS, and FORCE ROW LEVEL SECURITY must be off on the ledger;
--     otherwise existing ledger insert policies (e.g. user_id = auth.uid()) would block
--     the definer insert. The migration aborts if this is not satisfied.
select c.oid::regclass::text as table_name,
       pg_get_userbyid(c.relowner) as table_owner,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced,
       current_user as migration_role,
       (select r.rolbypassrls from pg_roles r where r.rolname = current_user) as migration_role_bypasses_rls,
       pg_has_role(current_user, c.relowner, 'USAGE') as migration_role_is_owner_or_member
from pg_class c
where c.oid in ('public.dream_token_transactions'::regclass, 'public.profiles'::regclass)
order by table_name;

-- 6. Aggregate baseline for the post-flight comparison (no per-user data).
--    max_profile_dt_balance shows the current head-room against the balance column capacity.
select
  (select count(*) from public.dream_token_transactions) as ledger_rows,
  (select coalesce(sum(amount), 0) from public.dream_token_transactions where token_kind = 'virtual') as ledger_virtual_sum,
  (select coalesce(sum(dream_token_balance), 0) from public.profiles) as profile_dt_sum,
  (select max(dream_token_balance) from public.profiles) as max_profile_dt_balance,
  (select max(abs(amount)) from public.dream_token_transactions) as max_abs_ledger_amount;
