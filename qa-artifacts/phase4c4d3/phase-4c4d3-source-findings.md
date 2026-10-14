# DREAMSCAPE ONE — Phase 4C-4D-3 source findings

Source basis: the user's seven original student-teaching follow-up files and the six preceding 4D-2 files. All observations are static; no database policies or live authentication were exercised.

## Confirmed learner architecture

- `app/learning-missions/core/[subject]/[level]/quiz/[quizId]/presentation/CoreMissionStage.tsx` imports `../teaching/CoreTeachingEngine` and renders it for all three question presentation paths. This teaching engine's implementation is **not included** in the seven-file 4D-3 ZIP. It is the next crucial integration target.
- `CoreQuizTypes.ts` declares feedback modes `immediate`, `end_of_quiz`, `none`; `QuizPayload.saved_answers`, `ImmediateFeedback` and `SubmitResult.question_results` carry potential explanations and correct responses.
- `CoreQuizPlayer.tsx` (4D-2 source) loads via subject-specific `get_math_quiz_payload`, saves via `save_math_quiz_answer`, and submits via `submit_math_quiz_attempt` from the browser's authenticated Supabase client. The quiz player only presents end-of-quiz answer reviews if `feedback_mode !== 'none'`.
- `CoreQuizPlayer.tsx` restores browser-side checkpoints for answers and feedback, with server `locked` feedback taking precedence for restored entries. These props are **not acceptable proof** that a separate teaching API may reveal answers.
- `hooks/useCoreMissionAccess.ts` is a client hook. It calls `dreamscape_get_my_learning_access`, checks staff roles and `learning_mission_zone_access`, and caches results in memory. That is **not** equivalent to a verified server-side entitlement gate for new APIs.
- `lib/supabase/server.ts` constructs a cookie-backed Supabase client. Its existence does not independently prove attempt ownership, teaching-feedback release authorization, or RLS policy.
- `buildTeachingContract.ts` creates a ready 4A contract only from a ready `TeachingQuestionUnderstanding`; it carries internal answer context that should **not** be returned to browsers.
- `consumer/boundary.ts` creates distinct read-only 4B and 4C consumer envelopes after validating the 4A build result. Consumer exports strip internal validation; they are method-selection inputs, not authorization or answer-release evidence.

## Security and rollout conclusions

1. Do not splice 4C/B4 selection into authoring generation APIs or trust CoreTeachingEngine props as server authorization.
2. Keep B4 `mode: disabled`; do not allow clients to submit `reviewedMathEvidence`, signer trust config or raw 4A/4C envelopes to a route.
3. Before live route changes, inspect `CoreTeachingEngine.tsx` and its teaching-service dependencies, plus server-verifiable quiz attempt/feedback RPC ownership and release semantics (including after `submit` and for `none`).
4. A separate, **unwired** fail-closed release-policy primitive is included in this package. It accepts facts that a later route **must first verify**. It does not authenticate, read Supabase, certify RLS, generate teaching steps, or connect the selector.
5. Do not count an already reviewed fixed or holdout cohort as an unbiased final validation set. Final method selection effectiveness remains unverified.

No production source, grading RPC, question bank, scoring weights, middleware, routes or deployment configuration was changed during this audit.
