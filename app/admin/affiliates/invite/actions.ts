"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/affiliate/auth";
import { AFFILIATE_ROUTES, getSiteUrl } from "@/lib/affiliate/config";
import { sendAffiliateInviteEmail } from "@/lib/affiliate/email";
import { createRawToken, hashToken } from "@/lib/affiliate/security";

export type InviteAffiliateFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

const inviteAffiliateSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the affiliate's name").max(120),
  displayName: z.string().trim().max(120).optional().default(""),
  email: z.string().trim().email("Enter a valid email address").max(200),
  phone: z.string().trim().min(7, "Enter a valid mobile number").max(40),
  country: z.string().trim().min(2, "Enter a country").max(100),
  businessName: z.string().trim().max(180).optional().default(""),
  registrationNumber: z.string().trim().max(80).optional().default(""),
  partnerType: z.enum(["standard", "kol", "business", "educator"]),
  commissionRate: z.preprocess(
    (value) => Number(value),
    z
      .number()
      .finite()
      .min(1, "Commission must be at least 1%")
      .max(20, "Commission cannot exceed 20%"),
  ),
  adminNotes: z.string().trim().max(3000).optional().default(""),
});

function applicantTypeForPartner(
  partnerType: "standard" | "kol" | "business" | "educator",
) {
  if (partnerType === "business") return "registered_business";
  if (partnerType === "kol") return "content_creator";
  return "individual";
}

export async function inviteAffiliatePartner(
  _previousState: InviteAffiliateFormState,
  formData: FormData,
): Promise<InviteAffiliateFormState> {
  const parsed = inviteAffiliateSchema.safeParse({
    legalName: formData.get("legal_name"),
    displayName: formData.get("display_name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    country: formData.get("country"),
    businessName: formData.get("business_name"),
    registrationNumber: formData.get("registration_number"),
    partnerType: formData.get("partner_type"),
    commissionRate: formData.get("commission_rate"),
    adminNotes: formData.get("admin_notes"),
  });

  if (!parsed.success) {
    return {
      error: "Please review the invitation details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const value = parsed.data;
  const { user, admin } = await requireAdmin();

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { data, error } = await admin.rpc("invite_affiliate_partner", {
    p_invited_by: user.id,
    p_legal_name: value.legalName,
    p_display_name: value.displayName || null,
    p_email: value.email.toLowerCase(),
    p_phone: value.phone,
    p_country: value.country,
    p_applicant_type: applicantTypeForPartner(value.partnerType),
    p_business_name: value.businessName || null,
    p_registration_number: value.registrationNumber || null,
    p_partner_type: value.partnerType,
    p_commission_rate: value.commissionRate,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
    p_admin_notes: value.adminNotes || null,
  });

  if (error) {
    console.error("Direct affiliate invitation failed", error);

    const duplicate =
      /already (has|exists)|existing affiliate|already linked/i.test(
        error.message || "",
      );

    return {
      error: duplicate
        ? "This email already has an affiliate application or partner record that should be managed instead of creating a duplicate."
        : error.message || "The affiliate invitation could not be created.",
    };
  }

  const result = data as
    | {
        application_id?: string;
        partner_id?: string;
        application_number?: string;
      }
    | null;

  if (!result?.application_id) {
    return {
      error:
        "The affiliate record was created incompletely. Please check Affiliate Applications before trying again.",
    };
  }

  const onboardingUrl =
    `${getSiteUrl()}${AFFILIATE_ROUTES.onboarding}` +
    `?token=${encodeURIComponent(rawToken)}`;

  const emailSent = await sendAffiliateInviteEmail({
    to: value.email.toLowerCase(),
    name: value.displayName || value.legalName,
    commissionRate: value.commissionRate,
    onboardingUrl,
    expiresAt: expiresAt.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });

  const detailUrl = `/admin/affiliates/${result.application_id}`;

  redirect(
    `${detailUrl}?${emailSent ? "success" : "error"}=${encodeURIComponent(
      emailSent
        ? "Affiliate invitation created and onboarding email sent."
        : "Affiliate invitation was created, but the email could not be sent. Use “Send a new onboarding link” from this record.",
    )}`,
  );
}
