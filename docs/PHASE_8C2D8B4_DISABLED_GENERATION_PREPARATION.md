# Phase 8C-2D.8B-4 — Controlled AI generation preparation

## Scope delivered

- A pure, allowlisted dry-run policy that accepts only the 8B-2 mapped-question contract and the 8B-3 specialist method contract.
- A server-only readiness adapter that reuses the authenticated 8B-2 bridge, returns metadata only, and **never calls the AI provider**.
- Strict offline output-shape inspection using the existing 8B-3 validator; checks **do not** prove arithmetic correctness or NOVA output provenance.
- All response flags remain negative for provider invocation, actual captures, source verification (in the pure policy), mathematical verification, educator approval, persistence and learner release.

## Deliberately NOT delivered

- An AI provider call, model prompt, key handling, API route, database insert, filesystem capture, public UI or activated specialist method.
- A version-bound, transactionally fresh provider request with verified mathematical solution.
- A real NOVA explanation, proof of diagram rendering, human approval or completed security tests.

## Outbound-data rules for the future phase

1. Authenticate the staff caller on the server for every request. Resolve a trusted Mathematics question and freshly verify source identity/version immediately before use.
2. Define an independently reviewed outbound-question-data policy (the existing authoring-time Luna client includes `correct_answer` and `explanation` and **must not be reused unchanged**).
3. Do not send stored answer keys, student data, authentication tokens, system or server secrets, raw DB objects, options from excluded question types, or any unstated fields.
4. Require strict structured-output parsing, validate the expected method stage IDs, reject any identity/version mismatch, and treat structure checking separately from mathematical correctness.
5. Never save generated output into Git, logs or the production database; future authorised private capture must use the separate 8C-2D.7 capture integrity workflow.
6. Preserve specialist drafts as inactive and never mark them approved on the basis of model output alone.

## Verification

```powershell
node --test tests/phase4e2b8c2d8b4-disabled-generation.test.cjs
npx tsc --noEmit
```

## Release blockers — NOT waived

- Actual Google/OAuth staff and ordinary-user access checks (deferred until beta readiness).
- Authenticated source freshness during an actual provider call.
- Explicitly approved external-model data-minimisation policy and provider configuration.
- Independent mathematical checking of responses, diagram rendering checks and two-educator pedagogical review.
- Live audit recording tests before staff write actions; learner release remains disabled.

No Supabase SQL or environment variables are required for this phase.
