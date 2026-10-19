-- DREAMSCAPE Phase 2A-3B-2A: Secure admin Dream Token adjustments.
-- MANUAL SQL ONLY: Never run as part of an automatic build, CI, or migration deploy.
-- Run phase-2a3b2a-01-readonly-preflight.sql first and review every result.
--
-- ADDITIVE ONLY. Creates one audit table and one SECURITY DEFINER function that
-- is executable by service_role only. It does not alter dream_token_transactions,
-- its balance trigger, profiles, existing rows, balances, grants on existing
-- objects, or anything in the Dream Gem economy.
--
-- The function inserts into the existing ledger exactly as the Admin Dream
-- Tokens page did (user_id, amount, token_kind 'virtual', type earn/spend, title),
-- so update_profile_dream_token_balance_trigger keeps profiles in sync.
-- ROLLBACK on error is automatic within the explicit transaction.
BEGIN;

DO $phase2a3b2a_guard$
BEGIN
  IF to_regclass('public.dream_token_transactions') IS NULL THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: public.dream_token_transactions not found.';
  END IF;

  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dream_token_transactions'
      AND column_name IN ('id', 'user_id', 'amount', 'token_kind', 'type', 'title')
  ) <> 6 THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: ledger columns differ from the reviewed schema.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.dream_token_transactions'::regclass AND NOT tgisinternal
  ) THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: no balance trigger found on the ledger.';
  END IF;

  IF to_regclass('public.admin_dream_token_adjustments') IS NOT NULL
     OR to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: objects already exist. Review before re-running.';
  END IF;
END
$phase2a3b2a_guard$;

-- Audit and idempotency record. One row per admin request id.
-- No foreign keys, so audit history survives account deletion.
CREATE TABLE public.admin_dream_token_adjustments (
  request_id uuid PRIMARY KEY,
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  amount bigint NOT NULL CHECK (amount <> 0),
  action text NOT NULL CHECK (action IN ('class_attendance', 'manual_add', 'manual_deduct')),
  title text NOT NULL,
  ledger_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX admin_dream_token_adjustments_target_idx
  ON public.admin_dream_token_adjustments (target_user_id, created_at DESC);
CREATE INDEX admin_dream_token_adjustments_admin_idx
  ON public.admin_dream_token_adjustments (admin_user_id, created_at DESC);

ALTER TABLE public.admin_dream_token_adjustments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.admin_dream_token_adjustments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.admin_dream_token_adjustments TO service_role;

CREATE FUNCTION public.admin_adjust_dream_tokens(
  p_request_id uuid,
  p_admin_user_id uuid,
  p_target_user_id uuid,
  p_amount bigint,
  p_title text,
  p_action text
)
RETURNS TABLE (duplicate boolean, ledger_transaction_id text, new_balance numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  v_expected_title text;
  v_existing public.admin_dream_token_adjustments%ROWTYPE;
  v_ledger_id text;
  v_claimed integer;
BEGIN
  IF p_request_id IS NULL OR p_admin_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Missing required argument' USING ERRCODE = '22023';
  END IF;

  v_expected_title := CASE p_action
    WHEN 'class_attendance' THEN 'Class Attendance Reward'
    WHEN 'manual_add' THEN 'Admin Manual Add'
    WHEN 'manual_deduct' THEN 'Admin Manual Deduct'
  END;

  IF v_expected_title IS NULL OR p_title IS DISTINCT FROM v_expected_title THEN
    RAISE EXCEPTION 'Invalid adjustment action' USING ERRCODE = '22023';
  END IF;

  IF p_amount IS NULL OR p_amount = 0
     OR (p_action = 'class_attendance' AND p_amount <> 100)
     OR (p_action = 'manual_add' AND p_amount < 0)
     OR (p_action = 'manual_deduct' AND p_amount > 0) THEN
    RAISE EXCEPTION 'Invalid adjustment amount' USING ERRCODE = '22023';
  END IF;

  -- Re-verify the acting admin inside the database; the caller is not trusted.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles pr
    WHERE pr.id = p_admin_user_id
      AND lower(btrim(coalesce(pr.role, ''))) = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin access only' USING ERRCODE = '42501';
  END IF;

  -- Target must exist; lock it so concurrent adjustments for one account serialise.
  PERFORM 1 FROM public.profiles pr WHERE pr.id = p_target_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target account not found' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.admin_dream_token_adjustments AS a
    (request_id, admin_user_id, target_user_id, amount, action, title)
  VALUES
    (p_request_id, p_admin_user_id, p_target_user_id, p_amount, p_action, p_title)
  ON CONFLICT (request_id) DO NOTHING;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;

  IF v_claimed = 0 THEN
    SELECT a.* INTO v_existing
    FROM public.admin_dream_token_adjustments a
    WHERE a.request_id = p_request_id;

    IF v_existing.admin_user_id <> p_admin_user_id
       OR v_existing.target_user_id <> p_target_user_id
       OR v_existing.amount <> p_amount
       OR v_existing.action <> p_action THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
      SELECT true, v_existing.ledger_transaction_id, pr.dream_token_balance::numeric
      FROM public.profiles pr WHERE pr.id = p_target_user_id;
    RETURN;
  END IF;

  INSERT INTO public.dream_token_transactions AS t (user_id, amount, token_kind, type, title)
  VALUES (
    p_target_user_id,
    p_amount,
    'virtual',
    CASE WHEN p_amount < 0 THEN 'spend' ELSE 'earn' END,
    p_title
  )
  RETURNING t.id::text INTO v_ledger_id;

  UPDATE public.admin_dream_token_adjustments a
  SET ledger_transaction_id = v_ledger_id
  WHERE a.request_id = p_request_id;

  RETURN QUERY
    SELECT false, v_ledger_id, pr.dream_token_balance::numeric
    FROM public.profiles pr WHERE pr.id = p_target_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text)
  TO service_role;

COMMIT;
