# Phase 4C-4D-5B-2 — reviewed findings

**Source:** the two user-supplied 4D-5B-1 Supabase SQL exports, 5 routine definitions and 8 privilege rows. Analysis is static; no database operations were performed.

## Verified evidence

1. The eight exact routine signatures were returned. Helpers and `_unlocked` procedures deny effective EXECUTE for PUBLIC / anon / authenticated. The original wrappers permit authenticated callers.
2. Attempt helper checks `attempt.id = p_attempt_id AND attempt.user_id = p_user_id`, then checks quiz visibility. Save and submit unlocked functions independently verify `user_id = auth.uid()`.
3. Saving a response checks `question.id = p_question_id` belongs to the quiz; submission verifies each submitted question belongs to the attempt quiz.

## Unresolved disclosure checks

- Opening a quiz includes raw `question.content`, which may include nested `teaching` information. Review schema/contents to classify it, without conflating client-side visibility with server authorization.
- Immediate saved feedback may contain `explanation` even with `pending_manual_review = true`. When a repeated locked answer is requested, source calls `core_mark_response` and returns computed feedback rather than always honoring `requires_manual_marking`.
- `build_math_quiz_attempt_result` controls the returned post-submission result and wasn't in the five audited function bodies. Need its definition/grants to verify `end_of_quiz` and `none` feedback.

## Safety disposition

**No new student endpoint. No auto-deployment. No B4 enablement.** Query builder + content-shape aggregates, then review findings. Fixes to existing quiz RPCs, if needed, require separately approved migrations with a regression/rollback plan.
