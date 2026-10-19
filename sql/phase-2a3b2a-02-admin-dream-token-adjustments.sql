-- DREAMSCAPE Phase 2A-3B-2A: Secure admin Dream Token adjustments (revision 2).
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
-- so update_profile_dream_token_balance keeps profiles in sync.
--
-- Capacity: no business limit is imposed. Each call is checked against the real
-- capacity of the ledger amount column and the profile balance column, read from
-- the catalog at call time, so large top-ups (500,000 DT and above) succeed
-- whenever the column types can hold them.
-- ROLLBACK on error is automatic within the explicit transaction.
BEGIN;

DO $phase2a3b2a_guard$
DECLARE
  v_type text;
  v_trigger_count integer;
BEGIN
  IF to_regclass('public.dream_token_transactions') IS NULL
     OR to_regclass('public.profiles') IS NULL THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: ledger or profiles table not found.';
  END IF;

  IF (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'dream_token_transactions'
      AND column_name IN ('id', 'user_id', 'amount', 'token_kind', 'type', 'title')
  ) <> 6 THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: ledger columns differ from the reviewed schema.';
  END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'dream_token_transactions' AND column_name = 'amount';
  IF v_type IS NULL OR v_type NOT IN ('smallint', 'integer', 'bigint', 'numeric') THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: unsupported ledger amount type %.', v_type;
  END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'dream_token_balance';
  IF v_type IS NULL OR v_type NOT IN ('smallint', 'integer', 'bigint', 'numeric') THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: unsupported profile balance type %.', v_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: profiles.role not found.';
  END IF;

  -- Exactly the reviewed balance trigger must be present, enabled, per row and on INSERT.
  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE t.tgrelid = 'public.dream_token_transactions'::regclass
    AND NOT t.tgisinternal
    AND t.tgenabled IN ('O', 'A')
    AND (t.tgtype & 1) <> 0
    AND (t.tgtype & 4) <> 0
    AND n.nspname = 'public'
    AND p.proname = 'update_profile_dream_token_balance';
  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: expected exactly one enabled INSERT row trigger calling public.update_profile_dream_token_balance (found %).', v_trigger_count;
  END IF;

  -- The function runs as the migration role. It must be able to insert ledger rows and
  -- lock profile rows regardless of client-facing RLS policies.
  IF EXISTS (
    SELECT 1 FROM pg_class c
    WHERE c.oid IN ('public.dream_token_transactions'::regclass, 'public.profiles'::regclass)
      AND c.relrowsecurity
      AND (
        c.relforcerowsecurity
        OR NOT (
          pg_has_role(current_user, c.relowner, 'USAGE')
          OR coalesce((SELECT r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user), false)
        )
      )
  ) THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: migration role % would be subject to RLS on the ledger or profiles.', current_user;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    RAISE EXCEPTION 'Phase 2A-3B-2A aborted: service_role not found.';
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
  ledger_transaction_id text NOT NULL,
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
RETURNS TABLE (duplicate boolean, ledger_transaction_id text, new_balance text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
#variable_conflict use_column
DECLARE
  v_expected_title text;
  v_existing public.admin_dream_token_adjustments%ROWTYPE;
  v_balance numeric;
  v_resulting_balance numeric;
  v_amount_capacity numeric;
  v_balance_capacity numeric;
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

  -- Target must exist. Locking its profile row serialises every adjustment for
  -- that account, so balance checks and duplicate detection cannot race.
  SELECT pr.dream_token_balance INTO v_balance
  FROM public.profiles pr WHERE pr.id = p_target_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target account not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency first: a confirmed earlier request is returned unchanged, even if
  -- the balance has since moved close to the column capacity.
  SELECT a.* INTO v_existing
  FROM public.admin_dream_token_adjustments a
  WHERE a.request_id = p_request_id;

  IF FOUND THEN
    IF v_existing.admin_user_id <> p_admin_user_id
       OR v_existing.target_user_id <> p_target_user_id
       OR v_existing.amount <> p_amount
       OR v_existing.action <> p_action THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY SELECT true, v_existing.ledger_transaction_id, v_balance::text;
    RETURN;
  END IF;

  -- Database capacity of the ledger amount and the profile balance columns
  -- (NULL means unbounded numeric). Read at call time, so a later widening of
  -- either column is honoured without changing this function.
  SELECT CASE c.data_type
           WHEN 'smallint' THEN 32767::numeric
           WHEN 'integer' THEN 2147483647::numeric
           WHEN 'bigint' THEN 9223372036854775807::numeric
           WHEN 'numeric' THEN CASE WHEN c.numeric_precision IS NULL THEN NULL
             ELSE power(10::numeric, c.numeric_precision - coalesce(c.numeric_scale, 0)) - 1 END
         END
    INTO v_amount_capacity
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'dream_token_transactions'
    AND c.column_name = 'amount';

  SELECT CASE c.data_type
           WHEN 'smallint' THEN 32767::numeric
           WHEN 'integer' THEN 2147483647::numeric
           WHEN 'bigint' THEN 9223372036854775807::numeric
           WHEN 'numeric' THEN CASE WHEN c.numeric_precision IS NULL THEN NULL
             ELSE power(10::numeric, c.numeric_precision - coalesce(c.numeric_scale, 0)) - 1 END
         END
    INTO v_balance_capacity
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profiles'
    AND c.column_name = 'dream_token_balance';

  IF v_amount_capacity IS NOT NULL AND abs(p_amount::numeric) > v_amount_capacity THEN
    RAISE EXCEPTION 'Adjustment exceeds ledger amount capacity' USING ERRCODE = '22003';
  END IF;

  v_resulting_balance := coalesce(v_balance, 0) + p_amount::numeric;
  IF v_balance_capacity IS NOT NULL AND abs(v_resulting_balance) > v_balance_capacity THEN
    RAISE EXCEPTION 'Adjustment would exceed profile balance capacity' USING ERRCODE = '22003';
  END IF;

  -- Ledger row first, then the audit row, in this one transaction: both commit or
  -- neither does. A concurrent request reusing this request_id for another target
  -- blocks on the primary key until this commits, then fails and rolls back its
  -- own ledger row.
  INSERT INTO public.dream_token_transactions AS t (user_id, amount, token_kind, type, title)
  VALUES (
    p_target_user_id,
    p_amount,
    'virtual',
    CASE WHEN p_amount < 0 THEN 'spend' ELSE 'earn' END,
    p_title
  )
  RETURNING t.id::text INTO v_ledger_id;

  INSERT INTO public.admin_dream_token_adjustments AS a
    (request_id, admin_user_id, target_user_id, amount, action, title, ledger_transaction_id)
  VALUES
    (p_request_id, p_admin_user_id, p_target_user_id, p_amount, p_action, p_title, v_ledger_id)
  ON CONFLICT (request_id) DO NOTHING;

  GET DIAGNOSTICS v_claimed = ROW_COUNT;
  IF v_claimed = 0 THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED' USING ERRCODE = 'P0001';
  END IF;

  RETURN QUERY
    SELECT false, v_ledger_id, pr.dream_token_balance::text
    FROM public.profiles pr WHERE pr.id = p_target_user_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_dream_tokens(uuid, uuid, uuid, bigint, text, text)
  TO service_role;

COMMIT;
