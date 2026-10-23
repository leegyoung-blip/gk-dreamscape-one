# Phase 8C-2D.8B-5A — Specialist explanation provider interface

## Purpose
Define a provider-neutral interface for complete specialist explanations, distinct from the **existing visual teaching planner** (`lib/math-intelligence/ai/TeachingAIProvider.ts`). Implement a *disabled* Luna-facing placeholder to prevent accidental provider calls before the separately reviewed 8B-5B and 8B-5C phases.

## Boundaries

- **No API route, model invocation, environment secrets, network requests, file writes or Supabase changes.**
- Do not edit `lib/math-intelligence/ai/OpenAILunaProvider.ts`; its legacy visual planner supports a different input contract (some analysis paths contain answer-bearing fields).
- The request DTO allows only question identity/version, source fingerprint, bounded prompt/instruction, primary level, method/stages and disabled controls. No `answer_data`, `correct_answer`, `explanation`, `options`, `apiKey`, `token` or extraneous field.
- The validator's `candidate_shape_valid_provider_disabled` result only confirms data shape. An adversarial caller can forge question IDs and fingerprints: **staff identity, source authenticity and freshness are ALWAYS false in this phase.**
- Candidate structure is not mathematical correctness; there is no reviewer approval, real capture or learner release.

## Next steps and release gates

1. **8B-5B**: design schema-constrained response parsing and deterministic mathematical checks; reject unverified output.
2. **8B-5C**: create an authenticated, source-fresh internal execution path, explicit outbound data minimisation and private capture; require separate approval before enabling any actual model requests.
3. Before real staff submissions or learner-facing beta release: complete live authentication/permission checks and independent educator reviews (previously deferred by project decision).

## Install

Extract the ZIP into repository root (`C:\Users\leegy\gk-design-world`). Run the focused test and the full repository `npx tsc --noEmit`. Stage only the three new files in this package. No SQL is included.
