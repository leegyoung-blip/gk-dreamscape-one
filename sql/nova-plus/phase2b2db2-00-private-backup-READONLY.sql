-- NOVA+ Phase 2B-2D-B2 — PRIVATE BACKUP (READ ONLY)
-- Run immediately before any approved migration. Export the result and store it
-- OUTSIDE the repository (it contains full privileged function bodies).
-- Never commit the output.
select
  p.oid::regprocedure::text as function_signature,
  pg_get_userbyid(p.proowner) as owner,
  md5(pg_get_functiondef(p.oid)) as definition_md5,
  pg_get_functiondef(p.oid) as definition,
  p.proacl::text as acl
from pg_proc p
where p.oid in (
  to_regprocedure('public.start_nova_learning_cycle(uuid, uuid)'),
  to_regprocedure('public.get_nova_plus_recommendations(uuid)'),
  to_regprocedure('public.get_nova_learning_cycles(uuid)')
)
order by 1;
