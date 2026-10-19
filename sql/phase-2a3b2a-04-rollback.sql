-- DREAMSCAPE Phase 2A-3B-2A ROLLBACK. MANUAL SQL ONLY.
-- Removes the adjustment function so the admin API returns 503 (fails closed).
-- It does NOT touch dream_token_transactions, balances or the balance trigger.
-- Ledger rows already written by admin adjustments are kept, as they are real history.
-- The audit table is kept by default so the record of who made each adjustment survives.
BEGIN;

REVOKE ALL ON FUNCTION public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text)
  FROM service_role;
DROP FUNCTION IF EXISTS public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text);

-- Only if the audit history is confirmed unwanted (irreversible):
-- DROP TABLE IF EXISTS public.admin_dream_token_adjustments;

COMMIT;
