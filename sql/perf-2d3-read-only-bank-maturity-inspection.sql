-- PERF-2D-3: Milo Bank maturity -> account refresh — READ-ONLY inspection.
--
-- Run in the Supabase SQL editor. Every statement only reads the system
-- catalog; nothing is executed against bank data and nothing is created,
-- altered or dropped.
--
-- Questions this answers before any client change:
--   1. What does refresh_milo_bank_bond_maturities() return? The client reads
--      it as Number(data || 0). Is that the number of holdings it changed?
--   2. Does maturing a holding change available DT in
--      get_milo_bank_account_summary(), or only after settle_milo_bank_bond()?
--      (The client fallback still counts status 'matured' as locked.)
--   3. Is the maturity write safe to call concurrently (locking / idempotence)?

-- 1. Signatures, volatility, security and return types.
select
  p.proname as routine,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  case p.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' else 'VOLATILE' end as volatility,
  p.prosecdef as security_definer,
  p.proconfig::text as settings
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'refresh_milo_bank_bond_maturities',
    'get_milo_bank_account_summary',
    'get_milo_bank_bond_eligibility',
    'settle_milo_bank_bond'
  )
order by p.proname;

-- 2. Full definitions (read the RETURN value of the maturity routine, and
--    which holding statuses the account summary treats as locked).
select p.proname as routine, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'refresh_milo_bank_bond_maturities',
    'get_milo_bank_account_summary'
  )
order by p.proname;

-- 3. Allowed holding statuses (to confirm the active -> matured -> settled flow).
select conname, pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t on t.oid = c.conrelid
join pg_namespace n on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'milo_bank_bond_holdings'
  and c.contype = 'c';
