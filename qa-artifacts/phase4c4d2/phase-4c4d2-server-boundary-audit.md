# DREAMSCAPE ONE — Phase 4C-4D-2 Server Boundary Audit

**Static source inspection only. Not a security or pedagogical certification. No source files were changed.**

## Verified source layout

| Source file | Status | Classification |
|---|---|---|
| `app/api/curriculum-developer/math-intelligence/generate/route.ts` | Found | generateRoute |
| `app/api/curriculum-developer/math-intelligence/batch/route.ts` | Found | batchRoute |
| `lib/curriculum-developer/server/CurriculumDeveloperApiAuth.ts` | Found | curriculumAuth |
| `lib/math-intelligence/MathIntelligencePipeline.ts` | Found | authoringPipeline |
| `lib/math-intelligence/MathTeachingVisualPipeline.ts` | Found | visualTeachingPipeline |
| `app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizPlayer.tsx` | Found | learnerPlayer |

- Authoring endpoints found: **yes**. Both call the curriculum access helper: **yes**; those calls precede generation in the supplied sources: **yes**.
- Supabase bearer/user/profile-role checks found in access helper: **yes**. Actual effective RLS and authorization are **not tested**.
- Learner player calls Supabase RPC directly: **yes**.
- B2/B4 selector references in six files: **0**. This is not a repository-wide reference search.
- Live student teaching service identified: **no**.
- Ready to patch live student route: **no**.

## Safest integration decision

Keep Math Intelligence authoring endpoints and Core Quiz grading paths unchanged. Do not attach the B4 gateway to curriculum-authoring generation or insert a client-side call into the quiz. The next implementation will need a separate server-owned, authenticated method-selection service with proven student/attempt access and respect for feedback timing. B4 remains **disabled**.

## Source files needed for next integration step

- `hooks/useCoreMissionAccess.ts` (not found in scanned root)
- `app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizTypes.ts` (not found in scanned root)
- `app/learning-missions/core/[subject]/[level]/quiz/[quizId]/CoreQuizUtils.ts` (not found in scanned root)
- `app/learning-missions/core/[subject]/[level]/quiz/[quizId]/presentation/CoreMissionStage.tsx` (not found in scanned root)
- `lib/supabase/server.ts` (not found in scanned root)
- `lib/math-intelligence/teaching/contract/buildTeachingContract.ts` (not found in scanned root)
- `lib/math-intelligence/teaching/contract/consumer/boundary.ts` (not found in scanned root)

## Data/server contracts still needed

- Server-side student/attempt entitlement and ownership contract not examined
- Supabase get/save/submit RPC definitions, RLS and solution-release rules not examined
- Actual client result/feedback presentation contracts not examined
- 4A contract construction from a trusted persisted question not yet wired
- No authenticated image-content verification or signed teaching approvals
- A genuinely unseen question cohort is still required before activating reviewed evidence

## Boundaries

- Leave authoring generate/batch endpoints unchanged; neither is the learner teaching route
- Do not infer student authorization from useCoreMissionAccess browser state
- Do not expose answer keys or explanations before the currently configured feedback-release event
- Build a separate server-owned student teaching handler only after reviewing ownership, RLS and feedback contracts
- Keep B4 approval in disabled mode; never accept review data, trusted keys or rollout mode from client payloads

**Do not upload** .env files, private keys, service-role keys, signing keys or account tokens.
