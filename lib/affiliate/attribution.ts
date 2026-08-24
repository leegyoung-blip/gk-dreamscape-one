import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  AFFILIATE_ATTRIBUTION_COOKIE,
  AFFILIATE_CLICK_COOKIE,
} from "@/lib/affiliate/config";

export type ActiveAffiliateAttribution = {
  id: string;
  email: string;
  referralCode: string;
};

export type CheckoutAffiliateAttribution = {
  partnerId: string | null;
  referralCode: string | null;
  clickId: string | null;
  source: "cookie" | "body" | "referer" | null;
  rejectedReason: string | null;
};

function decodeCookieValue(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCookieValue(
  cookieHeader: string | null,
  name: string,
): string {
  if (!cookieHeader) return "";

  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");

    if (rawName === name) {
      return decodeCookieValue(rawValue.join("=")).trim();
    }
  }

  return "";
}

export function normaliseAffiliateReferralCode(value: unknown): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 80);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export async function findActiveAffiliateByCode(
  rawCode: unknown,
): Promise<ActiveAffiliateAttribution | null> {
  const code = normaliseAffiliateReferralCode(rawCode);

  if (!code) return null;

  const { data, error } = await supabaseAdmin
    .from("affiliate_partners")
    .select("id,email,referral_code,status")
    .eq("referral_code", code)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(`Could not validate affiliate referral code: ${error.message}`);
  }

  if (!data?.id || !data.referral_code) {
    return null;
  }

  return {
    id: String(data.id),
    email: String(data.email || "").trim().toLowerCase(),
    referralCode: String(data.referral_code).trim(),
  };
}

function affiliateCodeFromReferer(request: Request): string {
  const referer = request.headers.get("referer");

  if (!referer) return "";

  try {
    return normaliseAffiliateReferralCode(
      new URL(referer).searchParams.get("affiliate_ref"),
    );
  } catch {
    return "";
  }
}

function affiliateCodeFromRequestUrl(request: Request): string {
  try {
    return normaliseAffiliateReferralCode(
      new URL(request.url).searchParams.get("affiliate_ref"),
    );
  } catch {
    return "";
  }
}

function candidateFromRequest(
  request: Request,
  bodyAffiliateRef?: unknown,
): {
  code: string;
  source: "cookie" | "body" | "referer" | null;
} {
  const cookieCode = normaliseAffiliateReferralCode(
    readCookieValue(
      request.headers.get("cookie"),
      AFFILIATE_ATTRIBUTION_COOKIE,
    ),
  );

  if (cookieCode) {
    return { code: cookieCode, source: "cookie" };
  }

  const bodyCode = normaliseAffiliateReferralCode(bodyAffiliateRef);

  if (bodyCode) {
    return { code: bodyCode, source: "body" };
  }

  const urlCode = affiliateCodeFromRequestUrl(request);

  if (urlCode) {
    return { code: urlCode, source: "referer" };
  }

  const refererCode = affiliateCodeFromReferer(request);

  if (refererCode) {
    return { code: refererCode, source: "referer" };
  }

  return { code: "", source: null };
}

export async function resolveAffiliateAttributionForCheckout(input: {
  request: Request;
  parentEmail: string;
  learnerEmail: string;
  bodyAffiliateRef?: unknown;
}): Promise<CheckoutAffiliateAttribution> {
  const candidate = candidateFromRequest(
    input.request,
    input.bodyAffiliateRef,
  );

  if (!candidate.code) {
    return {
      partnerId: null,
      referralCode: null,
      clickId: null,
      source: null,
      rejectedReason: null,
    };
  }

  const partner = await findActiveAffiliateByCode(candidate.code);

  if (!partner) {
    return {
      partnerId: null,
      referralCode: null,
      clickId: null,
      source: candidate.source,
      rejectedReason: "invalid_or_inactive_affiliate",
    };
  }

  const parentEmail = input.parentEmail.trim().toLowerCase();
  const learnerEmail = input.learnerEmail.trim().toLowerCase();

  if (
    partner.email &&
    (partner.email === parentEmail || partner.email === learnerEmail)
  ) {
    return {
      partnerId: null,
      referralCode: null,
      clickId: null,
      source: candidate.source,
      rejectedReason: "self_referral",
    };
  }

  let clickId: string | null = null;

  const rawClickId = readCookieValue(
    input.request.headers.get("cookie"),
    AFFILIATE_CLICK_COOKIE,
  );

  if (isUuid(rawClickId)) {
    const { data: click, error } = await supabaseAdmin
      .from("affiliate_referral_clicks")
      .select("id")
      .eq("id", rawClickId)
      .eq("attributed_partner_id", partner.id)
      .maybeSingle();

    if (error) {
      console.error("Affiliate click validation failed", error);
    } else if (click?.id) {
      clickId = String(click.id);
    }
  }

  return {
    partnerId: partner.id,
    referralCode: partner.referralCode,
    clickId,
    source: candidate.source,
    rejectedReason: null,
  };
}
