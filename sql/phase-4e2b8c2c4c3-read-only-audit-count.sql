-- DREAMSCAPE ONE — 8C-2C.4C-3, READ-ONLY.
-- Run before and after session checks: this phase should insert no events.
SELECT COUNT(*)::bigint AS audit_events_count
FROM public.math_specialist_structure_review_events;
