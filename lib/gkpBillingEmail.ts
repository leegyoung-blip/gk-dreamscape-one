import { createHash, randomUUID } from "crypto";
import { createBillingServiceClient } from "@/lib/gkpBillingServer";

export type BillingEmailType =
  | "invoice_issued"
  | "invoice_resent"
  | "payment_received";

type SendOptions = {
  invoiceId: string;
  emailType: BillingEmailType;
  origin: string;
  requestedBy?: string | null;
  paymentId?: string | null;
};

type PreparedEmail = {
  invoiceId: string;
  accountId: string;
  recipients: string[];
  subject: string;
  html: string;
  idempotencyKey: string;
  emailType: BillingEmailType;
  metadata: Record<string, unknown>;
  requestedBy: string | null;
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

function numberValue(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(numberValue(value));
}

function formatDate(value: unknown) {
  if (!value) return "—";
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function formatMonth(value: unknown) {
  if (!value) return "";
  const raw = String(value).slice(0, 10);
  const parsed = new Date(`${raw}T12:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

function cleanOrigin(origin: string) {
  return origin.replace(/\/+$/, "");
}

function uniqueRecipients(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of values) {
    const value = String(raw || "").trim().toLowerCase();
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function emailShell({
  preheader,
  title,
  intro,
  invoiceNumber,
  studentNames,
  billingPeriod,
  totalLabel,
  totalValue,
  dueDate,
  buttonLabel,
  invoiceUrl,
  footerEmail,
}: {
  preheader: string;
  title: string;
  intro: string;
  invoiceNumber: string;
  studentNames: string[];
  billingPeriod: string;
  totalLabel: string;
  totalValue: string;
  dueDate?: string | null;
  buttonLabel: string;
  invoiceUrl: string;
  footerEmail: string;
}) {
  const studentLine =
    studentNames.length > 0 ? studentNames.join(", ") : "Student account";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f5f2ea;font-family:Arial,Helvetica,sans-serif;color:#15233b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f2ea;padding:30px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #ded5c4;border-radius:22px;overflow:hidden;">
            <tr>
              <td style="background:#15233b;padding:26px 30px;">
                <div style="font-size:12px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#e8c474;">Guru Kids Pro</div>
                <div style="margin-top:8px;font-size:28px;font-weight:700;line-height:1.15;color:#ffffff;">${escapeHtml(title)}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0;font-size:15px;line-height:1.7;color:#5f6672;">${escapeHtml(intro)}</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;background:#fbfaf7;border:1px solid #ebe4d8;border-radius:16px;">
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Invoice</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(invoiceNumber)}</td>
                  </tr>
                  <tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Student${studentNames.length === 1 ? "" : "s"}</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(studentLine)}</td>
                  </tr>
                  ${
                    billingPeriod
                      ? `<tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Billing period</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(billingPeriod)}</td>
                  </tr>`
                      : ""
                  }
                  ${
                    dueDate
                      ? `<tr>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;color:#81796d;font-size:12px;">Due date</td>
                    <td style="padding:14px 16px;border-bottom:1px solid #ebe4d8;text-align:right;font-weight:700;">${escapeHtml(dueDate)}</td>
                  </tr>`
                      : ""
                  }
                  <tr>
                    <td style="padding:16px;color:#81796d;font-size:12px;">${escapeHtml(totalLabel)}</td>
                    <td style="padding:16px;text-align:right;font-size:22px;font-weight:800;color:#9b7029;">${escapeHtml(totalValue)}</td>
                  </tr>
                </table>

                <div style="margin-top:28px;text-align:center;">
                  <a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;background:#15233b;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:14px 24px;border-radius:999px;">${escapeHtml(buttonLabel)}</a>
                </div>

                <p style="margin:26px 0 0;font-size:12px;line-height:1.7;color:#8a8378;">
                  This is a secure Guru Kids Pro invoice link. If the button does not open, copy and paste this address into your browser:<br>
                  <span style="word-break:break-all;color:#6f5a31;">${escapeHtml(invoiceUrl)}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#fbfaf7;border-top:1px solid #ebe4d8;padding:20px 30px;text-align:center;font-size:11px;line-height:1.6;color:#928a7d;">
                Guru Kids Pro · Blk 4 Queen's Road #02-127, Singapore 260004<br>
                Billing enquiries: ${escapeHtml(footerEmail)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

async function prepareEmail(
  options: SendOptions,
): Promise<PreparedEmail> {
  const client = createBillingServiceClient();

  const { data: invoice, error: invoiceError } = await client
    .from("gkp_billing_invoices")
    .select(
      "id,invoice_number,account_id,billing_period,due_date,currency,status,total_amount,amount_paid,balance_due,paid_at,public_token,public_link_enabled,issued_at",
    )
    .eq("id", options.invoiceId)
    .maybeSingle();

  if (invoiceError) throw invoiceError;
  if (!invoice) throw new Error("Invoice not found.");

  if (
    !["issued", "partially_paid", "paid", "overdue"].includes(
      String(invoice.status),
    )
  ) {
    throw new Error("Only issued invoices can be emailed.");
  }

  if (!invoice.public_link_enabled) {
    throw new Error("The secure parent invoice link is disabled.");
  }

  const [accountResult, settingsResult, itemResult] = await Promise.all([
    client
      .from("gkp_billing_accounts")
      .select("payer_name,billing_email,alternate_email")
      .eq("id", invoice.account_id)
      .maybeSingle(),
    client
      .from("gkp_billing_settings")
      .select("billing_email,support_email")
      .eq("id", true)
      .maybeSingle(),
    client
      .from("gkp_billing_invoice_items")
      .select("student_id")
      .eq("invoice_id", invoice.id),
  ]);

  const firstError =
    accountResult.error || settingsResult.error || itemResult.error;
  if (firstError) throw firstError;
  if (!accountResult.data) throw new Error("Billing account not found.");

  const studentIds = Array.from(
    new Set(
      (itemResult.data || [])
        .map((row) => row.student_id)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const studentsResult =
    studentIds.length > 0
      ? await client
          .from("gkp_billing_students")
          .select("id,full_name")
          .in("id", studentIds)
      : { data: [], error: null };

  if (studentsResult.error) throw studentsResult.error;

  const studentNames = (studentsResult.data || []).map(
    (student) => student.full_name,
  );

  const recipients = uniqueRecipients([
    accountResult.data.billing_email,
    accountResult.data.alternate_email,
  ]);

  if (recipients.length === 0) {
    throw new Error("The family does not have a billing email address.");
  }

  const invoiceUrl = `${cleanOrigin(options.origin)}/invoice/${invoice.public_token}`;
  const billingPeriod = formatMonth(invoice.billing_period);
  const supportEmail =
    settingsResult.data?.support_email ||
    settingsResult.data?.billing_email ||
    "admin@gurukidspro.com";

  let subject: string;
  let html: string;
  let idempotencySeed: string;
  const metadata: Record<string, unknown> = {
    issued_at: invoice.issued_at,
  };

  if (options.emailType === "payment_received") {
    if (String(invoice.status) !== "paid" && numberValue(invoice.balance_due) > 0) {
      throw new Error("The invoice is not fully paid yet.");
    }

    if (options.paymentId) {
      metadata.provider_payment_id = options.paymentId;
    }

    subject = `Payment Received – ${invoice.invoice_number} – Guru Kids Pro`;
    idempotencySeed =
      options.paymentId ||
      String(invoice.paid_at || invoice.invoice_number);

    html = emailShell({
      preheader: `Payment received for ${invoice.invoice_number}.`,
      title: "Payment received",
      intro: `Thank you. We have received payment for ${invoice.invoice_number}. Your paid invoice is now available for your records.`,
      invoiceNumber: invoice.invoice_number,
      studentNames,
      billingPeriod,
      totalLabel: "Amount received",
      totalValue: formatMoney(invoice.amount_paid, invoice.currency),
      buttonLabel: "View Paid Invoice",
      invoiceUrl,
      footerEmail: supportEmail,
    });
  } else {
    const isResend = options.emailType === "invoice_resent";
    subject = `${billingPeriod ? `${billingPeriod} Invoice` : "Invoice"} – Guru Kids Pro`;
    idempotencySeed = isResend
      ? randomUUID()
      : String(invoice.issued_at || invoice.invoice_number);

    html = emailShell({
      preheader: `${invoice.invoice_number} is ready.`,
      title: isResend ? "Your invoice is ready" : "New invoice issued",
      intro: isResend
        ? `We are resending the secure link for ${invoice.invoice_number}. Please review the invoice and complete payment by the stated due date.`
        : `Your Guru Kids Pro invoice is ready. Please review the lesson details and complete payment by the stated due date.`,
      invoiceNumber: invoice.invoice_number,
      studentNames,
      billingPeriod,
      totalLabel: "Amount due",
      totalValue: formatMoney(invoice.balance_due, invoice.currency),
      dueDate: formatDate(invoice.due_date),
      buttonLabel: "View & Pay Invoice",
      invoiceUrl,
      footerEmail: supportEmail,
    });
  }

  const keyHash = createHash("sha256")
    .update(
      `${options.emailType}:${invoice.id}:${idempotencySeed}`,
    )
    .digest("hex")
    .slice(0, 32);

  return {
    invoiceId: invoice.id,
    accountId: invoice.account_id,
    recipients,
    subject,
    html,
    idempotencyKey: `gkp-${options.emailType}-${keyHash}`,
    emailType: options.emailType,
    metadata,
    requestedBy: options.requestedBy || null,
  };
}

async function existingSuccessfulLog(idempotencyKey: string) {
  const client = createBillingServiceClient();
  const { data, error } = await client
    .from("gkp_billing_email_logs")
    .select("id,resend_email_id,status,sent_at")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function createOrResetLog(email: PreparedEmail) {
  const client = createBillingServiceClient();

  const existing = await existingSuccessfulLog(email.idempotencyKey);

  if (existing?.status === "sent") {
    return {
      logId: existing.id,
      alreadySent: true,
      resendEmailId: existing.resend_email_id,
    };
  }

  if (existing?.id) {
    const { error } = await client
      .from("gkp_billing_email_logs")
      .update({
        recipient_emails: email.recipients,
        subject: email.subject,
        status: "pending",
        error_message: null,
        metadata: email.metadata,
        requested_by: email.requestedBy,
      })
      .eq("id", existing.id);

    if (error) throw error;

    return {
      logId: existing.id,
      alreadySent: false,
      resendEmailId: null,
    };
  }

  const logId = randomUUID();
  const { error } = await client
    .from("gkp_billing_email_logs")
    .insert({
      id: logId,
      invoice_id: email.invoiceId,
      account_id: email.accountId,
      email_type: email.emailType,
      recipient_emails: email.recipients,
      subject: email.subject,
      status: "pending",
      idempotency_key: email.idempotencyKey,
      metadata: email.metadata,
      requested_by: email.requestedBy,
    });

  if (error) throw error;

  return { logId, alreadySent: false, resendEmailId: null };
}

async function updateLog(
  logId: string,
  values: {
    status: "sent" | "failed";
    resendEmailId?: string | null;
    errorMessage?: string | null;
  },
) {
  const client = createBillingServiceClient();
  const { error } = await client
    .from("gkp_billing_email_logs")
    .update({
      status: values.status,
      resend_email_id: values.resendEmailId || null,
      error_message: values.errorMessage || null,
      sent_at: values.status === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", logId);

  if (error) {
    console.error("Billing email log update failed", error);
  }
}

export async function sendGkpBillingEmail(options: SendOptions) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const email = await prepareEmail(options);
  const log = await createOrResetLog(email);

  if (log.alreadySent) {
    return {
      sent: false,
      skipped: true,
      resendEmailId: log.resendEmailId,
      recipients: email.recipients,
    };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from: senderAddress(),
      to: email.recipients,
      reply_to: "admin@gurukidspro.com",
      subject: email.subject,
      html: email.html,
      tags: [
        { name: "system", value: "gkp_billing" },
        { name: "type", value: email.emailType },
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

    await updateLog(log.logId, {
      status: "failed",
      errorMessage: message,
    });

    throw new Error(message);
  }

  await updateLog(log.logId, {
    status: "sent",
    resendEmailId: payload.id,
  });

  return {
    sent: true,
    skipped: false,
    resendEmailId: payload.id,
    recipients: email.recipients,
  };
}

export async function sendGkpInvoiceBatch({
  batchId,
  origin,
  requestedBy,
}: {
  batchId: string;
  origin: string;
  requestedBy?: string | null;
}) {
  const apiKey = requiredEnv("RESEND_API_KEY");
  const client = createBillingServiceClient();

  const { data: invoices, error } = await client
    .from("gkp_billing_invoices")
    .select("id")
    .eq("batch_id", batchId)
    .in("status", ["issued", "partially_paid", "paid", "overdue"])
    .order("invoice_number", { ascending: true });

  if (error) throw error;

  const prepared: Array<{
    email: PreparedEmail;
    logId: string;
  }> = [];
  let skipped = 0;

  for (const invoice of invoices || []) {
    const email = await prepareEmail({
      invoiceId: invoice.id,
      emailType: "invoice_issued",
      origin,
      requestedBy,
    });

    const log = await createOrResetLog(email);

    if (log.alreadySent) {
      skipped += 1;
      continue;
    }

    prepared.push({ email, logId: log.logId });
  }

  if (prepared.length === 0) {
    return { sent: 0, skipped, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (let start = 0; start < prepared.length; start += 100) {
    const chunk = prepared.slice(start, start + 100);
    const chunkSignature = createHash("sha256")
      .update(chunk.map((entry) => entry.email.idempotencyKey).join("|"))
      .digest("hex")
      .slice(0, 32);

    const response = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `gkp-batch-${chunkSignature}`,
      },
      body: JSON.stringify(
        chunk.map(({ email }) => ({
          from: senderAddress(),
          to: email.recipients,
          reply_to: "admin@gurukidspro.com",
          subject: email.subject,
          html: email.html,
          tags: [
            { name: "system", value: "gkp_billing" },
            { name: "type", value: email.emailType },
          ],
        })),
      ),
    });

    const payload = (await response.json().catch(() => ({}))) as {
      data?: Array<{ id?: string }>;
      message?: string;
      error?: { message?: string };
    };

    if (!response.ok || !Array.isArray(payload.data)) {
      const message =
        payload.message ||
        payload.error?.message ||
        `Resend batch returned HTTP ${response.status}.`;

      failed += chunk.length;

      await Promise.all(
        chunk.map(({ logId }) =>
          updateLog(logId, {
            status: "failed",
            errorMessage: message,
          }),
        ),
      );
      continue;
    }

    await Promise.all(
      chunk.map(async ({ logId }, index) => {
        const resendId = payload.data?.[index]?.id || null;

        if (!resendId) {
          failed += 1;
          await updateLog(logId, {
            status: "failed",
            errorMessage: "Resend did not return an email id.",
          });
          return;
        }

        sent += 1;
        await updateLog(logId, {
          status: "sent",
          resendEmailId: resendId,
        });
      }),
    );
  }

  return { sent, skipped, failed };
}
