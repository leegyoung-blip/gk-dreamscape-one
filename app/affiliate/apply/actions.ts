"use server";

import { redirect } from "next/navigation";
import {
  AFFILIATE_ROUTES,
  AFFILIATE_TERMS_VERSION,
  PRIVACY_VERSION,
  getSiteUrl,
} from "@/lib/affiliate/config";
import {
  sendAdminApplicationAlert,
  sendApplicationReceivedEmail,
} from "@/lib/affiliate/email";
import { affiliateApplicationSchema } from "@/lib/affiliate/validation";
import { createAdminClient } from "@/lib/supabase/admin";

export type ApplicationFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function checked(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}

export async function submitAffiliateApplication(
  _previousState: ApplicationFormState,
  formData: FormData,
): Promise<ApplicationFormState> {
  const honeypot = String(formData.get("company_website") ?? "").trim();
  if (honeypot) {
    return { error: "Your application could not be submitted." };
  }

  const parsed = affiliateApplicationSchema.safeParse({
    legalName: formData.get("legal_name"),
    displayName: formData.get("display_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    applicantType: formData.get("applicant_type"),
    businessName: formData.get("business_name"),
    registrationNumber: formData.get("registration_number"),
    website: formData.get("website"),
    instagram: formData.get("instagram"),
    tiktok: formData.get("tiktok"),
    facebook: formData.get("facebook"),
    youtube: formData.get("youtube"),
    linkedin: formData.get("linkedin"),
    otherSocial: formData.get("other_social"),
    promotionChannels: formData.getAll("promotion_channels").map(String),
    audienceDescription: formData.get("audience_description"),
    audienceSize: formData.get("audience_size"),
    audienceCountries: formData.get("audience_countries"),
    promotionPlan: formData.get("promotion_plan"),
    expectedReferrals: formData.get("expected_referrals"),
    programmeRequested: formData.get("programme_requested"),
    ageConfirmed: checked(formData, "age_confirmed"),
    informationConfirmed: checked(formData, "information_confirmed"),
    termsAccepted: checked(formData, "terms_accepted"),
    privacyAccepted: checked(formData, "privacy_accepted"),
    conductAccepted: checked(formData, "conduct_accepted"),
  });

  if (!parsed.success) {
    return {
      error: "Please review the highlighted information and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const value = parsed.data;
  const email = value.email.toLowerCase();

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (adminClientError) {
    console.error("Affiliate admin client could not be created", adminClientError);
    return {
      error:
        "We could not submit your application right now. Please try again or email admin@gurukidspro.com.",
    };
  }

  const { data: existing, error: existingError } = await admin
    .from("affiliate_applications")
    .select("id, status")
    .eq("email", email)
    .in("status", [
      "submitted",
      "under_review",
      "information_requested",
      "approved_pending_onboarding",
      "active",
    ])
    .limit(1)
    .maybeSingle();

  if (existingError) {
    console.error("Affiliate duplicate-application check failed", existingError);
    return {
      error:
        "We could not verify your application status. Please try again or email admin@gurukidspro.com.",
    };
  }

  if (existing) {
    return {
      error:
        "An active or pending application already exists for this email address. Contact admin@gurukidspro.com if you need help.",
    };
  }

  const acceptedAt = new Date().toISOString();
  const socialLinks = Object.fromEntries(
    Object.entries({
      instagram: value.instagram,
      tiktok: value.tiktok,
      facebook: value.facebook,
      youtube: value.youtube,
      linkedin: value.linkedin,
      other: value.otherSocial,
    }).filter(([, link]) => Boolean(link)),
  );

  const { data: application, error: insertError } = await admin
    .from("affiliate_applications")
    .insert({
      legal_name: value.legalName,
      display_name: value.displayName || null,
      email,
      phone: value.phone,
      country: value.country,
      applicant_type: value.applicantType,
      business_name: value.businessName || null,
      registration_number: value.registrationNumber || null,
      website: value.website || null,
      social_links: socialLinks,
      promotion_channels: value.promotionChannels,
      audience_description: value.audienceDescription,
      audience_size: value.audienceSize ?? null,
      audience_countries: value.audienceCountries || null,
      promotion_plan: value.promotionPlan,
      expected_referrals: value.expectedReferrals ?? null,
      programme_requested: value.programmeRequested,
      terms_version: AFFILIATE_TERMS_VERSION,
      terms_accepted_at: acceptedAt,
      privacy_version: PRIVACY_VERSION,
      privacy_accepted_at: acceptedAt,
      declarations: {
        age_confirmed: true,
        information_confirmed: true,
        conduct_accepted: true,
      },
    })
    .select("id, application_number")
    .single();

  if (insertError || !application) {
    console.error("Affiliate application insert failed", insertError);
    return {
      error:
        "We could not save your application. Please try again or email admin@gurukidspro.com.",
    };
  }

  const { error: acceptanceError } = await admin
    .from("affiliate_terms_acceptances")
    .insert({
      application_id: application.id,
      email,
      terms_version: AFFILIATE_TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      acceptance_method: "application_checkbox",
      accepted_at: acceptedAt,
      metadata: { source: "public_affiliate_application" },
    });

  // The application row already records the accepted terms/privacy versions and
  // timestamps. Do not make the applicant resubmit a successfully saved
  // application if the secondary acceptance-audit insert has a transient issue.
  if (acceptanceError) {
    console.error(
      "Affiliate terms acceptance audit insert failed",
      acceptanceError,
    );
  }

  const emailTasks: Promise<unknown>[] = [
    sendApplicationReceivedEmail({
      to: email,
      name: value.displayName || value.legalName,
      applicationNumber: application.application_number,
    }),
  ];

  try {
    const siteUrl = getSiteUrl();
    emailTasks.push(
      sendAdminApplicationAlert({
        applicationNumber: application.application_number,
        legalName: value.legalName,
        email,
        applicantType: value.applicantType,
        programmeRequested: value.programmeRequested,
        adminUrl: `${siteUrl}${AFFILIATE_ROUTES.adminList}/${application.id}`,
      }),
    );
  } catch (siteUrlError) {
    console.error(
      "Affiliate admin alert skipped because site URL is unavailable",
      siteUrlError,
    );
  }

  const emailResults = await Promise.allSettled(emailTasks);
  for (const result of emailResults) {
    if (result.status === "rejected") {
      console.error("Affiliate application email failed", result.reason);
    }
  }

  redirect(
    `${AFFILIATE_ROUTES.received}?ref=${encodeURIComponent(
      application.application_number,
    )}`,
  );
}
