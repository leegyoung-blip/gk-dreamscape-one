-- DREAMSCAPE ONE 4E-2A-1 | Schema discovery for server-owned teaching context | READ ONLY
-- Reports column names/types only; no table records, answers, student identities or credentials.
WITH selected AS (
 SELECT table_schema,table_name,column_name,udt_name,is_nullable,ordinal_position
 FROM information_schema.columns
 WHERE table_schema = 'public'
   AND (
     table_name ~* '^math_.*(quiz|question|attempt|answer|teach|method|review|approval)'
     OR table_name ~* '(teaching|method_selection|lesson_review)'
   )
)
SELECT
  table_name,
  count(*) AS columns_count,
  string_agg(column_name || ' (' || udt_name || ')', ', ' ORDER BY ordinal_position) AS columns_and_types,
  bool_or(column_name = 'answer_data') AS has_answer_data,
  bool_or(column_name = 'content') AS has_content,
  bool_or(column_name = 'user_id') AS has_user_id,
  bool_or(column_name = 'student_user_id') AS has_student_user_id,
  bool_or(column_name = 'status') AS has_status,
  bool_or(column_name = 'verification_status') AS has_verification_status
FROM selected
GROUP BY table_name
ORDER BY table_name;
