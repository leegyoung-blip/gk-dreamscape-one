/**
 * DREAMSCAPE ONE — 4E-2B-1: staff-only, read-only method selection preview.
 *
 * No route or browser caller in this phase. The authenticated staff resolver
 * obtains the answer key under RLS; ALL answer-bearing objects stay on the server.
 * This function returns only bounded method metadata and status codes.
 *
 * "selected" means 4C suggested a method, NOT teacher approval or Gold release.
 * Student release, B4 approvals, grading, rewards, and stored teaching are untouched.
 */
import 'server-only';

import { normalizeCanonicalTeachingQuestion } from '../../../math-intelligence/teaching/canonical/normalizeCanonicalTeachingQuestion';
import { understandTeachingQuestion } from '../../../math-intelligence/teaching/understanding/understandTeachingQuestion';
import { buildTeachingContract } from '../../../math-intelligence/teaching/contract/buildTeachingContract';
import {
  createPhase4BMethodLibraryContractView,
  createPhase4CStrategySelectorContractView,
} from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { selectFromPhase4A4B } from '../strategy-selection/phase4C4Adapter';
import { resolveStaffMathTeachingSource } from './phase4E2A3StaffSourceResolver.server';

type Stage = 'access' | 'canonical' | 'understanding' | 'contract' | 'consumer' | 'selector';

// Only score/ranking metadata produced by the deterministic 4C selector.
// Do not return raw candidate evidence, answer checks, contract values,
// source question text, grader details or pedagogical explanations.
export type StaffMethodCandidateScore = Readonly<{
  methodId: string;
  familyId: string;
  eligible: boolean;
  rank: number | null;
  score: number | null;
  exclusionCodes: readonly string[];
  dimensions: readonly Readonly<{ dimension: string; points: number; maximum: number }>[];
}>;
export type StaffMethodScoreComparison = Readonly<{
  candidates: readonly StaffMethodCandidateScore[];
  selectionIssueCodes: readonly string[];
  methodDifferentiation?: Readonly<{ status: 'evidence_found' | 'needs_review'; ruleCode: string; preferredMethodId: string | null; lessSuitableMethodId: string | null; }>;
  curriculumSkillAudit?: Readonly<{ status: 'undeclared' | 'no_exact_match' | 'partially_declared' | 'exact_match_present'; ruleCode: string; auditedMethodCount: number; undeclaredMethodCount: number; exactMatchMethodCount: number }>;
}>;
type Metadata = Readonly<{
  phase: '4E-2B-1';
  previewOnly: true;
  studentReleased: false;
  teachingApproved: false;
}>;
export type StaffMathMethodPreview = Metadata & (
  | Readonly<{ status: 'blocked'; stage: Stage; reasonCodes: string[] }>
  | Readonly<{ status: 'ambiguous'; stage: 'selector'; reasonCodes: string[]; candidateMethodCount: number; primaryFamilies: string[]; scoreComparison: StaffMethodScoreComparison }>
  | Readonly<{
      status: 'selected';
      stage: 'selector';
      methodId: string;
      familyId: string;
      confidence: 'low' | 'medium' | 'high' | 'none';
      candidateMethodCount: number;
    }>
);

const marker: Metadata = Object.freeze({
  phase: '4E-2B-1', previewOnly: true, studentReleased: false, teachingApproved: false,
});
const denied = (stage: Stage, codes: string[]): StaffMathMethodPreview => ({
  ...marker, status: 'blocked', stage, reasonCodes: [...new Set(codes)].slice(0, 16),
});

// These identifiers are defined by the server-side 4A readiness gate.
// Return ONLY the static code identifiers — never diagnostic messages,
// question data, source evidence, answer validation details or student data.
const safeUnderstandingGateCodes = new Set<string>([
  'GATE_CANONICAL_NOT_READY',
  'GATE_DOMAIN_UNRESOLVED',
  'GATE_DOMAIN_GENERIC_FALLBACK',
  'GATE_DOMAIN_LOW_CONFIDENCE',
  'GATE_STRUCTURE_UNRESOLVED',
  'GATE_STRUCTURE_GENERIC_FALLBACK',
  'GATE_STRUCTURE_LOW_CONFIDENCE',
  'GATE_TARGET_UNRESOLVED',
  'GATE_REASONING_UNRESOLVED',
  'GATE_REASONING_GENERIC_FALLBACK',
  'GATE_ANSWER_MISMATCH',
  'GATE_BLOCKING_CONFLICT',
  'GATE_BLOCKING_ISSUE',
  'GATE_OVERALL_LOW_CONFIDENCE',
]);

function understandingBlockerCodes(
  value: ReturnType<typeof understandTeachingQuestion>,
): string[] {
  const blockers = value.gateDiagnostics?.blockers;
  if (!Array.isArray(blockers)) return [];
  return [...new Set(blockers.flatMap((entry) =>
    typeof entry?.code === 'string' && safeUnderstandingGateCodes.has(entry.code)
      ? [entry.code]
      : [],
  ))].slice(0, 14);
}

