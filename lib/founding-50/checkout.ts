import { adminDb } from "./server";

/**
 * Server-only checkout integration. Call only AFTER verifying logged-in user ID;
 * never accept the user ID or selected price from an untrusted client without
 * independently validating them against your checkout session selection.
 *
 * Add to your existing Stripe subscription checkout builder:
 *   const promotionCodeId = await getF50MonthlyCheckoutPromotionCode(user.id, selectedPriceId);
 *   if (promotionCodeId) sessionParams.discounts = [{ promotion_code: promotionCodeId }];
 *
 * Do not enable general promo-code entry for annual plans sharing the same
 * Stripe product, unless you separately enforce the correct price restrictions.
 */
export async function getF50MonthlyCheckoutPromotionCode(userId:string, selectedPriceId:string){
 const priceId=process.env.FOUNDING50_NOVA_PLUS_MONTHLY_PRICE_ID;
 if(!priceId || selectedPriceId!==priceId)return null;
 const db=adminDb();
 const {data:app,error}=await db.from("founding_50_applications")
  .select("id,beta_ends_at,survey_completed_at,status")
  .eq("account_user_id",userId).maybeSingle();
 if(error)throw error;
 if(!app || app.status!=="activated"||!app.survey_completed_at||!app.beta_ends_at||Date.now()<Date.parse(app.beta_ends_at))return null;
 const {data:discount,error:discountErr}=await db.from("founding_50_discounts")
  .select("state,stripe_promotion_code_id,redeem_by").eq("application_id",app.id).maybeSingle();
 if(discountErr)throw discountErr;
 if(discount?.state!=="issued"||!discount.stripe_promotion_code_id ||!discount.redeem_by||Date.now()>Date.parse(discount.redeem_by))return null;
 return discount.stripe_promotion_code_id as string;
}
