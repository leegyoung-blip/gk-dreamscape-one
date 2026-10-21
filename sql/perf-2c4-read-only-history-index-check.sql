-- PERF-2C-4: Profile transaction history pagination — READ-ONLY checks.
--
-- Run in the Supabase SQL editor. Every statement only reads the catalog or
-- runs EXPLAIN (without ANALYZE), so nothing is executed against the data and
-- nothing is created, altered or dropped. Do not add indexes from this file.
--
-- The Profile page now pages each history with:
--   dream_token_transactions: WHERE user_id = $1 AND token_kind = 'virtual'
--                             [AND (created_at, id) < cursor]
--                             ORDER BY created_at DESC, id DESC LIMIT 26
--   dream_gem_transactions:   WHERE user_id = $1
--                             [AND (created_at, id) < cursor]
--                             ORDER BY created_at DESC, id DESC LIMIT 26

-- 1. id must be NOT NULL and unique (primary key) for the (created_at, id)
--    order to be total. Also shows the id and created_at types.
select
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('dream_token_transactions', 'dream_gem_transactions')
  and c.column_name in ('id', 'user_id', 'token_kind', 'created_at')
order by c.table_name, c.column_name;

select
  tc.table_name,
  tc.constraint_type,
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as columns
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on kcu.constraint_schema = tc.constraint_schema
 and kcu.constraint_name = tc.constraint_name
where tc.table_schema = 'public'
  and tc.table_name in ('dream_token_transactions', 'dream_gem_transactions')
  and tc.constraint_type in ('PRIMARY KEY', 'UNIQUE')
group by tc.table_name, tc.constraint_type, tc.constraint_name
order by tc.table_name, tc.constraint_type;

-- 2. Existing indexes on both tables.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('dream_token_transactions', 'dream_gem_transactions')
order by tablename, indexname;

-- 3. Approximate table sizes (planner statistics, no table scan).
select relname as table_name, reltuples::bigint as estimated_rows
from pg_class
where relnamespace = 'public'::regnamespace
  and relname in ('dream_token_transactions', 'dream_gem_transactions');

-- 4. Plans for the new queries (EXPLAIN without ANALYZE does not run them).
--    Replace the zero UUID with a real learner id if you want a representative plan.
explain
select id, user_id, type, title, amount, token_kind, created_at
from public.dream_token_transactions
where user_id = '00000000-0000-0000-0000-000000000000'
  and token_kind = 'virtual'
order by created_at desc, id desc
limit 26;

explain
select id, user_id, type, source, title, description, amount, balance_after, created_at
from public.dream_gem_transactions
where user_id = '00000000-0000-0000-0000-000000000000'
order by created_at desc, id desc
limit 26;

-- Possible indexes, for review only (NOT applied by PERF-2C-4). Consider them
-- only if step 4 shows a sort over all of a learner's rows and step 3 shows
-- the tables are large enough for it to matter:
--
--   create index concurrently dream_token_transactions_user_kind_created_id_idx
--     on public.dream_token_transactions (user_id, token_kind, created_at desc, id desc);
--
--   create index concurrently dream_gem_transactions_user_created_id_idx
--     on public.dream_gem_transactions (user_id, created_at desc, id desc);
