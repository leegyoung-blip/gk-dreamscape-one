# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-1

## Existing Mathematics generator: verified source contracts

Reviewed October 22, 2026, using the user-supplied targeted generation-source archive. Source observations are not successful runtime tests.

| Component | Verified behaviour | Boundary for capture |
|---|---|---|
| `app/api/curriculum-developer/math-intelligence/generate/route.ts` | Uses `requireCurriculumDeveloperApiAccess`, takes `body.question`, normalises it and runs `generateMathVisualAndTeachingForQuestion` | **Caller-supplied authoring draft**. Not an authenticated, version-bound database question lookup. |
| `lib/curriculum-developer/server/CurriculumDeveloperApiAuth.ts` | Validates the Supabase bearer session and role from `profiles`; accepts `admin`/`curriculum_lead` | Live role checks still deferred to beta-readiness; code inspection is not end-to-end verification. |
| `MathIntelligencePipeline.ts` | Generates a visual first; if no valid generated visual/spec, returns `teaching: null` | Existing generator is **not** a general-purpose text explanation API. |
| `MathTeachingVisualPipeline.ts` | Deterministic teaching rules first, Luna fallback only when deferred; validates resulting visual teaching plans | Captured teaching steps are visual-specific, not automatically specialist-method explanations. |
| `OpenAILunaProvider.ts` | Requests Responses API; sets `store:false`; includes structured prompt and model response validation | The analysis payload contains `correct_answer` and `explanation` fields. Authorise and minimise outbound answer-bearing data before using this path on production questions. `store:false` is not equivalent to a general no-disclosure guarantee. |
| `method-preview/route.ts` | Independently verifies staff access and returns bounded method metadata | Existing preview is read-only; do not repurpose it to expose source/question/answer data. |
| `phase4E2B8C2C4DStaffShadowComparison.server.ts` | Staff-only source-correlated comparison; uses existing rankings, outputs `pending_manual_review` | No connection to generation pipeline, no specialist approval, no learner activation. |

## 8B-1 outcome

**SOURCE CONTRACTS REVIEWED — CAPTURE BLOCKED UNTIL BRIDGE DESIGN.**

The generator exists and can create validated **visual teaching steps**, subject to visual-generation eligibility. It is not yet source/version-bound to the specialist shadow review or a real NOVA explanation capture. The generic generator is not suitable as a drop-in replacement for the specialist evaluation workflow.

No route or generation code is changed in this phase. The accompanying audit script reads only specified repository source files and prints a fixed, sanitised contract report.

## 8B-2 requirements before implementation

1. Verify the trusted staff source resolver's exact source/identity shape.
2. Verify `MathQuestionNormalizer`, `MathAuthoringProposal`, and visual/teaching types to establish a lossless mapping from an **authorised** source row; do not depend on browser-provided question text.
3. Require server-only invocation and explicit capture opt-in; no new public learner API.
4. Re-read question ID, version and content fingerprint after any generation; reject stale results. This is an advisory snapshot, **not** an atomic approval certificate.
5. Do not send authoritative answer data to the model until data-minimisation and validation rules are established; bound output size, provider calls and error handling.
6. Capture only actual generated steps that have passed the existing validation, label their provenance (`rules` or `luna`), and keep the status `pending_educator_review`.
7. Keep real captures out of Git and student-facing endpoints. Do not modify 4C rankings, specialist statuses, or audit confirmation state.
8. Live role checks, educator approval and end-to-end beta security verification remain pending release gates.

## Usage

```
node --test tests/phase4e2b8c2d8b1-generation-contract-audit.test.cjs
node scripts/phase4e2b8c2d8b1-generation-contract-audit.cjs --root .
```

Expected assessment: `SOURCE_CONTRACT_REVIEWED_CAPTURE_BLOCKED` with 14/14 observed source-contract checks and the unresolved safety dependencies listed above. This expected blocked status is *not* an audit failure.

Next, run `scripts/phase4e2b8c2d8b2-extract-generator-contracts.ps1` from PowerShell to gather the targeted additional definitions, or supply those files from an already-prepared extract. This helper does not alter source files or collect `.env` values.
