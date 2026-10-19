-- DREAMSCAPE Phase 2A-3B-2A: ROLLBACK-ONLY REHEARSAL of the admin Dream Token migration.
-- MANUAL SQL ONLY. This script NEVER COMMITS: it ends in ROLLBACK and contains no COMMIT.
-- If any statement fails, PostgreSQL aborts the transaction and nothing persists.
-- Run the WHOLE script in one execution, after a fresh phase-2a3b2a-01 preflight.
--
-- Verifies inside one transaction against the real schema and triggers:
--   guard checks, DDL, function compilation, permissions, credit/debit through the real
--   ledger triggers (including the Milo Bank guard), advisory-lock key, idempotency,
--   request-id reuse, validation errors, int4 capacity, client-role refusal, and that
--   profile sums stay aligned with the ledger. Results are returned as a table.
-- Side effects that survive ROLLBACK: consumed sequence values for ledger ids (id gaps).
-- It briefly holds the earliest admin's profile row lock and per-user advisory lock;
-- run it at a quiet time and expect it to finish in well under a second.
--
-- The block between the EMBEDDED MIGRATION markers must stay byte-identical to the body
-- of phase-2a3b2a-02 (enforced by tests/phase2a3b2a-admin-dream-token-adjustments.test.cjs).
BEGIN;

-- >>> BEGIN EMBEDDED MIGRATION (phase-2a3b2a-02, without its BEGIN/COMMIT)

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

  -- Lock order must match every other ledger write for this user:
  --   1. the per-user advisory lock taken by the BEFORE INSERT trigger
  --      public.milo_bank_guard_locked_dt_spend(), then
  --   2. the profiles row lock taken by the AFTER INSERT balance trigger.
  -- Taking the same advisory lock here first (identical key expression) prevents
  -- a lock-order inversion with concurrent ledger spends. Advisory locks are
  -- re-entrant within a session, so the guard's own acquisition later succeeds
  -- immediately and the guard still enforces Milo Bank reserved balances.
  -- Taken for credits too, as the guard body is not assumed to skip them.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_target_user_id::text));

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

-- <<< END EMBEDDED MIGRATION

-- >>> REHEARSAL CHECKS. Every result is recorded in a temporary table; nothing is committed.
-- Uses the earliest admin profile as both acting admin and target. No ids, emails or
-- balances are output: only pass/fail and SQLSTATE details.
CREATE TEMP TABLE rehearsal_results (
  step integer NOT NULL,
  check_name text NOT NULL,
  passed boolean NOT NULL,
  detail text
) ON COMMIT DROP;

DO $rehearsal$
DECLARE
  v_fn regprocedure := to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)');
  v_admin uuid;
  v_r1 uuid := gen_random_uuid();
  v_r2 uuid := gen_random_uuid();
  v_r3 uuid := gen_random_uuid();
  v_res record;
  v_first_ledger_id text;
  v_balance0 bigint;
  v_balance bigint;
  v_rows0 bigint;
  v_rows bigint;
  v_drift0 numeric;
  v_drift numeric;
  v_key bigint;
  v_ok boolean;
  v_overflow bigint;
  v_state text;
  v_msg text;
