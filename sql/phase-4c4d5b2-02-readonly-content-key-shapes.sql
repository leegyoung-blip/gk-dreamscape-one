-- DREAMSCAPE ONE 4C-4D-5B-2 (2/2)
-- READ ONLY: aggregate structure-only inventory of published question.content.
-- No question text, student attempts, responses, answer_data or teaching values returned.
-- This does NOT prove the absence of sensitive answers in the content values.
WITH published AS (
  SELECT COALESCE(q.content, '{}'::jsonb) AS content
  FROM public.math_questions q
  WHERE q.status = 'published'
),
summary AS (
  SELECT
    count(*)::bigint AS published_question_count,
    count(*) FILTER (WHERE content ? 'teaching')::bigint AS with_teaching,
    count(*) FILTER (WHERE content ? 'answer')::bigint AS with_answer_key,
    count(*) FILTER (WHERE content ? 'solution')::bigint AS with_solution_key,
    count(*) FILTER (WHERE content ? 'explanation')::bigint AS with_explanation_key,
    count(*) FILTER (WHERE content ? 'correct_response')::bigint AS with_correct_response_key,
    count(*) FILTER (WHERE jsonb_typeof(content) <> 'object')::bigint AS non_object_content
  FROM published
),
top_keys AS (
  SELECT k.key, count(*)::bigint AS appearances
  FROM published p
  CROSS JOIN LATERAL jsonb_object_keys(
    CASE WHEN jsonb_typeof(p.content) = 'object' THEN p.content ELSE '{}'::jsonb END
  ) AS k(key)
  GROUP BY k.key
),
teaching_keys AS (
  SELECT k.key, count(*)::bigint AS appearances
  FROM published p
  CROSS JOIN LATERAL jsonb_object_keys(
    CASE WHEN jsonb_typeof(p.content -> 'teaching') = 'object'
      THEN p.content -> 'teaching' ELSE '{}'::jsonb END
  ) AS k(key)
  GROUP BY k.key
)
SELECT
  s.*,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'appearances',appearances) ORDER BY key),'[]'::jsonb) FROM top_keys) AS top_level_content_keys,
  (SELECT coalesce(jsonb_agg(jsonb_build_object('key',key,'appearances',appearances) ORDER BY key),'[]'::jsonb) FROM teaching_keys) AS teaching_content_keys
FROM summary s;
