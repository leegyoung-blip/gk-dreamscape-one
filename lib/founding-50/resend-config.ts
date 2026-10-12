/**
 * Founding 50-specific Resend configuration.
 * Do not change RESEND_FROM: subscription, billing and other Dreamscape emails
 * may depend on it. This module is server-only.
 *
 * Optional override for staging or future sender changes:
 *   FOUNDING50_RESEND_FROM="Dreamscape One <hello@mail.dreamscape-one.com>"
 * Resend must have mail.dreamscape-one.com verified in the sending account.
 * NOTE: FOUNDING50_RESEND_FROM overrides the default; update/remove any
 * outdated Vercel override before deploying or the old sender will continue.
 * Reply-To stays hello@dreamscape-one.com for the existing reply inbox.
 */
export const FOUNDING50_ADMIN_NOTIFICATION_TO = "admin@gurukidspro.com";

export function founding50ResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() || "";
}

export function founding50ResendSender(): string {
  return (
    process.env.FOUNDING50_RESEND_FROM?.trim() ||
    "Dreamscape One <hello@mail.dreamscape-one.com>"
  );
}

export function founding50ResendReplyTo(): string {
  return "hello@dreamscape-one.com";
}