BEGIN
  SELECT pr.id INTO v_admin
  FROM public.profiles pr
  WHERE lower(btrim(coalesce(pr.role, ''))) = 'admin'
  ORDER BY pr.created_at NULLS LAST, pr.id
  LIMIT 1;

  INSERT INTO rehearsal_results VALUES (0, 'admin profile available for rehearsal', v_admin IS NOT NULL, NULL);
  IF v_admin IS NULL THEN RETURN; END IF;

  SELECT pr.dream_token_balance INTO v_balance0 FROM public.profiles pr WHERE pr.id = v_admin;
  SELECT count(*) INTO v_rows0 FROM public.dream_token_transactions;
  v_drift0 := (SELECT coalesce(sum(dream_token_balance), 0) FROM public.profiles)
            - (SELECT coalesce(sum(amount), 0) FROM public.dream_token_transactions WHERE token_kind = 'virtual');

  -- 1. Security posture of the new function.
  INSERT INTO rehearsal_results
  SELECT 1, 'function is SECURITY DEFINER with empty search_path, service_role only',
         p.prosecdef
           AND coalesce(array_to_string(p.proconfig, ','), '') LIKE '%search_path=""%'
           AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
           AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
           AND has_function_privilege('service_role', p.oid, 'EXECUTE'),
         NULL
  FROM pg_proc p WHERE p.oid = v_fn;

  -- 2. Authorised credit writes exactly one ledger row and one audit row; trigger syncs balance.
  BEGIN
    SELECT * INTO v_res FROM public.admin_adjust_dream_tokens(v_r1, v_admin, v_admin, 1, 'Admin Manual Add', 'manual_add');
    v_first_ledger_id := v_res.ledger_transaction_id;
    SELECT pr.dream_token_balance INTO v_balance FROM public.profiles pr WHERE pr.id = v_admin;
    SELECT count(*) INTO v_rows FROM public.dream_token_transactions;
    v_ok := v_res.duplicate = false
      AND v_first_ledger_id IS NOT NULL
      AND v_balance = v_balance0 + 1
      AND v_res.new_balance = v_balance::text
      AND v_rows = v_rows0 + 1
      AND EXISTS (
        SELECT 1 FROM public.dream_token_transactions t
        WHERE t.id::text = v_first_ledger_id AND t.user_id = v_admin AND t.amount = 1
          AND t.token_kind = 'virtual' AND t.type = 'earn' AND t.title = 'Admin Manual Add')
      AND EXISTS (
        SELECT 1 FROM public.admin_dream_token_adjustments a
        WHERE a.request_id = v_r1 AND a.admin_user_id = v_admin AND a.target_user_id = v_admin
          AND a.amount = 1 AND a.action = 'manual_add' AND a.ledger_transaction_id = v_first_ledger_id);
    INSERT INTO rehearsal_results VALUES (2, 'credit +1: one ledger row, one audit row, balance synced', v_ok, NULL);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (2, 'credit +1: one ledger row, one audit row, balance synced', false, v_state || ' ' || v_msg);
  END;

  -- 3. The function holds the same per-user advisory lock key as milo_bank_guard_locked_dt_spend().
  v_key := pg_catalog.hashtext(v_admin::text)::bigint;
  INSERT INTO rehearsal_results
  SELECT 3, 'per-user advisory lock (hashtext(user_id::text)) held by this transaction',
         EXISTS (
           SELECT 1 FROM pg_locks l
           WHERE l.locktype = 'advisory' AND l.pid = pg_backend_pid() AND l.granted
             AND l.objsubid = 1
             AND l.classid::bigint = ((v_key >> 32) & 4294967295)
             AND l.objid::bigint = (v_key & 4294967295)),
         NULL;

  -- 4. Same request id again is recognised as a duplicate with no new rows.
  BEGIN
    SELECT * INTO v_res FROM public.admin_adjust_dream_tokens(v_r1, v_admin, v_admin, 1, 'Admin Manual Add', 'manual_add');
    SELECT count(*) INTO v_rows FROM public.dream_token_transactions;
    SELECT pr.dream_token_balance INTO v_balance FROM public.profiles pr WHERE pr.id = v_admin;
    INSERT INTO rehearsal_results VALUES (4, 'duplicate request: no second ledger row',
      v_res.duplicate AND v_res.ledger_transaction_id = v_first_ledger_id
        AND v_rows = v_rows0 + 1 AND v_balance = v_balance0 + 1, NULL);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (4, 'duplicate request: no second ledger row', false, v_state || ' ' || v_msg);
  END;

  -- 5. Reusing the request id for a different adjustment is refused.
  BEGIN
    PERFORM public.admin_adjust_dream_tokens(v_r1, v_admin, v_admin, 2, 'Admin Manual Add', 'manual_add');
    INSERT INTO rehearsal_results VALUES (5, 'request id reuse with a different amount refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (5, 'request id reuse with a different amount refused',
      v_state = 'P0001' AND v_msg = 'IDEMPOTENCY_KEY_REUSED', v_state);
  END;

  -- 6. Authorised debit passes through the existing ledger triggers (including the Milo Bank guard).
  BEGIN
    SELECT * INTO v_res FROM public.admin_adjust_dream_tokens(v_r2, v_admin, v_admin, -1, 'Admin Manual Deduct', 'manual_deduct');
    SELECT pr.dream_token_balance INTO v_balance FROM public.profiles pr WHERE pr.id = v_admin;
    INSERT INTO rehearsal_results VALUES (6, 'debit -1: spend row through existing triggers, balance synced',
      v_res.duplicate = false AND v_balance = v_balance0
        AND EXISTS (SELECT 1 FROM public.dream_token_transactions t
                    WHERE t.id::text = v_res.ledger_transaction_id AND t.amount = -1 AND t.type = 'spend'
                      AND t.title = 'Admin Manual Deduct'), NULL);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (6, 'debit -1: spend row through existing triggers, balance synced', false, v_state || ' ' || v_msg);
  END;

  -- 7. Class attendance is fixed at +100.
  BEGIN
    SELECT * INTO v_res FROM public.admin_adjust_dream_tokens(v_r3, v_admin, v_admin, 100, 'Class Attendance Reward', 'class_attendance');
    INSERT INTO rehearsal_results VALUES (7, 'class attendance +100 accepted', v_res.duplicate = false, NULL);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (7, 'class attendance +100 accepted', false, v_state || ' ' || v_msg);
  END;

  -- 8-13. Refusals, each expected with a specific SQLSTATE and no rows written.
  BEGIN
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, v_admin, 99, 'Class Attendance Reward', 'class_attendance');
    INSERT INTO rehearsal_results VALUES (8, 'class attendance with amount other than 100 refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
    INSERT INTO rehearsal_results VALUES (8, 'class attendance with amount other than 100 refused', v_state = '22023', v_state);
  END;

  BEGIN
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, v_admin, 5, 'Free money', 'manual_add');
    INSERT INTO rehearsal_results VALUES (9, 'non-standard title refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
    INSERT INTO rehearsal_results VALUES (9, 'non-standard title refused', v_state = '22023', v_state);
  END;

  BEGIN
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), gen_random_uuid(), v_admin, 5, 'Admin Manual Add', 'manual_add');
    INSERT INTO rehearsal_results VALUES (10, 'non-admin acting user refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
    INSERT INTO rehearsal_results VALUES (10, 'non-admin acting user refused', v_state = '42501', v_state);
  END;

  BEGIN
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, gen_random_uuid(), 5, 'Admin Manual Add', 'manual_add');
    INSERT INTO rehearsal_results VALUES (11, 'unknown target refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE;
    INSERT INTO rehearsal_results VALUES (11, 'unknown target refused', v_state = 'P0002', v_state);
  END;

  BEGIN
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, v_admin, 2147483648, 'Admin Manual Add', 'manual_add');
    INSERT INTO rehearsal_results VALUES (12, 'amount beyond int4 ledger capacity refused', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (12, 'amount beyond int4 ledger capacity refused',
      v_state = '22003' AND v_msg LIKE '%ledger amount capacity%', v_state);
  END;

  SELECT pr.dream_token_balance INTO v_balance FROM public.profiles pr WHERE pr.id = v_admin;
  v_overflow := 2147483647 - v_balance + 1;
  IF v_overflow BETWEEN 1 AND 2147483647 THEN
    BEGIN
      PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, v_admin, v_overflow, 'Admin Manual Add', 'manual_add');
      INSERT INTO rehearsal_results VALUES (13, 'credit that would overflow the int4 balance refused', false, 'call succeeded');
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
      INSERT INTO rehearsal_results VALUES (13, 'credit that would overflow the int4 balance refused',
        v_state = '22003' AND v_msg LIKE '%profile balance capacity%', v_state);
    END;
  ELSE
    INSERT INTO rehearsal_results VALUES (13, 'credit that would overflow the int4 balance refused', true, 'skipped: no int4-sized overflow amount for this balance');
  END IF;

  -- 14. Client roles cannot execute the function even inside the database.
  BEGIN
    EXECUTE 'SET LOCAL ROLE authenticated';
    PERFORM public.admin_adjust_dream_tokens(gen_random_uuid(), v_admin, v_admin, 5, 'Admin Manual Add', 'manual_add');
    RESET ROLE;
    INSERT INTO rehearsal_results VALUES (14, 'authenticated role cannot execute', false, 'call succeeded');
  EXCEPTION WHEN OTHERS THEN
    -- Requires the specific function-permission error, so a failure to SET ROLE
    -- (also 42501) is not mistaken for a pass.
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
    INSERT INTO rehearsal_results VALUES (14, 'authenticated role cannot execute',
      v_state = '42501' AND v_msg LIKE 'permission denied for function%', v_state || ' ' || v_msg);
  END;

  -- 15. Net effect: exactly three ledger rows (+1, -1, +100) and profile sums still match the ledger.
  SELECT count(*) INTO v_rows FROM public.dream_token_transactions;
  SELECT pr.dream_token_balance INTO v_balance FROM public.profiles pr WHERE pr.id = v_admin;
  v_drift := (SELECT coalesce(sum(dream_token_balance), 0) FROM public.profiles)
           - (SELECT coalesce(sum(amount), 0) FROM public.dream_token_transactions WHERE token_kind = 'virtual');
  INSERT INTO rehearsal_results VALUES (15, 'net: 3 ledger rows, balance +100, profile/ledger sums still aligned',
    v_rows = v_rows0 + 3 AND v_balance = v_balance0 + 100 AND v_drift = v_drift0, NULL);

  -- 16. Existing ledger triggers are still enabled (including the Milo Bank guard).
  INSERT INTO rehearsal_results
  SELECT 16, 'ledger triggers enabled: balance sync and Milo Bank guard',
         count(*) FILTER (WHERE p.proname = 'update_profile_dream_token_balance' AND t.tgenabled IN ('O', 'A')) = 1
           AND count(*) FILTER (WHERE p.proname = 'milo_bank_guard_locked_dt_spend' AND t.tgenabled IN ('O', 'A')) >= 1,
         string_agg(p.proname || ':' || t.tgenabled, ', ' ORDER BY p.proname)
  FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.dream_token_transactions'::regclass AND NOT t.tgisinternal;
END
$rehearsal$;

SELECT step, check_name, passed, detail FROM rehearsal_results ORDER BY step;
-- <<< END REHEARSAL CHECKS

ROLLBACK;

-- Post-rollback, read only: expect both objects absent and totals equal to the preflight.
select
  to_regclass('public.admin_dream_token_adjustments') as audit_table_after_rollback,
  to_regprocedure('public.admin_adjust_dream_tokens(uuid,uuid,uuid,bigint,text,text)') as function_after_rollback,
  (select count(*) from public.dream_token_transactions) as ledger_rows,
  (select coalesce(sum(amount), 0) from public.dream_token_transactions where token_kind = 'virtual') as ledger_virtual_sum,
  (select coalesce(sum(dream_token_balance), 0) from public.profiles) as profile_dt_sum;
