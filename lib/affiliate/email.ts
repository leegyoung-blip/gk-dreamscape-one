import "server-only";
import { Resend } from "resend";

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

function emailShell(title: string, body: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;background:#f7f4fb;font-family:Arial,sans-serif;color:#21184f">
    <div style="max-width:640px;margin:0 auto;padding:32px 18px">
      <div style="background:#fff;border:1px solid #e5def6;border-radius:24px;padding:30px;box-shadow:0 18px 45px rgba(60,40,110,.08)">
        <p style="margin:0 0 12px;color:#6338d7;font-size:12px;font-weight:800;letter-spacing:.14em">DREAMSCAPE ONE · POWERED BY GURU KIDS PRO</p>
        <h1 style="margin:0 0 18px;font-size:30px;line-height:1.1">${title}</h1>
        ${body}
        <hr style="border:0;border-top:1px solid #ece6f7;margin:28px 0">
        <p style="margin:0;color:#777184;font-size:13px;line-height:1.6">Guru Kids Pro · UEN 53232375X<br>Blk 4 Queen's Road, #02-127, Singapore<br>admin@gurukidspro.com</p>
      </div>
    </div>
  </body>
</html>`;
}

async function sendEmailSafe(input: {
  to: string | string[];
  subject: string;
  html: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.DREAMSCAPE_FROM_EMAIL ||
    "Dreamscape One <admin@gurukidspro.com>";

  if (!apiKey) {
    console.warn("RESEND_API_KEY is missing. Email was not sent:", input.subject);
    return false;
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      console.error("Resend email error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Unexpected Resend email failure:", error);
    return false;
  }
}

export async function sendApplicationReceivedEmail(input: {
  to: string;
  name: string;
  applicationNumber: string;
}): Promise<boolean> {
  const name = escapeHtml(input.name);
  const applicationNumber = escapeHtml(input.applicationNumber);

  return sendEmailSafe({
    to: input.to,
    subject: "We received your Dreamscape Affiliate application",
    html: emailShell(
      "Application received",
      `<p style="line-height:1.7">Hi ${name},</p>
       <p style="line-height:1.7">Thank you for applying to become a Dreamscape Affiliate Partner. Your application reference is <strong>${applicationNumber}</strong>.</p>
       <p style="line-height:1.7">Applications are normally reviewed within 3–5 business days. We will contact you if more information is required.</p>`,
    ),
  });
}

export async function sendAdminApplicationAlert(input: {
  applicationNumber: string;
  legalName: string;
  email: string;
  applicantType: string;
  programmeRequested: string;
  adminUrl: string;
}): Promise<boolean> {
  const values = Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, escapeHtml(value)]),
  ) as typeof input;

  return sendEmailSafe({
    to: "admin@gurukidspro.com",
    subject: `New affiliate application: ${input.applicationNumber}`,
    html: emailShell(
      "New affiliate application",
      `<p style="line-height:1.7"><strong>Reference:</strong> ${values.applicationNumber}<br>
       <strong>Name:</strong> ${values.legalName}<br>
       <strong>Email:</strong> ${values.email}<br>
       <strong>Applicant type:</strong> ${values.applicantType}<br>
       <strong>Programme requested:</strong> ${values.programmeRequested}</p>
       <p><a href="${values.adminUrl}" style="display:inline-block;background:#6338d7;color:#fff;text-decoration:none;padding:13px 19px;border-radius:999px;font-weight:700">Review application</a></p>`,
    ),
  });
}

export async function sendApprovalEmail(input: {
  to: string;
  name: string;
  commissionRate: number;
  onboardingUrl: string;
  expiresAt: string;
}): Promise<boolean> {
  const name = escapeHtml(input.name);
  const onboardingUrl = escapeHtml(input.onboardingUrl);
  const expiresAt = escapeHtml(input.expiresAt);

  return sendEmailSafe({
    to: input.to,
    subject: "You’re approved for the Dreamscape Affiliate Programme",
    html: emailShell(
      "Your application has been approved",
      `<p style="line-height:1.7">Hi ${name},</p>
       <p style="line-height:1.7">Your Dreamscape Affiliate Regular application has been approved at a commission rate of <strong>${input.commissionRate}%</strong>.</p>
       <p style="line-height:1.7">Complete your secure onboarding by <strong>${expiresAt}</strong>. The link below is valid for 7 days and is single-use.</p>
       <p><a href="${onboardingUrl}" style="display:inline-block;background:linear-gradient(135deg,#6338d7,#db4a9d);color:#fff;text-decoration:none;padding:14px 21px;border-radius:999px;font-weight:800">Complete Affiliate Onboarding</a></p>
       <p style="color:#777184;font-size:13px;line-height:1.6">Do not forward this link. If it expires, Dreamscape can issue you a new one.</p>`,
    ),
  });
}

export async function sendActivationEmail(input: {
  to: string;
  name: string;
  commissionRate: number;
  referralCode: string;
  referralLink: string;
  welcomeUrl: string;
}): Promise<boolean> {
  const name = escapeHtml(input.name);
  const referralCode = escapeHtml(input.referralCode);
  const referralLink = escapeHtml(input.referralLink);
  const welcomeUrl = escapeHtml(input.welcomeUrl);

  return sendEmailSafe({
    to: input.to,
    subject: "Your Dreamscape affiliate account is active",
    html: emailShell(
      "Welcome to the Dreamscape Affiliate Programme",
      `<p style="line-height:1.7">Hi ${name},</p>
       <p style="line-height:1.7">Your account is active at an approved commission rate of <strong>${input.commissionRate}%</strong>.</p>
       <div style="background:#f6f1ff;border-radius:18px;padding:18px;margin:20px 0">
         <p style="margin:0 0 8px"><strong>Referral code:</strong> ${referralCode}</p>
         <p style="margin:0;word-break:break-all"><strong>Affiliate link:</strong> ${referralLink}</p>
       </div>
       <p style="line-height:1.7">Commission begins after an eligible customer completes the first paid billing cycle. Eligible commission is collated monthly and scheduled for payout between the 7th and 10th of the following month.</p>
       <p><a href="${welcomeUrl}" style="display:inline-block;background:#6338d7;color:#fff;text-decoration:none;padding:13px 19px;border-radius:999px;font-weight:700">View Affiliate Details</a></p>`,
    ),
  });
}

export async function sendInformationRequestedEmail(input: {
  to: string;
  name: string;
  message: string;
}): Promise<boolean> {
  return sendEmailSafe({
    to: input.to,
    subject: "More information needed for your Dreamscape application",
    html: emailShell(
      "More information is needed",
      `<p style="line-height:1.7">Hi ${escapeHtml(input.name)},</p>
       <p style="line-height:1.7">Please reply to <strong>admin@gurukidspro.com</strong> with the information below:</p>
       <div style="background:#f6f1ff;border-radius:18px;padding:18px;line-height:1.7">${escapeHtml(input.message).replace(/\n/g, "<br>")}</div>`,
    ),
  });
}

export async function sendRejectionEmail(input: {
  to: string;
  name: string;
}): Promise<boolean> {
  return sendEmailSafe({
    to: input.to,
    subject: "Update on your Dreamscape Affiliate application",
    html: emailShell(
      "Application update",
      `<p style="line-height:1.7">Hi ${escapeHtml(input.name)},</p>
       <p style="line-height:1.7">Thank you for your interest in the Dreamscape Affiliate Programme. We are unable to approve your application at this time.</p>
       <p style="line-height:1.7">Programme approval depends on current fit, audience relevance, promotion methods and operational capacity. This decision does not prevent you from applying again later if your circumstances change.</p>`,
    ),
  });
}