// 4C scores and issue codes are staff-only metadata, not method approval.
// Constrain strings and number ranges at this outbound boundary. Never forward
// the selector's `detail`, `positiveEvidence`, `penalties` or `explanationCodes`.
const validId = (text: unknown): text is string =>
  typeof text === 'string' && /^[A-Za-z0-9_.:-]{1,120}$/.test(text);
const safeCode = (text: unknown): text is string =>
  typeof text === 'string' && /^[A-Z][A-Z0-9_]{1,80}$/.test(text);
const safeScore = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
    ? Math.round(value * 100) / 100 : null;
const allowedDimensions = new Set([
  'problem_structure', 'required_reasoning', 'curriculum_skill',
  'learner_level', 'math_domain', 'representation_fit', 'prerequisites',
]);

function publicScoreComparison(
  output: ReturnType<typeof selectFromPhase4A4B>,
): StaffMethodScoreComparison {
  const candidates: StaffMethodCandidateScore[] = [];
  const issueCodes: string[] = [];
  for (const familySelection of output.familySelections ?? []) {
    for (const issue of familySelection.issues ?? []) {
      if (safeCode(issue.code)) issueCodes.push(issue.code);
    }
    for (const candidate of familySelection.candidates ?? []) {
      if (candidates.length >= 12) break;
      if (!validId(candidate.methodId) || !validId(candidate.familyId)) continue;
      const eligible = candidate.eligible === true;
      candidates.push({
        methodId: candidate.methodId,
        familyId: candidate.familyId,
        eligible,
        rank: eligible && Number.isInteger(candidate.rank) &&
          candidate.rank! >= 1 && candidate.rank! <= 153 ? candidate.rank : null,
        score: eligible ? safeScore(candidate.score) : null,
        exclusionCodes: [...new Set((candidate.exclusions ?? [])
          .map((item) => item.code).filter(safeCode))].slice(0, 8),
        dimensions: eligible ? (candidate.dimensionScores ?? [])
          .filter((dim) => allowedDimensions.has(dim.dimension) &&
            typeof dim.points === 'number' && typeof dim.maximum === 'number' &&
            Number.isFinite(dim.points) && Number.isFinite(dim.maximum) &&
            dim.maximum >= 0 && dim.maximum <= 100 &&
            dim.points >= 0 && dim.points <= dim.maximum)
          .slice(0, 7)
          .map((dim) => ({
            dimension: dim.dimension, points: Math.round(dim.points * 100) / 100,
            maximum: Math.round(dim.maximum * 100) / 100,
          })) : [],
      });
    }
  }
  const finding = output.methodDifferentiation;
  // Only expose an allow-listed static rule code and method IDs already
  // verified as eligible by the same 4C selector. Never return prompt text.
  const eligibleMethodIds = new Set(candidates.filter(item => item.eligible).map(item => item.methodId));
  const methodDifferentiation = finding &&
    finding.status !== 'not_applicable' &&
    /^8C2B_[A-Z0-9_]{3,75}$/.test(finding.ruleCode) &&
    (finding.preferredMethodId === null ||
      (validId(finding.preferredMethodId) && eligibleMethodIds.has(finding.preferredMethodId))) &&
    (finding.lessSuitableMethodId === null ||
      (validId(finding.lessSuitableMethodId) && eligibleMethodIds.has(finding.lessSuitableMethodId))) &&
    (finding.status !== 'evidence_found' ||
      (finding.preferredMethodId !== null && finding.lessSuitableMethodId !== null))
      ? {status: finding.status, ruleCode: finding.ruleCode,
          preferredMethodId: finding.preferredMethodId,
          lessSuitableMethodId: finding.lessSuitableMethodId} : undefined;
  // Expose only fixed enumerations and bounded counts to authenticated staff.
  // No curriculum text, prompt, answer data or internal method evidence exits.
  const skill = output.curriculumSkillAudit;
  // Explicit discriminant checks are necessary here: Set.has() does not
  // narrow Phase8C2CSkillAudit['status'] to the staff-visible status union.
  // In particular, 'not_applicable' must never be returned to the staff UI.
  const curriculumSkillAudit = skill &&
    (skill.status === 'undeclared' ||
      skill.status === 'no_exact_match' ||
      skill.status === 'partially_declared' ||
      skill.status === 'exact_match_present') &&
    /^8C2C_[A-Z0-9_]{3,75}$/.test(skill.ruleCode) &&
    skill.auditedMethodCount === 2 &&
    Number.isInteger(skill.undeclaredMethodCount) &&
    skill.undeclaredMethodCount >= 0 && skill.undeclaredMethodCount <= 2 &&
    Number.isInteger(skill.exactMatchMethodCount) &&
    skill.exactMatchMethodCount >= 0 && skill.exactMatchMethodCount <= 2
      ? {status: skill.status, ruleCode: skill.ruleCode,
          auditedMethodCount: skill.auditedMethodCount,
          undeclaredMethodCount: skill.undeclaredMethodCount,
          exactMatchMethodCount: skill.exactMatchMethodCount} : undefined;
  return {
    candidates,
    selectionIssueCodes: [...new Set(issueCodes)].slice(0, 12),
    ...(methodDifferentiation ? {methodDifferentiation} : {}),
    ...(curriculumSkillAudit ? {curriculumSkillAudit} : {}),
  };
}

