"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/affiliate/auth";
import { AFFILIATE_ROUTES, getSiteUrl } from "@/lib/affiliate/config";
import {
  sendApprovalEmail,
  sendInformationRequestedEmail,
  sendRejectionEmail,
} from "@/lib/affiliate/email";
import { createRawToken, hashToken } from "@/lib/affiliate/security";

function messageUrl(id: string, type: "success" | "error", message: string) {
  return `/admin/affiliates/${id}?${type}=${encodeURIComponent(message)}`;
}

export async function markAffiliateUnderReview(formData: FormData) {
  const id = String(formData.get("application_id") ?? "");
  const { user, admin } = await requireAdmin();

  const { error } = await admin
    .from("affiliate_applications")
    .update({
      status: "under_review",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", id)
    .in("status", ["submitted", "information_requested"]);

  if (error) {
    redirect(messageUrl(id, "error", error.message));
  }

  await admin.from("affiliate_admin_audit_log").insert({
    application_id: id,
    actor_user_id: user.id,
    action: "marked_under_review",
  });

  revalidatePath(AFFILIATE_ROUTES.adminList);
  revalidatePath(`/admin/affiliates/${id}`);
  redirect(messageUrl(id, "success", "Application marked as under review."));
}

export async function approveAffiliateApplication(formData: FormData) {
  const id = String(formData.get("application_id") ?? "");
  const partnerType = String(formData.get("partner_type") ?? "standard");
  const commissionRate = Number(formData.get("commission_rate") ?? 20);
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  if (!id || !["standard", "kol", "business", "educator"].includes(partnerType)) {
    redirect(messageUrl(id, "error", "Invalid approval details."));
  }

  if (!Number.isFinite(commissionRate) || commissionRate <= 0 || commissionRate > 40) {
    redirect(messageUrl(id, "error", "Commission must be between 0 and 40%."));
  }

  const { user, admin } = await requireAdmin();
  const { data: application } = await admin
    .from("affiliate_applications")
    .select("legal_name, display_name, email")
    .eq("id", id)
    .single();

  if (!application) {
    redirect(messageUrl(id, "error", "Application not found."));
  }

  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const { error } = await admin.rpc("approve_affiliate_application", {
    p_application_id: id,
    p_reviewed_by: user.id,
    p_partner_type: partnerType,
    p_commission_rate: commissionRate,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt.toISOString(),
    p_admin_notes: adminNotes || null,
  });

  if (error) {
    console.error("Affiliate approval failed", error);
    redirect(messageUrl(id, "error", error.message));
  }

  const onboardingUrl = `${getSiteUrl()}${AFFILIATE_ROUTES.onboarding}?token=${encodeURIComponent(rawToken)}`;
  await sendApprovalEmail({
    to: application.email,
    name: application.display_name || application.legal_name,
    commissionRate,
    onboardingUrl,
    expiresAt: expiresAt.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });

  revalidatePath(AFFILIATE_ROUTES.adminList);
  revalidatePath(`/admin/affiliates/${id}`);
  redirect(messageUrl(id, "success", "Approved and onboarding email sent."));
}

export async function resendAffiliateApprovalLink(formData: FormData) {
  const id = String(formData.get("application_id") ?? "");
  const { user, admin } = await requireAdmin();

  const { data: application } = await admin
    .from("affiliate_applications")
    .select("legal_name, display_name, email, status")
    .eq("id", id)
    .single();
  const { data: partner } = await admin
    .from("affiliate_partners")
    .select("id, commission_rate")
    .eq("application_id", id)
    .single();

  if (!application || !partner || application.status !== "approved_pending_onboarding") {
    redirect(messageUrl(id, "error", "This application is not awaiting onboarding."));
  }

  const rawToken = createRawToken();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await admin
    .from("affiliate_onboarding_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("application_id", id)
    .is("used_at", null);

  const { error } = await admin.from("affiliate_onboarding_tokens").insert({
    application_id: id,
    partner_id: partner.id,
    token_hash: hashToken(rawToken),
    expires_at: expiresAt.toISOString(),
  });

  if (error) {
    redirect(messageUrl(id, "error", error.message));
  }

  await admin.from("affiliate_admin_audit_log").insert({
    application_id: id,
    affiliate_partner_id: partner.id,
    actor_user_id: user.id,
    action: "approval_link_resent",
    details: { expires_at: expiresAt.toISOString() },
  });

  await sendApprovalEmail({
    to: application.email,
    name: application.display_name || application.legal_name,
    commissionRate: Number(partner.commission_rate),
    onboardingUrl: `${getSiteUrl()}${AFFILIATE_ROUTES.onboarding}?token=${encodeURIComponent(rawToken)}`,
    expiresAt: expiresAt.toLocaleDateString("en-SG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  });

  revalidatePath(`/admin/affiliates/${id}`);
  redirect(messageUrl(id, "success", "A new onboarding link was sent."));
}

export async function requestAffiliateInformation(formData: FormData) {
  const id = String(formData.get("application_id") ?? "");
  const requestMessage = String(formData.get("request_message") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  if (requestMessage.length < 10) {
    redirect(messageUrl(id, "error", "Enter the information you need from the applicant."));
  }

  const { user, admin } = await requireAdmin();
  const { data: application } = await admin
    .from("affiliate_applications")
    .select("legal_name, display_name, email")
    .eq("id", id)
    .single();

  if (!application) {
    redirect(messageUrl(id, "error", "Application not found."));
  }

  const { error } = await admin
    .from("affiliate_applications")
    .update({
      status: "information_requested",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      admin_notes: adminNotes || null,
    })
    .eq("id", id);

  if (error) redirect(messageUrl(id, "error", error.message));

  await admin.from("affiliate_admin_audit_log").insert({
    application_id: id,
    actor_user_id: user.id,
    action: "information_requested",
    details: { request_message: requestMessage },
  });

  await sendInformationRequestedEmail({
    to: application.email,
    name: application.display_name || application.legal_name,
    message: requestMessage,
  });

  revalidatePath(AFFILIATE_ROUTES.adminList);
  revalidatePath(`/admin/affiliates/${id}`);
  redirect(messageUrl(id, "success", "Information request sent."));
}

export async function rejectAffiliateApplication(formData: FormData) {
  const id = String(formData.get("application_id") ?? "");
  const reason = String(formData.get("rejection_reason") ?? "").trim();
  const adminNotes = String(formData.get("admin_notes") ?? "").trim();

  if (reason.length < 5) {
    redirect(messageUrl(id, "error", "Enter an internal rejection reason."));
  }

  const { user, admin } = await requireAdmin();
  const { data: application } = await admin
    .from("affiliate_applications")
    .select("legal_name, display_name, email")
    .eq("id", id)
    .single();

  if (!application) {
    redirect(messageUrl(id, "error", "Application not found."));
  }

  const { error } = await admin
    .from("affiliate_applications")
    .update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
      admin_notes: adminNotes || null,
      rejection_reason: reason,
    })
    .eq("id", id);

  if (error) redirect(messageUrl(id, "error", error.message));

  await admin.from("affiliate_admin_audit_log").insert({
    application_id: id,
    actor_user_id: user.id,
    action: "rejected",
    details: { rejection_reason: reason },
  });

  await sendRejectionEmail({
    to: application.email,
    name: application.display_name || application.legal_name,
  });

  revalidatePath(AFFILIATE_ROUTES.adminList);
  revalidatePath(`/admin/affiliates/${id}`);
  redirect(messageUrl(id, "success", "Application rejected and applicant notified."));
}
