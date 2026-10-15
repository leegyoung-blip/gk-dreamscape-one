-- DREAMSCAPE Phase 4C-4D-5B-3: Targeted immediate-feedback disclosure correction.
-- MANUAL SQL ONLY: Never run as part of an automatic build, CI, or migration deploy.
-- Must first review the preflight, current functions, client compatibility and backup plan.
-- This changes TWO SECURITY DEFINER function bodies. It preserves their signatures,
-- grants, security mode, owner, RLS and all unrelated grading, rewards and quiz logic.
-- Assumes the definitions exported on 2026-10-14. Abort on any unexpected drift.
-- 4D-5B-3 line-ending hotfix: normalize both source AND anchored text (CRLF, LF, CR).
-- Full-definition MD5 fingerprints are checked BEFORE any EXECUTE statement.
-- ROLLBACK on error is automatic within the explicit transaction.
BEGIN;
DO $phase4c4d5b3$
DECLARE
  v_payload_oid oid := to_regprocedure('public.get_math_quiz_payload_unlocked(uuid)');
  v_save_oid oid := to_regprocedure('public.save_math_quiz_answer_unlocked(uuid,uuid,jsonb,integer)');
  v_payload text;
  v_save text;
  v_count int;
  v_old1 text;
  v_new1 text;
  v_old2 text;
  v_new2 text;
  v_old3 text;
  v_new3 text;
  v_payload_acl aclitem[];
  v_save_acl aclitem[];
