import "server-only";

import {
  buildMathAuthoringQuestionFingerprint,
  buildMathAuthoringSourceFingerprint,
} from "./MathAuthoringFingerprint";
import { buildMathAuthoringProposal } from "./MathAuthoringProposal";
import type { MathAuthoringProposal } from "./MathAuthoringProposalTypes";
import type {
  MathAuthoringBatchItem,
  MathAuthoringBatchRequestItem,
  MathAuthoringBatchSummary,
} from "./MathBatchGenerationTypes";
import { generateMathVisualAndTeachingForQuestion } from "./MathIntelligencePipeline";
import { normaliseMathIntelligenceQuestion } from "./MathQuestionNormalizer";

export const MATH_AUTHORING_BATCH_MAX_ITEMS = 40;
export const MATH_AUTHORING_BATCH_CONCURRENCY = 3;
export const MATH_AUTHORING_BATCH_MAX_QUESTION_BYTES = 256 * 1024;

function classifyGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("openai_api_key") || lower.includes("not configured")) {
    return {
      code: "LUNA_NOT_CONFIGURED",
      retryable: false,
      message:
        "This question requires Luna, but the server-side OpenAI API key is not configured for Math Intelligence.",
    };
  }

  if (
    lower.includes("openai") ||
    lower.includes("luna") ||
    lower.includes("http 429") ||
    lower.includes("rate limit")
  ) {
    return {
      code: "INTELLIGENCE_PROVIDER_FAILED",
      retryable: true,
      message:
        "Dreamscape could not complete the Luna step for this Math question.",
    };
  }

  return {
    code: "GENERATION_FAILED",
    retryable: false,
    message: "Math Intelligence could not build a proposal for this question.",
  };
}

function validClientId(value: unknown) {
  const text = String(value || "").trim();
  return text ? text.slice(0, 160) : "";
}

function serialisedBytes(value: unknown) {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

async function generateOne(
  item: MathAuthoringBatchRequestItem,
): Promise<MathAuthoringBatchItem> {
  const clientId = validClientId(item.client_id);

  if (!clientId || !item.question || typeof item.question !== "object") {
    return {
      client_id: clientId || "invalid-item",
      status: "failed",
      proposal: null,
      error: {
        code: "QUESTION_REQUIRED",
        message: "Each batch item needs a client_id and Math question object.",
        retryable: false,
      },
    };
  }

  if (serialisedBytes(item.question) > MATH_AUTHORING_BATCH_MAX_QUESTION_BYTES) {
    return {
      client_id: clientId,
      status: "failed",
      proposal: null,
      error: {
        code: "QUESTION_TOO_LARGE",
        message: "This Math question draft is too large for batch generation.",
        retryable: false,
      },
    };
  }

  const normalised = normaliseMathIntelligenceQuestion(item.question);
  if (!normalised.prompt) {
    return {
      client_id: clientId,
      status: "failed",
      proposal: null,
      error: {
        code: "QUESTION_REQUIRED",
        message: "The Math question prompt is empty.",
        retryable: false,
      },
    };
  }

  try {
    const result = await generateMathVisualAndTeachingForQuestion(item.question);
    const proposal = buildMathAuthoringProposal(result, {
      questionFingerprint: buildMathAuthoringQuestionFingerprint(item.question),
      sourceFingerprint: buildMathAuthoringSourceFingerprint(item.question),
    });

    return {
      client_id: clientId,
      status: proposal.status,
      proposal,
      error: null,
    };
  } catch (error) {
    const classified = classifyGenerationError(error);
    return {
      client_id: clientId,
      status: "failed",
      proposal: null,
      error: classified,
    };
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function runner() {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  const runners = Array.from(
    { length: Math.min(Math.max(1, concurrency), Math.max(1, items.length)) },
    () => runner(),
  );
  await Promise.all(runners);
  return results;
}

export function summariseMathAuthoringBatch(
  items: MathAuthoringBatchItem[],
): MathAuthoringBatchSummary {
  const summary: MathAuthoringBatchSummary = {
    total: items.length,
    generated: 0,
    not_needed: 0,
    preserved: 0,
    needs_review: 0,
    invalid: 0,
    failed: 0,
    visual_acceptable: 0,
    teaching_acceptable: 0,
    combined_acceptable: 0,
    interpretation_rules: 0,
    interpretation_luna: 0,
    teaching_rules: 0,
    teaching_luna: 0,
    teaching_none: 0,
    strategy_counts: {},
  };

  for (const item of items) {
    summary[item.status] += 1;
    const proposal: MathAuthoringProposal | null = item.proposal;
    if (!proposal) continue;

    if (proposal.can_accept.visual) summary.visual_acceptable += 1;
    if (proposal.can_accept.teaching) summary.teaching_acceptable += 1;
    if (proposal.can_accept.combined) summary.combined_acceptable += 1;

    if (proposal.sources.interpretation.source === "luna") {
      summary.interpretation_luna += 1;
    } else {
      summary.interpretation_rules += 1;
    }

    if (proposal.sources.teaching.source === "luna") {
      summary.teaching_luna += 1;
    } else if (proposal.sources.teaching.source === "rules") {
      summary.teaching_rules += 1;
    } else {
      summary.teaching_none += 1;
    }

    const strategy = proposal.decision.strategy;
    summary.strategy_counts[strategy] =
      (summary.strategy_counts[strategy] || 0) + 1;
  }

  return summary;
}

/**
 * Safe Phase 2H batch generator.
 *
 * It intentionally has no persistence side effects. Each question is isolated:
 * one failure does not abort the rest of the batch. Concurrency is bounded so a
 * batch cannot fan out uncontrolled Luna calls.
 */
export async function generateMathAuthoringBatch(
  items: MathAuthoringBatchRequestItem[],
) {
  if (items.length < 1) return [];
  if (items.length > MATH_AUTHORING_BATCH_MAX_ITEMS) {
    throw new Error(
      `Math Intelligence accepts at most ${MATH_AUTHORING_BATCH_MAX_ITEMS} questions per server batch.`,
    );
  }

  return mapWithConcurrency(
    items,
    MATH_AUTHORING_BATCH_CONCURRENCY,
    async (item) => generateOne(item),
  );
}
