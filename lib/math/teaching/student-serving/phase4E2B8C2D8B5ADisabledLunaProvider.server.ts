/**
 * DREAMSCAPE ONE — Phase 8C-2D.8B-5A.
 * NO-OP server-side seam for a FUTURE specialist explanation provider.
 * Deliberately separate from the production OpenAILunaProvider visual planner.
 * Cannot call fetch, accept provider credentials, write captures or approve methods.
 */
import 'server-only';
import {
  inspectOfflineSpecialistProviderRequest,
} from './phase4E2B8C2D8B5ASpecialistProviderContract';
import type {
  SpecialistExplanationAIProvider,
  SpecialistProviderRequest,
  ProviderShapeCheck,
} from './phase4E2B8C2D8B5ASpecialistProviderContract';

export class DisabledLunaSpecialistExplanationProvider implements SpecialistExplanationAIProvider {
  readonly providerName = 'luna-specialist-disabled';
  readonly capability = 'specialist_explanation' as const;

  /** Even a well-formed input never causes a network/model invocation. */
  async generateForStaffReview(request: SpecialistProviderRequest): Promise<ProviderShapeCheck> {
    return inspectOfflineSpecialistProviderRequest(request);
  }
}