BEGIN
  IF v_payload_oid IS NULL OR v_save_oid IS NULL THEN
    RAISE EXCEPTION '4D-5B-3 STOP: expected routine or signature not found';
  END IF;

  IF current_user <> 'postgres' THEN
    RAISE EXCEPTION '4D-5B-3 STOP: run only as postgres after an authorized review';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid IN (v_payload_oid, v_save_oid)
      AND (pg_get_userbyid(p.proowner) <> 'postgres' OR NOT p.prosecdef
           OR NOT coalesce('search_path=public, pg_temp' = ANY (p.proconfig),false))
  ) THEN
    RAISE EXCEPTION '4D-5B-3 STOP: ownership/SECURITY DEFINER/search_path drift';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p WHERE p.oid IN (v_payload_oid, v_save_oid)
      AND (has_function_privilege('anon',p.oid,'EXECUTE')
        OR has_function_privilege('authenticated',p.oid,'EXECUTE')
        OR EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                   WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))
  ) THEN
    RAISE EXCEPTION '4D-5B-3 STOP: internal function unexpectedly client-callable';
  END IF;

  SELECT proacl INTO v_payload_acl FROM pg_proc WHERE oid=v_payload_oid;
  SELECT proacl INTO v_save_acl FROM pg_proc WHERE oid=v_save_oid;
  v_payload := replace(replace(pg_get_functiondef(v_payload_oid), E'\r\n', E'\n'), E'\r', E'\n');
  v_save := replace(replace(pg_get_functiondef(v_save_oid), E'\r\n', E'\n'), E'\r', E'\n');

  -- Fingerprints verified by the read-only 4D-5B-3 anchor diagnostic.
  -- A changed body MUST be reviewed anew; exact anchors alone are insufficient.
  IF md5(regexp_replace(v_payload, '[[:space:]]+', ' ', 'g')) <> '0eb83089c97aa6b1477e95a13f597330'
     OR md5(regexp_replace(v_save, '[[:space:]]+', ' ', 'g')) <> '55ea44f3eb1966a08a2b5ecd8a7c6171'
  THEN
    RAISE EXCEPTION '4D-5B-3 STOP: full-definition fingerprint drift';
  END IF;
  IF strpos(v_payload, 'CREATE OR REPLACE FUNCTION public.get_math_quiz_payload_unlocked') <> 1
     OR strpos(v_save, 'CREATE OR REPLACE FUNCTION public.save_math_quiz_answer_unlocked') <> 1
  THEN
     RAISE EXCEPTION '4D-5B-3 STOP: unexpected function DDL formatting';
  END IF;

  -- Anchor literals are normalized consistently with the source definitions.
  -- Do NOT weaken an exact-match guard or accept an unmatched source.
  v_old1 := replace(replace($phase4c4d5b3_old1$when v_quiz.feedback_mode = 'immediate'
              then question.explanation ->> 'student'$phase4c4d5b3_old1$, E'\r\n', E'\n'), E'\r', E'\n');
  v_new1 := replace(replace($phase4c4d5b3_new1$when v_quiz.feedback_mode = 'immediate'
               and answer.is_correct is not null
              then question.explanation ->> 'student'$phase4c4d5b3_new1$, E'\r\n', E'\n'), E'\r', E'\n');
  v_old2 := replace(replace($phase4c4d5b3_old2$    v_mark := public.core_mark_response(
      v_question.question_type,
      v_question.answer_data,
      v_existing.response_data,
      v_maximum_marks
    );

    return jsonb_build_object(
      'saved', true,
      'locked', true,
      'pending_manual_review', (v_mark -> 'is_correct') = 'null'::jsonb,
      'is_correct', v_mark -> 'is_correct',
      'marks_awarded', v_mark -> 'marks_awarded',
      'maximum_marks', v_maximum_marks,
      'explanation', v_question.explanation ->> 'student',
      'correct_response', v_mark -> 'correct_response'
    );$phase4c4d5b3_old2$, E'\r\n', E'\n'), E'\r', E'\n');
  v_new2 := replace(replace($phase4c4d5b3_new2$    return jsonb_build_object(
      'saved', true,
      'locked', true,
      'pending_manual_review', v_existing.is_correct is null,
      'is_correct', v_existing.is_correct,
      'marks_awarded', v_existing.marks_awarded,
      'maximum_marks', v_maximum_marks,
      'explanation',
        case
          when v_existing.is_correct is null then null
          else v_question.explanation ->> 'student'
        end,
      'correct_response',
        case
          when v_existing.is_correct is null then null
          when v_question.requires_manual_marking
            then v_question.answer_data -> 'display_answer'
          else coalesce(v_question.answer_data -> 'display_answer', v_question.answer_data)
        end
    );$phase4c4d5b3_new2$, E'\r\n', E'\n'), E'\r', E'\n');
  v_old3 := replace(replace($phase4c4d5b3_old3$v_explanation := v_question.explanation ->> 'student';$phase4c4d5b3_old3$, E'\r\n', E'\n'), E'\r', E'\n');
  v_new3 := replace(replace($phase4c4d5b3_new3$v_explanation := case
      when v_is_manual then null
      else v_question.explanation ->> 'student'
    end;$phase4c4d5b3_new3$, E'\r\n', E'\n'), E'\r', E'\n');

  -- Guard 1: payload resume, exactly once on the reviewed definition.
  v_count := (length(v_payload) - length(replace(v_payload, v_old1, '')))
             / nullif(length(v_old1),0);
  IF v_count <> 1 THEN
    RAISE EXCEPTION '4D-5B-3 STOP: snippet 1 unexpected match count %', v_count;
  END IF;
  v_payload := replace(v_payload, v_old1, v_new1);

  -- Guard 2: locked resave, exactly once on the reviewed definition.
  v_count := (length(v_save) - length(replace(v_save, v_old2, '')))
             / nullif(length(v_old2),0);
  IF v_count <> 1 THEN
    RAISE EXCEPTION '4D-5B-3 STOP: snippet 2 unexpected match count %', v_count;
  END IF;
  v_save := replace(v_save, v_old2, v_new2);

  -- Guard 3: first save, exactly once on the reviewed definition.
  v_count := (length(v_save) - length(replace(v_save, v_old3, '')))
             / nullif(length(v_old3),0);
  IF v_count <> 1 THEN
    RAISE EXCEPTION '4D-5B-3 STOP: snippet 3 unexpected match count %', v_count;
  END IF;
  v_save := replace(v_save, v_old3, v_new3);

  -- Definitions are updated only after every precondition and exact-match guard passed.
  EXECUTE v_payload;
  EXECUTE v_save;
  -- Postconditions: preserve private execution and designated SECURITY DEFINER.
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid IN (v_payload_oid,v_save_oid)
      AND (pg_get_userbyid(p.proowner) <> 'postgres'
       OR NOT p.prosecdef
       OR NOT coalesce('search_path=public, pg_temp' = ANY(p.proconfig),false)
       OR NOT has_function_privilege('service_role',p.oid,'EXECUTE')
       OR (p.oid = v_payload_oid AND p.proacl IS DISTINCT FROM v_payload_acl)
       OR (p.oid = v_save_oid AND p.proacl IS DISTINCT FROM v_save_acl)
       OR has_function_privilege('anon',p.oid,'EXECUTE')
       OR has_function_privilege('authenticated',p.oid,'EXECUTE')
       OR EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                  WHERE a.grantee=0 AND a.privilege_type='EXECUTE'))
  ) THEN
    RAISE EXCEPTION '4D-5B-3 STOP: postcondition failed, transaction will roll back';
  END IF;
END;
$phase4c4d5b3$;
COMMIT;
