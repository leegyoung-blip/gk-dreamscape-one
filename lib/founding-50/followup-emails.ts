import { htmlEscape } from "@/lib/founding-50/email";

/**
 * Founding 50 Phase 3B survey journey. Pure rendering; no entitlement or billing
 * changes, no API calls, no images or external fonts. The existing mail outbox
 * remains the source of truth for one-time delivery and retries.
 */
export type Founding50SurveyMailKind =
  | "beta_feedback_day23"
  | "beta_feedback_reminder_day27"
  | "beta_feedback_received"
  | "beta_complete";

export type Founding50SurveyMailInput = {
  kind: Founding50SurveyMailKind;
  studentName: string;
  origin: string;
  betaEndsAt: string;
  surveyCompleted: boolean;
};

export type Founding50SurveyMail = {
  subject: string;
  previewText: string;
  html: string;
  text: string;
};

const discountCondition =
  "Eligible Founding 50 families can receive 30% off a qualifying NOVA+ monthly subscription " +
  "for six monthly billing periods, subject to completing the 30-day beta, submitting " +
  "the parent feedback survey and meeting the programme and redemption terms. " +
  "No paid subscription is started automatically.";

const brand = "DREAMSCAPE ONE · FOUNDING 50";

function linkFromOrigin(origin: string, path: string): string {
  const parsed = new URL(origin);
  const localhost = process.env.NODE_ENV !== "production" && parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !(localhost && parsed.protocol === "http:")) {
    throw new Error("Founding 50 follow-up email links require HTTPS");
  }
  return new URL(path, parsed.origin).toString();
}

function sgDate(timestamp: string): string {
  const dt = new Date(timestamp);
  if (Number.isNaN(dt.getTime())) throw new Error("Invalid Founding 50 expiry timestamp");
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore", day: "numeric", month: "long", year: "numeric",
  }).format(dt);
}

