import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

export type DreamscapeSubscriptionEmailType =
  | "subscription_started"
  | "payment_received"
  | "payment_issue"
  | "cancellation_scheduled"
  | "subscription_ended"
  | "management_link"
  | "trial_started"
  | "trial_ending"
  | "trial_cancelled"
  | "trial_ended";

type SendInput = {
  contractId: string;
  emailType: DreamscapeSubscriptionEmailType;
  origin: string;
  eventKey?: string | null;
  requestedBy?: string | null;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is missing from the Vercel environment.`);
  }
  return value;
}

function senderAddress() {
  return (
    process.env.RESEND_FROM?.trim() ||
    "Guru Kids Pro <admin@gurukidspro.com>"
  );
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function date(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (!Number.isFinite(parsed.getTime())) return "—";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function cleanOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

async function loadContract(contractId: string) {
  const { data, error } = await supabaseAdmin
    .from("dreamscape_subscription_contracts")
    .select(
      "id,reference,parent_name,parent_email,learner_name,learner_email,status,current_period_end,next_billing_at,grace_until,management_token,management_link_enabled,last_successful_charge_at,first_paid_at,updated_at,plan_id,trial_started_at,trial_ends_at,intro_trial_days,cancel_at_period_end,provider",
    )
    .eq("id", contractId)
    .single();

  if (error) throw error;

  const { data: plan, error: planError } = await supabaseAdmin
    .from("dreamscape_subscription_plans")
    .select("display_name,plan_code,billing_cycle,amount,currency")
    .eq("id", data.plan_id)
    .single();

  if (planError) throw planError;

  return { contract: data, plan };
}

function emailContent(input: {
  type: DreamscapeSubscriptionEmailType;
  learnerName: string;
  planName: string;
  amount: string;
  billingCycle: string;
  paidThrough: string;
  nextBilling: string;
  graceUntil: string;
  trialEnds: string;
  firstBilling: string;
  managementUrl: string;
}) {
  const common = {
    managementLabel: "Manage Subscription",
  };

  switch (input.type) {
    case "subscription_started":
      return {
        subject: `Dreamscape subscription activated – ${input.learnerName}`,
        title: "Dreamscape access is active",
        intro: `${input.learnerName}'s ${input.planName} subscription has been activated.`,
        detail: `Plan: ${input.planName} · ${input.amount} ${input.billingCycle}.`,
        button: common.managementLabel,
      };

    case "payment_received":
      return {
        subject: `Dreamscape payment received – ${input.learnerName}`,
        title: "Recurring payment received",
        intro: `We have received the latest Dreamscape subscription payment for ${input.learnerName}.`,
        detail: `Current access is paid through ${input.paidThrough}. Next billing: ${input.nextBilling}.`,
        button: common.managementLabel,
      };

    case "payment_issue":
      return {
        subject: `Action required: Dreamscape payment method – ${input.learnerName}`,
        title: "Please update the payment method",
        intro: `A payment issue has been reported for ${input.learnerName}'s Dreamscape subscription.`,
        detail: `Please use the secure management page below to update the payment method.${input.graceUntil !== "—" ? ` Access is currently available during the recovery period until ${input.graceUntil}.` : ""}`,
        button: "Manage Payment Method",
      };

    case "cancellation_scheduled":
      return {
        subject: `Dreamscape cancellation scheduled – ${input.learnerName}`,
        title: "Future renewal has been stopped",
        intro: `${input.learnerName}'s Dreamscape subscription will not renew again.`,
        detail: `Existing paid access remains available through ${input.paidThrough}.`,
        button: common.managementLabel,
      };

    case "subscription_ended":
      return {
        subject: `Dreamscape subscription ended – ${input.learnerName}`,
        title: "Dreamscape subscription ended",
        intro: `${input.learnerName}'s paid Dreamscape subscription has ended.`,
        detail: "You can contact Guru Kids Pro if you would like help starting access again.",
        button: common.managementLabel,
      };

    case "trial_started":
      return {
        subject: `Your 7-day Dreamscape trial has started – ${input.learnerName}`,
        title: "Your 7-day free trial is active",
        intro: `${input.learnerName} now has ${input.planName} access during the introductory trial.`,
        detail: `The trial ends on ${input.trialEnds}. Your first charge of ${input.amount} ${input.billingCycle} is scheduled for ${input.firstBilling} unless the trial is cancelled before it ends.`,
        button: common.managementLabel,
      };

    case "trial_ending":
      return {
        subject: `Dreamscape trial ending soon – ${input.learnerName}`,
        title: "Your free trial ends soon",
        intro: `${input.learnerName}'s ${input.planName} trial is due to end on ${input.trialEnds}.`,
        detail: `Your selected subscription will continue at ${input.amount} ${input.billingCycle}, with the first charge scheduled for ${input.firstBilling}, unless you cancel before the trial ends.`,
        button: common.managementLabel,
      };

    case "trial_cancelled":
      return {
        subject: `Dreamscape trial cancellation scheduled – ${input.learnerName}`,
        title: "Your trial will not convert to a paid plan",
        intro: `${input.learnerName}'s ${input.planName} trial will end on ${input.trialEnds}.`,
        detail: "You can continue using the trial until it ends. No subscription charge will be made after the trial unless you choose to keep the trial before it ends.",
        button: common.managementLabel,
      };

    case "trial_ended":
      return {
        subject: `Dreamscape trial ended – ${input.learnerName}`,
        title: "Your Dreamscape trial has ended",
        intro: `${input.learnerName}'s ${input.planName} introductory trial has ended.`,
        detail: "No further subscription charge will be made for a cancelled trial. You can visit Dreamscape One if you would like to choose a paid plan later.",
        button: common.managementLabel,
      };

    case "management_link":
      return {
        subject: `Manage ${input.learnerName}'s Dreamscape subscription`,
        title: "Your secure Dreamscape management link",
        intro: `Use this secure page to review ${input.learnerName}'s current Dreamscape subscription.`,
        detail: `Plan: ${input.planName} · ${input.amount} ${input.billingCycle}.`,
        button: common.managementLabel,
      };
  }
}

