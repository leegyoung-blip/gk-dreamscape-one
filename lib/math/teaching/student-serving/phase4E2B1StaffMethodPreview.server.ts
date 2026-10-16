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
type Metadata = Readonly<{
  phase: '4E-2B-1';
  previewOnly: true;
  studentReleased: false;
  teachingApproved: false;
}>;
export type StaffMathMethodPreview = Metadata & (
  | Readonly<{ status: 'blocked'; stage: Stage; reasonCodes: string[] }>
  | Readonly<{ status: 'ambiguous'; stage: 'selector'; reasonCodes: string[]; candidateMethodCount: number; primaryFamilies: string[] }>
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
      return {
        ...marker, status: 'ambiguous', stage: 'selector',
        reasonCodes: [...new Set(selection.reasonCodes)].slice(0, 16),
        candidateMethodCount: selection.candidateMethodCount,
        primaryFamilies: selection.primaryFamilies.slice(0, 16),
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
