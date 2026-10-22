-- =============================================================================
-- NOVA+ Phase 2B-3B1C: database guards for commit_nova_schoolwork_review
--
--   *** DRAFT / NOT APPROVED. DO NOT RUN ON PRODUCTION. ***
--
-- The commit RPC is SECURITY DEFINER and executable by `authenticated`, so a
-- direct RPC call bypasses the API route. These two triggers enforce the
-- route's rules inside the RPC's own transaction WITHOUT replacing the RPC
-- (its private body is not reproduced here or anywhere in Git). A raised
-- exception rolls back the whole commit, including its profile events.
--
-- 1. Approval guard (nova_schoolwork_uploads): EVERY transition to
--    'approved' is checked (no exemptions).
--    a) From review_ready / approved (commit RPC): the latest analysis run
--       must have succeeded and recorded exactly the stored items.
--    b) From archived (restore via set_nova_schoolwork_archived): the
--       upload must carry a genuine saved review - reviewed_at set, every
--       item decided by a commit (approved_at set), at least one item
--       included - and the same latest-run rule must hold.
--    c) From any other status: refused.
--    Tracked runs that succeeded without a question_count are refused (every
--    route version records the count with success). Uploads with no run rows
--    (analysed before run tracking) skip only the run rule.
--
-- 2. Edit guard (nova_schoolwork_items): the commit RPC raises an item's
--    stored confidence to 1.0 when the caller flags correctness_edited /
--    mapping_edited, which also raises the committed evidence weight. The
--    guard refuses a first-time raise to 1.0 unless the reviewer actually
--    changed the stored correctness (or the primary concept away from the
--    AI's original). The API route derives these flags server-side, so only
--    a forged direct call can trip it.
--
-- Verify: phase2b3b1c-03-verify-READONLY.sql (sections A, C, D first).
-- Roll back: phase2b3b1c-04-rollback-DRAFT.sql.
-- =============================================================================

begin;

-- ---------------------------------------------------------------- 1. approval
create or replace function public.nova_schoolwork_guard_approval()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_run_status text;
  v_run_questions integer;
  v_items integer;
  v_undecided integer;
  v_included integer;
begin
  if old.status = 'archived' then
    -- Restore: only an upload that was genuinely reviewed and approved.
    select
      count(*),
      count(*) filter (where item.approved_at is null),
      count(*) filter (where item.included_in_profile and item.approved_at is not null)
    into v_items, v_undecided, v_included
    from public.nova_schoolwork_items item
    where item.upload_id = new.id;

    if old.reviewed_at is null or v_items = 0 or v_undecided > 0 or v_included = 0 then
      raise exception 'SCHOOLWORK_ANALYSIS_NOT_COMMITTABLE: archived upload has no saved review';
    end if;
  elsif old.status not in ('review_ready', 'approved') then
    raise exception 'SCHOOLWORK_ANALYSIS_NOT_COMMITTABLE: status %', old.status;
  end if;

  select run.status, run.question_count
  into v_run_status, v_run_questions
  from public.nova_schoolwork_analysis_runs run
  where run.upload_id = new.id
  order by run.run_number desc
  limit 1;

  if found then
    if v_run_status is distinct from 'succeeded' then
      raise exception 'SCHOOLWORK_ANALYSIS_NOT_COMMITTABLE: latest analysis did not succeed';
    end if;

    if v_run_questions is null then
      raise exception 'SCHOOLWORK_ANALYSIS_NOT_COMMITTABLE: latest analysis has no recorded question count';
    end if;

    select count(*)
    into v_items
    from public.nova_schoolwork_items item
    where item.upload_id = new.id;

    if v_run_questions <> v_items then
      raise exception 'SCHOOLWORK_ANALYSIS_NOT_COMMITTABLE: items do not match the latest analysis';
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists nova_schoolwork_guard_approval on public.nova_schoolwork_uploads;

create trigger nova_schoolwork_guard_approval
  before update of status on public.nova_schoolwork_uploads
  for each row
  when (new.status = 'approved')
  execute function public.nova_schoolwork_guard_approval();

-- -------------------------------------------------------------------- 2. edits
create or replace function public.nova_schoolwork_guard_review_edits()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $function$
declare
  v_primary_code text;
begin
  -- Correctness: a first-time raise to 1.0 requires a real change.
  if new.correctness_confidence = 1
     and coalesce(old.correctness_confidence, 0) < 1
     and new.final_correctness is not distinct from old.final_correctness then
    raise exception 'SCHOOLWORK_EDIT_FLAG_WITHOUT_CHANGE: correctness, item %', new.item_index;
  end if;

  -- Mapping: a first-time raise to 1.0 requires a primary concept other than
  -- the AI's original. The RPC writes the approved primary mapping before it
  -- updates the item, so it is visible here.
  if new.mapping_confidence = 1
     and coalesce(old.mapping_confidence, 0) < 1 then
    select taxonomy.skill_code
    into v_primary_code
    from public.nova_schoolwork_item_skills mapping
    join public.learning_skill_taxonomy taxonomy
      on taxonomy.id = mapping.skill_id
    where mapping.item_id = new.id
      and mapping.is_primary_skill
      and mapping.approved
    limit 1;

    if v_primary_code is not distinct from (new.raw_item ->> 'primary_skill_code') then
      raise exception 'SCHOOLWORK_EDIT_FLAG_WITHOUT_CHANGE: concept, item %', new.item_index;
    end if;
  end if;

  return new;
end;
$function$;

drop trigger if exists nova_schoolwork_guard_review_edits on public.nova_schoolwork_items;

create trigger nova_schoolwork_guard_review_edits
  before update on public.nova_schoolwork_items
  for each row
  when (
    new.included_in_profile
    and (
      new.correctness_confidence is distinct from old.correctness_confidence
      or new.mapping_confidence is distinct from old.mapping_confidence
    )
  )
  execute function public.nova_schoolwork_guard_review_edits();

-- Trigger functions are not callable directly; keep them off the API anyway.
revoke all on function public.nova_schoolwork_guard_approval() from public, anon, authenticated;
revoke all on function public.nova_schoolwork_guard_review_edits() from public, anon, authenticated;

commit;
