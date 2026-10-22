# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-3

## Controlled generation and private capture contract (offline, non-activating)

**Status:** Contract and structure gates implemented. Provider calls: **disabled**. Real NOVA specialist outputs captured: **zero**. Human review: **pending**. Learner release: **disabled**.

### Why this is a separate contract

The current authoring-time Luna pathway accepts `correct_answer` and `explanation` in its internal question payload and requires a valid visual specification. The new specialist drafts describe teaching methodology, not necessarily a visual lesson. Consequently, the visual generator cannot be treated as an approved general-purpose specialist explanation generator. This phase neither calls that provider nor changes its input contract.

### Gate 1 — data-minimised input

`inspectOfflineSpecialistExplanationInput()` accepts the narrowly mapped private draft shape from 8B-2. It rejects unexpected fields, answer data, arbitrary HTML-bearing or oversized question wording, unsupported levels, and methods outside the three *inactive* specialists. It returns **metadata only**, never source wording, provider payloads or answer keys.

A forged object can satisfy the same shape. **Shape validation is not evidence of authentication or source freshness.** A later authenticated server workflow must re-resolve the question, check its version/fingerprint and authorisation inside the trusted boundary before any model request. No browser-provided prompt, stage list, role or `approved` flag can authorise generation.

### Gate 2 — structured explanation

`inspectOfflineSpecialistExplanationStructure()` expects a deliberately small response schema:

```json
{
  "schemaVersion": "8C2D8B3.v1",
  "questionId": "UUID_FROM_TRUSTED_SERVER_ONLY",
  "questionVersion": 1,
  "methodId": "heuristic.multi_step.equal_spacing_interval_count",
  "steps": [
    {"stageId": "represent_positions", "explanation": "...", "working": "..."},
    {"stageId": "count_intervals", "explanation": "...", "working": "..."},
    {"stageId": "calculate_distance", "explanation": "...", "working": "..."},
    {"stageId": "check_small_case", "explanation": "...", "working": "..."}
  ],
  "finalAnswer": "...",
  "finalCheck": "...",
  "visualPlan": {"kind":"number_line", "description":"..."}
}
```

Stage IDs and their order are fixed by the existing draft definitions. The validator rejects unknown fields, mismatched question IDs/versions/method IDs, missing stages, unsupported visual-plan types and malformed or excessive text. Its result includes **no raw explanation or answer**.

**A structurally valid explanation may still contain incorrect arithmetic, a misleading representation or a wrong answer.** Structural checks do not validate factual correctness, rendered diagrams, whether NOVA really generated the output, or educator approval.

### Private capture handoff (NOT implemented in 8B-3)

1. The later authorised internal capture mechanism must use a fresh server-side staff source resolution and **separate, explicit permission** for outbound generation. No browser-provided source or arbitrary selection object.
2. Capture the original text and render screenshots **outside Git** in an access-restricted location. Never log the question, answer keys, provider payload, response prose or access tokens.
3. Record the actual generation version/model and source fingerprint. Do not label synthetic reference text as a real NOVA capture.
4. Use the existing `scripts/phase4e2b8c2d7-real-output-evaluation.cjs` and its private manifest for SHA-256 checks and the two-reviewer assessment. This phase does **not** duplicate that checker and does not write a manifest or files.
5. Mathematical correctness must be checked independently against the authorised answer, with diagrams reviewed on real mobile and desktop devices. Return to human/technical review if the source changes.
6. Before live staff review writes or learner-facing activation, complete the deferred authenticated ordinary-user/staff tests, source-freshness/audit write tests and educator approvals.

### Governance

- No provider calls, request routes, Supabase writes, files saved, scoring changes, draft registration or teaching release.
- The three existing specialist methods remain `draft`, with curriculum-skill scoring undeclared.
- This is **not** a runnable real-output capture endpoint. 8B-4 should implement a strictly controlled provider adapter only after the outbound payload and provider policy are independently reviewed.
