import { adminDb, safeError } from "@/lib/founding-50/server";
import { decryptInviteToken, publicOrigin } from "@/lib/founding-50/invite-crypto";
import { htmlEscape } from "@/lib/founding-50/email";
import {
  FOUNDING50_ADMIN_NOTIFICATION_TO,
  founding50ResendApiKey,
  founding50ResendSender,
  founding50ResendReplyTo,
} from "@/lib/founding-50/resend-config";

type MailKind =
  | "admin_application_notification"
  | "application_received" | "invitation" | "invite_reminder_3d" | "invite_reminder_1d"
  | "waitlisted" | "declined"
  | "beta_welcome" | "beta_checkin_day7" | "beta_feedback_day23"
  | "beta_feedback_reminder_day27" | "beta_feedback_received" | "beta_complete";
type Claimed = {
  mail_id: string; app_id: string; mail_kind: MailKind;
  mail_generation: number; claim_token: string; attempt_number: number;
};
type Application = {
  id: string; parent_email: string; student_name: string; student_age: number; created_at: string; status: string;
  invite_generation: number; notice_version: number;
  invite_token_ciphertext: string | null;
  invite_expires_at: string | null; invite_delivery_status: string | null;
  beta_starts_at: string | null; beta_ends_at: string | null;
  survey_completed_at: string | null;
};

type MailDraft = { subject: string; heading: string; body: string; actionUrl?: string; actionLabel?: string; audience?: "admin" | "applicant" };

