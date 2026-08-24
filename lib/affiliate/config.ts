export const AFFILIATE_TERMS_VERSION = "affiliate-terms-v2-2026-08-03";

export const PRIVACY_VERSION = "privacy-v1-2026-08-01";

export const AFFILIATE_ROUTES = {
  terms: "/affiliate-terms",
  privacy: "/privacy",
  login: "/login",
  signup: "/signup",
  application: "/affiliate/apply",
  received: "/affiliate/application-received",
  onboarding: "/affiliate/onboarding",
  welcome: "/affiliate/welcome",
  adminList: "/admin/affiliates",
} as const;

export const AFFILIATE_ATTRIBUTION_COOKIE = "dreamscape_affiliate_ref";
export const AFFILIATE_CLICK_COOKIE = "dreamscape_affiliate_click";
export const AFFILIATE_ATTRIBUTION_COOKIE_DAYS = 30;

export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (!value) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  }

  return value.replace(/\/$/, "");
}

export function getReferralDestinationPath(): string {
  const configured =
    process.env.NEXT_PUBLIC_AFFILIATE_REFERRAL_DESTINATION_PATH?.trim();

  // /signup does not exist in the current Dreamscape purchase flow.
  // Keep older environment settings from sending affiliates to a 404.
  if (!configured || configured === "/signup") {
    return "/pricing";
  }

  // Only allow internal paths here.
  if (!configured.startsWith("/") || configured.startsWith("//")) {
    return "/pricing";
  }

  return configured;
}

export function getAffiliateReferralPath(referralCode: string): string {
  return `/r/${encodeURIComponent(referralCode.trim())}`;
}
