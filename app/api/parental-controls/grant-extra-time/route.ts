import { NextRequest, NextResponse } from "next/server";
import {
  grantExtraTimeSchema,
  requireAuthenticatedUser,
  rpcErrorResponse,
  validationError,
} from "@/lib/parentalControlsServer";

export async function POST(request: NextRequest) {
  const parsed = grantExtraTimeSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);

  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { data, error } = await auth.supabase.rpc(
    "grant_parental_extra_time",
    {
      p_student_user_id: parsed.data.studentUserId,
      p_additional_minutes: parsed.data.additionalMinutes,
      p_password: parsed.data.password,
      p_reason: parsed.data.reason ?? null,
    },
  );

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ status: data });
}