function draftFor(kind: MailKind, app: Application): MailDraft | null {
  const name = app.student_name;
  // An admin alert describes the original submission, even if the application
  // was reviewed by the time an email retry is sent. Do not tie it to status.
  if (kind === "admin_application_notification") {
    const submitted = new Date(app.created_at);
    const submittedAt = Number.isNaN(submitted.getTime())
      ? "Recorded in Dreamscape Admin"
      : new Intl.DateTimeFormat("en-SG", {
          timeZone: "Asia/Singapore", dateStyle: "medium", timeStyle: "short",
        }).format(submitted);
    let reviewUrl: string | undefined;
    try {
      reviewUrl = `${publicOrigin()}/admin?section=founding-50`;
    } catch {
      // Missing public origin must not prevent an admin from being notified.
    }
    return {
      subject: `New Founding 50 Application — ${name}`,
      heading: "A new Founding 50 application has arrived.",
      audience: "admin",
      body: [
        `Student: ${name}`,
        `Age: ${app.student_age}`,
        `Registered email: ${app.parent_email}`,
        `Submitted (Singapore): ${submittedAt}`,
        "Review in Dreamscape Admin → Users & Access → Founding 50 Beta.",
      ].join("\n"),
      actionUrl: reviewUrl,
      actionLabel: "Review application →",
    };
  }
  const inviteKind = kind === "invitation" || kind === "invite_reminder_3d" || kind === "invite_reminder_1d";
  if (inviteKind) {
    if (app.status !== "invited" || !app.invite_token_ciphertext ||
        !app.invite_expires_at || Date.parse(app.invite_expires_at) <= Date.now()) return null;
    if (kind !== "invitation" && app.invite_delivery_status !== "sent") return null;
    const token = decryptInviteToken(app.invite_token_ciphertext);
    const url = `${publicOrigin()}/founding-50/activate?token=${encodeURIComponent(token)}`;
    if (kind === "invitation") return {
      subject: "Dreamscape Founding 50 — You're invited!",
      heading: "Your family has been selected.",
      body: `We're pleased to invite ${name} to the Founding 50 beta. You have seven days from invitation to activate 30 days of complimentary NOVA+ access. Sign in or create your Dreamscape account using this parent email address. No payment is required.`,
      actionUrl: url, actionLabel: "Activate NOVA+ beta →",
    };
    if (kind === "invite_reminder_3d") return {
      subject: "Dreamscape Founding 50 — Your invitation is waiting",
      heading: "Your invitation is waiting.",
      body: `Your invitation for ${name} is still available. Please activate it before it expires to secure your family's Founding 50 place. No payment is needed.`,
      actionUrl: url, actionLabel: "Activate my invitation →",
    };
    return {
      subject: "Dreamscape Founding 50 — Final day to activate",
      heading: "Your invitation expires soon.",
      body: `This is the final reminder to activate ${name}'s Founding 50 beta invitation. The reserved place will return to the available pool when the invitation expires.`,
      actionUrl: url, actionLabel: "Activate before expiry →",
    };
  }
  if (kind === "waitlisted") {
    if (app.status !== "waitlisted") return null;
    return {
      subject: "Dreamscape Founding 50 — You're on our waitlist",
      heading: "You're on our waitlist.",
      body: `Thank you for registering ${name}. We are reviewing applications for the limited Founding 50 beta. You haven't been selected yet, but we may contact you if a place opens. There is no action you need to take now.`,
    };
  }
  if (kind === "declined") {
    if (app.status !== "declined") return null;
    return {
      subject: "Dreamscape Founding 50 — Your application update",
      heading: "Thank you for your interest.",
      body: `Thank you for applying for ${name}. We aren't able to offer a Founding 50 beta place at this time, and we appreciate your interest in Dreamscape.`,
    };
  }
  // All post-activation mail is bound to the current participant record.
  // No outdated stage emails are sent after the associated stage has passed.
  if (kind.startsWith("beta_")) {
    if (app.status !== "activated" || !app.beta_starts_at || !app.beta_ends_at) return null;
    const start = Date.parse(app.beta_starts_at);
    const end = Date.parse(app.beta_ends_at);
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
    const day = 86_400_000;
    const benefits = `${publicOrigin()}/founding-50/benefits`;
    const feedback = `${publicOrigin()}/founding-50/feedback`;
    if (kind === "beta_welcome") {
      if (now < start || now >= start + 7 * day) return null;
      return {
        subject: "Founding 50 — Welcome to your NOVA+ beta",
        heading: "Your 30-day adventure starts now.",
        body: `Welcome! ${name}'s complimentary NOVA+ beta is now active. Your 30-day access starts from activation. Explore Learning Missions, Think Lab, Knowledge Arena and your progress insights. Your Founding 50 badge is recorded; any Dream Token and Dream Gem credit will show when the wallet confirms delivery. No payment details are needed and no paid plan starts automatically.`,
        actionUrl: benefits, actionLabel: "View my Founding 50 benefits →",
      };
    }
    if (kind === "beta_checkin_day7") {
      if (now < start + 7 * day || now >= start + 14 * day) return null;
      return {
        subject: "Founding 50 — How is your first week going?",
        heading: "One week into Dreamscape.",
        body: `We hope ${name} is enjoying NOVA+. Try a new learning mission or thinking challenge this week, and explore your child's learning progress. If you run into any issues, please contact Dreamscape support. We will invite you to complete one short feedback survey in the final week.`,
        actionUrl: benefits, actionLabel: "Continue exploring →",
      };
    }
    if (kind === "beta_feedback_day23") {
      if (app.survey_completed_at || now < start + 23 * day || now >= start + 27 * day) return null;
      return {
        subject: "Founding 50 — Your short feedback survey is ready",
        heading: "Your feedback helps shape Dreamscape.",
        body: `Thank you for exploring NOVA+ with ${name}. During your final beta week, please share your experience in our short parent survey. Completion of the survey is required to qualify for the Founding 50 post-launch subscription discount.`,
        actionUrl: feedback, actionLabel: "Complete my feedback →",
      };
    }
    if (kind === "beta_feedback_reminder_day27") {
      if (app.survey_completed_at || now < start + 27 * day || now >= end) return null;
      return {
        subject: "Founding 50 — A quick feedback reminder",
        heading: "We'd love to hear from you.",
        body: `Just a quick reminder to share your feedback on ${name}'s NOVA+ experience. The survey takes only a few minutes. Completing the beta and survey qualifies your family for the Founding 50 six-month launch discount, subject to the programme terms.`,
        actionUrl: feedback, actionLabel: "Share my feedback →",
      };
    }
    if (kind === "beta_feedback_received") {
      if (!app.survey_completed_at) return null;
      return {
        subject: "Founding 50 — Thank you for your feedback",
        heading: "Your feedback is in.",
        body: `Thank you for completing ${name}'s Founding 50 survey. Your input helps us improve Dreamscape. Once the full 30-day beta is complete, you can check your benefits page for any launch discount eligibility. There is no automatic paid subscription.`,
        actionUrl: benefits, actionLabel: "View my benefits →",
      };
    }
    if (kind === "beta_complete") {
      if (now < end || now >= end + 7 * day) return null;
      if (app.survey_completed_at) return {
        subject: "Founding 50 — Thank you for being part of our beta",
        heading: "You've completed your Founding 50 beta.",
        body: `Thank you for helping us shape Dreamscape with ${name}. Your complimentary NOVA+ beta has ended and no subscription has started automatically. You have completed the survey and can check the benefits page for your 30% six-month NOVA+ launch discount eligibility, subject to the programme terms.`,
        actionUrl: benefits, actionLabel: "View my launch benefits →",
      };
      return {
        subject: "Founding 50 — Thank you for being part of our beta",
        heading: "Your 30-day beta has ended.",
        body: `Thank you for trying NOVA+ with ${name}. Your complimentary access has ended and no paid subscription has started. If you haven't completed the short parent feedback survey, you can still submit it to qualify for the Founding 50 launch discount under the programme terms.`,
        actionUrl: feedback, actionLabel: "Complete the feedback survey →",
      };
    }
    return null;
  }
  if (kind !== "application_received") return null;
  return {
    subject: "Dreamscape Founding 50 — Interest received",
    heading: "Thanks for registering your interest.",
    body: `We've received the Founding 50 application for ${name}. Our team will review the application and email you if a place is offered. No payment is required.`,
  };
}

