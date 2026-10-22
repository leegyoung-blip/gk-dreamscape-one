-- =============================================================================
-- NOVA+ Phase 2B-3B1C: PRIVATE read-only export of remaining dependencies
--
-- Read-only, but the OUTPUT contains raw function bodies. Run it yourself in
-- the Supabase SQL editor, keep the exported CSV outside any Git repository,
-- and hand it to the reviewer locally only. Never paste it publicly.
--
-- These definitions are still unreviewed and govern:
--   - whether a failed targeted refresh is ever retried
--     (refresh_nova_plus_learning_profile)
--   - what deletion recalculates (refresh_learner_skill_mastery and the two
--     optional pattern / insight refreshers)
--   - who may read, upload or delete schoolwork FILES through the browser
--     storage API (nova_schoolwork_storage_student_id)
--   - the viewer rule's inner checks (admin, Founding 50, NOVA+ ownership)
-- =============================================================================

select
  p.oid::regprocedure                   as signature,
  pg_get_userbyid(p.proowner)           as owner,
  p.prosecdef                           as security_definer,
  p.proconfig                           as config,
  md5(pg_get_functiondef(p.oid))        as definition_md5,
  pg_get_functiondef(p.oid)             as definition
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in (
    'refresh_nova_plus_learning_profile',
    'refresh_learner_skill_mastery',
    'refresh_learner_learning_patterns',
    'refresh_learner_profile_insights',
    'nova_schoolwork_storage_student_id',
    'learner_has_nova_plus',
    'f50_actor_can_view_selected_student',
    'learning_profile_is_admin'
  )
order by 1;
