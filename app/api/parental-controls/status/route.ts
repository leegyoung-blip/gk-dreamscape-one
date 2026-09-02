import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  rpcErrorResponse,
  studentUserIdSchema,
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
    "get_parental_control_status",
    { p_student_user_id: parsedStudentId.data },
  );

  if (error) return rpcErrorResponse(error);
  return NextResponse.json({ status: data });
}
