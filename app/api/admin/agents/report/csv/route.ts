import {
  checkAdminFromRequest,
} from "@/lib/checkAdmin";

import {
  createAdminClient,
} from "@/lib/supabase/admin";

import {
  agentTransactionsToCsv,
  loadAgentReportTransactionPage,
  safeReportMode,
  TRANSACTION_COLUMNS,
} from "@/lib/agents/reporting/economyReport";

export const runtime =
  "nodejs";

export const dynamic =
  "force-dynamic";

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
    return new Response(
      "Admin access required.",
      {
        status:
          403,
      },
    );
  }

  const url =
    new URL(
      request.url,
    );

  const mode =
    safeReportMode(
      url.searchParams.get(
        "mode",
      ),
    );

  const startDate =
    dateValue(
      url.searchParams.get(
        "startDate",
      ),
    );

  const endDate =
    dateValue(
      url.searchParams.get(
        "endDate",
      ),
    );

  const asOf =
    url.searchParams.get(
      "asOf",
    ) ||
    new Date()
      .toISOString();

  const admin =
    createAdminClient();

  const encoder =
    new TextEncoder();

  const pageSize =
    5000;

  const stream =
    new ReadableStream<
      Uint8Array
    >({
      async start(
        controller,
      ) {
        try {
          controller.enqueue(
            encoder.encode(
              "\uFEFF" +
              TRANSACTION_COLUMNS
                .join(
                  ",",
                ) +
              "\r\n",
            ),
          );

          let offset =
            0;

          while (true) {
            const rows =
              await loadAgentReportTransactionPage({
                admin,

                mode,

                startDate,

                endDate,

                asOf,

                offset,

                limit:
                  pageSize,
              });

            if (
              rows.length ===
              0
            ) {
              break;
            }

            controller.enqueue(
              encoder.encode(
                agentTransactionsToCsv(
                  rows,
                  false,
                ) +
                "\r\n",
              ),
            );

            offset +=
              rows.length;

            if (
              rows.length <
              pageSize
            ) {
              break;
            }
          }

          controller.close();
        } catch (
          error
        ) {
          controller.error(
            error,
          );
        }
      },
    });

  const filename =
    mode === "RANGE"
      ? `dreamscape-agent-transactions-${startDate || "start"}-to-${endDate || "end"}.csv`
      : `dreamscape-agent-${mode.toLowerCase()}-transactions.csv`;

  return new Response(
    stream,
    {
      headers: {
        "Content-Type":
          "text/csv; charset=utf-8",

        "Content-Disposition":
          `attachment; filename="${filename}"`,

        "Cache-Control":
          "no-store",
      },
    },
  );
}