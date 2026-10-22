-- =============================================================================
-- NOVA+ Phase 2B-3B1C: ROLLBACK for 01 and 02
--
--   *** DRAFT / NOT APPROVED. DO NOT RUN ON PRODUCTION WITHOUT APPROVAL. ***
--
-- Order:
--   1. Set NOVA_SCHOOLWORK_ATOMIC_FINALIZE off (or unset) and redeploy, so
--      the analyse route stops calling the finalize function.
--   2. Run this script.
-- Dropping these objects removes no data: the guards only refuse writes and
-- the finalize function only writes rows the REST path would also write.
-- =============================================================================

begin;

drop trigger if exists nova_schoolwork_guard_review_edits on public.nova_schoolwork_items;
drop function if exists public.nova_schoolwork_guard_review_edits();

drop trigger if exists nova_schoolwork_guard_approval on public.nova_schoolwork_uploads;
drop function if exists public.nova_schoolwork_guard_approval();

drop function if exists public.finalize_nova_schoolwork_analysis(uuid, timestamptz, uuid, jsonb, jsonb);

commit;

-- Post-rollback check (read-only): expect zero rows.
select proname
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in (
    'finalize_nova_schoolwork_analysis',
    'nova_schoolwork_guard_approval',
    'nova_schoolwork_guard_review_edits'
  );
