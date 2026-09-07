import {
  NextResponse,
} from "next/server";

import {
  checkAdminFromRequest,
} from "@/lib/checkAdmin";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  loadAgentEconomyReport,
  loadAgentReportTransactionPreview,
  safeReportMode,
  sendAgentEconomyReportEmail,
} from "@/lib/agents/reporting/economyReport";

import type {
  AgentReportMode,
} from "@/lib/agents/reporting/types";

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

function dateValue(
  value:
    string |
    null,
) {
  const clean =
    String(
      value || "",
    )
      .trim();

  return /^\d{4}-\d{2}-\d{2}$/
    .test(
      clean,
    )
      ? clean
      : null;
}

function asOfValue(
  value:
    string |
    null,
) {
  if (!value) {
    return new Date()
      .toISOString();
  }

  const parsed =
    new Date(
      value,
    );

  return Number.isNaN(
    parsed.getTime(),
  )
    ? new Date()
        .toISOString()
    : parsed
        .toISOString();
}

function requestValues(
  url:
    URL,
) {
  const mode =
    safeReportMode(
      url.searchParams.get(
        "mode",
      ),
    );

  return {
    mode,

    startDate:
      dateValue(
        url.searchParams.get(
          "startDate",
        ),
      ),

    endDate:
      dateValue(
        url.searchParams.get(
          "endDate",
        ),
      ),

    asOf:
      asOfValue(
        url.searchParams.get(
          "asOf",
        ),
      ),
  };
}

export async function GET(
  request:
    Request,
) {
  const access =
    await checkAdminFromRequest(
      request,
    );

  if (
    !access.isAdmin ||
    !access.user
  ) {
    return json(
      {
        ok:
          false,

        error:
          access.error ||
          "Admin access required.",
      },
      403,
    );
  }

  try {
    const url =
      new URL(
        request.url,
      );

    const values =
      requestValues(
        url,
      );

    const admin =
      createAdminClient();

    const [
      report,
      transactions,
    ] =
      await Promise.all([
        loadAgentEconomyReport({
          admin,
          ...values,
        }),

        loadAgentReportTransactionPreview({
          admin,
          ...values,
          limit:
            250,
        }),
      ]);

    return json({
      ok:
        true,

      report,

      transactions,

      transactionPreviewLimit:
        250,

      transactionPreviewTruncated:
        Number(
          report
            .export
            .transaction_rows ||
          0,
        ) >
        transactions.length,
    });
  } catch (
    error
  ) {
    console.error(
      "Agent report generation error:",
      error,
    );

    return json(
      {
        ok:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "Agent report could not be generated.",
      },
      500,
    );
  }
}

export async function POST(
  request:
    Request,
) {
  const access =
    await checkAdminFromRequest(
      request,
    );

  if (
    !access.isAdmin ||
    !access.user
  ) {
    return json(
      {
        ok:
          false,

        error:
          access.error ||
          "Admin access required.",
      },
      403,
    );
  }

  try {
    const body =
      (
        await request
          .json()
      ) as {
        action?: string;

        mode?:
          AgentReportMode;

        startDate?:
          string | null;

        endDate?:
          string | null;

        asOf?:
          string | null;
      };

    if (
      body.action !==
      "send_email"
    ) {
      return json(
        {
          ok:
            false,

          error:
            "Unsupported report action.",
        },
        400,
      );
    }

    const admin =
      createAdminClient();

    const result =
      await sendAgentEconomyReportEmail({
        admin,

        mode:
          safeReportMode(
            body.mode,
          ),

        startDate:
          dateValue(
            body.startDate ||
            null,
          ),

        endDate:
          dateValue(
            body.endDate ||
            null,
          ),

        asOf:
          body.asOf ||
          new Date()
            .toISOString(),
      });

    return json({
      ok:
        true,

      result,
    });
  } catch (
    error
  ) {
    console.error(
      "Agent report email error:",
      error,
    );

    return json(
      {
        ok:
          false,

        error:
          error instanceof
            Error
            ? error.message
            : "Agent report email could not be sent.",
      },
      500,
    );
  }
}