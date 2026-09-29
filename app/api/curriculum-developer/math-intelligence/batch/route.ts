import { NextResponse } from "next/server";

import {
  CurriculumDeveloperApiAccessError,
  requireCurriculumDeveloperApiAccess,
} from "@/lib/curriculum-developer/server/CurriculumDeveloperApiAuth";
import {
  generateMathAuthoringBatch,
  MATH_AUTHORING_BATCH_MAX_ITEMS,
  summariseMathAuthoringBatch,
} from "@/lib/math-intelligence/MathBatchGeneration";
import {
  MATH_AUTHORING_BATCH_SCHEMA_VERSION,
  type MathAuthoringBatchErrorCode,
  type MathAuthoringBatchErrorResponse,
  type MathAuthoringBatchRequest,
  type MathAuthoringBatchSuccessResponse,
} from "@/lib/math-intelligence/MathBatchGenerationTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_REQUEST_BYTES = 2 * 1024 * 1024;

function json<T>(body: T, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

function errorResponse(
  code: MathAuthoringBatchErrorCode,
  message: string,
  status: number,
  retryable = false,
) {
  const body: MathAuthoringBatchErrorResponse = {
    ok: false,
    error: { code, message, retryable },
  };
  return json(body, status);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    await requireCurriculumDeveloperApiAccess(request);

    const contentLength = Number(request.headers.get("content-length") || 0);
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return errorResponse(
        "QUESTION_TOO_LARGE",
        "The Math Intelligence batch request is too large. Send the questions in smaller chunks.",
        413,
      );
    }

    let body: MathAuthoringBatchRequest;
    try {
      body = (await request.json()) as MathAuthoringBatchRequest;
    } catch {
      return errorResponse(
        "INVALID_REQUEST",
        "The Math Intelligence batch request must be valid JSON.",
        400,
      );
    }

    if (!isRecord(body) || !Array.isArray(body.questions)) {
      return errorResponse(
        "INVALID_REQUEST",
        "Send an array of Math questions in the questions field.",
        400,
      );
    }

    if (body.questions.length === 0) {
      return errorResponse("EMPTY_BATCH", "Add at least one Math question.", 400);
    }

    if (body.questions.length > MATH_AUTHORING_BATCH_MAX_ITEMS) {
      return errorResponse(
        "BATCH_TOO_LARGE",
        `Send at most ${MATH_AUTHORING_BATCH_MAX_ITEMS} questions per batch request.`,
        413,
      );
    }

    const items = await generateMathAuthoringBatch(body.questions);
    const response: MathAuthoringBatchSuccessResponse = {
      ok: true,
      schema_version: MATH_AUTHORING_BATCH_SCHEMA_VERSION,
      created_at: new Date().toISOString(),
      summary: summariseMathAuthoringBatch(items),
      items,
    };
    return json(response);
  } catch (error) {
    if (error instanceof CurriculumDeveloperApiAccessError) {
      return errorResponse(error.code, error.message, error.status, false);
    }

    return errorResponse(
      "INVALID_REQUEST",
      error instanceof Error ? error.message : "Math Intelligence batch generation failed.",
      500,
      false,
    );
  }
}
