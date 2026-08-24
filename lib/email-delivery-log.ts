import "server-only";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type EmailDeliveryStatus = "pending" | "sent" | "failed" | "skipped";

type DeliveryLogInput = {
  category: string;
  emailType?: string | null;
  to: string | string[];
  from: string;
  replyTo?: string | string[] | null;
  subject: string;
  metadata?: Record<string, unknown> | null;
};

function normaliseList(value: string | string[] | null | undefined): string[] {
  if (!value) return [];

  return (Array.isArray(value) ? value : [value])
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

export function parseMailbox(value: string): {
  raw: string;
  name: string | null;
  email: string;
} {
  const raw = String(value || "").trim();
  const match = raw.match(/^(.*?)\s*<([^<>]+)>$/);

  if (match) {
    return {
      raw,
      name: match[1].trim().replace(/^["']|["']$/g, "") || null,
      email: match[2].trim().toLowerCase(),
    };
  }

  return {
    raw,
    name: null,
    email: raw.toLowerCase(),
  };
}

export async function createEmailDeliveryLog(
  input: DeliveryLogInput,
): Promise<string | null> {
  const sender = parseMailbox(input.from);
  const replyTo = normaliseList(input.replyTo);

  try {
    const { data, error } = await supabaseAdmin
      .from("dreamscape_email_delivery_logs")
      .insert({
        provider: "resend",
        email_category: input.category,
        email_type: input.emailType || null,
        recipient_emails: normaliseList(input.to),
        sender_name: sender.name,
        sender_email: sender.email,
        sender_raw: sender.raw,
        reply_to_emails: replyTo,
        subject: input.subject,
        status: "pending",
        metadata: input.metadata || {},
      })
      .select("id")
      .single();

    if (error) {
      console.error("Could not create Dreamscape email delivery log", error);
      return null;
    }

    return String(data.id);
  } catch (error) {
    console.error("Unexpected Dreamscape email delivery log error", error);
    return null;
  }
}

export async function updateEmailDeliveryLog(
  id: string | null,
  input: {
    status: EmailDeliveryStatus;
    providerMessageId?: string | null;
    error?: string | null;
    metadata?: Record<string, unknown> | null;
  },
) {
  if (!id) return;

  try {
    const now = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from("dreamscape_email_delivery_logs")
      .update({
        status: input.status,
        provider_message_id: input.providerMessageId || null,
        error_message: input.error || null,
        ...(input.status === "sent" ? { sent_at: now } : {}),
        ...(input.status === "failed" ? { failed_at: now } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
        updated_at: now,
      })
      .eq("id", id);

    if (error) {
      console.error("Could not update Dreamscape email delivery log", error);
    }
  } catch (error) {
    console.error("Unexpected Dreamscape email delivery log update error", error);
  }
}
