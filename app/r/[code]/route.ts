import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  AFFILIATE_ATTRIBUTION_COOKIE,
  AFFILIATE_ATTRIBUTION_COOKIE_DAYS,
  AFFILIATE_CLICK_COOKIE,
  getReferralDestinationPath,
} from "@/lib/affiliate/config";
import {
  findActiveAffiliateByCode,
  normaliseAffiliateReferralCode,
  readCookieValue,
} from "@/lib/affiliate/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = {
  params: Promise<{ code: string }>;
};

function campaignData(url: URL): Record<string, string> {
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "utm_term",
  ] as const;

  const data: Record<string, string> = {};

  for (const key of keys) {
    const value = (url.searchParams.get(key) || "").trim().slice(0, 200);

    if (value) {
      data[key] = value;
    }
  }

  return data;
}

export async function GET(request: Request, context: Params) {
  const { code: rawCode } = await context.params;
  const requestedCode = normaliseAffiliateReferralCode(rawCode);
  const origin = new URL(request.url).origin;
  const destination = new URL(getReferralDestinationPath(), origin);

  if (!requestedCode) {
    destination.searchParams.set("affiliate", "invalid");
    return NextResponse.redirect(destination, 302);
  }

  const clickedPartner = await findActiveAffiliateByCode(requestedCode);

  if (!clickedPartner) {
    destination.searchParams.set("affiliate", "invalid");
    return NextResponse.redirect(destination, 302);
  }

  /*
   * First valid affiliate attribution wins for this browser.
   * If a valid active affiliate cookie already exists, clicking a different
   * affiliate's link does not overwrite it.
   */
  const existingCode = readCookieValue(
    request.headers.get("cookie"),
    AFFILIATE_ATTRIBUTION_COOKIE,
  );

  const existingPartner = existingCode
    ? await findActiveAffiliateByCode(existingCode)
    : null;

  const attributedPartner = existingPartner || clickedPartner;
  const accepted = !existingPartner || existingPartner.id === clickedPartner.id;

  const { data: click, error: clickError } = await supabaseAdmin
    .from("affiliate_referral_clicks")
    .insert({
      clicked_partner_id: clickedPartner.id,
      clicked_referral_code: clickedPartner.referralCode,
      attributed_partner_id: attributedPartner.id,
      attributed_referral_code: attributedPartner.referralCode,
      attribution_status: accepted ? "accepted" : "ignored_existing",
      destination_path: destination.pathname,
      campaign_data: campaignData(new URL(request.url)),
    })
    .select("id")
    .single();

  if (clickError) {
    console.error("Affiliate referral click could not be recorded", clickError);
  }

  destination.searchParams.set(
    "affiliate_ref",
    attributedPartner.referralCode,
  );

  for (const [key, value] of Object.entries(campaignData(new URL(request.url)))) {
    destination.searchParams.set(key, value);
  }

  const response = NextResponse.redirect(destination, 302);
  response.headers.set("Cache-Control", "no-store");

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: AFFILIATE_ATTRIBUTION_COOKIE_DAYS * 24 * 60 * 60,
  };

  /*
   * Refresh the winning attribution cookie. This does not change which
   * affiliate owns the attribution when another affiliate link is clicked.
   */
  response.cookies.set(
    AFFILIATE_ATTRIBUTION_COOKIE,
    attributedPartner.referralCode,
    cookieOptions,
  );

  if (accepted && click?.id) {
    response.cookies.set(
      AFFILIATE_CLICK_COOKIE,
      String(click.id),
      cookieOptions,
    );
  }

  return response;
}
