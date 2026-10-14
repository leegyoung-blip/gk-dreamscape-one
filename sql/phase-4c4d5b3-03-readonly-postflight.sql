-- Phase 4C-4D-5B-3 read-only postflight. Does not access learner records.
-- Run only AFTER an approved manual patch has completed, to check stored DDL.
with funcs as (
  select p.oid,p.proname,
         replace(pg_get_functiondef(p.oid),E'\r\n',E'\n') as def,
         p.prosecdef,p.proconfig,p.proacl,p.proowner
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.oid in (
      to_regprocedure('public.get_math_quiz_payload_unlocked(uuid)'),
      to_regprocedure('public.save_math_quiz_answer_unlocked(uuid,uuid,jsonb,integer)')
    )
)
select oid::regprocedure::text as routine,
       pg_get_userbyid(proowner) as owner,
       prosecdef as security_definer,
       has_function_privilege('anon',oid,'EXECUTE') as anon_can_execute,
       has_function_privilege('authenticated',oid,'EXECUTE') as authenticated_can_execute,
       has_function_privilege('service_role',oid,'EXECUTE') as service_role_can_execute,
       (select coalesce(bool_or(a.grantee=0 and a.privilege_type='EXECUTE'),false)
        from aclexplode(coalesce(proacl,acldefault('f',proowner))) a) as public_execute_granted,
       case proname
         when 'get_math_quiz_payload_unlocked' then
           strpos(def,E'and answer.is_correct is not null\n              then question.explanation') > 0
         when 'save_math_quiz_answer_unlocked' then
           strpos(def, $needle$'pending_manual_review', v_existing.is_correct is null$needle$) > 0
           and strpos(def, $needle$'is_correct', v_existing.is_correct$needle$) > 0
           and strpos(def,'when v_is_manual then null') > 0
           and strpos(def, 'v_existing.response_data,') = 0
       end as disclosure_guards_present
from funcs order by proname;
