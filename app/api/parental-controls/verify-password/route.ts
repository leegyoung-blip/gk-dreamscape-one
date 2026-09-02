import { NextRequest, NextResponse } from "next/server";
import {
  requireAuthenticatedUser,
  rpcErrorResponse,
  validationError,
  verifyPasswordSchema,
} from "@/lib/parentalControlsServer";

export async function POST(request: NextRequest) {
  const parsed = verifyPasswordSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return validationError(parsed.error);

  const auth = await requireAuthenticatedUser();
  if (auth.response) return auth.response;

  const { data, error } = await auth.supabase.rpc(
    "verify_parental_control_password",
    {
      p_student_user_id: parsed.data.studentUserId,
      p_password: parsed.data.password,
    },
  );

  if (error) return rpcErrorResponse(error);
  return NextResponse.json(data);
}