/**
 * Perform ONE read-only preview for an explicitly selected quiz/question pair.
 * Never include `source`, `canonical`, `understanding`, `contract`, or raw 4C
 * candidates in a response. All of them can contain answer-bearing material.
 *
 * May be called only from trusted staff server code. This is not a route.
 */
export async function previewStaffMathMethod(
  request: Request,
  query: Readonly<{ quizId: unknown; questionId: unknown }>,
): Promise<StaffMathMethodPreview> {
  // Authenticate/authorize FIRST. This resolver checks the JWT, staff role,
  // quiz/question linkage, P1-P6 level, and DB RLS on every invocation.
  const resolved = await resolveStaffMathTeachingSource(request, query);
  if (resolved.status !== 'ready') {
    return denied('access', [resolved.reason]);
  }

  try {
    const canonical = normalizeCanonicalTeachingQuestion(resolved.source);
    if (canonical.identity.quizId !== resolved.sourceIdentity.quizId ||
        canonical.identity.questionId !== resolved.sourceIdentity.questionId ||
        !canonical.diagnostics.readyForUnderstanding) {
      return denied('canonical', [
        ...canonical.diagnostics.issues
          .filter(issue => issue.severity === 'blocking').map(issue => issue.code),
        'CANONICAL_NOT_READY',
      ]);
    }

    const understanding = understandTeachingQuestion({ question: canonical });
    if (!understanding.readyForMethodSelection) {
      // Fail closed exactly as before, but expose the 4A gate's static,
      // allow-listed blocker codes to authenticated staff for diagnosis.
      // Never return blocker messages, paths, answers or other source details.
      return denied('understanding', [
        'UNDERSTANDING_NOT_READY',
        ...understandingBlockerCodes(understanding),
      ]);
    }

    const built = buildTeachingContract(understanding);
    if (built.status !== 'ready') {
      return denied('contract', ['TEACHING_CONTRACT_NOT_READY']);
    }

    const b = createPhase4BMethodLibraryContractView(built);
    const c = createPhase4CStrategySelectorContractView(built);
    if (b.status !== 'ready' || c.status !== 'ready') {
      return denied('consumer', ['CONSUMER_ENVELOPE_NOT_READY']);
    }

    // Intentionally NO inferred learner mastery, B2 reviewer evidence, or
    // arbitrary approval overrides. Missing proof must remain unknown.
    const selection = selectFromPhase4A4B({
      methodLibraryEnvelope: b.envelope,
      strategyEnvelope: c.envelope,
    });

    if (selection.status === 'blocked') {
      return denied('selector', selection.reasonCodes.length ? selection.reasonCodes : ['SELECTOR_BLOCKED']);
    }
    if (selection.status === 'ambiguous') {
      const scoreComparison = publicScoreComparison(selection);
      // Existing staff UI/CSV shows static reason codes; no panel change
      // needed to make the 8C-2B shadow diagnostic visible to reviewers.
      const rule = scoreComparison.methodDifferentiation?.ruleCode;
      const skillRule = scoreComparison.curriculumSkillAudit?.ruleCode;
      return {
        ...marker, status: 'ambiguous', stage: 'selector',
        reasonCodes: [...new Set([...selection.reasonCodes,
          ...(rule ? [`METHOD_${rule}`] : []),
          ...(skillRule ? [`SKILL_${skillRule}`] : [])])].slice(0, 16),
        candidateMethodCount: selection.candidateMethodCount,
        primaryFamilies: selection.primaryFamilies.slice(0, 16),
        scoreComparison,
      };
    }
    const methodId = selection.selection?.primaryMethodId;
    const familyId = selection.selection?.primaryFamilyId;
    if (!methodId || !familyId) return denied('selector', ['SELECTED_METHOD_ID_MISSING']);
    return {
      ...marker, status: 'selected', stage: 'selector',
      methodId, familyId,
      confidence: selection.selection!.confidence,
      candidateMethodCount: selection.candidateMethodCount,
    };
  } catch {
    // Do not echo DB contents, answer keys, errors, or stack traces.
    return denied('selector', ['INTERNAL_PREVIEW_UNAVAILABLE']);
  }
}
