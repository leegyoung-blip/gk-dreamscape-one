-- DREAMSCAPE ONE — 8C-2C.4C-3, READ-ONLY.
-- Select only non-sensitive identifiers for an authenticated staff preview.
-- NO question text, answer_data, evidence, secrets or profile data.
SELECT l.quiz_id, l.question_id, q.version AS question_version
FROM public.math_quiz_questions AS l
JOIN public.math_questions AS q ON q.id = l.question_id
JOIN public.math_quizzes AS z ON z.id = l.quiz_id
WHERE q.subject = 'math'
  AND q.version >= 1
  AND q.topic_id = z.topic_id
ORDER BY l.quiz_id, l.question_id
LIMIT 5;
