import { NextResponse } from "next/server";
import { authenticatedUser, safeError } from "@/lib/founding-50/server";
import { getFounding50NovaPlusAccess } from "@/lib/founding-50/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "private, no-store, max-age=0" };

/** Authenticated, real-time access status. The browser cannot select a user ID. */
export async function GET(request: Request) {
  try {
    const user = await authenticatedUser(request);
    if (!user) return NextResponse.json(
      { error: "Please sign in with a verified parent account." },
      { status: 401, headers: noStore },
    );
    const entitlement = await getFounding50NovaPlusAccess(user.id);
    return NextResponse.json(
      entitlement,
      { headers: noStore },
    );
  } catch (error) {
    safeError(error, "Founding 50 access check failed");
    return NextResponse.json({ error: "Unable to verify beta access." },
      { status: 503, headers: noStore });
  }
}
