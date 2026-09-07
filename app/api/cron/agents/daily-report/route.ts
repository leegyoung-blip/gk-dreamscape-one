import {
  timingSafeEqual,
} from "crypto";

import {
  NextResponse,
} from "next/server";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  loadAgentEconomyReport,
  loadAgentReportRecipient,
  sendAgentEconomyReportEmail,
} from "@/lib/agents/reporting/economyReport";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

function json(
  body: unknown,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function safeSecretEqual(
  received:
    string,
  expected:
    string,
) {
  const receivedBuffer =
    Buffer.from(
      received,
    );

  const expectedBuffer =
    Buffer.from(
      expected,
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    receivedBuffer,
    expectedBuffer,
  );
}

export async function POST(
  request:
    Request,
) {
  const expectedSecret =
    process.env
      .AGENT_DAILY_REPORT_CRON_SECRET
      ?.trim();

  if (!expectedSecret) {
    return json(
      {
        ok:
          false,

        error:
          "AGENT_DAILY_REPORT_CRON_SECRET is not configured.",
      },
      500,
    );
  }

  const authorization =
    request.headers
      .get(
        "authorization",
      ) ||
    "";

  const receivedSecret =
    authorization
      .replace(
        /^Bearer\s+/i,
        "",
      )
      .trim();

  if (
    !receivedSecret ||
    !safeSecretEqual(
      receivedSecret,
      expectedSecret,
    )
  ) {
    return json(
      {
        ok:
          false,

        error:
          "Unauthorized.",
      },
      401,
    );
  }

  const admin =
    createAdminClient();

  const asOf =
    new Date()
      .toISOString();

  let deliveryId:
    string |
    null =
      null;

  try {
    const [
      report,
      recipient,
    ] =
      await Promise.all([
        loadAgentEconomyReport({
          admin,

          mode:
            "DAILY",

          asOf,
        }),

        loadAgentReportRecipient(
          admin,
        ),
      ]);

    const {
      data:
        claimData,

      error:
        claimError,
    } =
      await admin.rpc(
        "agent_claim_report_delivery_v1",
        {
          p_report_mode:
            "DAILY",

          p_window_start:
            report
              .window
              .start,

          p_window_end:
            report
              .window
              .end,

          p_recipient:
            recipient,
        },
      );

    if (claimError) {
      throw new Error(
        `Could not claim daily report delivery: ${claimError.message}`,
      );
    }

    const claim =
      (
        claimData ||
        {}
      ) as {
        claimed?: boolean;
        delivery_id?: string;
        reason?: string;
      };

    deliveryId =
      claim.delivery_id ||
      null;

    if (
      claim.claimed !==
      true
    ) {
      return json({
        ok:
          true,

        skipped:
          true,

        reason:
          claim.reason ||
          "already_claimed",

        deliveryId,
      });
    }

    if (!deliveryId) {
      throw new Error(
        "Daily report delivery claim returned no delivery ID.",
      );
    }

    const result =
      await sendAgentEconomyReportEmail({
        admin,

        mode:
          "DAILY",

        asOf,

        preloadedReport:
          report,
      });

    const {
      error:
        finalizeError,
    } =
      await admin.rpc(
        "agent_finalize_report_delivery_v1",
        {
          p_delivery_id:
            deliveryId,

          p_status:
            "sent",

          p_resend_email_id:
            result.resendEmailId,

          p_error:
            null,
        },
      );

    if (finalizeError) {
      throw new Error(
        `Report sent but delivery ledger could not be finalised: ${finalizeError.message}`,
      );
    }

    return json({
      ok:
        true,

      sent:
        true,

      deliveryId,

      result,
    });
  } catch (
    error
  ) {
    const message =
      error instanceof
        Error
        ? error.message
        : "Daily agent report failed.";

    if (deliveryId) {
      await admin.rpc(
        "agent_finalize_report_delivery_v1",
        {
          p_delivery_id:
            deliveryId,

          p_status:
            "failed",

          p_resend_email_id:
            null,

          p_error:
            message,
        },
      );
    }

    console.error(
      "Daily agent report error:",
      error,
    );

    return json(
      {
        ok:
          false,

        error:
          message,
      },
      500,
    );
  }
}