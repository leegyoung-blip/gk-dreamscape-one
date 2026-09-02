import { NextRequest, NextResponse } from "next/server";
import {
  policyUpdateSchema,
  requireAuthenticatedUser,
  rpcErrorResponse,
  studentUserIdSchema,
  validationError,
} from "@/lib/parentalControlsServer";

export async function GET(request: NextRequest) {
  const parsedStudentId = studentUserIdSchema.safeParse(
    request.nextUrl.searchParams.get("studentUserId"),
  );

  if (!parsedStudentId.success) {
    return NextResponse.json(
      { error: "A valid learner ID is required." },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { data, error } = await auth.supabase.rpc(
    "get_parental_control_policy",
    { p_student_user_id: parsedStudentId.data },
  );

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ policy: data });
}

export async function PUT(request: NextRequest) {
  const parsed = policyUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return validationError(parsed.error);

  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { data, error } = await auth.supabase.rpc(
    "set_parental_control_policy",
    {
      p_student_user_id: parsed.data.studentUserId,
      p_mode: parsed.data.mode,
      p_daily_limit_minutes: parsed.data.dailyLimitMinutes,
      p_time_zone: parsed.data.timeZone,
      p_current_password: parsed.data.currentPassword ?? null,
      p_new_password: parsed.data.newPassword ?? null,
    },
  );

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ policy: data });
}
