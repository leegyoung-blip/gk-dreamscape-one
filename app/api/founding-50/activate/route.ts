import { createHash, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, safeError } from "@/lib/founding-50/server";
import { classifyActivationError } from "@/lib/founding-50/activation-errors";
import { getFounding50NovaPlusAccess } from "@/lib/founding-50/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/**
 * Activates one invited, email-verified parent account, regardless of its
 * existing paid/trial/manual NOVA+ access. Never touches Stripe or billing.
 */
export async function POST(request: Request) {
  const diagnosticId = randomUUID();
  try {
    const user = await authenticatedUser(request);
    if (!user?.email) {
      return NextResponse.json({ error: "Please sign in with your verified parent account.", code: "F50_AUTH_REQUIRED" },
        { status: 401, headers: noStore });
    }

    let body: { token?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid activation request.", code: "F50_INVITE_INVALID" },
        { status: 400, headers: noStore });
    }
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (!/^[A-Za-z0-9_-]{35,90}$/.test(token)) {
      return NextResponse.json({ error: "This invitation link is invalid. Open the latest invitation email.", code: "F50_INVITE_INVALID" },
        { status: 400, headers: noStore });
    }

    const hash = createHash("sha256").update(token).digest("hex");
    const { data, error } = await adminDb().rpc("f50_activate_invitation", {
      p_hash: hash,
      p_user_id: user.id,
      p_email: user.email,
    });

    if (error) {
      const classified = classifyActivationError(error);
      // Keep the detailed Supabase error in server logs only, with a correlation
      // ID, so support can distinguish schema/configuration and business errors.
      console.error("Founding 50 activation rejected", {
        diagnosticId, code: classified.code,
        supabaseCode: error.code, message: error.message,
      });
      return NextResponse.json({ error: classified.message, code: classified.code, diagnosticId },
        { status: classified.status, headers: noStore });
    }

    const record = data?.[0];
    if (!record?.application_id || !record?.starts_at || !record?.ends_at) {
      console.error("Founding 50 activation unexpected RPC result", { diagnosticId });
      return NextResponse.json({ error: "Activation could not be confirmed. Please contact Dreamscape.", code: "F50_ACTIVATION_FAILED", diagnosticId },
        { status: 503, headers: noStore });
    }

    // The entitlement was inserted atomically by the RPC. Read the live record
    // and include the result. Other NOVA+ server gates still have to use the
    // helper in lib/founding-50/access.ts.
    let entitlementVerified = false;
    try {
      const access = await getFounding50NovaPlusAccess(user.id);
      entitlementVerified = access.active && access.endsAt === record.ends_at;
    } catch (verifyError) {
      safeError(verifyError, "Activation committed, verification deferred");
    }

    // 1D-C queues the welcome message inside the activation transaction.
    // Its scheduled communications worker sends it independently, so email
    // provider latency cannot delay the user's activation response.

    return NextResponse.json({
      ok: true,
      startsAt: record.starts_at,
      endsAt: record.ends_at,
      betaEntitlementVerified: entitlementVerified,
      // This flag means the Founding50 entitlement row is active; not that
      // every existing premium-page gate has been updated.
      source: "founding50_beta",
    }, { headers: noStore });
  } catch (error) {
    console.error("Founding 50 activation unexpected error", { diagnosticId });
    safeError(error, "Founding 50 activation failed");
    return NextResponse.json({
      error: "Unable to activate at the moment. Please try again or contact Dreamscape support.",
      code: "F50_ACTIVATION_FAILED", diagnosticId,
    }, { status: 500, headers: noStore });
  }
}
