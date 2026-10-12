import { founding50ResendApiKey, founding50ResendSender, founding50ResendReplyTo } from "@/lib/founding-50/resend-config";

export function htmlEscape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c] || c);
}

export async function sendF50Email(args: { to: string; subject: string; heading: string; body: string; actionUrl?: string; actionLabel?: string }) {
  const key = founding50ResendApiKey();
  if (!key) throw new Error("RESEND_API_KEY missing — invitation not delivered");
  const from = founding50ResendSender();
  const escapedHeading = htmlEscape(args.heading);
  const action = args.actionUrl ? `<p style="margin:24px 0"><a style="display:inline-block;border-radius:99px;padding:14px 22px;background:#8ee8ff;color:#100622;text-decoration:none;font-weight:bold" href="${htmlEscape(args.actionUrl)}">${htmlEscape(args.actionLabel || "Continue")}</a></p>` : "";
  const html = `<div style="padding:34px;background:#030a17;color:white;font-family:Arial,Helvetica,sans-serif"><div style="max-width:600px;margin:auto;padding:32px;border:1px solid #263b53;border-radius:25px;background:#0a1228"><p style="color:#8ee8ff;letter-spacing:.18em;font-size:11px;font-weight:bold">DREAMSCAPE · FOUNDING 50</p><h1 style="font-family:Georgia,serif;font-weight:normal;font-size:35px">${escapedHeading}</h1><p style="line-height:1.7;color:#dbe6f4">${htmlEscape(args.body)}</p>${action}<p style="font-size:12px;color:#a7b7ca">If this message was unexpected, you can ignore it.</p></div></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, reply_to: founding50ResendReplyTo(), to: [args.to], subject: args.subject, html }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Resend request failed (${response.status})`);
}
