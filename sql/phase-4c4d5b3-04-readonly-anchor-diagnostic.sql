-- DREAMSCAPE 4D-5B-3 STOP diagnostic, SELECT ONLY. No function changes or record access.
-- Compare exact multiline anchors against definitions and against LF-normalized forms.
-- All review hashes come from the exported definitions dated 2026-10-14 11:05 (SGT).
WITH anchors(label, signature, needle, source_review_md5) AS (
  VALUES
    ('payload_resume', 'public.get_math_quiz_payload_unlocked(uuid)', $debug_literal$when v_quiz.feedback_mode = 'immediate'
              then question.explanation ->> 'student'$debug_literal$::text, '0eb83089c97aa6b1477e95a13f597330'),
    ('save_locked_resave', 'public.save_math_quiz_answer_unlocked(uuid,uuid,jsonb,integer)', $debug_literal$    v_mark := public.core_mark_response(
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
    );$debug_literal$::text, '55ea44f3eb1966a08a2b5ecd8a7c6171'),
    ('save_first', 'public.save_math_quiz_answer_unlocked(uuid,uuid,jsonb,integer)', $debug_literal$v_explanation := v_question.explanation ->> 'student';$debug_literal$::text, '55ea44f3eb1966a08a2b5ecd8a7c6171')
),
targets AS (
  SELECT a.*, pg_get_functiondef(to_regprocedure(a.signature)) AS current_definition
  FROM anchors a
),
normalized AS (
  SELECT label, signature, source_review_md5,
    needle, current_definition,
    replace(replace(needle, E'\r\n', E'\n'), E'\r', E'\n') AS normalized_needle,
    replace(replace(current_definition, E'\r\n', E'\n'), E'\r', E'\n') AS normalized_definition
  FROM targets
)
SELECT
  label,
  signature,
  current_definition IS NOT NULL AS function_found,
  CASE WHEN current_definition IS NULL THEN NULL ELSE
    (length(current_definition)-length(replace(current_definition, needle,''))) / nullif(length(needle),0)
  END AS original_exact_matches,
  CASE WHEN normalized_definition IS NULL THEN NULL ELSE
    (length(normalized_definition)-length(replace(normalized_definition,normalized_needle,''))) / nullif(length(normalized_needle),0)
  END AS normalized_exact_matches,
  strpos(needle, E'\r') > 0 AS needle_contains_cr,
  CASE WHEN normalized_definition IS NULL THEN NULL ELSE
    md5(regexp_replace(normalized_definition,'[[:space:]]+',' ','g')) = source_review_md5
  END AS matches_reviewed_definition,
  CASE WHEN normalized_definition IS NULL THEN NULL ELSE
    md5(regexp_replace(normalized_definition,'[[:space:]]+',' ','g'))
  END AS current_definition_fingerprint
FROM normalized
ORDER BY label;