function renderHtml(draft: MailDraft): string {
  const action = draft.actionUrl
    ? `<p style="margin:25px 0"><a href="${htmlEscape(draft.actionUrl)}" style="display:inline-block;padding:15px 24px;background:linear-gradient(90deg,#8ee8ff,#c58cff);color:#140725;text-decoration:none;border-radius:99px;font-weight:800">${htmlEscape(draft.actionLabel || "Continue")}</a></p><p style="font-size:12px;color:#a9b7c9;overflow-wrap:anywhere">${htmlEscape(draft.actionUrl)}</p>`
    : "";
  const footer = draft.audience === "admin"
    ? "Internal Dreamscape Founding 50 application notification."
    : "You received this message because this email was used for a Founding 50 beta application. If unexpected, please ignore it.";
  return `<div style="background:#030a17;color:white;padding:32px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:0 auto;padding:34px;background:#091428;border:1px solid #30465e;border-radius:24px"><p style="font-size:11px;letter-spacing:.15em;font-weight:bold;color:#8ee8ff">DREAMSCAPE · FOUNDING 50</p><h1 style="font-family:Georgia,serif;font-size:34px;font-weight:normal;line-height:1.15">${htmlEscape(draft.heading)}</h1><p style="font-size:16px;line-height:1.7;color:#d4e0ee">${htmlEscape(draft.body).replace(/\n/g, "<br />")}</p>${action}<p style="font-size:12px;color:#a9b7c9">${htmlEscape(footer)}</p></div></div>`;
}

