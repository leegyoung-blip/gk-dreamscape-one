-- =============================================================================
-- NOVA+ Phase 2B-3B1C: READ-ONLY verification
--
-- No writes. Returns metadata, object NAMES and aggregate counts only (no
-- learner IDs, storage keys, filenames, document content or function
-- bodies). Run section A BEFORE applying 01 / 02, and sections B-D AFTER.
-- =============================================================================


-- A1. PRE-APPLY: column types and nullability the drafts and route assume.
select table_name, column_name, data_type, udt_name, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'nova_schoolwork_items' and column_name in (
      'item_index','page_number','question_number','prompt','student_answer',
      'expected_answer','teacher_mark','teacher_feedback','final_correctness',
      'correctness_source','extraction_confidence','correctness_confidence',
      'mapping_confidence','needs_review','evidence_recommendation',
      'proposed_evidence_weight','reasoning_note','raw_item','included_in_profile',
      'approved_at'))
    or (table_name = 'nova_schoolwork_item_skills' and column_name in (
      'item_id','skill_id','is_primary_skill','mapping_confidence',
      'proposed_evidence_weight','mapping_reason','approved'))
    or (table_name = 'nova_schoolwork_analysis_runs' and column_name in (
      'id','upload_id','run_number','status','stage','question_count',
      'completed_at','error_code','error_message'))
    or (table_name = 'nova_schoolwork_uploads' and column_name in (
      'status','analysis_started_at','analysis_revision','detected_subject',
      'detected_primary_level','assignment_title','analysis_confidence',
      'analysis_completed_at','error_message','reviewed_at'))
    -- The route's claim-time write sets these on the shared analyses row:
    -- completed_at / error_message must accept NULL; overall_summary must
    -- accept '' and the two code columns an empty array.
    or (table_name = 'nova_schoolwork_analyses' and column_name in (
      'upload_id','started_at','completed_at','error_message','overall_summary',
      'strength_skill_codes','support_skill_codes'))
  )
order by table_name, column_name;

-- A2. PRE-APPLY: uploads the approval guard would refuse, per current status,
--     under the exact rules in 02 (all transitions to 'approved'). Expected 0
--     for 'approved' (protects "Edit Analysis" on existing uploads) and for
--     'archived' rows that are approved-history restores.
with latest_run as (
  select distinct on (run.upload_id)
    run.upload_id, run.status, run.question_count
  from public.nova_schoolwork_analysis_runs run
  order by run.upload_id, run.run_number desc
),
item_stats as (
  select
    item.upload_id,
    count(*)::integer                                                     as items,
    count(*) filter (where item.approved_at is null)::integer             as undecided,
    count(*) filter (where item.included_in_profile
                       and item.approved_at is not null)::integer         as included
  from public.nova_schoolwork_items item
  group by item.upload_id
),
classified as (
  select
    upload.status,
    latest_run.upload_id is not null as tracked,
    (latest_run.upload_id is not null and (
       latest_run.status is distinct from 'succeeded'
       or latest_run.question_count is null
       or latest_run.question_count <> coalesce(item_stats.items, 0)
    ))                                                     as run_rule_fails,
    (upload.reviewed_at is null
       or coalesce(item_stats.items, 0) = 0
       or coalesce(item_stats.undecided, 0) > 0
       or coalesce(item_stats.included, 0) = 0)            as archive_history_fails,
    (latest_run.status = 'succeeded' and latest_run.question_count is null) as null_count
  from public.nova_schoolwork_uploads upload
  left join latest_run on latest_run.upload_id = upload.id
  left join item_stats on item_stats.upload_id = upload.id
  where upload.status in ('review_ready', 'approved', 'archived')
)
select
  status,
  count(*)                                                    as uploads,
  count(*) filter (where tracked)                             as with_runs,
  count(*) filter (where null_count)                          as succeeded_with_null_count,
  count(*) filter (where run_rule_fails)                      as run_rule_would_refuse,
  count(*) filter (where status = 'archived'
                     and (archive_history_fails or run_rule_fails)) as restore_to_approved_would_refuse,
  count(*) filter (where status = 'archived'
                     and not archive_history_fails)           as archived_with_approved_history
from classified
group by status
order by status;

-- A3. PRE-APPLY: tracked runs that succeeded without a question_count
--     (source review: no route version writes this; expected 0).
select
  count(*) filter (where status = 'succeeded')                          as succeeded_runs,
  count(*) filter (where status = 'succeeded' and question_count is null) as succeeded_null_count
from public.nova_schoolwork_analysis_runs;

