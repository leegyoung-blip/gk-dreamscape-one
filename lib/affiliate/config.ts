export const AFFILIATE_TERMS_VERSION = "affiliate-terms-v3-2026-08-11";
export const PRIVACY_VERSION = "privacy-v1-2026-08-01";

export const AFFILIATE_ROUTES = {
  programme: "/affiliate",
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

export function getSiteUrl(): string {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) {
    throw new Error("NEXT_PUBLIC_SITE_URL is not configured");
  }
  return value.replace(/\/$/, "");
}

export function getReferralDestinationPath(): string {
  return (
    process.env.NEXT_PUBLIC_AFFILIATE_REFERRAL_DESTINATION_PATH?.trim() ||
    "/signup"
  );
}
