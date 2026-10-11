import { NextResponse } from "next/server";
import { adminDb, authorizedAdmin, safeError } from "@/lib/founding-50/server";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";
export const runtime="nodejs";

export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  if(!(await authorizedAdmin(request))) return NextResponse.json({error:"Forbidden"},{status:403});
  try {
    const {id}=await params;
    const {data,error}=await adminDb().from("founding_50_email_outbox")
      .select("id,kind,generation,status,attempts,created_at,sent_at,next_attempt_at,last_error,provider_message_id")
      .eq("application_id",id).order("created_at",{ascending:false}).limit(100);
    if(error) throw error;
    return NextResponse.json({messages:data||[]});
  } catch(e) {safeError(e,"Mail history failed");return NextResponse.json({error:"Could not load email history"},{status:500});}
}

/** Manual requeue of a failed email. Dispatcher rechecks applicant state and expiry. */
export async function POST(request: Request,{params}:{params:Promise<{id:string}>}) {
  if(!(await authorizedAdmin(request))) return NextResponse.json({error:"Forbidden"},{status:403});
  try {
    const {id}=await params;
    const body=await request.json();
    const mailId=typeof body?.mailId==="string"?body.mailId:"";
    if(!/^[0-9a-f-]{36}$/i.test(mailId)) return NextResponse.json({error:"Invalid mail ID"},{status:400});
    const db=adminDb();
    const {data,error}=await db.from("founding_50_email_outbox")
      .update({status:"queued",attempts:0,next_attempt_at:new Date().toISOString(),last_error:null,claimed_until:null,claim_id:null})
      .eq("id",mailId).eq("application_id",id).eq("status","failed")
      .select("id").maybeSingle();
    if(error) throw error;
    if(!data) return NextResponse.json({error:"Only failed emails can be retried"},{status:409});
    let delivery: unknown = {queued:true};
    try {delivery=await deliverQueuedF50Mail({applicationId:id,limit:1});}
    catch(e){safeError(e,"Mail requeued");}
    return NextResponse.json({ok:true,delivery});
  } catch(e){safeError(e,"Retry failed");return NextResponse.json({error:"Unable to retry email"},{status:500});}
}
