import { NextResponse } from "next/server";
import { adminDb, safeError } from "@/lib/founding-50/server";
import { sendF50Email } from "@/lib/founding-50/email";
export const runtime="nodejs";
export async function GET(request:Request) {
 const authorization=request.headers.get("authorization")||"";
 if(!process.env.CRON_SECRET||authorization!==`Bearer ${process.env.CRON_SECRET}`)
  return NextResponse.json({error:"Forbidden"},{status:403});
 const origin=process.env.FOUNDING50_PUBLIC_ORIGIN;
 if(!origin)return NextResponse.json({error:"Missing public origin"},{status:503});
 try{
  const db=adminDb();
  const now=new Date().toISOString();
  const {data:apps,error}=await db.from("founding_50_applications")
   .select("id,parent_email,student_name,beta_starts_at,beta_ends_at,survey_completed_at")
   .eq("status","activated").lte("beta_starts_at",now).limit(100);
  if(error)throw error;
  let sent=0,failed=0;
  for(const app of apps||[]){
   const day=Math.floor((Date.now()-Date.parse(app.beta_starts_at))/86400000);
   const kind=day>=30?"beta_end":day>=23&&!app.survey_completed_at?"feedback_week":null;
   if(!kind)continue;
   const {data:notice}=await db.from("founding_50_notices").select("kind").eq("application_id",app.id).eq("kind",kind).maybeSingle();
   if(notice)continue;
   const {error:lockError}=await db.from("founding_50_notices").insert({application_id:app.id,kind});
   if(lockError)continue; // another run reserved it; no duplicate sends
   try{
    await sendF50Email({to:app.parent_email,
     subject:kind==="feedback_week"?"Founding 50: Share your final-week feedback":"Founding 50: Your beta has ended",
     heading:kind==="feedback_week"?"Your feedback matters.":"Thank you for exploring Dreamscape.",
     body:kind==="feedback_week"?`Thank you for exploring Dreamscape with ${app.student_name}. Please complete the short feedback survey during your final week.`:
      `Your 30-day NOVA + NOVA+ beta for ${app.student_name} has ended. Thank you for your support. See your Founding 50 benefits and any available discount eligibility.`,
     actionUrl:`${origin.replace(/\/$/,"")}/founding-50/${kind==="feedback_week"?"feedback":"benefits"}`,
     actionLabel:kind==="feedback_week"?"Complete feedback →":"View benefits →"});
    sent++;
   }catch(e){failed++;safeError(e,"Reminder email failed");await db.from("founding_50_notices").delete().eq("application_id",app.id).eq("kind",kind);}
  }
  return NextResponse.json({ok:true,sent,failed});
 }catch(e){safeError(e,"Reminder processing failed");return NextResponse.json({error:"Reminder failed"},{status:500});}
}