function shell(input: {
  preheader: string;
  title: string;
  intro: string;
  detail: string;
  learnerName: string;
  planName: string;
  periodLabel: string;
  periodValue: string;
  billingLabel: string;
  billingValue: string;
  buttonLabel: string;
  managementUrl: string;
}) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f2ea;font-family:Arial,Helvetica,sans-serif;color:#15233b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(input.preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f2ea;padding:30px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #ded5c4;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#15233b;padding:26px 30px;">
                <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e8c474;">Dreamscape One · Guru Kids Pro</div>
                <div style="margin-top:8px;font-size:28px;font-weight:700;line-height:1.15;color:#ffffff;">${escapeHtml(input.title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#5f6672;">${escapeHtml(input.intro)}</p>
                <p style="margin:14px 0 0;font-size:14px;line-height:1.7;color:#5f6672;">${escapeHtml(input.detail)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;background:#fbfaf7;border:1px solid #ebe4d8;border-radius:16px;">
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Learner</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(input.learnerName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Plan</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(input.planName)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">${escapeHtml(input.periodLabel)}</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(input.periodValue)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;color:#81796d;font-size:12px;">${escapeHtml(input.billingLabel)}</td>
                    <td style="padding:14px 16px;text-align:right;font-weight:700;">${escapeHtml(input.billingValue)}</td>
                  </tr>
                </table>

                <div style="margin-top:28px;text-align:center;">
                  <a href="${escapeHtml(input.managementUrl)}" style="display:inline-block;background:#15233b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:14px 24px;border-radius:999px;">${escapeHtml(input.buttonLabel)}</a>
                </div>

                <p style="margin:26px 0 0;font-size:12px;line-height:1.7;color:#8a8378;">
                  This is a private subscription-management link. Please do not forward it to others.<br>
                  <span style="word-break:break-all;color:#6f5a31;">${escapeHtml(input.managementUrl)}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#fbfaf7;border-top:1px solid #ebe4d8;padding:20px 30px;text-align:center;font-size:11px;line-height:1.6;color:#928a7d;">
                Guru Kids Pro · Dreamscape One<br>
                Billing enquiries: admin@gurukidspro.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendDreamscapeSubscriptionEmail(
  input: SendInput,
) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const { contract, plan } = await loadContract(input.contractId);

  if (!contract.management_link_enabled) {
    throw new Error("The parent management link is disabled.");
  }

  const managementUrl = `${cleanOrigin(input.origin)}/dreamscape/subscription/${contract.management_token}`;
  const amount = money(plan.amount, plan.currency);
  const billingCycle =
    plan.billing_cycle === "annual" ? "per year" : "per month";

  const content = emailContent({
    type: input.emailType,
    learnerName: contract.learner_name,
    planName: plan.display_name,
    amount,
    billingCycle,
    paidThrough: date(contract.current_period_end),
    nextBilling: date(contract.next_billing_at),
    graceUntil: date(contract.grace_until),
    trialEnds: date(contract.trial_ends_at || contract.current_period_end),
    firstBilling: date(contract.trial_ends_at || contract.next_billing_at),
    managementUrl,
  });

  const eventKey =
    input.eventKey ||
    (input.emailType === "management_link"
      ? randomUUID()
      : `${contract.updated_at || contract.reference}:${input.emailType}`);

  const idempotencyKey = `dreamscape-${createHash("sha256")
    .update(`${input.emailType}:${contract.id}:${eventKey}`)
    .digest("hex")
    .slice(0, 32)}`;

  const { data: existing, error: existingError } = await supabaseAdmin
    .from("dreamscape_subscription_email_logs")
    .select("id,status,resend_email_id")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.status === "sent") {
    return {
      sent: false,
      skipped: true,
      resendEmailId: existing.resend_email_id,
      recipient: contract.parent_email,
    };
  }

  const logId = existing?.id || randomUUID();

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("dreamscape_subscription_email_logs")
      .update({
        recipient_email: contract.parent_email,
        subject: content.subject,
        status: "pending",
        error_message: null,
        metadata: {
          learner_name: contract.learner_name,
          plan_name: plan.display_name,
          management_url: managementUrl,
        },
        requested_by: input.requestedBy || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin
      .from("dreamscape_subscription_email_logs")
      .insert({
        id: logId,
        contract_id: contract.id,
        email_type: input.emailType,
        recipient_email: contract.parent_email,
        subject: content.subject,
        status: "pending",
        idempotency_key: idempotencyKey,
        metadata: {
          learner_name: contract.learner_name,
          plan_name: plan.display_name,
          management_url: managementUrl,
        },
        requested_by: input.requestedBy || null,
      });

    if (error) throw error;
  }

  const isTrialEmail = input.emailType.startsWith("trial_");

  const html = shell({
    preheader: content.subject,
    title: content.title,
    intro: content.intro,
    detail: content.detail,
    learnerName: contract.learner_name,
    planName: plan.display_name,
    periodLabel: isTrialEmail ? "Trial ends" : "Paid through",
    periodValue: isTrialEmail
      ? date(contract.trial_ends_at || contract.current_period_end)
      : date(contract.current_period_end),
    billingLabel: isTrialEmail ? "First billing" : "Next billing",
    billingValue:
      input.emailType === "trial_cancelled" || input.emailType === "trial_ended"
        ? "No charge scheduled"
        : isTrialEmail
          ? date(contract.trial_ends_at || contract.next_billing_at)
          : date(contract.next_billing_at),
    buttonLabel: content.button,
    managementUrl,
  });

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify({
      from: senderAddress(),
      to: [contract.parent_email],
      reply_to: "admin@gurukidspro.com",
      subject: content.subject,
      html,
      tags: [
        { name: "system", value: "dreamscape_billing" },
        { name: "type", value: input.emailType },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id) {
    const message =
      payload.message ||
      payload.error?.message ||
      `Resend returned HTTP ${response.status}.`;

    await supabaseAdmin
      .from("dreamscape_subscription_email_logs")
      .update({
        status: "failed",
        error_message: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", logId);

    throw new Error(message);
  }

  const sentAt = new Date().toISOString();

  await supabaseAdmin
    .from("dreamscape_subscription_email_logs")
    .update({
      status: "sent",
      resend_email_id: payload.id,
      sent_at: sentAt,
      error_message: null,
      updated_at: sentAt,
    })
    .eq("id", logId);

  if (input.emailType === "management_link") {
    await supabaseAdmin
      .from("dreamscape_subscription_contracts")
      .update({ last_management_email_at: sentAt })
      .eq("id", contract.id);
  }

  return {
    sent: true,
    skipped: false,
    resendEmailId: payload.id,
    recipient: contract.parent_email,
  };
}
