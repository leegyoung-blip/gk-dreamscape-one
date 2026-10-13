# DREAMSCAPE ONE — Repository Access Gate Scan

Scanned **1020** code files; found **153** candidate markers.

**This is a static discovery audit, not an access-permission proof.** A beta check elsewhere in a file may not protect a particular backend action; RLS can also block an operation that a UI permits.

## Candidate counts
- BETA_ENTITLEMENT: 11
- NOVA_PLUS_ROLE_GATE: 13
- PREMIUM_API_OR_ROUTE: 3
- PRIMARY_ROLE_READ: 98
- STUDENT_ROLE_GATE: 28

## Files with access gates but no beta marker anywhere in the same file (18)
- `app/admin/dream-tokens/page.tsx`
- `app/api/admin/agents/execution-qa/route.ts`
- `app/api/gkp-student-activation/route.ts`
- `app/api/nova-plus/schoolwork/analyse/route.ts`
- `app/api/nova-plus/schoolwork/history/route.ts`
- `app/inventor/page.tsx`
- `app/learning-missions/think/gear/ThinkGearClient.tsx`
- `app/learning-missions/think/page.tsx`
- `app/nova/membership-portal/page.tsx`
- `app/organisation/class-matching/page.tsx`
- `components/admin/RoleManagementPanel.tsx`
- `components/admin/StudentAccessPanel.tsx`
- `components/nova-plus/tabs/MasteryMapTab.tsx`
- `hooks/useNovaTeachingEvidence.ts`
- `lib/agents/execution/syntheticPerformance.ts`
- `lib/nova-plus/helpers.ts`
- `lib/roles.ts`
- `lib/science/helpers.ts`

## Important required source files
- `components/admin/StudentAccessPanel.tsx` and any RPCs it invokes
- `components/admin/NovaPlusAccessAdminPanel.tsx` (shows how permanent roles work)
- `middleware.ts` / `proxy.ts` and premium page layouts or server components
- All Student-only lesson, mission and teaching routes/API handlers
- NOVA+ analytics, recommendations, reports, schoolwork upload and other premium APIs

## How to interpret
- `REVIEW_BETA_NOT_NEARBY`: likely uses an existing role/access gate without an obvious Founding 50 alternative nearby; inspect the actual condition and imported helpers.
- `REVIEW_BETA_NEARBY_CHECK_AUTHORIZATION`: same code vicinity includes Founding 50, but its correct use is not proven.
- `INSPECT_FOR_ROLE_ENFORCEMENT`: a base-role read could be for UI display rather than authorization.
- `BETA_REFERENCE_PRESENT`: marker found, not necessarily a secured/working entitlement.

Report: `access-gate-inventory.csv`. Do not treat an empty result as proof of full parity.
