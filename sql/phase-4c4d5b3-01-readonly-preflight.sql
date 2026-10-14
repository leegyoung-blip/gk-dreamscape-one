-- Phase 4C-4D-5B-3. READ ONLY. Runs no DDL and accesses no student records.
-- Function execution must remain restricted; matches alone do not establish security.
select
  p.oid::regprocedure::text as routine,
  pg_get_userbyid(p.proowner) as owner,
  p.prosecdef as security_definer,
  p.proconfig::text as routine_settings,
  has_function_privilege('anon',p.oid,'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_can_execute,
  has_function_privilege('service_role',p.oid,'EXECUTE') as service_role_can_execute,
  (select coalesce(bool_or(x.grantee = 0 and x.privilege_type = 'EXECUTE'), false)
   from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) x) as public_execute_granted,
  case p.proname
    when 'get_math_quiz_payload_unlocked' then
      strpos(replace(pg_get_functiondef(p.oid), E'\r\n', E'\n'), E'and answer.is_correct is not null
              then question.explanation') > 0
    when 'save_math_quiz_answer_unlocked' then
      strpos(pg_get_functiondef(p.oid), $needle$'pending_manual_review', v_existing.is_correct is null$needle$) > 0
      and strpos(pg_get_functiondef(p.oid), 'when v_is_manual then null') > 0
  end as candidate_patch_detected
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (p.oid = to_regprocedure('public.get_math_quiz_payload_unlocked(uuid)')
       or p.oid = to_regprocedure('public.save_math_quiz_answer_unlocked(uuid,uuid,jsonb,integer)'))
order by p.proname;
