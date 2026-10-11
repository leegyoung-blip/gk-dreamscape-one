import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, safeError } from "@/lib/founding-50/server";
export const runtime="nodejs";
export async function POST(request:Request) {
 try {
  const user=await authenticatedUser(request);
  if(!user)return NextResponse.json({error:"Please sign in"},{status:401});
  const body=await request.json();
  const values=[body?.ease,body?.engagement,body?.learning,body?.reliability,body?.overall];
  if(values.some(v=>!Number.isInteger(v)||v<1||v>5)||typeof body?.suggestions!=="string"||body.suggestions.length>2000)
    return NextResponse.json({error:"Please complete all five ratings (1–5)"},{status:400});
  const {error}=await adminDb().rpc("f50_submit_feedback",{
    p_user_id:user.id,p_ease:values[0],p_engagement:values[1],p_learning:values[2],p_reliability:values[3],
    p_overall:values[4],p_suggestions:body.suggestions,
  });
  if(error)return NextResponse.json({error:"Survey is available only from day 23 of an activated beta."},{status:409});
  return NextResponse.json({ok:true});
 }catch(e){safeError(e,"Feedback failed");return NextResponse.json({error:"Unable to save survey"},{status:500});}
}
