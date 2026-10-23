# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-5C

## Controlled Generation & Private Capture Integration — Disabled Dry Run

**Status:** source-control-ready, **NOT enabled**. No AI provider calls, no real NOVA outputs, no filesystem/database writes, no changes to scores, approval or student release. No new API routes or staff UI.

### Files

- `lib/math/teaching/student-serving/phase4E2B8C2D8B5CStaffCapturePreflight.server.ts`
- `lib/math/teaching/student-serving/phase4E2B8C2D8B5COfflineCaptureHandoff.server.ts`
- `tests/phase4e2b8c2d8b5c-controlled-capture-integration.test.cjs`

### Staff preflight

`inspectStaffCapturePreflight(request, {quizId, questionId, methodId})` accepts **only** those 3 fields. It runs:

1. The existing 8B-2 authenticated trusted-source bridge.
2. The existing 4D staff shadow-comparison gate, checking the method is present in its current comparisons.
3. The existing authenticated staff source resolver, with version/identity agreement.
4. The 8B-2 data-minimising authoring mapping policy.
5. The 8B-3 method/stage contract.
6. The 8B-5A disabled provider request-shape contract against an in-memory candidate using an **ephemeral** SHA-256 snapshot hash.
7. A repeat resolver read that blocks changed version/content/staff-review state.

The temporary provider-shaped object is not returned, written, logged or passed to the provider. Only bounded reason-code metadata is returned. Source reads are not an atomic DB transaction; success must not be treated as a reusable approval certificate or as the database-defined audit fingerprint. New data, staff role, content or question version may change immediately after the check.

### Offline explanation handoff

`inspectOfflinePrivateCaptureHandoff(proposedRequest, rawResponse)` calls the 8B-5B response checker **without a caller-provided arithmetic witness**. This avoids claiming independent numerical evidence that is not tied to the live source. A structurally valid offline fixture returns a SHA-256 of the UTF-8 JSON string and a stage count; it never returns the JSON or text. Failed validation returns an error code, with no hash.

**A hash is not a provider-origin signature.** The function intentionally keeps `realNovaOriginVerified`, `authenticatedStaffSessionVerified`, `privateCaptureManifestComplete`, `artifactsWritten`, `educatorApproved`, and `learnerReleaseAllowed` set to `false`.

The existing 8C-2D.7 private capture checker remains the only prepared *offline file verification* workflow. It expects text files and any mobile/desktop screenshots stored **outside Git**, with SHA-256 hashes and staff-created manifest. There are no real capture files in 5C, and no 8C-2D.7 manifest can legitimately claim `captured_nova_output` from this phase.

### Risk boundaries and blockers

- Staff calls and roles are implemented by existing resolvers; **real authenticated staff/ordinary-user session tests were deferred until beta readiness** and remain a blocker before write-capable submissions or learner release.
- No question-answer key may be sent to the Luna authoring provider. The existing authoring-time visual provider is untouched.
- This phase provides no trusted arithmetic witness (only offline structure validation); do not use a model-provided final answer as its own source of truth.
- The 8B-5A provider remains disabled. No actual NOVA-generated response, rendered diagram, mathematical certification or educator review exists.
- Any later live model path must use a new explicit provider execution policy, authoritative source revalidation, independently derived math facts, tight cost/rate limits and private access-restricted capture.

### Verification

```
node --test tests/phase4e2b8c2d8b5c-controlled-capture-integration.test.cjs
npx tsc --noEmit
git --no-pager diff --check
```

Local reconstructed-snapshot regression run: **136/136 tests passed** across 8B-3, 8B-4, 8B-5A, 8B-5B and 8B-5C. This is **not** a full repository TypeScript check or real authenticated Supabase test.

### Next meaningful development milestone

Design the **disabled real-provider execution implementation** and run a controlled, explicit staff-only pilot only when the required live staff permission and outbound-data protections have been verified. Capture genuine outputs outside Git and evaluate with 8C-2D.7 and two educator reviews. Until then, the dry run is intentionally non-generative.
