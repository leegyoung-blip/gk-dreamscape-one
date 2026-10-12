import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, safeError } from "@/lib/founding-50/server";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";

export const runtime = "nodejs";

const FAVOURITES = new Set([
  "mission_centre", "think_lab", "knowledge_arena",
  "skyforge_hangar", "nova_home", "not_explored",
]);
const RECOMMENDATIONS = new Set(["yes", "maybe", "no"]);
const RATING_KEYS = ["ease", "engagement", "learning", "reliability", "overall"] as const;

type SurveyPayload = Record<string, unknown>;

function isRating(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value >= 1 && value <= 5;
}

function validationError(body: SurveyPayload): string | null {
  if (RATING_KEYS.some((key) => !isRating(body[key]))) {
    return "Please rate all five areas from 1 to 5.";
  }
  if (typeof body.favourite_feature !== "string" || !FAVOURITES.has(body.favourite_feature)) {
    return "Please select the feature your child enjoyed most.";
  }
  if (typeof body.recommendation !== "string" || !RECOMMENDATIONS.has(body.recommendation)) {
    return "Please tell us whether you would recommend Dreamscape.";
  }
  if (typeof body.suggestions !== "string" || [...body.suggestions].length > 2000) {
    return "Suggestions must be text containing at most 2,000 characters.";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // Never trust a client-provided user id. The auth token is verified by
    // Supabase Auth on the server; the RPC receives only that verified id.
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json({ error: "Sign in with your registered Founding 50 account." }, { status: 401 });

    if (!(request.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Expected a JSON survey submission." }, { status: 415 });
    }

    // Reject oversized data *while streaming*, not after buffering an
    // unbounded authenticated request. The feedback comment limit is 2,000.
    const size = Number(request.headers.get("content-length") || 0);
    if (size > 8192) {
      return NextResponse.json({ error: "Survey response is too large." }, { status: 413 });
    }
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Survey data is missing." }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > 8192) {
          await reader.cancel().catch(() => undefined);
          return NextResponse.json({ error: "Survey response is too large." }, { status: 413 });
        }
        chunks.push(value);
      }
    }
    const bytes = new Uint8Array(total);
    let cursor = 0;
    for (const chunk of chunks) { bytes.set(chunk, cursor); cursor += chunk.byteLength; }
    const content = new TextDecoder("utf-8").decode(bytes);
    let parsed: unknown;
    try { parsed = JSON.parse(content); }
    catch { return NextResponse.json({ error: "Invalid survey data." }, { status: 400 }); }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Invalid survey data." }, { status: 400 });
    }
    const body = parsed as SurveyPayload;
    const invalid = validationError(body);
    if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

    const { data: applicationId, error } = await adminDb().rpc("f50_submit_feedback_v2", {
      p_user_id: user.id,
      p_ease: body.ease,
      p_engagement: body.engagement,
      p_learning: body.learning,
      p_reliability: body.reliability,
      p_overall: body.overall,
      p_favourite_feature: body.favourite_feature,
      p_recommendation: body.recommendation,
      p_suggestions: (body.suggestions as string).trim(),
    });
    if (error) {
      const message = error.message || "";
      if (message.includes("F50_SURVEY_ALREADY_SUBMITTED") || error.code === "23505") {
        return NextResponse.json({ error: "Your family's survey has already been submitted. Thank you!", code: "already_submitted" }, { status: 409 });
      }
      if (message.includes("F50_SURVEY_NOT_OPEN_YET")) {
        return NextResponse.json({ error: "Your survey opens on Day 23 of your beta." }, { status: 403 });
      }
      if (message.includes("F50_SURVEY_NOT_ELIGIBLE")) {
        return NextResponse.json({ error: "No activated Founding 50 beta is linked to this account." }, { status: 403 });
      }
      if (message.includes("F50_SURVEY_INVALID_") || message.includes("F50_SURVEY_TEXT_TOO_LONG")) {
        return NextResponse.json({ error: "Please check your survey answers and try again." }, { status: 400 });
      }
      safeError(error, "Founding 50 survey database error");
      return NextResponse.json({ error: "Unable to save your survey right now. Please try again." }, { status: 500 });
    }

    // Receipt was queued atomically in Postgres, so Resend outages do not
    // roll back the submitted survey or cause a second submission attempt.
    // Immediate delivery is best effort; the existing cron retries if needed.
    if (applicationId) {
      try { await deliverQueuedF50Mail({ applicationId, limit: 5 }); }
      catch (error) { safeError(error, "Survey acknowledgement will be sent by the communications worker"); }
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    safeError(error, "Founding 50 feedback error");
    return NextResponse.json({ error: "Unable to save the survey right now." }, { status: 500 });
  }
}
