-- =============================================================================
-- NOVA+ Phase 2B-3B1: schoolwork storage-metadata hardening
--
--   *** DRAFT / NOT APPROVED. DO NOT RUN ON PRODUCTION. ***
--
-- Status: proposal for independent review only. It has not been executed
-- anywhere. Live Supabase is production (no staging).
--
-- Why: the INSERT policy on public.nova_schoolwork_uploads only checks
--   (uploaded_by_user_id = auth.uid()) AND nova_plus_can_view_student(student_user_id, auth.uid())
-- (confirmed from the read-only metadata export). storage_bucket,
-- storage_path, id and status are unconstrained, so a browser can insert a
-- row whose storage metadata points at another learner's object or another
-- bucket. The Phase 2B-3B1 route guards (lib/nova-plus/schoolwork-guards.ts)
-- now refuse such rows before any service-role signing or removal; this
-- draft would add the same rule at the database boundary (defence in depth).
--
-- Section A is READ-ONLY and may be run first (with approval) to size the
-- impact. Sections B and C are commented proposals.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- A. READ-ONLY PREFLIGHT (no writes; returns counts only, no paths or names)
-- -----------------------------------------------------------------------------

-- A1. Existing rows whose storage metadata is not the canonical key
--     nova-schoolwork / <student_user_id>/<id>/<sanitised basename>.
select
  count(*)                                                     as uploads_total,
  count(*) filter (where storage_bucket <> 'nova-schoolwork')  as non_canonical_bucket,
  count(*) filter (
    where storage_path !~ (
      '^' || student_user_id::text || '/' || id::text || '/[A-Za-z0-9_.-]+$'
    )
    or storage_path ~ '/\.\.?$'
    or length(storage_path) > 1024
  )                                                            as non_canonical_path,
  count(*) filter (where status not in ('uploaded','analysing','needs_input','review_ready','failed','approved','archived'))
                                                               as unexpected_status
from public.nova_schoolwork_uploads;

-- A2. Duplicate files per learner (same SHA-256), excluding archived rows.
--     Informs the product decision in section C; no uniqueness exists today.
select
  count(*)            as duplicate_groups,
  coalesce(sum(n), 0) as rows_in_duplicate_groups
from (
  select student_user_id, file_sha256, count(*) as n
  from public.nova_schoolwork_uploads
  where file_sha256 is not null
    and status <> 'archived'
  group by student_user_id, file_sha256
  having count(*) > 1
) d;

-- A3. Included evidence on uploads that are not approved/archived (should be 0).
select count(*) as included_items_on_unapproved_uploads
from public.nova_schoolwork_items item
join public.nova_schoolwork_uploads upload on upload.id = item.upload_id
where item.included_in_profile
  and upload.status not in ('approved','archived');


-- -----------------------------------------------------------------------------
-- B. PROPOSED (commented) - tighten the browser INSERT policy
--    Requires A1 non_canonical_* = 0 (or a reviewed remediation first).
--    Rollback: re-create the original policy text shown above.
-- -----------------------------------------------------------------------------

-- begin;
--
-- drop policy "NOVA schoolwork uploads can be created by learner viewers"
--   on public.nova_schoolwork_uploads;
--
-- create policy "NOVA schoolwork uploads can be created by learner viewers"
--   on public.nova_schoolwork_uploads
--   for insert
--   to authenticated
--   with check (
--     uploaded_by_user_id = auth.uid()
--     and nova_plus_can_view_student(student_user_id, auth.uid())
--     -- Browser rows always start un-analysed.
--     and status = 'uploaded'
--     -- Canonical private object key for exactly this learner and upload.
--     and storage_bucket = 'nova-schoolwork'
--     and storage_path ~ (
--       '^' || student_user_id::text || '/' || id::text || '/[A-Za-z0-9_.-]+$'
--     )
--     and storage_path !~ '/\.\.?$'   -- bare "." / ".." only; "a..b.pdf" is legitimate
--     and length(storage_path) <= 1024
--   );
--
-- -- Optional, after A1 = 0: the same rule as a table constraint so no
-- -- service-role writer can store a non-canonical key either. NOT VALID first,
-- -- then VALIDATE in a separate reviewed step.
-- alter table public.nova_schoolwork_uploads
--   add constraint nova_schoolwork_uploads_canonical_object
--   check (
--     storage_bucket = 'nova-schoolwork'
--     and storage_path ~ ('^' || student_user_id::text || '/' || id::text || '/[A-Za-z0-9_.-]+$')
--     and storage_path !~ '/\.\.?$'
--     and length(storage_path) <= 1024
--   ) not valid;
--
-- commit;


-- -----------------------------------------------------------------------------
-- C. PROPOSED (commented) - duplicate evidence, PENDING PRODUCT DECISION
--    The uploader deliberately offers "Upload anyway" for a repeated file, so
--    a hard unique index would remove that option. Only adopt if the product
--    decides repeated files must never become separate evidence.
-- -----------------------------------------------------------------------------

-- create unique index concurrently nova_schoolwork_uploads_one_active_file
--   on public.nova_schoolwork_uploads (student_user_id, file_sha256)
--   where file_sha256 is not null and status <> 'archived';


-- -----------------------------------------------------------------------------
-- D. NOT A MIGRATION - commit RPC contract (reviewed locally from the private
--    definition, md5 b58dfe24d90eb41d2046a41d25b866ce; body NOT stored here)
--    1. auth.uid() required; nova_plus_can_view_student(learner, auth.uid()). VERIFIED
--    2. Upload row locked FOR UPDATE; only review_ready / approved accepted;
--       re-commit deletes and rebuilds this upload's profile events, so a
--       repeated or concurrent commit converges on one set of events.   VERIFIED
--    3. Decision count and distinct item_index count must both equal the
--       stored item count; unknown indexes raise.                        VERIFIED
--    4. skill_code must be approved, active, non-topic taxonomy for the
--       upload's subject / level (English listening / viewing excluded);
--       included items need correct / incorrect / partial.               VERIFIED
--    5. Committed weight follows the RPC's own policy, which differs from the
--       analyse route's proposed weight (see the Phase 2B-3B1 report).   OPEN
-- =============================================================================
