/**
 * DREAMSCAPE ONE — Phase 4E-2B-8C-2C.1
 * Staff-only, read-only curriculum-skill declaration audit.
 *
 * This does NOT establish that a teaching method is mathematically correct.
 * It distinguishes missing 4B method skill declarations from a genuine
 * failure to match exact 4A curriculum keys. It never awards points,
 * changes 4C rankings, or trusts quiz/answer data as method evidence.
 */
import type { TeachingMethod } from '../../../math-intelligence/teaching/method-library/schema/types';

export const PHASE8C2C_SKILL_AUDIT_VERSION = '4E-2B-8C-2C.1' as const;
export type Phase8C2CSkillAudit = Readonly<{
  version: typeof PHASE8C2C_SKILL_AUDIT_VERSION;
  status: 'undeclared' | 'no_exact_match' | 'partially_declared' | 'exact_match_present' | 'not_applicable';
  ruleCode: string;
  auditedMethodCount: number;
  undeclaredMethodCount: number;
  exactMatchMethodCount: number;
}>;

type AuditInput = Readonly<{
  /** Must be the two ranked, eligible 4C method IDs, not all candidates. */
  topTwoMethodIds: readonly string[];
  /** Authored, registered 4B methods; never derive skills from their titles. */
  registeredMethods: readonly Pick<TeachingMethod, 'methodId' | 'applicability'>[];
  /** Exact trusted 4A curriculum metadata, never inferred from prompt wording. */
  curriculumKeys: readonly (string | null | undefined)[];
}>;

function report(status: Phase8C2CSkillAudit['status'], code: string,
  auditedMethodCount = 0, undeclaredMethodCount = 0, exactMatchMethodCount = 0,
): Phase8C2CSkillAudit {
  return {
    version: PHASE8C2C_SKILL_AUDIT_VERSION,
    status, ruleCode: code, auditedMethodCount,
    undeclaredMethodCount, exactMatchMethodCount,
  };
}

/** Never emits curriculum labels, raw prompt text, candidate evidence or answers. */
export function auditTopTwoCurriculumSkillDeclarations(input: AuditInput): Phase8C2CSkillAudit {
  if (!input || !Array.isArray(input.topTwoMethodIds) ||
      input.topTwoMethodIds.length !== 2 ||
      input.topTwoMethodIds[0] === input.topTwoMethodIds[1] ||
      !input.topTwoMethodIds.every(x => typeof x === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(x)) ||
      !Array.isArray(input.registeredMethods) || !Array.isArray(input.curriculumKeys)) {
    return report('not_applicable', '8C2C_INVALID_EVIDENCE_INPUT');
  }
  const byId = new Map<string, Pick<TeachingMethod, 'methodId' | 'applicability'>>();
  for (const method of input.registeredMethods) {
    if (!method || typeof method.methodId !== 'string' || byId.has(method.methodId)) {
      return report('not_applicable', '8C2C_METHOD_LIBRARY_NOT_UNIQUE');
    }
    byId.set(method.methodId, method);
  }
  const pair = input.topTwoMethodIds.map(id => byId.get(id));
  if (pair.some(m => !m || !Array.isArray(m.applicability?.curriculumSkills))) {
    return report('not_applicable', '8C2C_TOP_TWO_NOT_IN_LIBRARY');
  }
  const exactKeys = new Set(input.curriculumKeys.filter(
    (v): v is string => typeof v === 'string' && !!v.trim(),
  ));
  let undeclared = 0;
  let matched = 0;
  for (const method of pair) {
    const skills = method!.applicability.curriculumSkills;
    if (!skills.length) undeclared++;
    else if (skills.some(key => exactKeys.has(key))) matched++;
  }
  if (undeclared === 2) return report('undeclared', '8C2C_TOP_TWO_SKILLS_UNDECLARED', 2, 2, 0);
  if (undeclared === 1) return report('partially_declared', '8C2C_ONE_METHOD_SKILLS_UNDECLARED', 2, 1, matched);
  if (matched) return report('exact_match_present', '8C2C_AUTHORED_SKILL_MATCH_PRESENT', 2, 0, matched);
  return report('no_exact_match', '8C2C_AUTHORED_SKILLS_NO_EXACT_MATCH', 2, 0, 0);
}
