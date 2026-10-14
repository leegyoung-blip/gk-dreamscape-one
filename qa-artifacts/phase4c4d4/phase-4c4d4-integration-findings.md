# DREAMSCAPE ONE — Phase 4C-4D-4 Integration Findings

## Confirmed from uploaded source

- `CoreTeachingEngine.tsx` is a **client component** that reads authored `question.content.teaching` and displays progressive hints before feedback, then authored summaries, working, lessons and visual steps after the `feedback` prop exists.
- `MathTeachingRenderer.tsx` maps authored teaching lesson `type` to a fixed set of renderer components. It does **not** call B2/B4 or select a method from the 153-method library.
- `MathTeachingVisualSteps.tsx` reads authored/generated `math_visual` from question content and visual teaching steps embedded in the lesson object.
- `CoreMissionStage.tsx` renders `CoreTeachingEngine` for the existing student quiz. The existing `feedback` and checkpoint values are client-held and **not trusted** for server authorization.
- `CoreQuizPlayer.tsx` calls Supabase RPCs `get_math_quiz_payload`, `save_math_quiz_answer`, `submit_math_quiz_attempt`. The SQL definitions, functions' SECURITY DEFINER characteristics and grants were not provided.
- `phase4C4Adapter.ts` expects independently built and validated 4A 4B/4C consumer envelopes. The B4 gateway defaults disabled. 4D3 protects the release of new server responses but cannot purge any potentially sensitive teaching content already sent to browsers.

## Implemented in this B4-disabled package

- A server-only **internal** selector composition requiring server-provided current attempt, quiz, question, feedback and access facts; it cross-checks request identity and calls the existing 4D3 release decision **before** the B4 gateway.
- A TypeScript server-only adapter connecting the real 4A consumer builders and B2 selector. B4 is hard-coded `mode: 'disabled'`. No arbitrary human-review attestations accepted.
- Only `unavailable`, `ambiguous`, or a bounded method ID/family/confidence may leave the service. No raw 4A contracts, answer keys, authored explanations, review signatures, candidate scores, or student data are returned.

## NOT implemented / NOT verified

- No public Next.js route, no Supabase query/permissions wiring, no changes to `CoreQuizPlayer`, `CoreTeachingEngine`, grading or rewards. Do not claim live integration is complete.
- Supabase may already deliver authored answer-containing teaching objects inside the quiz payload; verifying and possibly tightening that is a **separate task**, not solved by restricting a new endpoint.
- The B2 selected teaching method is descriptive metadata, NOT a generated lesson, not independently certified math accuracy, and cannot substitute for authored content.
- No teacher-approved B3 evidence, no verified diagram content, and no unbiased fresh cohort evaluation.

## Next decision gate

1. Run the supplied read-only Supabase metadata queries for the three math quiz RPCs and relevant RLS relation flags.
2. Inspect the full function definitions, possible quiz payload projections and effective ownership/feedback authorization in a controlled source audit **without posting credentials or student records**.
3. Implement a trusted resolver for `TrustedTeachingContext` and a private integration test harness.
4. Only after that consider a new authorized API route and optional method label inside the existing teaching UI.