/** No untrusted HTML or externally supplied URLs are interpolated unescaped. */
export function renderFounding50SurveyMail(input: Founding50SurveyMailInput): Founding50SurveyMail {
  const student = input.studentName.trim();
  if (!student) throw new Error("A student name is required for Founding 50 email");
  const expiry = sgDate(input.betaEndsAt);
  const feedback = linkFromOrigin(input.origin, "/founding-50/feedback");
  const benefits = linkFromOrigin(input.origin, "/founding-50/benefits");
  const world = linkFromOrigin(input.origin, "/inventor");

  let subject: string;
  let previewText: string;
  let headline: string;
  let intro: string;
  let detail: string;
  let action: string;
  let actionUrl: string;
  let footnote: string;
  let marker: string;

  switch (input.kind) {
    case "beta_feedback_day23":
      marker = "DAY 23 · YOUR FEEDBACK";
      subject = "Founding 50 — How was your family's NOVA+ adventure?";
      previewText = "Our 2–3 minute parent survey is ready. Your feedback helps us improve Dreamscape.";
      headline = "Tell Us About Your Adventure!";
      intro = `We hope ${student} has enjoyed exploring Nova's World! Your Founding 50 beta is entering its final week, and we'd love to hear how it's going for your family.`;
      detail = "Our short parent survey takes about 2–3 minutes. Tell us what your child enjoyed, how easy the experience was, and what we could improve.";
      footnote = `Your complimentary beta access is scheduled to end on ${expiry} (Singapore date). Survey completion is one requirement for the Founding 50 30%-off NOVA+ benefit. The discount remains subject to the full programme terms and eligibility.`;
      action = "SHARE OUR FEEDBACK";
      actionUrl = feedback;
      break;
    case "beta_feedback_reminder_day27":
      marker = "DAY 27 · FRIENDLY REMINDER";
      subject = "Founding 50 — One quick reminder to share your feedback";
      previewText = "A quick nudge: we'd still love to hear what your family thinks.";
      headline = "Could You Share Your Thoughts?";
      intro = `Your family's 30-day NOVA+ trial for ${student} is almost complete. Thank you for being one of the first families to explore DREAMSCAPE ONE.`;
      detail = "If you have a few minutes, please complete our short survey. Your answers help us identify what families love and what needs improvement.";
      footnote = `Your beta period is scheduled to end on ${expiry} (Singapore date). You can still submit your survey after that date. Completing the feedback survey is one of the conditions for the Founding 50 launch discount; other eligibility rules apply.`;
      action = "COMPLETE OUR SURVEY";
      actionUrl = feedback;
      break;
    case "beta_feedback_received":
      marker = "FEEDBACK RECEIVED";
      subject = "Founding 50 — Thank you for your feedback!";
      previewText = "Your response is saved. Thank you for helping shape the next chapter of Dreamscape.";
      headline = "Thank You for Helping Us Grow!";
      intro = `Thank you for sharing your family's experience with ${student}! Your feedback has been received.`;
      detail = "We'll use feedback from our Founding 50 families to improve learning missions, world navigation and the overall experience before launch.";
      footnote = `You have completed the survey requirement for the Founding 50 launch benefit. After completing the full beta period, eligible families may access the 30% NOVA+ discount for six monthly billing periods, subject to the programme terms and public launch. No subscription starts automatically.`;
      action = "VIEW FOUNDING BENEFITS";
      actionUrl = benefits;
      break;
    case "beta_complete":
      marker = "DAY 30 · BETA COMPLETE";
      subject = "Founding 50 — Thank you for joining our first adventure!";
      previewText = "Your Founding 50 beta period is complete. Here's what happens next.";
      headline = "What an Adventure — Thank You!";
      intro = `Thank you for exploring DREAMSCAPE ONE with ${student}. Your family's 30-day complimentary Founding 50 NOVA+ beta period is complete.`;
      detail = input.surveyCompleted
        ? "You've already submitted your feedback, and we're grateful for your ideas. You can review the next steps for your Founding 50 benefits once the public launch requirements are met."
        : "We'd still love to hear from you! If you haven't completed the short parent feedback survey, you can submit it now, even after your beta period has ended.";
      footnote = input.surveyCompleted
        ? `${discountCondition} This notice refers only to Founding 50 beta access; any separate paid subscription or permanent access is unaffected.`
        : `Submitting the survey and completing the beta are both requirements for the Founding 50 launch discount, subject to eligibility. This notice refers only to Founding 50 beta access; any separate paid subscription or permanent access is unaffected. No paid subscription starts automatically.`;
      action = input.surveyCompleted ? "VIEW MY FOUNDING BENEFITS" : "SHARE MY FEEDBACK";
      actionUrl = input.surveyCompleted ? benefits : feedback;
      break;
  }

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<meta name="color-scheme" content="light"/><title>${htmlEscape(subject)}</title></head>
<body style="margin:0;padding:0;background:#F2EFF8;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">
<span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${htmlEscape(previewText)}</span>
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#F2EFF8"><tr><td align="center" style="padding:22px 10px 32px">
<!--[if mso]><table role="presentation" width="600"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;border-collapse:separate;background:#FFFFFF;border-radius:19px;overflow:hidden">
<tr><td style="padding:30px 30px 32px;background:#21153E;color:#FFFFFF" align="center">
<p style="margin:0;font-size:12px;font-weight:800;letter-spacing:2.2px;color:#FFFFFF">DREAMSCAPE ONE</p>
<p style="margin:11px 0 0;font-size:11px;font-weight:700;letter-spacing:1.2px;color:#FFBE88">${htmlEscape(marker)}</p>
<h1 style="margin:18px 0 10px;color:#FFFFFF;font-family:Georgia,serif;font-weight:normal;line-height:1.25;font-size:29px">${htmlEscape(headline)}</h1>
<p style="margin:0;color:#E7DBFF;line-height:1.65;font-size:14px">Learn. Explore. Discover. Together.</p></td></tr>
<tr><td style="padding:29px 30px 16px;color:#342B46;font-size:15px;line-height:1.8">
<p style="margin:0 0 13px;font-weight:800;color:#29164A">Hello, Founding 50 family!</p>
<p style="margin:0 0 16px">${htmlEscape(intro)}</p>
<p style="margin:0 0 8px">${htmlEscape(detail)}</p></td></tr>
<tr><td align="center" style="padding:11px 20px 21px">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#6E3EC2" style="background:#6E3EC2;border-radius:10px" align="center">
<a href="${htmlEscape(actionUrl)}" style="display:inline-block;padding:16px 25px;color:#FFFFFF;font-weight:800;font-size:14px;text-decoration:none;font-family:Arial,Helvetica,sans-serif">${htmlEscape(action)} &nbsp;→</a></td></tr></table>
<p style="margin:13px 0 0;color:#72678A;font-size:11px;line-height:1.5;overflow-wrap:anywhere">${htmlEscape(actionUrl)}</p></td></tr>
<tr><td style="padding:0 30px 25px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;background:#F8F5FF;border:1px solid #E9E2FA;border-radius:12px"><tr><td style="padding:17px 18px;color:#504667;font-size:13px;line-height:1.7">${htmlEscape(footnote)}</td></tr></table></td></tr>
<tr><td style="padding:20px 30px 25px;background:#FBFAFD;border-top:1px solid #EEE7F7" align="center">
<p style="margin:0 0 7px;color:#615876;font-size:12px;line-height:1.65">Thank you for being part of our first adventure!<br/>The DREAMSCAPE ONE Team</p>
<p style="margin:0 0 9px;color:#716882;font-size:12px;line-height:1.6">Need help? Simply reply to this email.</p>
<a href="${htmlEscape(world)}" style="color:#6E3EC2;font-weight:700;font-size:12px;text-decoration:none">dreamscape-one.com</a>
<p style="margin:12px 0 0;color:#81778E;font-size:11px;line-height:1.6">Sent to the registered parent email for ${htmlEscape(student)}'s Founding 50 application.</p>
</td></tr></table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;

  const text = `${brand}\n${marker}\n${headline}\nLearn. Explore. Discover. Together.\n\nHello, Founding 50 family!\n\n${intro}\n\n${detail}\n\n${action}: ${actionUrl}\n\n${footnote}\n\nThank you for being part of our first adventure!\nThe DREAMSCAPE ONE Team\nNeed help? Reply to this email.\n${world}`;

  return { subject, previewText, html, text };
}
