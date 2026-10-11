/**
 * Stripe coupon: 30% for six MONTHS, on one configured NOVA+ product only.
 * Use monthly checkout, with promotion codes enabled or applied explicitly.
 * Stripe's 'repeating' coupons are deprecated in newer API versions; test against
 * your account's pinned API version before launch.
 */
async function stripeCall(path: string, body: URLSearchParams, idempotencyKey: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY not configured");
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": idempotencyKey,
    },
    body: body.toString(), cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Stripe ${path} failed: ${result?.error?.code || response.status}`);
  return result as { id: string; code?: string };
}

async function stripeGet(path: string) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_SECRET_KEY not configured");
  const response=await fetch(`https://api.stripe.com/v1/${path}`, {headers:{Authorization:`Bearer ${secret}`},cache:"no-store"});
  if(!response.ok)throw new Error(`Stripe lookup failed (${response.status})`);
  return response.json();
}

export async function issueF50PromotionCode(applicationId: string, redeemBy: Date) {
  const productId = process.env.FOUNDING50_NOVA_PLUS_STRIPE_PRODUCT_ID;
  if (!productId || !/^prod_[a-zA-Z0-9]+$/.test(productId)) {
    throw new Error("FOUNDING50_NOVA_PLUS_STRIPE_PRODUCT_ID missing or invalid");
  }
  const couponId = `f50_${applicationId.replace(/-/g, "")}`;
  const params = new URLSearchParams({ id: couponId, name: "Dreamscape Founding 50 - 30% / 6 months", percent_off: "30", duration: "repeating", duration_in_months: "6",
    "applies_to[products][0]": productId, "metadata[founding_50_application]": applicationId });
  let coupon: { id:string };
  try {coupon=await stripeCall("coupons", params, `f50-coupon-${applicationId}`);}
  catch (error) {
    // Stripe idempotency keys can expire; safely recover by deterministic coupon ID.
    const existing=await stripeGet(`coupons/${couponId}`);
    if(existing.percent_off!==30 || existing.duration!=="repeating" || existing.duration_in_months!==6 || existing.metadata?.founding_50_application!==applicationId)
      throw new Error("Stripe coupon ID collision; manual recovery required");
    coupon={id:existing.id};
  }
  const code = `F50${applicationId.replace(/-/g, "").slice(0, 20).toUpperCase()}`;
  let promotion: {id:string;code?:string};
  try {promotion=await stripeCall("promotion_codes", new URLSearchParams({
    coupon: coupon.id, code, max_redemptions: "1",
    expires_at: String(Math.floor(redeemBy.getTime()/1000)),
    "metadata[founding_50_application]": applicationId,
  }), `f50-promo-${applicationId}`);}
  catch (error) {
    const existing=await stripeGet(`promotion_codes?code=${encodeURIComponent(code)}&limit=10`);
    const match=existing.data?.find((p:{coupon?:{id:string}|string,code?:string}) =>
      (typeof p.coupon==="string"?p.coupon:p.coupon?.id)===coupon.id && p.code?.toUpperCase()===code);
    if(!match)throw error;
    promotion={id:match.id,code:match.code};
  }
  return { code: promotion.code || code, couponId: coupon.id, promotionCodeId: promotion.id };
}
