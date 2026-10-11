import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
import { encryptInviteToken, publicOrigin } from "@/lib/founding-50/invite-crypto";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";
export const runtime = "nodejs";

/** Approve + reserve a seat + queue invitation in ONE database transaction. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorizedAdmin(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    publicOrigin(); // Fail before reserving a seat if activation links cannot be created.
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
      return NextResponse.json({ error: "Configure Resend before sending invitations." }, { status: 503 });
    }
    const token = randomBytes(32).toString("base64url");
    const hash = createHash("sha256").update(token).digest("hex");
    const encrypted = encryptInviteToken(token);
    const expires = new Date(Date.now() + 7 * 86400_000).toISOString();
    const { data, error } = await adminDb().rpc("f50_approve_queue_invite", {
      p_id: id, p_hash: hash, p_ciphertext: encrypted, p_expires: expires,
    });
    if (error) {
      console.warn("Founding 50 invite rejected:", error.code);
      return NextResponse.json({ error: "Unable to reserve a place. Check status and available seats." }, { status: 409 });
    }
    // Best-effort immediate delivery; the background job retries any failed send.
    let delivery = { claimed: 0, sent: 0, failed: 0, cancelled: 0 };
    try { delivery = await deliverQueuedF50Mail({ applicationId: id, limit: 5 }); }
    catch (mailError) { safeError(mailError, "Invite queued; dispatcher will retry"); }
    return NextResponse.json({ ok: true, queued: true, delivery, expiresAt: expires, applicationId: data?.[0]?.application_id });
  } catch (error) {
    safeError(error, "Invite setup failed");
    return NextResponse.json({ error: "Invitation system is not configured or unavailable." }, { status: 503 });
  }
}
