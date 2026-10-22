# Phase 4E-2B-8C-2D.8B-2 — Trusted Source → Private Authoring Mapping

## Scope

This is a server-only **read-only mapping preflight**, not a real explanation capture or method activation. It adds two source files and one test file. It does not add an HTTP route, database migration, Supabase write, AI provider invocation, learner-visible UI, or scoring change.

The bridge calls `inspectStaffMathSpecialistShadowComparison`, followed by the authenticated resolver, maps a text-only question into a minimal private authoring draft, validates it using the existing `normaliseMathIntelligenceQuestion`, and re-reads the source for non-atomic freshness detection.

Returned diagnostics contain **no prompts, question content, answer keys or generated teaching output**. The private draft is never returned by the server wrapper.

## Why actual capture is still blocked

The authoring generator expects a draft and its provider can transmit `correct_answer` / `explanation` to Luna. The Phase 4E trusted source holds authoritative `answer_data`. No approval has been given to transmit these answer-bearing fields through the authoring provider. The generator also produces **visual teaching steps**, not necessarily a full specialist-method explanation, and may return no teaching output without a valid visual.

Phase 8B-2 maps only text-only open responses, and strips authoritative answer fields. It explicitly sets `canInvokeProvider=false` and `canCaptureRealExplanation=false`. This preserves the boundary until a separate outbound-data policy and an actual provider/capture contract are reviewed.

## Testing

```
node --test tests/phase4e2b8c2d8b2-trusted-generator-mapping.test.cjs
npx tsc --noEmit
git --no-pager diff --check
```

The standalone policy is compiled under ES2017 by the test. The full TypeScript check is a local installation gate; it was not executed against the entire private repository during package creation.

## Later 8B-3 requirements

- Explicitly choose whether general narrative explanation generation is in scope; the visual authoring generator alone is insufficient.
- Define outbound data minimisation and model-provider permissions; do not transmit `answer_data` by accident.
- Bind capture files to the original question version and a transactional or otherwise verified source fingerprint.
- Ensure outputs stay local/private, are not stored in Git, and are reviewed by educators.
- Retain the deferred beta live-authentication and staff audit-session checks before release or write-capable staff workflows.
