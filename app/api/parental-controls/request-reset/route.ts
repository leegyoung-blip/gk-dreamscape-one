import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendParentalControlResetEmail } from "@/lib/parentalControlsEmail";
import {
  requestResetSchema,
  requireAuthenticatedUser,
  validationError,
} from "@/lib/parentalControlsServer";

export const runtime = "nodejs";

const GENERIC_RESPONSE = {
  accepted: true,
  message:
    "If a parent PIN exists and you are authorised, a change link will be sent to the controlling parent's verified account email.",
};

function getResetOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configured) {
    const parsed = new URL(configured);
    if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
      throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS in production.");
    }
    return parsed.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production.");
  }

  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  const parsed = requestResetSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);

  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const admin = createAdminClient();

  const { data, error } = await admin.rpc(
    "create_parental_control_reset_token",
    {
      p_student_user_id: parsed.data.studentUserId,
      p_requester_user_id: auth.user.id,
      p_token_hash: tokenHash,
    },
  );

  if (error) {
    console.error("Parental-control reset-token error:", error);
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const result = data as {
    accepted?: boolean;
    shouldSend?: boolean;
    ownerUserId?: string;
  } | null;

  if (!result?.shouldSend || !result.ownerUserId) {
    return NextResponse.json(GENERIC_RESPONSE);
  }

  const { data: ownerResult, error: ownerError } =
    await admin.auth.admin.getUserById(result.ownerUserId);
  const owner = ownerResult?.user;

  if (
    ownerError
    || !owner?.email
    || !owner.email_confirmed_at
  ) {
    console.error(
      "Parental-control reset email requires a verified owner email:",
      ownerError ?? { ownerUserId: result.ownerUserId },
    );
    return NextResponse.json(GENERIC_RESPONSE);
  }

  try {
    const resetUrl = new URL(
      "/parental-controls/reset-password",
      getResetOrigin(request),
    );
    resetUrl.searchParams.set("token", rawToken);

    await sendParentalControlResetEmail({
      recipient: owner.email,
      resetUrl: resetUrl.toString(),
    });
  } catch (emailError) {
    console.error("Parental-control reset email failed:", emailError);
  }

  return NextResponse.json(GENERIC_RESPONSE);
}
