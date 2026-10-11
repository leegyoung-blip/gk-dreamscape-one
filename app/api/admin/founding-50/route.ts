import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!(await authorizedAdmin(request))) return NextResponse.json({ error:"Forbidden" },{status:403});
  try {
    const filter = new URL(request.url).searchParams.get("status") || "all";
    if (!["all","pending","approved","invited","activated","waitlisted","declined"].includes(filter))
      return NextResponse.json({error:"Invalid filter"},{status:400});
    const db = adminDb();
    let query = db.from("founding_50_applications")
      .select("id,parent_email,student_name,student_age,status,created_at,admin_notes,invited_at,invite_expires_at,invite_sent_at,invite_delivery_status,invite_expired_at,activated_at,beta_starts_at,beta_ends_at,survey_completed_at,invite_generation")
      .order("created_at",{ascending:false}).limit(1000);
    if (filter!=="all") query=query.eq("status",filter);
    const [{data,error},{data:seats,error:countError}] = await Promise.all([
      query,db.rpc("f50_seat_counts"),
    ]);
    if(error||countError) throw error||countError;
    return NextResponse.json({ applications:data||[], seats:seats?.[0]||{activated_count:0,reserved_count:0,available_count:50} });
  } catch(error) {
    safeError(error,"List failed");
    return NextResponse.json({ error:"Unable to load Founding 50 applications." },{status:500});
  }
}
