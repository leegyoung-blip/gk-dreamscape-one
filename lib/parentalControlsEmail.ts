import "server-only";

const PARENTAL_CONTROLS_FROM =
  "Dreamscape Parent Controls <parent-controls@mail.dreamscape-one.com>";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendParentalControlResetEmail(input: {
  recipient: string;
  resetUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing from the Vercel environment.");
  }

  const safeUrl = escapeHtml(input.resetUrl);

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#050b18;font-family:Arial,Helvetica,sans-serif;color:#ffffff;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#050b18;padding:32px 14px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;overflow:hidden;border:1px solid #24435f;border-radius:24px;background:#0a1730;">
            <tr>
              <td style="padding:28px 30px;background:linear-gradient(135deg,#0c3450,#26134d);">
                <div style="font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#8ee8ff;">Dreamscape One · Parent Controls</div>
                <div style="margin-top:10px;font-size:28px;font-weight:800;line-height:1.2;color:#ffffff;">Reset your parental password</div>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0;font-size:15px;line-height:1.75;color:#c9d7e8;">
                  A parental-control password reset was requested for a learner account you control.
                </p>
                <p style="margin:14px 0 0;font-size:14px;line-height:1.75;color:#9fb0c6;">
                  This secure link expires in 30 minutes and can only be used once. Your normal Dreamscape account password will not be changed.
                </p>
                <div style="margin-top:28px;text-align:center;">
                  <a href="${safeUrl}" style="display:inline-block;border-radius:999px;background:linear-gradient(135deg,#35c5ff,#7c5cff);padding:14px 24px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;">Reset parental password</a>
                </div>
                <p style="margin:26px 0 0;font-size:12px;line-height:1.7;color:#7f91a8;">
                  If you did not request this reset, you can safely ignore this email. The existing parental password remains active.<br><br>
                  <span style="word-break:break-all;color:#8fbad1;">${safeUrl}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #1c3550;padding:20px 30px;text-align:center;font-size:11px;line-height:1.6;color:#6f849d;">
                Dreamscape One · Guru Kids Pro<br>
                Security enquiries: admin@gurukidspro.com
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: PARENTAL_CONTROLS_FROM,
      to: [input.recipient],
      reply_to: "admin@gurukidspro.com",
      subject: "Reset your Dreamscape parental-control password",
      html,
      tags: [
        { name: "system", value: "parental_controls" },
        { name: "type", value: "password_reset" },
      ],
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    error?: { message?: string };
  };

  if (!response.ok || !payload.id) {
    throw new Error(
      payload.message
        || payload.error?.message
        || `Resend returned HTTP ${response.status}.`,
    );
  }

  return { resendEmailId: payload.id };
}
