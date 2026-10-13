import { NextResponse } from "next/server";
import { adminDb, safeError } from "@/lib/founding-50/server";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";
export const runtime = "nodejs";
export const maxDuration = 60;

/** Set Vercel Cron to hourly. CRON_SECRET is required. Never expose publicly. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const db = adminDb();
    const {data:expired,error:expireError}=await db.rpc("f50_expire_invites");
    if(expireError) throw expireError;
    const {data:queued,error:queueError}=await db.rpc("f50_schedule_invite_reminders");
    if(queueError) throw queueError;
    const {data:betaQueued,error:betaError}=await db.rpc("f50_schedule_beta_followups");
    if(betaError) throw betaError;
    const mail=await deliverQueuedF50Mail({limit:30});
    return NextResponse.json({ok:true,expired,invitationRemindersQueued:queued,betaFollowupsQueued:betaQueued,mail});
  }catch(e){safeError(e,"Communications cron error");return NextResponse.json({error:"Processing failed"},{status:500});}
}
