/**
 * Founding 50 shares the same Resend configuration as the existing Dreamscape
 * subscription mailer. RESEND_FROM is the existing system's sender variable.
 * RESEND_FROM_EMAIL is supported for older Founding 50 deployments.
 *
 * The final fallback matches the current subscription email module. It must
 * point to a domain verified in the site's Resend account.
 * This module runs on the server only. Do not import it into a client component.
 */
export function founding50ResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() || "";
}

export function founding50ResendSender(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "Guru Kids Pro <admin@gurukidspro.com>"
  );
}
