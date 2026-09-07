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
  loadAgentReportTransactions,
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

function reportMode(
  value: unknown,
): AgentReportMode {
  return String(value || "")
    .trim()
    .toUpperCase() === "DAILY"
    ? "DAILY"
    : "CURRENT";
}

function safeAsOf(
  value: unknown,
) {
  const clean =
    typeof value === "string"
      ? value.trim()
      : "";

  if (!clean) {
    return new Date()
      .toISOString();
  }

  const parsed =
    new Date(clean);

  if (
    Number.isNaN(
      parsed.getTime(),
    )
  ) {
    return new Date()
      .toISOString();
  }

  return parsed
    .toISOString();
}

export async function GET(
  request: Request,
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

    const mode =
      reportMode(
        url.searchParams.get(
          "mode",
        ),
      );

    const asOf =
      safeAsOf(
        url.searchParams.get(
          "asOf",
        ),
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
          mode,
          asOf,
        }),

        loadAgentReportTransactions({
          admin,
          mode,
          asOf,
        }),
      ]);

    return json({
      ok:
        true,

      report,

      transactions,
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
          error instanceof Error
            ? error.message
            : "Agent economy report could not be generated.",
      },
      500,
    );
  }
}

export async function POST(
  request: Request,
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
        mode?: AgentReportMode;
        asOf?: string;
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
          reportMode(
            body.mode,
          ),

        asOf:
          safeAsOf(
            body.asOf,
          ),
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
          error instanceof Error
            ? error.message
            : "Agent economy report email could not be sent.",
      },
      500,
    );
  }
}