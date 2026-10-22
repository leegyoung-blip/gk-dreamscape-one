-- =============================================================================
-- NOVA+ Phase 2B-3B1C: atomic schoolwork analysis finalization
--
--   *** DRAFT / NOT APPROVED. DO NOT RUN ON PRODUCTION. ***
--
-- Purpose: replace the analyse route's REST sequence (claim check, item
-- delete, item + mapping inserts, run success, review_ready) with ONE
-- transaction, so a failed insert or a superseded worker can never leave a
-- partial or mixed item set (Phase 2B-3B1 review scenarios S2 / S3).
--
-- Called only by the analyse route with the service role, and only when the
-- deployment sets NOVA_SCHOOLWORK_ATOMIC_FINALIZE=on. Until then the route
-- uses single-statement bulk inserts plus claim-token-scoped writes.
--
-- Verify with phase2b3b1c-03-verify-READONLY.sql (sections A and B).
-- Roll back with phase2b3b1c-04-rollback-DRAFT.sql (disable the app flag first).
-- =============================================================================

begin;

create or replace function public.finalize_nova_schoolwork_analysis(
  p_upload_id uuid,
  p_claim_started_at timestamptz,
  p_run_id uuid,
  p_items jsonb,
  p_upload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_upload public.nova_schoolwork_uploads%rowtype;
  v_item jsonb;
  v_skill jsonb;
  v_item_id uuid;
  v_item_count integer := 0;
  v_revision integer;
  v_now timestamptz := now();
begin
  if p_upload_id is null or p_claim_started_at is null or p_run_id is null then
    raise exception 'FINALIZE_ARGUMENT_REQUIRED';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'FINALIZE_ITEMS_MUST_BE_ARRAY';
  end if;

  if p_upload is null or jsonb_typeof(p_upload) <> 'object' then
    raise exception 'FINALIZE_UPLOAD_FIELDS_REQUIRED';
  end if;

  -- Serialises against commit, archive, delete and any other finalizer.
  select *
  into v_upload
  from public.nova_schoolwork_uploads
  where id = p_upload_id
  for update;

  if v_upload.id is null then
    raise exception 'SCHOOLWORK_UPLOAD_NOT_FOUND';
  end if;

  -- Claim ownership: only the request whose claim token is current may write.
  if v_upload.status <> 'analysing'
     or v_upload.analysis_started_at is distinct from p_claim_started_at then
    raise exception 'ANALYSIS_CLAIM_LOST';
  end if;

  if exists (
    select 1
    from public.nova_schoolwork_items item
    where item.upload_id = p_upload_id
      and item.included_in_profile
  ) then
    raise exception 'UPLOAD_HAS_REVIEWED_EVIDENCE';
  end if;

  if not exists (
    select 1
    from public.nova_schoolwork_analysis_runs run
    where run.id = p_run_id
      and run.upload_id = p_upload_id
      and run.status = 'running'
  ) then
    raise exception 'ANALYSIS_RUN_NOT_RUNNING';
  end if;

  -- item_skills rows cascade with their items.
  delete from public.nova_schoolwork_items
  where upload_id = p_upload_id;

  for v_item in
    select value from jsonb_array_elements(p_items)
  loop
    insert into public.nova_schoolwork_items (
      upload_id,
      item_index,
      page_number,
      question_number,
      prompt,
      student_answer,
      expected_answer,
      teacher_mark,
      teacher_feedback,
      final_correctness,
      correctness_source,
      extraction_confidence,
      correctness_confidence,
      mapping_confidence,
      needs_review,
      evidence_recommendation,
      proposed_evidence_weight,
      reasoning_note,
      raw_item
    )
    values (
      p_upload_id,
      (v_item ->> 'item_index')::integer,
      nullif(v_item ->> 'page_number', '')::integer,
      nullif(v_item ->> 'question_number', ''),
      coalesce(v_item ->> 'prompt', ''),
      coalesce(v_item ->> 'student_answer', ''),
      coalesce(v_item ->> 'expected_answer', ''),
      v_item ->> 'teacher_mark',
      coalesce(v_item ->> 'teacher_feedback', ''),
      v_item ->> 'final_correctness',
      v_item ->> 'correctness_source',
      coalesce((v_item ->> 'extraction_confidence')::numeric, 0),
      coalesce((v_item ->> 'correctness_confidence')::numeric, 0),
      coalesce((v_item ->> 'mapping_confidence')::numeric, 0),
      coalesce((v_item ->> 'needs_review')::boolean, true),
      coalesce(v_item ->> 'evidence_recommendation', 'review'),
      coalesce((v_item ->> 'proposed_evidence_weight')::numeric, 0),
      coalesce(v_item ->> 'reasoning_note', ''),
      v_item -> 'raw_item'
    )
    returning id into v_item_id;

    for v_skill in
      select value from jsonb_array_elements(coalesce(v_item -> 'skills', '[]'::jsonb))
    loop
      insert into public.nova_schoolwork_item_skills (
        item_id,
        skill_id,
        is_primary_skill,
        mapping_confidence,
        proposed_evidence_weight,
        mapping_reason,
        approved
      )
      values (
        v_item_id,
        (v_skill ->> 'skill_id')::uuid,
        coalesce((v_skill ->> 'is_primary_skill')::boolean, false),
        coalesce((v_skill ->> 'mapping_confidence')::numeric, 0),
        coalesce((v_skill ->> 'proposed_evidence_weight')::numeric, 0),
        v_skill ->> 'mapping_reason',
        false
      );
    end loop;

    v_item_count := v_item_count + 1;
  end loop;

  update public.nova_schoolwork_analysis_runs
  set
    status = 'succeeded',
    stage = 'complete',
    question_count = v_item_count,
    completed_at = v_now,
    error_code = null,
    error_message = null
  where id = p_run_id;

  update public.nova_schoolwork_uploads
  set
    status = 'review_ready',
    analysis_revision = coalesce(analysis_revision, 0) + 1,
    detected_subject = p_upload ->> 'detected_subject',
    detected_primary_level = nullif(p_upload ->> 'detected_primary_level', '')::integer,
    assignment_title = nullif(p_upload ->> 'assignment_title', ''),
    analysis_confidence = coalesce((p_upload ->> 'analysis_confidence')::numeric, 0),
    analysis_completed_at = v_now,
    error_message = null
  where id = p_upload_id
  returning analysis_revision into v_revision;

  return jsonb_build_object(
    'status', 'review_ready',
    'upload_id', p_upload_id,
    'analysis_revision', v_revision,
    'items_written', v_item_count
  );
end;
$function$;

-- Service role only: never callable from the browser.
revoke all on function public.finalize_nova_schoolwork_analysis(uuid, timestamptz, uuid, jsonb, jsonb) from public;
revoke all on function public.finalize_nova_schoolwork_analysis(uuid, timestamptz, uuid, jsonb, jsonb) from anon, authenticated;
grant execute on function public.finalize_nova_schoolwork_analysis(uuid, timestamptz, uuid, jsonb, jsonb) to service_role;

commit;
