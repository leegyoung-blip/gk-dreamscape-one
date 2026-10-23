# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-5B

## Structured explanation parsing and conservative arithmetic cross-check

**State: offline review tool only.** No Luna provider invocation, Supabase read/write, route, capture persistence, automatic method approval, learner release, or production scoring change.

### Inputs and outputs

`inspectOfflineSpecialistProviderResponse(proposedRequest, rawJsonResponse, optionalArithmeticFacts)` is pure. It takes:

1. A narrow, disabled 8B-5A request matching `8C2D8B5A.v1` with a question UUID, version, fingerprint, grade, specialist method and exact required stages. **This request is caller-supplied and may be forged; passing its shape check is NOT staff authorisation or proof of source freshness.**
2. A bounded **raw JSON string** matching the existing `8C2D8B3.v1` explanation format. Markdown fences and streaming fragments are deliberately rejected.
3. Optionally, a bounded, source-identity-matched **arithmetic witness** describing the expected calculation. Witnesses are untrusted until a later authorised server service derives them from fresh authoritative question understanding. **Do not build these witnesses from model-generated reasoning or a browser request in production.**

The checker reuses the existing 8B-3 explanation-structure validator. It requires the exact question ID/version, method ID, all stages in order, working, final answer, final check, and bounded visual-plan metadata.

**Return value:** bounded diagnostic metadata only; no prompt, original question, generated steps, final-answer text, provider credentials or witness facts. All flags for source authentication, source freshness, response provenance, model invocation, mathematical correctness, reasoning correctness, rendered visuals, educator approval, capture persistence and learner release remain `false`.

### Deterministic cross-check coverage (optional)

These **arithmetical consistency checks are NOT mathematical correctness certification**:

- `equal_spacing`: recompute `(endIndex - startIndex) × gapLength`; rejects invalid ordinal ordering and non-positive gap length.
- `multiplicative_chain`: recompute `total × relativeUnits[targetIndex] / sum(relativeUnits)`; requires positive integer units and an integer target result.
- `changing_ratio`: solve a *unique integer whole-quantity* before/after ratio system with stated signed changes, and check positivity of both states. Valid targets: `original_a`, `original_b`, `original_total`.

Checks use exact integer BigInt arithmetic (callable constructor, without `0n` or `1n` syntax) for the supported bounded values. The code passes the isolated ES2017 TypeScript check; the Node.js runtime must provide `BigInt` (modern Node versions do).

The output `finalAnswer` can be machine-checked only when it is an unambiguous integer optionally followed by one simple unit word. Elaborated prose and unsupported fractional forms remain pending independent review rather than being guessed or silently marked correct. Mismatched numeric answers are blocked. Even exact matches remain **`structure_valid_review_pending`** with `mathematicalCorrectnessVerified: false`.

### Security boundaries

- Reject JSON larger than 24,000 UTF-16 code units, non-string output, invalid JSON, duplicate property names (including Unicode-escaped aliases), unexpected fields, unsafe HTML and wrong version/stage/order.
- Reject arithmetic witnesses that do not match the request's method, UUID, source version and fingerprint, or that carry extra fields or unsupported structures.
- No provider calls, environment reads, logging, network, database, filesystem or new API route.
- The existing Luna visual generator **is not modified**. The 8B-5A Luna provider remains disabled.
- No output is an approval, signed certificate, trusted witness or real NOVA capture. Actual explanation prose and screenshots, if authorised in a later phase, must stay outside Git and use the 8C-2D.7 private capture workflow.

### Remaining gates

1. **8B-5C:** authorised server-side source re-resolution, source-fresh mathematical facts, fresh permission checks, policy for provider outbound fields, and private capture. No live model call should be enabled by default.
2. Independent answer and natural-language reasoning verification, diagram rendering tests, real provider output capture and two-educator assessment.
3. Final beta readiness: the previously deferred real Google-login staff/ordinary-user checks, database audit behaviour and learner-release approval.

### Installation

Unzip at repository root (`C:\Users\leegy\gk-design-world`). Add only the new three files. Run:

```powershell
node --test tests/phase4e2b8c2d8b5b-response-review.test.cjs
npx tsc --noEmit

git --no-pager diff --check
```

Do not alter `tsconfig.json`, run SQL or enable generation. The additional combined regression command in `INSTALLATION_8C2D8B5B.txt` assumes previous 8B-3/4/5A source and tests are present, as in the user's repository.
