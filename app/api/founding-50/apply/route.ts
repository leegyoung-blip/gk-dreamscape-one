import { NextResponse } from "next/server";
import { adminDb, safeError } from "@/lib/founding-50/server";
import { deliverQueuedF50Mail } from "@/lib/founding-50/communications";
export const runtime = "nodejs";
const accepted = () => NextResponse.json({ok:true});

/**
 * Preserves the existing validation and application privacy behaviour.
 * The Phase 1 email migration atomically queues one admin notification on INSERT.
 * This route ensures the existing applicant confirmation and then tries to
 * deliver both. Email failures never undo a saved application.
 */
export async function POST(request:Request){
  try {
    if(Number(request.headers.get("content-length")||0)>4000)
      return NextResponse.json({error:"Invalid form request"},{status:413});
    const body=await request.json();
    const studentName=typeof body?.studentName==="string"?body.studentName.trim():"";
    const parentEmail=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
    const age=Number(body?.studentAge);
    if(studentName.length<2||studentName.length>100||!Number.isInteger(age)||age<6||age>12||
      parentEmail.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)||body?.consentAccepted!==true)
      return NextResponse.json({error:"Enter the student's name, age 6–12, valid parent email and guardian consent."},{status:400});
    if(body?.termsVersion!=="founding50-v1")
      return NextResponse.json({error:"Please refresh the form and accept the latest terms."},{status:400});
    const db=adminDb();
    const {data,error}=await db.from("founding_50_applications")
      .insert({student_name:studentName,student_age:age,parent_email:parentEmail,
        consent_accepted:true,consented_at:new Date().toISOString(),terms_version:"founding50-v1",
        status:"pending",submission_source:"homepage-banner"})
      .select("id").single();
    // Don't reveal whether a guardian email already has an application.
    if(error?.code==="23505")return accepted();
    if(error||!data)throw error||new Error("Application not saved");
    // Compatibility: before the SQL migration this queues the acknowledgement;
    // once the trigger is installed it is an idempotent no-op.
    const {error:mailError}=await db.from("founding_50_email_outbox")
      .upsert({application_id:data.id,kind:"application_received",generation:0},
        {onConflict:"application_id,kind,generation",ignoreDuplicates:true});
    if (mailError) safeError(mailError, "Acknowledgement could not be confirmed in outbox");
    // Dispatch attempts are best effort; existing cron retries pending rows.
    // The new admin alert was queued inside the INSERT transaction by trigger.
    try { await deliverQueuedF50Mail({ applicationId: data.id, limit: 2 }); }
    catch (e) { safeError(e, "Founding 50 emails queued for cron"); }
    return accepted();
  } catch(e) {
    safeError(e,"Application failed");
    return NextResponse.json({error:"We could not save your application. Please retry."},{status:500});
  }
}
