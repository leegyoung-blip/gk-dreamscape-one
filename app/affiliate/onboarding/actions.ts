"use server";

import { redirect } from "next/navigation";
import {
  AFFILIATE_ROUTES,
  AFFILIATE_TERMS_VERSION,
  PRIVACY_VERSION,
  getAffiliateReferralPath,
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

function isSingaporeCountry(country: string): boolean {
  return country.trim().toLowerCase().includes("singapore");
}

async function createUniqueReferralCode(seed: string): Promise<string> {
  const admin = createAdminClient();

  for (let attempt = 0; attempt < 10; attempt += 1) {
    // Prefix affiliate codes so they are clearly distinct from Dreamscape's
    // ordinary member-to-member referral codes.
    const code = `AFF${buildReferralCode(seed)}`;

    const { data, error } = await admin
      .from("affiliate_partners")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();

    if (error) {
      throw new Error(`Unable to check affiliate referral code: ${error.message}`);
    }

    if (!data) return code;
  }

  throw new Error("Unable to generate a unique affiliate referral code");
}

export async function completeAffiliateOnboarding(
  _previousState: OnboardingFormState,
  formData: FormData,
): Promise<OnboardingFormState> {
  const parsed = affiliateOnboardingSchema.safeParse({
    token: formData.get("token"),
    phone: formData.get("phone"),
    paynowProxyType: formData.get("paynow_proxy_type") || undefined,
    paynowProxyValue: formData.get("paynow_proxy_value"),
    payeeName: formData.get("payee_name"),
    termsAccepted: checked(formData, "terms_accepted"),
    privacyAccepted: checked(formData, "privacy_accepted"),
    payoutConfirmed: checked(formData, "payout_confirmed"),
    commissionAccepted: checked(formData, "commission_accepted"),
    eligibilityAccepted: checked(formData, "eligibility_accepted"),
    periodAccepted: checked(formData, "period_accepted"),
    disclosureAccepted: checked(formData, "disclosure_accepted"),
    conductAccepted: checked(formData, "conduct_accepted"),
    reversalAccepted: checked(formData, "reversal_accepted"),
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
      error:
        "Your session has expired. Sign in again using your approved email address.",
    };
  }

  const value = parsed.data;
  const tokenHash = hashToken(value.token);
  const admin = createAdminClient();

  const { data: tokenRow, error: tokenError } = await admin
    .from("affiliate_onboarding_tokens")
    .select("application_id, partner_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    console.error("Affiliate onboarding token lookup failed", tokenError);
    return {
      error: "We could not validate this approval link. Please try again.",
    };
  }

  if (
    !tokenRow ||
    tokenRow.used_at ||
    new Date(tokenRow.expires_at).getTime() <= Date.now()
  ) {
    return {
      error: "This approval link is invalid, expired, or already used.",
    };
  }

  const [{ data: application }, { data: partner }] = await Promise.all([
    admin
      .from("affiliate_applications")
      .select(
        "id, email, legal_name, display_name, business_name, country, status",
      )
      .eq("id", tokenRow.application_id)
      .maybeSingle(),
    admin
      .from("affiliate_partners")
      .select(
        "id, application_id, commission_rate, partner_type, status, user_id",
      )
      .eq("id", tokenRow.partner_id)
      .maybeSingle(),
  ]);

  if (!application || !partner) {
    return { error: "The approved affiliate record could not be found." };
  }

  if (
    partner.application_id !== application.id ||
    application.status !== "approved_pending_onboarding" ||
    partner.status !== "approved_pending_onboarding"
  ) {
    return {
      error:
        "This affiliate registration is no longer awaiting onboarding. Contact admin@gurukidspro.com if you need help.",
    };
  }

  if (application.email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      error: `Sign in using the approved email address: ${application.email}`,
    };
  }

  if (partner.user_id && partner.user_id !== user.id) {
    return {
      error:
        "This approved affiliate record is already linked to another account. Contact admin@gurukidspro.com.",
    };
  }

  const isSingapore = isSingaporeCountry(application.country);
  const payoutMethod = isSingapore ? "paynow" : "international_manual";

  if (isSingapore) {
    if (!value.paynowProxyType) {
      return {
        error: "Please complete your PayNow payout details.",
        fieldErrors: {
          paynowProxyType: ["Select a PayNow proxy type"],
        },
      };
    }

    if (!value.paynowProxyValue || value.paynowProxyValue.length < 4) {
      return {
        error: "Please complete your PayNow payout details.",
        fieldErrors: {
          paynowProxyValue: ["Enter the PayNow proxy value"],
        },
      };
    }
  }

  let encrypted = {
    ciphertext: null as string | null,
    iv: null as string | null,
    authTag: null as string | null,
    last4: null as string | null,
  };

  if (isSingapore) {
    try {
      encrypted = encryptSensitiveValue(value.paynowProxyValue);
    } catch (error) {
      console.error("Affiliate payout encryption failed", error);
      return {
        error:
          "Payout setup is temporarily unavailable. Please contact admin@gurukidspro.com.",
      };
    }
  }

  let referralCode: string;
  try {
    referralCode = await createUniqueReferralCode(
      application.business_name || application.display_name || application.legal_name,
    );
  } catch (error) {
    console.error("Affiliate referral code generation failed", error);
    return {
      error:
        "We could not create your affiliate referral code. Please try again.",
    };
  }

  const { data: activatedPartnerId, error: activationError } = await admin.rpc(
    "activate_affiliate_partner",
    {
      p_token_hash: tokenHash,
      p_user_id: user.id,
      // These identity values come from the reviewed application, never from
      // client-editable onboarding inputs.
      p_legal_name: application.legal_name,
      p_business_name: application.business_name || "",
      p_phone: value.phone,
      p_country: application.country,
      p_payout_method: payoutMethod,
      p_paynow_proxy_type: isSingapore ? value.paynowProxyType : null,
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

  if (activationError || !activatedPartnerId) {
    console.error("Affiliate activation failed", activationError);

    const duplicateCode = activationError?.message
      ?.toLowerCase()
      .includes("duplicate");

    return {
      error: duplicateCode
        ? "The affiliate referral code could not be reserved. Please submit the form again."
        : activationError?.message ||
          "Affiliate activation failed. Please contact admin@gurukidspro.com.",
    };
  }

  const siteUrl = getSiteUrl();

  const referralLink = `${siteUrl}${getAffiliateReferralPath(referralCode)}`;

  const emailSent = await sendActivationEmail({
    to: application.email,
    name: application.display_name || application.legal_name,
    commissionRate: Number(partner.commission_rate),
    referralCode,
    referralLink,
    welcomeUrl: `${siteUrl}${AFFILIATE_ROUTES.welcome}`,
  });

  redirect(
    emailSent
      ? AFFILIATE_ROUTES.welcome
      : `${AFFILIATE_ROUTES.welcome}?notice=${encodeURIComponent(
          "Your affiliate account is active, but the welcome email could not be delivered. Your referral details are shown below.",
        )}`,
  );
}
