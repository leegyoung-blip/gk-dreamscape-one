-- DREAMSCAPE PERF-2C-3B: confirm profiles.dream_token_balance as the DT display source. READ ONLY.
-- No DDL or DML. Returns definitions and aggregate counts only, never learner rows.
-- Run before releasing the change that stops pages summing the DT ledger in the browser.
-- Inspect function definitions for embedded literals before sharing the output.

-- 1. Which events keep the stored balance in step, and exactly what the trigger adds.
--    Expect: enabled, row-level, AFTER INSERT (plus UPDATE/DELETE if supported), and a body that
--    applies NEW.amount (and OLD.amount on UPDATE/DELETE) only for token_kind = 'virtual'.
select t.tgname,
       t.tgenabled,
       (t.tgtype & 1) <> 0 as for_each_row,
       (t.tgtype & 2) <> 0 as before_trigger,
       (t.tgtype & 4) <> 0 as on_insert,
       (t.tgtype & 8) <> 0 as on_delete,
       (t.tgtype & 16) <> 0 as on_update,
       p.oid::regprocedure::text as trigger_function,
       pg_get_functiondef(p.oid) as definition
from pg_trigger t
join pg_proc p on p.oid = t.tgfoid
where t.tgrelid = 'public.dream_token_transactions'::regclass
  and not t.tgisinternal
order by t.tgname;

-- 2. Token kinds present. The browser summed token_kind = 'virtual' only; if other kinds exist,
--    the trigger body (query 1) must exclude them for the stored balance to stay equivalent.
select token_kind, count(*) as rows
from public.dream_token_transactions
group by token_kind
order by token_kind;

-- 3. Re-check equivalence immediately before release (expect mismatched_users = 0).
with ledger as (
  select user_id, sum(amount) as virtual_sum
  from public.dream_token_transactions
  where token_kind = 'virtual'
  group by user_id
)
select count(*) as profiles,
       count(*) filter (where coalesce(p.dream_token_balance, 0) <> coalesce(l.virtual_sum, 0)) as mismatched_users
from public.profiles p
left join ledger l on l.user_id = p.id;
