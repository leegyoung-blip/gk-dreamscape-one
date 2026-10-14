# DREAMSCAPE ONE — Phase 4C-4D-5A, submitted SQL body and RLS review

**Source:** two Supabase CSV exports uploaded 14 October 2026.
**Scope:** public math quiz RPC wrappers and five math-related table policies.
**Status:** gateway disabled, no student teaching endpoint authorized or deployed.

## Function source findings

1. `get_math_quiz_payload(p_quiz_id uuid)` executes as SECURITY DEFINER, owned by `postgres` (owner bypasses RLS). It takes `auth.uid()` and first calls `public.core_assert_quiz_topic_access('math', p_quiz_id, v_user_id)`, then `public.get_math_quiz_payload_unlocked(p_quiz_id)`.
2. `save_math_quiz_answer(p_attempt_id uuid, ...)` likewise first calls `public.core_assert_attempt_topic_access('math', p_attempt_id, v_user_id)` and then `public.save_math_quiz_answer_unlocked(...)`.
3. `submit_math_quiz_attempt(p_attempt_id uuid, ...)` likewise first calls `public.core_assert_attempt_topic_access('math', p_attempt_id, v_user_id)` and then `public.submit_math_quiz_attempt_unlocked(...)`.
4. All three wrappers explicitly set search_path to `public, auth, pg_temp`. Security of their delegated `_unlocked` functions and `core_assert_*` checks remains **unverified**.

## Table and RLS findings

- `math_quiz_attempts`: authenticated SELECT policy `user_id = auth.uid()`.
- `math_attempt_answers`: authenticated SELECT policy only for `is_core_content_editor()`; ordinary student direct SELECT is not granted by this policy.
- `math_quiz_questions`: curriculum-editor `ALL` policy.
- `math_quiz_reward_claims`: authenticated SELECT policy `user_id = auth.uid()`.
- `math_quizzes`: curriculum-editor policy plus published/visible learner-and-teacher SELECT policy.
- RLS is enabled for all five reported tables, but not forced; owner is `postgres`, able to bypass RLS.

## Critical remaining checks

- Are `_unlocked` functions executable directly as `anon` or `authenticated` due to PostgreSQL's default PUBLIC execute grants, or explicit grants?
- Do the `core_assert_*` functions check actual user ownership, permitted access, subject/quiz identity and correct attempt status?
- Does `get_math_quiz_payload_unlocked` include hidden answers or lesson solutions before the quiz feedback stage?
- Do the answer-save and submit implementations enforce question membership, response locking, submission state and feedback release?

The next package extracts **five delegated helper definitions** and **eight exact function permission rows**, without querying student records. **It does not certify security or activate any code.**
