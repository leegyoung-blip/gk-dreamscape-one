import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    if (!(await authorizedAdmin(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const filter = new URL(request.url).searchParams.get("status") || "all";
    const allowed = ["all", "pending", "approved", "invited", "activated", "waitlisted", "declined"];
    if (!allowed.includes(filter)) return NextResponse.json({ error: "Invalid filter" }, { status: 400 });
    let query = adminDb().from("founding_50_applications").select(
      "id,parent_email,student_name,student_age,status,created_at,admin_notes,invited_at,activated_at,beta_starts_at,beta_ends_at,survey_completed_at,invite_expires_at"
    ).order("created_at", { ascending: false }).limit(1000);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ applications: data || [] });
  } catch (e) { safeError(e,"Admin list failed"); return NextResponse.json({ error:"Unable to load applications" },{status:500}); }
}
