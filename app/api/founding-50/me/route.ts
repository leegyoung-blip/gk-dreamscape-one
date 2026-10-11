import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, applicationForUser, safeError } from "@/lib/founding-50/server";
export const runtime="nodejs";
export async function GET(request:Request) {
 try {
  const user=await authenticatedUser(request);
  if(!user)return NextResponse.json({error:"Please sign in"},{status:401});
  const app=await applicationForUser(user.id);
  if(!app)return NextResponse.json({application:null});
  const db=adminDb();
  const [badge,reward,discount]=await Promise.all([
   db.from("founding_50_badges").select("badge_key,asset_path,earned_at").eq("application_id",app.id).maybeSingle(),
   db.from("founding_50_reward_grants").select("dream_tokens,dream_gems,status").eq("application_id",app.id).maybeSingle(),
   db.from("founding_50_discounts").select("state,promo_code,redeem_by").eq("application_id",app.id).maybeSingle(),
  ]);
  if(badge.error||reward.error||discount.error)throw new Error("Could not retrieve benefits");
  const now=Date.now(); const starts=Date.parse(app.beta_starts_at||""); const ends=Date.parse(app.beta_ends_at||"");
  const surveyAvailable=Number.isFinite(starts)&&now>=starts+23*86400000;
  const complete=Number.isFinite(ends)&&now>=ends;
  return NextResponse.json({application:app,badge:badge.data,reward:reward.data,discount:discount.data,
    surveyAvailable, discountEligible:complete&&Boolean(app.survey_completed_at), betaActive:now>=starts&&now<ends});
 }catch(e){safeError(e,"Profile failed");return NextResponse.json({error:"Unable to read beta status"},{status:500});}
}
