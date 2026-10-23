# DREAMSCAPE ONE — Phase 4E-2B-8C-2D.8B-6A

## Controlled local *synthetic* specialist Luna generation pilot

**Status:** An **optional, explicitly authorised command-line model call is implemented**. The default behavior is a network-free dry run. This phase does not introduce an API route, student page, production model use, Supabase reads/writes, live staff authentication, source-freshness certificate, specialist-method activation or teaching approval.

### Why local + synthetic first

The 8B-2 trusted bridge currently returns only metadata, the 8B-5A Luna provider remains intentionally disabled, and authenticated live role and audit-write tests are deferred. An API route sending real production question material now would violate those boundaries. This local pilot tests the **actual provider transport and existing 8B-5B structural review** using only three hard-coded, multi-step, synthetic questions:

| Case ID | Level | Specialist draft method | Local reference answer (not sent to provider) |
|---|---|---|---|
| `equal_spacing` | P4 | Equal-spacing interval count | 104 metres |
| `comparison_chain` | P5 | Multiplicative comparison chain | 100 tokens |
| `changing_ratio` | P6 | Changing ratios | 45 marbles |

### Files added

- `scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs`
- `tests/phase4e2b8c2d8b6a-local-luna-pilot.test.cjs`
- `docs/PHASE_8C2D8B6A_LOCAL_SYNTHETIC_LUNA_PILOT.md`

No existing source files are overwritten. Script uses installed `typescript` (dev dependency) to compile **already existing** 8B-3, 8B-5A and 8B-5B pure review modules in memory, with no generated JS files or duplicated TS sources.

### Offline verification

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
node --test tests/phase4e2b8c2d8b6a-local-luna-pilot.test.cjs
node scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs --dry-run --case equal_spacing
npx tsc --noEmit
git --no-pager diff --check
```

The dry-run **never calls OpenAI** and **does not create files**. Tests use an injected mock response, not the internet. Tests verify provider body has `store:false`, no reference answer or real question metadata, fail-closed HTTP/JSON/refusal logic, output path outside the repository, and actual 8B-5B response validation.

### OPTIONAL genuine Luna call — one synthetic question only

Run only on your own trusted **local** machine after tests pass; this invokes the external OpenAI Responses API and may incur model usage charges. Never paste an API key into this chat or commit it to Git. The script has a 45-second timeout and performs at most one provider request per execution, without retries.

PowerShell:

```powershell
Set-Location "C:\Users\leegy\gk-design-world"
$env:DREAMSCAPE_ENABLE_SYNTHETIC_LUNA_PILOT = 'I_UNDERSTAND_SYNTHETIC_ONLY'
# OPENAI_API_KEY must be available in this PowerShell process; do not print it.
# Optional: $env:OPENAI_MATH_MODEL should name an actual model available to your account.
$private = Join-Path ([Environment]::GetFolderPath('Desktop')) 'DREAMSCAPE_PRIVATE_LUNA_PILOT'
node scripts/phase4e2b8c2d8b6a-local-luna-pilot.cjs --execute-local --case equal_spacing --output-dir $private
Remove-Item Env:\DREAMSCAPE_ENABLE_SYNTHETIC_LUNA_PILOT -ErrorAction SilentlyContinue
```

Run `--case comparison_chain` or `--case changing_ratio` separately if desired. If the model is not available or the key is not set, this fails closed. Existing `OpenAILunaProvider` defaults to `OPENAI_MATH_MODEL` / `gpt-6-luna`; the pilot follows that convention, but **this is not an API model-availability assertion**.

The output JSON is written **outside Git** with exclusive create and limited permissions where the operating system supports them. On Windows, protect the local folder using your user account's filesystem permissions; file mode alone is not a complete Windows access policy. The JSON includes the synthetic problem, raw response, SHA-256 and explicit flags indicating NO live source, NO staff verification, NO mathematical approval and NO learner release. No API key or credential is saved.

**Never copy the private JSON into Git.** You can upload a local synthetic pilot result here for analysis, but it must not be represented as a published-question capture or a Phase 8C-2D.7 `captured_nova_output` manifest.

### Safety and evidence limits

- A mocked transport test is not a successful real AI call. Until you actually invoke `--execute-local` with valid credentials, **real specialist explanation count remains zero**.
- The numeric comparison uses local reference answers for the three synthetic questions. It blocks an obviously wrong machine-readable final answer; it does NOT independently verify the natural-language explanation, diagrams, teaching quality, or proof of source provenance.
- The first response has no network retries; network/model errors give non-sensitive error codes.
- The code has **no API route, staff session, Supabase, logging of prompts or learner access**. The production visual Luna provider is untouched.
- Do not invoke this script on Vercel or on a server with a production service-role key.
- Further progression to **published-question** generation and Phase 8C-2D.7 capture is blocked by authoritative source-binding, data egress review, live staff-auth tests, and educator review.

### Next: Phase 8B-6B

Inspect real synthetic outputs and complete transport/provider behavior review. Then implement server-side published-question execution only after the production role and source-freshness gates are actually verified. Keep all three specialist draft methods inactive until the separate two-educator teaching-quality decisions and beta security gates.
