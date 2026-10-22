# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.7

## Real Teaching Output Evaluation Framework — offline intake only

**Status:** Offline tooling implemented. **Actual NOVA outputs captured: 0.** The existing six pairs from 8C-2D.3 are *authored synthetic teaching references* and must never be described as real generation evidence. The 24-item 8C-2D.6 review queue remains unapproved.

### Scope and safety

- **No** new Teaching Engine API, source-question fetching, Supabase connection, Google OAuth, database write, scoring change, staff approval, specialist catalogue activation or learner release.
- The CLI only reads a private manifest, two output text files, and optional rendered-image files. It compares SHA-256 hashes and metadata, checks permitted method IDs and level ranges, confirms declared same-question linkage and tracks what has *not* been verified.
- The CLI does **not** prove the model truly produced the text, establish the correctness of a mathematical solution, verify database source freshness, inspect diagram content, authenticate a reviewer or establish an educational benefit. These are explicit pending gates.
- The CLI never prints question text, answers, prompts, image contents, output prose, environment variables, OAuth tokens or file paths. It emits only status, safe review ID, reason codes and pending checks. It never writes files or makes network calls.
- Real question text, answer keys, pupil data, personal identifiers, privileged responses, generated outputs and screenshots belong **outside the Git repository** in an access-restricted local review folder. Do not upload them to Git, a public issue, or this chat. Do not include stored answer keys even in the private manifest; authorised staff verify correctness separately.

### Collecting a real pair (only when an authorised staff-only capture workflow exists)

1. Authenticate through the **existing, authorised staff UI**, not by extracting browser access tokens. Pick a Mathematics quiz-question pair with a verified ID/version and source fingerprint. Do not build or bypass an unpublished learner endpoint to obtain explanations. If NOVA cannot yet emit a specialist explanation from an authorised staff workflow, **record the absence** and do not fabricate a real capture.
2. Capture exactly what NOVA displays, along with the generating code/model version and UTC/offset timestamp, as one UTF-8 `.txt` or `.md` file. Do not rewrite the output after capture. Add source-linked metadata to the private manifest, **not** the full question or answer key.
3. Capture an explanation using a named, existing 4B method for the **same question ID, version and fingerprint**. Clearly mark it `captured_existing_method_output` if actually produced, or `staff_authored_reference` if a human wrote it. They are scientifically different comparison classes.
4. Where the explanation uses diagrams or special mathematical notation, save **actual** desktop and mobile render screenshots. For unrendered explanations, note that this gate is pending; text alone does not validate line/bar models, horizontal fraction bars or layout.
5. Copy `docs/phase4e2b8c2d7-private-manifest-TEMPLATE.json` to an **access-controlled location outside this repository**, fill all evidence details, and change `templateOnly` from `true` to `false` only after genuine capture. Record SHA-256 hashes with `Get-FileHash` in PowerShell. Do not use the demo placeholder values.
6. Run the offline CLI. An integrity success means **`CAPTURE_INTEGRITY_OK_REVIEW_PENDING`**; it is NOT a mathematics pass, teacher approval or release permission. If any file hash changes or metadata conflicts, the result is **`BLOCKED`**.
7. Make an A/B packet *without method labels* for each of two qualified educators, using opposite presentation orders (R1: specialist/incumbent; R2: incumbent/specialist). Reviewers independently rework the solution, inspect diagrams on actual devices, assess Primary-level vocabulary and misconceptions, and document hard stops. A wrong answer, unsupported assumption or misleading diagram overrides an attractive explanation.
8. Use the CSV review template in a private folder; it remains `PENDING` by default. No CSV score authorises approval. Comparison decisions are provisional and may recommend a specialist as primary, supporting, or unwarranted for that particular question only. Cross-case decisions need independent adjudication.
9. **Before beta/release approval:** complete the deferred ordinary-user/staff live authentication checks, database audit write-path tests under controlled authorisation, current-question freshness tests, real NOVA-output review, independent educator calibration and an explicit approval/release process. Nothing in 2D.7 bypasses those gates.

### Local commands (PowerShell)

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
node --test tests/phase4e2b8c2d7-real-output-evaluation.test.cjs
node scripts/phase4e2b8c2d7-real-output-evaluation.cjs --check-template
npx tsc --noEmit

# Only AFTER an authorised staff capture, placed outside Git:
# Get-FileHash "C:\PRIVATE_REVIEW\specialist.txt" -Algorithm SHA256
# node scripts/phase4e2b8c2d7-real-output-evaluation.cjs --manifest "C:\PRIVATE_REVIEW\review.json"
```

An integrity-validated capture returns `CAPTURE_INTEGRITY_OK_REVIEW_PENDING`; all human and live checks remain pending. A blocked capture returns a non-zero exit status. Neither permits new production selection or learner release.

### Current outcome

**Framework readiness:** Source/tests locally verified, full repository checks pending installation. **Actual NOVA examples reviewed: 0.** **Real independent teaching-quality judgments: 0.** **Specialist methods approved: 0.** **Production change: 0.**
