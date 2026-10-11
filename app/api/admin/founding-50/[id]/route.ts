import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const staff = await authorizedAdmin(request);
    if (!staff) return NextResponse.json({error:"Forbidden"},{status:403});
    const { id } = await params;
    const body = await request.json();
    const status = body?.status;
    const notes = typeof body?.adminNotes === "string" ? body.adminNotes.slice(0,4000) : "";
    if (!["pending","approved","waitlisted","declined"].includes(status)) return NextResponse.json({error:"Invalid action"},{status:400});
    const db=adminDb();
    const {data:app,error:readError}=await db.from("founding_50_applications").select("id,status").eq("id",id).single();
    if(readError || !app) return NextResponse.json({error:"Application not found"},{status:404});
    // A reviewer cannot manually set an activated state or cancel active access.
    if(!["pending","approved","waitlisted","declined"].includes(app.status)) return NextResponse.json({error:"Invited/activated accounts require a separate lifecycle action"},{status:409});
    const {error}=await db.from("founding_50_applications").update({status,admin_notes:notes,approved_at:status==="approved"?new Date().toISOString():null}).eq("id",id).eq("status",app.status);
    if(error) throw error;
    return NextResponse.json({ok:true});
  } catch(e) {safeError(e,"Update failed");return NextResponse.json({error:"Unable to update application"},{status:500});}
}
