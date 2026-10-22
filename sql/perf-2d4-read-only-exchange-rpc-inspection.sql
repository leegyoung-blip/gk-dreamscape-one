-- PERF-2D-4: Milo Exchange — READ-ONLY inspection of RPC side effects.
--
-- Run in the Supabase SQL editor. Every statement only reads the system
-- catalog; no Exchange routine is called and nothing is created, altered or
-- dropped.
--
-- Why: the Property Exchange page loads its market twice — once BEFORE
-- process_my_milo_property_finance() and once after — and only the second
-- round is ever shown (a full-page loader covers the first). Dropping the
-- first round's reads (keeping the unit-sync write in its place) would save
-- 9 requests and 2 sequential stages, but only if every RPC it stops calling
-- is read-only. The Exchange hub's three portfolio RPCs could likewise run
-- alongside its property reads if they are read-only.
--
-- Read-only means: volatility STABLE/IMMUTABLE, and no INSERT/UPDATE/DELETE,
-- PERFORM of a writing routine, or settlement logic in the definition.

select
  p.proname as routine,
  case p.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE' else 'VOLATILE' end as volatility,
  p.prosecdef as security_definer,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as returns,
  (pg_get_functiondef(p.oid) ~* '\m(insert|update|delete)\M') as mentions_write,
  (pg_get_functiondef(p.oid) ~* '\mperform\M') as uses_perform
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    -- Property Exchange first round (would no longer be called before finance)
    'get_my_virtual_dream_token_balance',
    'get_milo_exchange_property_market_inventory',
    'get_milo_exchange_recent_property_sales',
    'get_milo_exchange_recent_unit_resale_sales',
    'get_milo_exchange_unit_resale_listings',
    'get_my_milo_exchange_unit_resale_listings',
    'get_milo_exchange_property_upgrade_catalog',
    'get_my_milo_exchange_property_units',
    -- writes that must keep their order (for reference)
    'sync_my_milo_exchange_property_units',
    'process_my_milo_property_finance',
    -- Exchange hub portfolio RPCs
    'get_my_milo_exchange_property_portfolio_value',
    'get_my_milo_exchange_property_equity_value',
    'get_my_milo_property_finance_dashboard'
  )
order by p.proname;

-- Full definitions, to review any routine flagged VOLATILE or mentions_write.
select p.proname as routine, pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_milo_exchange_property_market_inventory',
    'get_my_milo_exchange_property_units',
    'get_my_milo_property_finance_dashboard',
    'sync_my_milo_exchange_property_units',
    'process_my_milo_property_finance'
  )
order by p.proname;
