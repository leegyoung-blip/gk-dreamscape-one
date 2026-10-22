/**
 * DREAMSCAPE ONE — 8C-2D.8B-4. Internal server-only readiness adapter.
 * Hard disabled: never passes source data to Luna or another AI provider.
 * No public API route, writes, model requests or student release.
 *
 * The trusted 8B-2 bridge returns a metadata-only outcome, not question text;
 * this adapter must NOT reconstruct question prose from browser inputs.
 */
import 'server-only';
import { inspectTrustedGeneratorMapping } from './phase4E2B8C2D8B2TrustedGeneratorBridge.server';

export type GenerationAdapterReview = Readonly<{
  status: 'blocked' | 'trusted_mapping_ready_provider_disabled';
  reasonCode: 'STAFF_OR_SOURCE_NOT_READY' | 'NO_SPECIALIST_CANDIDATE' | 'GENERATION_DISABLED';
  eligibleDraftCount: number;
  providerInvocationAllowed: false;
  sourceTextReturned: false;
  captureStored: false;
  humanApproved: false;
  learnerReleaseAllowed: false;
}>;
const report = (
  status: GenerationAdapterReview['status'],
  reasonCode: GenerationAdapterReview['reasonCode'],
  eligibleDraftCount = 0,
): GenerationAdapterReview => Object.freeze({
  status, reasonCode, eligibleDraftCount,
  providerInvocationAllowed: false as const,
  sourceTextReturned: false as const,
  captureStored: false as const,
  humanApproved: false as const,
  learnerReleaseAllowed: false as const,
});

/** Caller may supply quizId and questionId only; bridge enforces that shape. */
export async function inspectDisabledStaffGenerationPath(
  request: Request, query: unknown,
): Promise<GenerationAdapterReview> {
  try {
    const bridge = await inspectTrustedGeneratorMapping(request, query);
    if (bridge.status !== 'mapping_validated_capture_disabled' ||
        bridge.canInvokeProvider !== false || bridge.studentReleased !== false)
      return report('blocked', 'STAFF_OR_SOURCE_NOT_READY');
    if (!bridge.specialistMethodIds.length)
      return report('blocked', 'NO_SPECIALIST_CANDIDATE');
    // Intentional stop: the bridge does NOT export authoritative question text,
    // and there is no approved external-model request contract yet.
    return report('trusted_mapping_ready_provider_disabled',
      'GENERATION_DISABLED', bridge.specialistMethodIds.length);
  } catch {
    return report('blocked', 'STAFF_OR_SOURCE_NOT_READY');
  }
}
