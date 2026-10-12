import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
export const runtime = "nodejs";

/** Manual queueing only. Scheduled dispatcher handles actual Resend delivery. */
export async function POST(request: Request) {
  if (!(await authorizedAdmin(request)))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body: unknown = await request.json();
    const applicationId = (body && typeof body === "object" && "applicationId" in body)
      ? (body as {applicationId?: unknown}).applicationId : null;
    if (typeof applicationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(applicationId))
      return NextResponse.json({ error: "Invalid application ID" }, { status: 400 });

    const { data, error } = await adminDb().rpc("f50_admin_queue_feedback_reminder", {
      p_application_id: applicationId,
    });
    if (error) {
      const code = String(error.message || "");
      const messages: Record<string,string> = {
        F50_MANUAL_NOT_ELIGIBLE: "This family does not have an activated beta application.",
        F50_MANUAL_OUTSIDE_WINDOW: "Manual feedback invitations can only be sent between Day 23 and the end of the beta period.",
        F50_MANUAL_ALREADY_SUBMITTED: "This family has already submitted feedback.",
        F50_MANUAL_NO_PRIOR_INVITATION: "Wait until the first scheduled survey invitation has been delivered. Failed jobs can be retried from email history.",
        F50_MANUAL_LIMIT_REACHED: "The limit of two manual survey invitations has been reached.",
        F50_MANUAL_RECENT_OR_PENDING: "A survey email is already pending, failed and retrying, or was sent within the last 48 hours.",
      };
      for (const [token, message] of Object.entries(messages)) {
        if (code.includes(token)) return NextResponse.json({ error: message }, { status: 409 });
      }
      throw error;
    }
    return NextResponse.json({ ok: true, queued: true, mailId: data }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    safeError(error, "Manual feedback invitation error");
    return NextResponse.json({ error: "Unable to queue feedback invitation" }, { status: 500 });
  }
}
