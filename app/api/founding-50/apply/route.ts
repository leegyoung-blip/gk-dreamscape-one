import { NextResponse } from "next/server";
import { adminDb, safeError } from "@/lib/founding-50/server";
import { sendF50Email } from "@/lib/founding-50/email";
export const runtime="nodejs";
const reply=()=>NextResponse.json({ok:true});
export async function POST(request:Request){
 try{
  if(Number(request.headers.get("content-length")||0)>4000)return NextResponse.json({error:"Invalid form request"},{status:413});
  const body=await request.json();
  const name=typeof body?.studentName==="string"?body.studentName.trim():"";
  const email=typeof body?.email==="string"?body.email.trim().toLowerCase():"";
  const age=Number(body?.studentAge);
  if(name.length<2||name.length>100||!Number.isInteger(age)||age<6||age>12||email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||body?.consentAccepted!==true)
   return NextResponse.json({error:"Enter the student's name, age 6–12, a valid parent email and guardian consent."},{status:400});
  if(body?.termsVersion!=="founding50-v1")return NextResponse.json({error:"Please refresh the form and accept the latest terms."},{status:400});
  const db=adminDb();
  const {error}=await db.from("founding_50_applications").insert({
   student_name:name,student_age:age,parent_email:email,consent_accepted:true,
   consented_at:new Date().toISOString(),terms_version:"founding50-v1",status:"pending",submission_source:"homepage-banner",
  });
  // Avoid revealing whether a particular parent email has already applied.
  if(error?.code==="23505")return reply();
  if(error)throw error;
  try{await sendF50Email({to:email,subject:"Dreamscape Founding 50 — Interest received",
    heading:"Thanks for registering your interest.",body:`We have received your application for ${name}. We will contact you if your family is selected. No payment is required at this stage.`});
  }catch(mailError){safeError(mailError,"Acknowledgement failed"); /* preserve successful DB submission */}
  return reply();
 }catch(e){safeError(e,"Application failed");return NextResponse.json({error:"We could not save your application. Please retry."},{status:500});}
}
