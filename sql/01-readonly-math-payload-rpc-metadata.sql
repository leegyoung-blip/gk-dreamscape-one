-- DREAMSCAPE ONE 4E-2A-1 | LIVE quiz payload / trusted RPC CONTRACT | READ ONLY
-- This query does not expose function bodies, credentials, student answers or tokens.
-- Boolean source-code indicators help focus the subsequent security audit;
-- they are NOT proof that a function safely filters fields or checks ownership.
WITH rpc AS (
  SELECT
    n.nspname AS function_schema,
    p.oid,
    p.proname AS function_name,
    p.prosecdef AS security_definer,
    p.proconfig AS function_settings,
    p.provolatile AS volatility,
    pg_get_functiondef(p.oid) AS definition
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      p.proname ILIKE '%math%quiz%payload%'
      OR p.proname IN (
        'save_math_quiz_answer',
        'submit_math_quiz_attempt'
      )
    )
)
SELECT
  function_schema,
  function_name,
  oid::regprocedure::text AS function_signature,
  security_definer,
  function_settings,
  volatility,
  pg_get_function_result(oid) AS returns,
  has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated_can_execute,
  has_function_privilege('anon',oid,'EXECUTE') AS anon_can_execute,
  md5(definition) AS definition_fingerprint,
  position('auth.uid' in lower(definition)) > 0 AS mentions_auth_uid,
  position('answer_data' in lower(definition)) > 0 AS mentions_answer_data,
  position('correct_response' in lower(definition)) > 0 AS mentions_correct_response,
  position('teaching' in lower(definition)) > 0 AS mentions_teaching,
  position('feedback' in lower(definition)) > 0 AS mentions_feedback,
  position('content' in lower(definition)) > 0 AS mentions_content,
  position('attempt' in lower(definition)) > 0 AS mentions_attempt
FROM rpc
ORDER BY function_name, function_signature;
