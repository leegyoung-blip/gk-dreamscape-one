import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";
export const runtime = "nodejs";

/** Human review only. No direct transition into invited/activated states. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorizedAdmin(request))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const { id } = await params;
    const body = await request.json();
    const notes = typeof body?.adminNotes === "string" ? body.adminNotes.slice(0,4000) : "";
    const status = body?.status;
    if (!status) {
      const { error } = await adminDb().from("founding_50_applications")
        .update({admin_notes:notes}).eq("id",id);
      if(error) throw error;
      return NextResponse.json({ ok:true });
    }
    if (!["pending","approved","waitlisted","declined"].includes(status))
      return NextResponse.json({ error: "Invalid status. Use Approve & Invite to reserve seats." }, { status: 400 });
    const { error } = await adminDb().rpc("f50_review_application", {
      p_id: id, p_status: status, p_notes: notes,
    });
    if (error) return NextResponse.json({ error: "Unable to review this application in its current state." }, { status:409 });
    if (status === "waitlisted" || status === "declined") {
      try { await deliverQueuedF50Mail({ applicationId: id, limit: 5 }); }
      catch (mailError) { safeError(mailError,"Status email queued; retry scheduled"); }
    }
    return NextResponse.json({ ok:true });
  } catch (error) {
    safeError(error,"Review failed");
    return NextResponse.json({ error:"Unable to update application." },{status:500});
  }
}
