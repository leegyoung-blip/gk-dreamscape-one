# DREAMSCAPE ONE — Phase 4C-4D-1 Integration Discovery

**Static inventory, not security certification.** No production code was modified.

- API route files identified: **93**
- Selector/gateway references outside their definitions: **0**
- Gateway references outside its definition: **0**
- Files referencing raw reviewed evidence: **0**
- Attention flags for manual review: **0**

Neither live wiring nor authentication has been verified by this scan.

## Next files to share for route audit

- `app/api/admin/dream-tokens/users/route.ts` — authorization helper
- `app/api/admin/schoolwork-ai/settings/route.ts` — authorization helper
- `app/api/nova-plus/schoolwork/health/route.ts` — authorization helper
- `app/api/curriculum-developer/math-intelligence/batch/route.ts` — potential server entry point
- `app/api/curriculum-developer/math-intelligence/generate/route.ts` — potential server entry point
- `app/api/admin/dream-tokens/credit/route.ts` — authorization helper
- `app/api/billing/hitpay/admin/payment-requests/route.ts` — authorization helper
- `app/api/nova-plus/schoolwork/analyse/route.ts` — authorization helper
- `app/api/nova-plus/schoolwork/commit/route.ts` — authorization helper
- `app/api/nova-plus/schoolwork/config/route.ts` — authorization helper
- `app/api/nova-plus/schoolwork/history/route.ts` — authorization helper
- `app/api/admin/agents/brain-preview/route.ts` — potential server entry point

## Attention flags

None detected by these heuristics; this does not prove any route safe.

## Safety

Do **not** send `.env` files, tokens, service-role keys, passwords, or private signing keys. Share only the generated JSON/Markdown report plus identified source files. Keep B4 `mode: disabled`.
