/** Phase 4D-4 — build the service with the ACTUAL 4A and 4C implementations.
 * This is a server-only application composition, NOT an API route.
 * Database/auth provider construction is intentionally left for 4D-5 after
 * inspecting the Supabase RPC function and RLS definitions.
 */
import 'server-only';
import type { TeachingContractBuildResult } from '../../../math-intelligence/teaching/contract/types';
import {
  createPhase4BMethodLibraryContractView,
  createPhase4CStrategySelectorContractView,
} from '../../../math-intelligence/teaching/contract/consumer/boundary';
import { selectFromPhase4A4B } from '../strategy-selection/phase4C4Adapter';

// Next.js supplies Node's require at runtime; keep the composition module-scoped.
declare const require: (id: string) => unknown;
const { createPhase4D4MethodService } = require('./phase4D4MethodService.server.cjs') as {
  createPhase4D4MethodService: (args: {
    resolveTrustedContext: (query: Readonly<{quizId:string;attemptId:string;questionId:string}>) => Promise<TrustedTeachingContext | null>;
    makeConsumerEnvelopes: (build:TeachingContractBuildResult) => unknown;
    selectFromPhase4A4B: typeof selectFromPhase4A4B;
  }) => {getPublicMethod(query:unknown):Promise<PublicMethodSummary>};
};

/** Every field MUST be read and checked against authenticated server-side
 * records at invocation time. This structure is not an API request body. */
export type TrustedTeachingContext = {
  principal: {userId:string;authenticated:true;learningAccessAllowed:boolean};
  attempt: {id:string;quizId:string;ownerUserId:string;status:string};
  quiz: {id:string;subject:string;published:boolean;feedbackMode:string};
  question: {id:string;quizId:string};
  grading: {attemptId:string;questionId:string;manualReviewPending:boolean;
    answerLocked:boolean;feedbackReleaseConfirmed:boolean};
  contractBuildResult:TeachingContractBuildResult;
};
export type PublicMethodSummary =
  | {status:'unavailable'|'ambiguous'}
  | {status:'selected'; methodId:string; familyId:string; confidence?:'low'|'medium'|'high'};

export function createTrustedMathMethodService(
  resolveTrustedContext: (query:Readonly<{quizId:string;attemptId:string;questionId:string}>) => Promise<TrustedTeachingContext|null>,
) {
  return createPhase4D4MethodService({
    resolveTrustedContext,
    makeConsumerEnvelopes(build) {
      const b = createPhase4BMethodLibraryContractView(build);
      const c = createPhase4CStrategySelectorContractView(build);
      if (b.status !== 'ready' || c.status !== 'ready') return null;
      return {methodLibraryEnvelope:b.envelope,strategyEnvelope:c.envelope};
    },
    selectFromPhase4A4B,
  });
}
