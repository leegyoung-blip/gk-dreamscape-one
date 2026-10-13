# Phase 4C-4C-B3 — Verification-to-approval protocol

## What this phase verifies

B3 builds a provenance-checked join of the same 480 previously inspected questions and F4 results. Its 24 curated cases cover all 11 P0 items. The independent answer calculations rely on enumerated prompt facts and are bound to the exact exported question via SHA-256. The original bank's explanation is **not used to derive** the independent expected result. However, a correct answer is not proof that a chosen teaching method is pedagogically right.

## Outstanding approval tasks

1. **Mathematical structure:** a maths curriculum reviewer should inspect original wording, verify which quantities are known versus unknown, and separately judge each 4B candidate. Some existing winners appear structurally unsuitable; no swap is automatic.
2. **Source images:** the nine curated external-image references require opening the actual Supabase images. Four of these cases cannot even confirm their reported answers without the picture. The other five can check textual arithmetic but not the actual diagram interpretation. Record the reviewed asset hash/path and visual observations separately.
3. **Curriculum:** mark mathematics as P-level core, appropriate enrichment, or requires reworking; do not infer curriculum compliance from the mathematical correctness of an inverse-work-rate or algebra method.
4. **Review authorization:** secure reviewer identity and approver authorization server-side; a CSV reviewer name, a signed-looking JSON document or `approvalRef` field alone is not proof of authorization. B3 never emits an `approvalStatus:"approved"` B2 record.
5. **Trial:** after properly authenticated curriculum review and media inspection, permit only per-question approved B2 records to influence scores (penalties only); preserve 75/8 thresholds and re-evaluate using a fresh unseen cohort.

## Reading and editing the review sheet

The `phase-4c4c-b3-teacher-review-template.csv` is a **copyable blank decision template**, not an authoritative approval source. Reviewers can work on a separate dated copy. Regenerating B3 overwrites its generated output, so do not store completed decisions at the generated path. Never ingest reviewer-filled CSV directly into production B2 evidence. Every decision must be checked by your trusted review service against the source question and method registry.

## QA integrity and known limits

- B3 does not modify any library method score or question bank data.
- Its 20 mathematical checks are fixed per-question evaluations; they are not a general-purpose automated mathematics solver.
- All 24 analyses are AI-assisted reviews. None is asserted to be independently authorized by a teacher or human verifier.
- Reported answer agreement was 20/20 for text-checkable cases; four image-only answers remain unresolved.
- All 480 examples have already been inspected; do not use either original cohort alone as proof of out-of-sample improvement.
