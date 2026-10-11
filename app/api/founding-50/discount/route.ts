import { NextResponse } from "next/server";
import { adminDb, authenticatedUser, applicationForUser, safeError } from "@/lib/founding-50/server";
import { issueF50PromotionCode } from "@/lib/founding-50/stripe";
export const runtime="nodejs";
export async function POST(request:Request) {
 try {
  const user=await authenticatedUser(request);
  if(!user)return NextResponse.json({error:"Please sign in"},{status:401});
  const app=await applicationForUser(user.id);
  if(!app||app.status!=="activated"||!app.beta_ends_at||Date.now()<Date.parse(app.beta_ends_at)||!app.survey_completed_at)
   return NextResponse.json({error:"Complete 30 days and the parent feedback survey to unlock the discount"},{status:403});
  // A 60-day redemption window from the later of actual beta end or configured public launch.
  const launch=process.env.FOUNDING50_PUBLIC_LAUNCH_AT;
  const launchMs=launch?Date.parse(launch):NaN;
  if(!Number.isFinite(launchMs))return NextResponse.json({error:"Public launch date has not been configured yet"},{status:503});
  if(Date.now()<launchMs)return NextResponse.json({error:"Founding 50 discount codes become available at public launch"},{status:409});
  const redeemBy=new Date(Math.max(Date.parse(app.beta_ends_at),launchMs)+60*86400000);
  const db=adminDb();
  const {data:existing,error:readErr}=await db.from("founding_50_discounts").select("state,promo_code").eq("application_id",app.id).maybeSingle();
  if(readErr)throw readErr;
  if(existing?.state==="issued")return NextResponse.json({ok:true,code:existing.promo_code,redeemBy:redeemBy.toISOString()});
  if(!existing){const {error}=await db.from("founding_50_discounts").insert({application_id:app.id,user_id:user.id,state:"issuing",redeem_by:redeemBy.toISOString()});if(error&&!String(error.code).includes("23505"))throw error;}
  try {
   const stripe=await issueF50PromotionCode(app.id,redeemBy);
   const {error}=await db.from("founding_50_discounts").update({state:"issued",promo_code:stripe.code,
    stripe_coupon_id:stripe.couponId,stripe_promotion_code_id:stripe.promotionCodeId,
    redeem_by:redeemBy.toISOString(),issued_at:new Date().toISOString(),last_error:null}).eq("application_id",app.id);
   if(error)throw error;
   return NextResponse.json({ok:true,code:stripe.code,redeemBy:redeemBy.toISOString()});
  } catch(issueError){await db.from("founding_50_discounts").update({state:"error",last_error:"Stripe issuance pending recovery"}).eq("application_id",app.id);
   throw issueError;}
 }catch(e){safeError(e,"Coupon failed");return NextResponse.json({error:"Discount code could not be issued yet. Please try again later."},{status:503});}
}