async function submitEmail(to: string, draft: MailDraft, idempotency: string) {
  const apiKey = founding50ResendApiKey();
  const from = founding50ResendSender();
  if (!apiKey) throw new Error("RESEND_API_KEY is missing on the server");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST", cache: "no-store",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `founding50-${idempotency}`,
    },
    body: JSON.stringify({ from, reply_to: founding50ResendReplyTo(), to: [to], subject: draft.subject, html: renderHtml(draft),
      text: `${draft.heading}\n\n${draft.body}${draft.actionUrl ? `\n\n${draft.actionUrl}` : ""}` }),
  });
  if (!result.ok) throw new Error(`Resend HTTP ${result.status}`);
  const json = await result.json().catch(() => ({}));
  return typeof json.id === "string" ? json.id : null;
}

/**
 * Processes only claimed records, checks the applicant's CURRENT state before
 * sending, and writes a durable receipt. Accepted means Resend accepted the
 * request, not that the parent necessarily opened or received the email.
 * 6 attempts maximum; manual admin retry may reset this budget.
 */
export async function deliverQueuedF50Mail(options: { limit?: number; applicationId?: string } = {}) {
  const db = adminDb();
  const { data: claims, error } = await db.rpc("f50_claim_emails", {
    p_limit: options.limit || 20, p_application_id: options.applicationId || null,
  });
  if (error) throw error;
  const result = { claimed: (claims || []).length, sent: 0, failed: 0, cancelled: 0 };

  for (const job of (claims || []) as Claimed[]) {
    const match = { id: job.mail_id, claim_id: job.claim_token, status: "processing" };
    try {
      const { data: app, error: loadError } = await db.from("founding_50_applications")
        .select("id,parent_email,student_name,student_age,created_at,status,invite_generation,notice_version,invite_token_ciphertext,invite_expires_at,invite_delivery_status,beta_starts_at,beta_ends_at,survey_completed_at")
        .eq("id", job.app_id).single();
      if (loadError || !app) throw new Error("Application missing");
      const kind = job.mail_kind;
      const generationValid = ["invitation", "invite_reminder_3d", "invite_reminder_1d"].includes(kind)
        ? app.invite_generation === job.mail_generation
        : ["waitlisted", "declined"].includes(kind)
          ? app.notice_version === job.mail_generation : true;
      const draft = generationValid ? draftFor(kind, app as Application) : null;
      if (!draft) {
        await db.from("founding_50_email_outbox").update({ status: "cancelled", claimed_until: null,
          last_error: "Not applicable to current applicant status",updated_at:new Date().toISOString() })
          .match(match);
        result.cancelled++;
        continue;
      }
      const destination = kind === "admin_application_notification"
        ? FOUNDING50_ADMIN_NOTIFICATION_TO
        : app.parent_email;
      const providerId = await submitEmail(destination, draft, job.mail_id);
      const now = new Date().toISOString();
      const { data: saved, error: saveError } = await db.from("founding_50_email_outbox")
        .update({ status: "sent",provider_message_id:providerId,sent_at:now,
          last_error:null,claimed_until:null,updated_at:now })
        .match(match).select("id").maybeSingle();
      if (saveError || !saved) throw new Error("Email receipt could not be saved");
      if (kind === "invitation") {
        await db.from("founding_50_applications")
          .update({invite_delivery_status:"sent",invite_sent_at:now})
          .eq("id",app.id).eq("status","invited")
          .eq("invite_generation",job.mail_generation);
      }
      result.sent++;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Mail provider failed";
      safeError(e, "Founding 50 email error");
      const attempts = job.attempt_number;
      const minutes = Math.min(120, Math.pow(2, Math.max(1, attempts)));
      const nextAttempt = new Date(Date.now() + minutes * 60_000).toISOString();
      await db.from("founding_50_email_outbox")
        .update({ status:"failed",last_error:message.slice(0,180),
          claimed_until:null,next_attempt_at:nextAttempt,updated_at:new Date().toISOString() })
        .match(match);
      result.failed++;
    }
  }
  return result;
}