-- A4. PRE-APPLY: who can move an upload to 'approved'.
--     A4a: table privileges and RLS for the API roles (no UPDATE policy is
--     expected, so authenticated/anon UPDATE affects no rows).
select
  c.relrowsecurity                                                       as rls_enabled,
  has_table_privilege('anon', c.oid, 'update')                           as anon_update_privilege,
  has_table_privilege('authenticated', c.oid, 'update')                  as authenticated_update_privilege,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = 'nova_schoolwork_uploads'
      and p.cmd in ('UPDATE', 'ALL'))                                    as update_or_all_policies
from pg_class c
where c.oid = 'public.nova_schoolwork_uploads'::regclass;

--     A4b: functions (NAMES only) whose source mentions both the uploads
--     table and 'approved'. Expected: the commit and archive RPCs (plus any
--     other writer that must then be reviewed before applying 02).
select
  p.oid::regprocedure                                       as function,
  p.prosecdef                                               as security_definer,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute,
  has_function_privilege('anon', p.oid, 'execute')          as anon_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.prosrc ilike '%nova_schoolwork_uploads%'
  and p.prosrc ilike '%approved%'
order by 1;

-- A5. PRE-APPLY: analyses currently claimed (and how many look abandoned).
select
  count(*)                                                                    as analysing,
  count(*) filter (where analysis_started_at < now() - interval '15 minutes') as stale_claims
from public.nova_schoolwork_uploads
where status = 'analysing';

-- A6. PRE-APPLY: object and trigger names must be free.
select 'function' as kind, proname as name
from pg_proc
where pronamespace = 'public'::regnamespace
  and proname in ('finalize_nova_schoolwork_analysis', 'nova_schoolwork_guard_approval', 'nova_schoolwork_guard_review_edits')
union all
select 'trigger', tgname
from pg_trigger
where not tgisinternal
  and tgrelid in ('public.nova_schoolwork_uploads'::regclass, 'public.nova_schoolwork_items'::regclass);
-- Expected: no functions; list any existing triggers on these tables so
-- their interaction with 02 can be reviewed.

-- A7. PRE-APPLY (R5, informational): reviewer-edit provenance of committed
--     evidence. Confidence 1.0 on an included item whose AI estimate in
--     raw_item is below 1.0 means the commit RPC treated a reviewer edit as
--     certainty; the weight split shows what those items contribute.
select
  count(*) filter (where item.included_in_profile)                                   as included_items,
  count(*) filter (where item.included_in_profile and item.correctness_confidence = 1
                     and coalesce((item.raw_item ->> 'correctness_confidence')::numeric, 0) < 1) as correctness_set_to_one,
  count(*) filter (where item.included_in_profile and item.mapping_confidence = 1
                     and coalesce((item.raw_item ->> 'mapping_confidence')::numeric, 0) < 1)     as mapping_set_to_one,
  round(avg(item.proposed_evidence_weight) filter (where item.included_in_profile and (
          item.correctness_confidence = 1 or item.mapping_confidence = 1)), 3)                 as avg_weight_edited,
  round(avg(item.proposed_evidence_weight) filter (where item.included_in_profile and
          coalesce(item.correctness_confidence, 0) < 1 and coalesce(item.mapping_confidence, 0) < 1), 3) as avg_weight_unedited
from public.nova_schoolwork_items item;


-- B. POST-APPLY 01: finalize function contract and grants.
select
  p.oid::regprocedure                                        as function,
  p.prosecdef                                                as security_definer,
  p.proconfig                                                as config,
  has_function_privilege('anon', p.oid, 'execute')           as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute')  as authenticated_execute,
  has_function_privilege('service_role', p.oid, 'execute')   as service_role_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname = 'finalize_nova_schoolwork_analysis';
-- Expected: security_definer true, search_path=public, pg_temp,
--           anon false, authenticated false, service_role true.


-- C. POST-APPLY 02: triggers present, enabled, and covering ALL approvals.
select
  tgrelid::regclass as table_name,
  tgname,
  tgenabled,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgname in ('nova_schoolwork_guard_approval', 'nova_schoolwork_guard_review_edits')
  and not tgisinternal;
-- Expected: two rows, tgenabled = 'O'; the approval trigger's WHEN clause is
-- exactly (new.status = 'approved') with no archived exemption.


-- D. POST-APPLY 02: guard functions are not executable from the API roles.
select
  p.proname,
  has_function_privilege('anon', p.oid, 'execute')          as anon_execute,
  has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('nova_schoolwork_guard_approval', 'nova_schoolwork_guard_review_edits');
-- Expected: false / false.
