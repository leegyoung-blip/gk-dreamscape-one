"use client";

import { supabase } from "@/lib/supabase";
import type {
  MathAuthoringBatchRequestItem,
  MathAuthoringBatchResponse,
  MathAuthoringBatchSuccessResponse,
} from "@/lib/math-intelligence/MathBatchGenerationTypes";

export const MATH_AUTHORING_CLIENT_BATCH_SIZE = 40;

async function accessToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(error.message);
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in again before using Math Intelligence.");
  return token;
}

function messageFromResponse(response: MathAuthoringBatchResponse) {
  return response.ok ? "" : response.error.message;
}

export async function requestMathBatchProposals(
  items: MathAuthoringBatchRequestItem[],
): Promise<MathAuthoringBatchSuccessResponse> {
  if (items.length < 1) {
    throw new Error("Add at least one Math question to the batch.");
  }
  if (items.length > MATH_AUTHORING_CLIENT_BATCH_SIZE) {
    throw new Error(
      `Send at most ${MATH_AUTHORING_CLIENT_BATCH_SIZE} questions per request.`,
    );
  }

  const token = await accessToken();
  const response = await fetch(
    "/api/curriculum-developer/math-intelligence/batch",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
      body: JSON.stringify({ questions: items }),
    },
  );

  let body: MathAuthoringBatchResponse;
  try {
    body = (await response.json()) as MathAuthoringBatchResponse;
  } catch {
    throw new Error("Math Intelligence returned an unreadable batch response.");
  }

  if (!response.ok || !body.ok) {
    throw new Error(messageFromResponse(body) || "Math Intelligence batch failed.");
  }

  return body;
}

export async function requestMathBatchProposalsInChunks(
  items: MathAuthoringBatchRequestItem[],
  onProgress?: (completed: number, total: number) => void,
) {
  const allItems: MathAuthoringBatchSuccessResponse["items"] = [];

  for (let start = 0; start < items.length; start += MATH_AUTHORING_CLIENT_BATCH_SIZE) {
    const chunk = items.slice(start, start + MATH_AUTHORING_CLIENT_BATCH_SIZE);
    const result = await requestMathBatchProposals(chunk);
    allItems.push(...result.items);
    onProgress?.(Math.min(start + chunk.length, items.length), items.length);
  }

  return allItems;
}
