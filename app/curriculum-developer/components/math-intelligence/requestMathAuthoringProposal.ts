"use client";

import { supabase } from "@/lib/supabase";
import type {
  MathAuthoringGenerateResponse,
  MathAuthoringProposal,
} from "@/lib/math-intelligence/MathAuthoringProposalTypes";

export class MathAuthoringProposalRequestError extends Error {
  code: string;
  retryable: boolean;
  status: number;

  constructor(input: {
    message: string;
    code: string;
    retryable?: boolean;
    status?: number;
  }) {
    super(input.message);
    this.name = "MathAuthoringProposalRequestError";
    this.code = input.code;
    this.retryable = Boolean(input.retryable);
    this.status = input.status ?? 0;
  }
}

export async function requestMathAuthoringProposal(
  question: unknown,
): Promise<MathAuthoringProposal> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new MathAuthoringProposalRequestError({
      code: "AUTH_REQUIRED",
      message: "Your curriculum developer session could not be verified. Sign in again and retry.",
      status: 401,
    });
  }

  let response: Response;
  try {
    response = await fetch(
      "/api/curriculum-developer/math-intelligence/generate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({ question }),
      },
    );
  } catch {
    throw new MathAuthoringProposalRequestError({
      code: "NETWORK_ERROR",
      message: "Dreamscape could not reach the Math Intelligence server. The question has not been changed.",
      retryable: true,
    });
  }

  let body: MathAuthoringGenerateResponse | null = null;
  try {
    body = (await response.json()) as MathAuthoringGenerateResponse;
  } catch {
    body = null;
  }

  if (!response.ok || !body || body.ok !== true) {
    const error = body && body.ok === false ? body.error : null;
    throw new MathAuthoringProposalRequestError({
      code: error?.code || "GENERATION_FAILED",
      message:
        error?.message ||
        "Math Intelligence could not create a proposal. The question has not been changed.",
      retryable: error?.retryable || false,
      status: response.status,
    });
  }

  return body.proposal;
}
