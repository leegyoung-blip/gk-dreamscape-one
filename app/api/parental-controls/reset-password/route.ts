import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  completeResetSchema,
  validationError,
} from "@/lib/parentalControlsServer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const parsed = completeResetSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);

  const tokenHash = createHash("sha256")
    .update(parsed.data.token.toLowerCase())
    .digest("hex");

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "reset_parental_control_password_from_token",
    {
      p_token_hash: tokenHash,
      p_new_password: parsed.data.newPassword,
    },
  );

  if (error) {
    if (error.code === "22023") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error("Parental-control reset completion error:", error);
    return NextResponse.json(
      { error: "The reset could not be completed. Please try again." },
      { status: 500 },
    );
  }

  const result = data as { success?: boolean } | null;
  if (!result?.success) {
    return NextResponse.json(
      { error: "This reset link is invalid, expired, or has already been used." },
      { status: 400 },
    );
  }

  return NextResponse.json({ success: true });
}
