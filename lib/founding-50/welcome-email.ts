import { htmlEscape } from "@/lib/founding-50/email";

/**
 * Founding 50 Phase 2 — family-first post-activation onboarding.
 * Pure HTML/text renderer; never sends email or changes entitlements.
 * One approved illustration, hosted from /public. No external fonts or images.
 */
export type Founding50WelcomeInput = {
  studentName: string;
  startsAt: string;
  endsAt: string;
  origin: string;
};

function sgDate(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("Invalid Founding 50 access date");
  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric", month: "long", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(date) + " SGT";
}

function url(origin: string, path: string): string {
  const parsed = new URL(origin);
  const localDev = process.env.NODE_ENV !== "production" && parsed.hostname === "localhost";
  if (parsed.protocol !== "https:" && !(localDev && parsed.protocol === "http:")) {
    throw new Error("Founding 50 onboarding links must use HTTPS");
  }
  // No user-provided path or third-party host may enter an email CTA.
  return new URL(path, parsed.origin).toString();
}

const font = "Arial,Helvetica,sans-serif";

function step(number: string, title: string, description: string): string {
  return `
    <tr>
      <td style="padding:0 0 14px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
               style="border-collapse:separate;background-color:#F8F6FF;border:1px solid #E9E2FA;border-radius:14px">
          <tr>
            <td width="57" valign="top" style="width:57px;padding:17px 0 17px 16px">
              <span style="display:inline-block;background-color:#EDE3FF;border-radius:10px;color:#5E33A1;font-size:15px;font-weight:800;text-align:center;line-height:36px;width:38px;height:36px">${number}</span>
            </td>
            <td valign="top" style="padding:18px 14px 15px 10px">
              <p style="margin:0 0 5px;color:#20123D;font-size:16px;font-weight:800;line-height:1.3">${title}</p>
              <p style="margin:0;color:#4C4562;font-size:14px;line-height:1.6">${description}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export function renderFounding50WelcomeEmail(input: Founding50WelcomeInput): {
  subject: string; previewText: string; html: string; text: string;
} {
  const name = htmlEscape(input.studentName.trim());
  const plainName = input.studentName.trim();
  const start = sgDate(input.startsAt);
  const end = sgDate(input.endsAt);
  const worldUrl = url(input.origin, "/inventor");
  const learningUrl = url(input.origin, "/nova-plus");
  const imageUrl = url(input.origin, "/founding-50/email/nova-welcome.png");
  const siteUrl = url(input.origin, "/");
  const subject = "Welcome to DREAMSCAPE ONE! Your NOVA+ Adventure Starts Now 🚀";
  const previewText = "Your Founding 50 access is active! Here's how your family can get started.";

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${htmlEscape(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#F0ECF7;font-family:${font};-webkit-text-size-adjust:100%">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all">${htmlEscape(previewText)}</span>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
         style="border-collapse:collapse;background-color:#F0ECF7">
    <tr><td align="center" style="padding:22px 10px 32px">
      <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" width="600"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
             style="max-width:600px;width:100%;border-collapse:separate;background-color:#FFFFFF;border-radius:20px;overflow:hidden">
        <tr>
          <td align="center" style="padding:26px 20px 24px;background-color:#21153E;color:#FFFFFF">
            <p style="margin:0;color:#FFFFFF;font-family:${font};font-size:12px;font-weight:800;letter-spacing:3px;line-height:1.6">DREAMSCAPE ONE</p>
            <p style="margin:10px 0 0;color:#FFC18B;font-size:11px;font-weight:800;letter-spacing:1.5px;line-height:1.5">FOUNDING 50 BETA PROGRAMME</p>
            <h1 style="margin:19px 0 8px;font-family:Georgia,serif;font-size:30px;font-weight:normal;line-height:1.18;color:#FFFFFF">Your Adventure Begins Here!</h1>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#E8DFFD">Learn. Explore. Discover. Together.</p>
            <img src="${htmlEscape(imageUrl)}" alt="Nova welcomes your family to DREAMSCAPE ONE"
                 width="216" height="216" style="display:block;width:216px;max-width:75%;height:auto;margin:8px auto 0;border:0;outline:none;text-decoration:none" />
          </td>
        </tr>
        <tr><td style="padding:29px 27px 6px;color:#322B42;font-size:15px;line-height:1.75">
          <p style="margin:0 0 11px;font-size:16px;font-weight:800;color:#251846">Hello, Founding 50 family!</p>
          <p style="margin:0 0 13px"><strong>Your 30-day NOVA+ beta access for ${name} is now active!</strong></p>
          <p style="margin:0 0 13px">Welcome to DREAMSCAPE ONE, where learning goes beyond worksheets and becomes an adventure.</p>
          <p style="margin:0 0 13px">As one of our Founding 50 families, you're among the first to experience Nova's World and help us shape what comes next.</p>
          <p style="margin:0 0 24px">Whether you're exploring together or letting your young adventurer take the lead, here's how to get started.</p>
        </td></tr>
        <tr><td style="padding:0 27px 24px">
          <h2 style="margin:0 0 7px;font-size:21px;line-height:1.35;color:#261544">Start Your Adventure in 3 Easy Steps</h2>
          <p style="margin:0 0 20px;color:#655B78;font-size:14px;line-height:1.6">We recommend these three places for your first visit.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
            ${step("01", "Mission Centre", "Start with a mission! Choose a subject, answer questions, and earn Dream Tokens as you learn.")}
            ${step("02", "Think Lab", "Give your brain a workout! Explore fun challenges that build memory, observation and logical thinking.")}
            ${step("03", "Knowledge Arena", "Ready for a challenge? Put your knowledge to the test in exciting battles where every correct answer counts!")}
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:9px auto 0;border-collapse:separate">
            <tr><td align="center" bgcolor="#6E3EC2" style="border-radius:10px;background-color:#6E3EC2">
              <a href="${htmlEscape(worldUrl)}" style="display:inline-block;padding:16px 27px;color:#FFFFFF;text-decoration:none;font-family:${font};font-size:14px;font-weight:800;letter-spacing:.2px">ENTER NOVA'S WORLD &nbsp; →</a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 27px 22px;background-color:#F9F6FF;border-top:1px solid #EEE7FA;border-bottom:1px solid #EEE7FA">
          <h2 style="margin:0 0 16px;color:#261544;font-size:20px;line-height:1.35">There's More to Discover!</h2>
          <p style="margin:0 0 11px;color:#322B42;font-size:14px;line-height:1.65"><strong style="color:#542A94">04 · Skyforge Hangar</strong><br/>Visit Nova's futuristic hangar and discover more of the world.</p>
          <p style="margin:0;color:#322B42;font-size:14px;line-height:1.65"><strong style="color:#542A94">05 · Nova Home</strong><br/>Personalise your characters and make yourself at home!</p>
        </td></tr>
        <tr><td style="padding:25px 27px 22px">
          <h2 style="margin:0 0 12px;font-size:20px;color:#261544;line-height:1.35">For Parents: Follow Their Learning Journey</h2>
          <p style="margin:0 0 12px;color:#403A50;font-size:14px;line-height:1.7">Every adventure is an opportunity to learn.</p>
          <p style="margin:0 0 16px;color:#403A50;font-size:14px;line-height:1.7">With <strong>NOVA+ My Learning</strong>, you can follow your child's progress, discover their strengths and identify areas where a little extra practice could help.</p>
          <p style="margin:0;color:#403A50;font-size:14px;line-height:1.7">Stay connected to their learning journey, even while they're having fun!</p>
          <p style="margin:14px 0 2px;font-size:14px;line-height:1.5"><a href="${htmlEscape(learningUrl)}" style="color:#6338B0;font-weight:800;text-decoration:underline">EXPLORE MY LEARNING ↗</a></p>
        </td></tr>
        <tr><td style="padding:5px 27px 20px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
                 style="border-collapse:separate;border:1px solid #E9E2FA;background-color:#F8F6FF;border-radius:14px">
            <tr><td style="padding:19px 20px">
              <p style="margin:0 0 10px;font-size:16px;color:#251846;font-weight:800">Your Founding 50 Access</p>
              <p style="margin:0 0 5px;font-size:14px;line-height:1.6;color:#403A50">Student: <strong>${name}</strong></p>
              <p style="margin:0 0 5px;font-size:14px;line-height:1.6;color:#403A50">Access Starts: <strong>${htmlEscape(start)}</strong></p>
              <p style="margin:0 0 9px;font-size:14px;line-height:1.6;color:#403A50">Access Ends: <strong>${htmlEscape(end)}</strong></p>
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6C6280">Your 30-day beta period begins when your invitation is successfully activated. No paid subscription starts automatically.</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:4px 27px 25px;color:#403A50;font-size:14px;line-height:1.75">
          <h2 style="margin:0 0 11px;font-size:19px;color:#261544;line-height:1.35">Help Us Shape DREAMSCAPE ONE</h2>
          <p style="margin:0 0 12px">You're part of something we're building together.</p>
          <p style="margin:0 0 12px">During your final week, we'll send you one short feedback survey. We'd love to hear what your family enjoyed and what we can improve.</p>
          <p style="margin:0 0 12px">Thank you for joining us on this adventure. We can't wait to see what your family discovers!</p>
          <p style="margin:0"><strong>See you in Nova's World!</strong><br/>The DREAMSCAPE ONE Team</p>
        </td></tr>
        <tr><td align="center" style="padding:22px 25px 28px;border-top:1px solid #EEE7FA;background-color:#FAF9FD">
          <p style="margin:0 0 8px;font-size:12px;line-height:1.7;color:#615675">Need help getting started? Simply reply to this email.</p>
          <a href="${htmlEscape(siteUrl)}" style="font-size:12px;color:#6943B0;text-decoration:none;font-weight:700">dreamscape-one.com</a>
          <p style="margin:11px 0 0;font-size:11px;line-height:1.6;color:#82798F">Sent to the parent email associated with ${name}'s Founding 50 application.</p>
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>
  </table>
</body>
</html>`;

  const text = `DREAMSCAPE ONE · FOUNDING 50 BETA PROGRAMME
Your Adventure Begins Here!
Learn. Explore. Discover. Together.

Hello, Founding 50 family!

Your 30-day NOVA+ beta access for ${plainName} is now active!

Welcome to DREAMSCAPE ONE, where learning goes beyond worksheets and becomes an adventure.

As one of our Founding 50 families, you're among the first to experience Nova's World and help us shape what comes next.

Whether you're exploring together or letting your young adventurer take the lead, here's how to get started.

START YOUR ADVENTURE IN 3 EASY STEPS
01 · Mission Centre
Start with a mission! Choose a subject, answer questions, and earn Dream Tokens as you learn.

02 · Think Lab
Give your brain a workout! Explore fun challenges that build memory, observation and logical thinking.

03 · Knowledge Arena
Ready for a challenge? Put your knowledge to the test in exciting battles where every correct answer counts!

ENTER NOVA'S WORLD: ${worldUrl}

THERE'S MORE TO DISCOVER!
04 · Skyforge Hangar — Visit Nova's futuristic hangar and discover more of the world.
05 · Nova Home — Personalise your characters and make yourself at home!

FOR PARENTS: FOLLOW THEIR LEARNING JOURNEY
Every adventure is an opportunity to learn.
With NOVA+ My Learning, you can follow your child's progress, discover their strengths and identify areas where a little extra practice could help.
Stay connected to their learning journey, even while they're having fun!
EXPLORE MY LEARNING: ${learningUrl}

YOUR FOUNDING 50 ACCESS
Student: ${plainName}
Access Starts: ${start}
Access Ends: ${end}
Your 30-day beta period begins when your invitation is successfully activated. No paid subscription starts automatically.

HELP US SHAPE DREAMSCAPE ONE
You're part of something we're building together.
During your final week, we'll send you one short feedback survey. We'd love to hear what your family enjoyed and what we can improve.
Thank you for joining us on this adventure. We can't wait to see what your family discovers!

See you in Nova's World!
The DREAMSCAPE ONE Team

Need help getting started? Simply reply to this email.
${siteUrl}`;

  return { subject, previewText, html, text };
}
