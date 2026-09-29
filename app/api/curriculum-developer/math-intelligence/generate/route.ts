import { NextResponse } from "next/server";

import {
  CurriculumDeveloperApiAccessError,
  requireCurriculumDeveloperApiAccess,
} from "@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth";
import { buildMathAuthoringProposal } from "@/lib/math-intelligence/MathAuthoringProposal";
import type {
  MathAuthoringGenerateErrorCode,
  MathAuthoringGenerateErrorResponse,
  MathAuthoringGenerateRequest,
  MathAuthoringGenerateSuccessResponse,
} from "@/lib/math-intelligence/MathAuthoringProposalTypes";
import { generateMathVisualAndTeachingForQuestion } from "@/lib/math-intelligence/MathIntelligencePipeline";
import { normaliseMathIntelligenceQuestion } from "@/lib/math-intelligence/MathQuestionNormalizer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_REQUEST_BYTES = 384 * 1024;

function json<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function errorResponse(
  code: MathAuthoringGenerateErrorCode,
  message: string,
  status: number,
  retryable = false,
) {
  const body: MathAuthoringGenerateErrorResponse = {
    ok: false,
    error: { code, message, retryable },
  };
  return json(body, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function explicitSubject(question: unknown) {
  if (!isRecord(question)) return "";
  const content = isRecord(question.content) ? question.content : {};
  return String(question.subject || content.subject || "")
    .trim()
    .toLowerCase();
}

function isMathSubject(value: string) {
  return !value || value === "math" || value === "mathematics" || value === "maths";
}

function classifyGenerationError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("openai_api_key") || lower.includes("not configured")) {
    return {
      code: "LUNA_NOT_CONFIGURED" as const,
      status: 503,
      retryable: false,
      message:
        "This question requires Luna, but the server-side OpenAI API key is not available to the Math Intelligence endpoint.",
    };
  }

  if (lower.includes("openai") || lower.includes("luna") || lower.includes("http 429")) {
    return {
      code: "INTELLIGENCE_PROVIDER_FAILED" as const,
      status: 502,
      retryable: true,
      message:
        "Dreamscape could not complete the Luna step for this ambiguous Math question. The question has not been changed.",
    };
  }

  return {
    code: "GENERATION_FAILED" as const,
    status: 500,
    retryable: false,
    message:
      "Math Intelligence could not build an authoring proposal. The question has not been changed.",
  };
}

export async function POST(request: Request) {
  try {
    await requireCurriculumDeveloperApiAccess(request);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return errorResponse(
        "QUESTION_TOO_LARGE",
        "The Math question draft is too large to analyse in one authoring request.",
        413,
      );
    }

    let body: MathAuthoringGenerateRequest;
    try {
      body = (await request.json()) as MathAuthoringGenerateRequest;
    } catch {
      return errorResponse(
        "INVALID_REQUEST",
        "The Math Intelligence request body must be valid JSON.",
        400,
      );
    }

    if (!isRecord(body) || !("question" in body) || !isRecord(body.question)) {
      return errorResponse(
        "QUESTION_REQUIRED",
        "Send the current unsaved Math question draft in the question field.",
        400,
      );
    }

    const subject = explicitSubject(body.question);
    if (!isMathSubject(subject)) {
      return errorResponse(
        "MATH_ONLY",
        "This endpoint only generates Math Visual V2 authoring proposals.",
        400,
      );
    }

    const normalized = normaliseMathIntelligenceQuestion(body.question);
    if (!normalized.prompt) {
      return errorResponse(
        "QUESTION_REQUIRED",
        "Enter the Math question prompt before generating a visual proposal.",
        400,
      );
    }

    const result = await generateMathVisualAndTeachingForQuestion(body.question);
    const proposal = buildMathAuthoringProposal(result);

    const response: MathAuthoringGenerateSuccessResponse = {
      ok: true,
      proposal,
    };
    return json(response);
  } catch (error) {
    if (error instanceof CurriculumDeveloperApiAccessError) {
      return errorResponse(error.code, error.message, error.status, false);
    }

    const classified = classifyGenerationError(error);
    return errorResponse(
      classified.code,
      classified.message,
      classified.status,
      classified.retryable,
    );
  }
}
