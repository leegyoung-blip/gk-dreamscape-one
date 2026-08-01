"use server";

import { redirect } from "next/navigation";
import {
  AFFILIATE_ROUTES,
  AFFILIATE_TERMS_VERSION,
  PRIVACY_VERSION,
  getReferralDestinationPath,
  getSiteUrl,
} from "@/lib/affiliate/config";
import { sendActivationEmail } from "@/lib/affiliate/email";
import {
  buildReferralCode,
  encryptSensitiveValue,
  hashToken,
} from "@/lib/affiliate/security";
import { affiliateOnboardingSchema } from "@/lib/affiliate/validation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type OnboardingFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

async function createUniqueReferralCode(seed: string): Promise<string> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = buildReferralCode(seed);
    const { data } = await admin
      .from("affiliate_partners")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (!data) return code;
  }

  throw new Error("Unable to generate a unique referral code");
}

export async function completeAffiliateOnboarding(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = affiliateOnboardingSchema.safeParse({
    token: formData.get("token"),
    legalName: formData.get("legal_name"),
    businessName: formData.get("business_name"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    payoutMethod: formData.get("payout_method"),
    paynowProxyType: formData.get("paynow_proxy_type") || undefined,
    paynowProxyValue: formData.get("paynow_proxy_value"),
    payeeName: formData.get("payee_name"),
    termsAccepted: checked(formData, "terms_accepted"),
    payoutConfirmed: checked(formData, "payout_confirmed"),
    billingRuleAccepted: checked(formData, "billing_rule_accepted"),
    participationRuleAccepted: checked(formData, "participation_rule_accepted"),
    brandRulesAccepted: checked(formData, "brand_rules_accepted"),
  });

  if (!parsed.success) {
    return {
      error: "Please complete all required onboarding information.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const user = await getCurrentUser();
  if (!user?.email) {
    return {
      error: "Your session has expired. Sign in again using your approved email address.",
    };
  }

  const value = parsed.data;
  const tokenHash = hashToken(value.token);
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("affiliate_onboarding_tokens")
    .select("application_id, partner_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (
    !tokenRow ||
    tokenRow.used_at ||
    new Date(tokenRow.expires_at).getTime() <= Date.now()
  ) {
    return { error: "This approval link is invalid, expired, or already used." };
  }

  const [{ data: application }, { data: partner }] = await Promise.all([
    admin
      .from("affiliate_applications")
      .select("email, legal_name, display_name")
      .eq("id", tokenRow.application_id)
      .single(),
    admin
      .from("affiliate_partners")
      .select("id, commission_rate, business_name")
      .eq("id", tokenRow.partner_id)
      .single(),
  ]);

  if (!application || !partner) {
    return { error: "The approved affiliate record could not be found." };
  }

  if (application.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: `Sign in using the approved email address: ${application.email}`,
    };
  }

  let encrypted = {
    ciphertext: null as string | null,
    iv: null as string | null,
    authTag: null as string | null,
    last4: null as string | null,
  };

  if (value.payoutMethod === "paynow") {
    const result = encryptSensitiveValue(value.paynowProxyValue);
    encrypted = result;
  }

  const referralCode = await createUniqueReferralCode(
    value.businessName || application.display_name || value.legalName,
  );

  const { data: activatedPartnerId, error } = await admin.rpc(
    "activate_affiliate_partner",
    {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      p_legal_name: value.legalName,
      p_business_name: value.businessName,
      p_phone: value.phone,
      p_country: value.country,
      p_payout_method: value.payoutMethod,
      p_paynow_proxy_type:
        value.payoutMethod === "paynow" ? value.paynowProxyType : null,
      p_paynow_value_encrypted: encrypted.ciphertext,
      p_paynow_iv: encrypted.iv,
      p_paynow_auth_tag: encrypted.authTag,
      p_paynow_last4: encrypted.last4,
      p_payee_name: value.payeeName,
      p_terms_version: AFFILIATE_TERMS_VERSION,
      p_privacy_version: PRIVACY_VERSION,
      p_referral_code: referralCode,
    },
  );

  if (error || !activatedPartnerId) {
    console.error("Affiliate activation failed", error);
    const message = error?.message?.includes("duplicate key")
      ? "The referral code could not be reserved. Please submit the form again."
      : error?.message || "Affiliate activation failed. Please contact admin@gurukidspro.com.";
    return { error: message };
  }

  const siteUrl = getSiteUrl();
  const referralLink = `${siteUrl}${getReferralDestinationPath()}?ref=${encodeURIComponent(referralCode)}`;

  await sendActivationEmail({
    to: application.email,
    name: application.display_name || value.legalName,
    commissionRate: Number(partner.commission_rate),
    referralCode,
    referralLink,
    welcomeUrl: `${siteUrl}${AFFILIATE_ROUTES.welcome}`,
  });

  redirect(AFFILIATE_ROUTES.welcome);
}
