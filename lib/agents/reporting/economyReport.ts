import "server-only";

import type {
  SupabaseClient,
} from "@supabase/supabase-js";

import type {
  AgentEconomyHealthReport,
  AgentReportMode,
  AgentReportTransaction,
} from "@/lib/agents/reporting/types";

type JsonObject =
  Record<string, unknown>;

function isObject(
  value: unknown,
): value is JsonObject {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value),
  );
}

function safeMode(
  value: unknown,
): AgentReportMode {
  return String(value || "")
    .trim()
    .toUpperCase() === "DAILY"
    ? "DAILY"
    : "CURRENT";
}

export async function loadAgentEconomyReport({
  admin,
  mode,
  asOf,
}: {
  admin: SupabaseClient;
  mode: AgentReportMode;
  asOf?: string;
}) {
  const reportMode =
    safeMode(mode);

  const timestamp =
    asOf ||
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "agent_generate_economy_health_report_v1",
      {
        p_mode:
          reportMode,

        p_as_of:
          timestamp,
      },
    );

  if (error) {
    throw new Error(
      `Could not generate agent economy report: ${error.message}`,
    );
  }

  if (!isObject(data)) {
    throw new Error(
      "Agent economy report did not return a valid report object.",
    );
  }

  return data as
    unknown as
    AgentEconomyHealthReport;
}

export async function loadAgentReportTransactions({
  admin,
  mode,
  asOf,
}: {
  admin: SupabaseClient;
  mode: AgentReportMode;
  asOf?: string;
}) {
  const reportMode =
    safeMode(mode);

  const timestamp =
    asOf ||
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await admin.rpc(
      "agent_report_transactions_v1",
      {
        p_mode:
          reportMode,

        p_as_of:
          timestamp,
      },
    );

  if (error) {
    throw new Error(
      `Could not load agent transactions: ${error.message}`,
    );
  }

  return (
    data ||
    []
  ) as AgentReportTransaction[];
}

function csvCell(
  value: unknown,
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  const text =
    typeof value === "object"
      ? JSON.stringify(value)
      : String(value);

  if (
    text.includes(",") ||
    text.includes("\"") ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replaceAll(
      "\"",
      "\"\"",
    )}"`;
  }

  return text;
}

const TRANSACTION_COLUMNS:
  Array<
    keyof AgentReportTransaction
  > = [
    "occurred_at",
    "agent_user_id",
    "agent_code",
    "agent_name",
    "currency_code",
    "transaction_id",
    "transaction_type",
    "direction",
    "amount",
    "title",
    "source",
    "description",
    "balance_after",
    "source_id",
    "source_table",
  ];

export function agentTransactionsToCsv(
  rows: AgentReportTransaction[],
) {
  const lines = [
    TRANSACTION_COLUMNS.join(
      ",",
    ),

    ...rows.map(
      (
        row,
      ) =>
        TRANSACTION_COLUMNS
          .map(
            (
              column,
            ) =>
              csvCell(
                row[column],
              ),
          )
          .join(","),
    ),
  ];

  return lines.join(
    "\r\n",
  );
}

function htmlEscape(
  value: unknown,
) {
  return String(
    value ?? "",
  )
    .replaceAll(
      "&",
      "&amp;",
    )
    .replaceAll(
      "<",
      "&lt;",
    )
    .replaceAll(
      ">",
      "&gt;",
    )
    .replaceAll(
      "\"",
      "&quot;",
    )
    .replaceAll(
      "'",
      "&#039;",
    );
}

function numberLabel(
  value: unknown,
) {
  const number =
    Number(value || 0);

  return Number.isFinite(
    number,
  )
    ? new Intl.NumberFormat(
        "en-SG",
      ).format(
        number,
      )
    : "0";
}

function signedNumberLabel(
  value: unknown,
) {
  const number =
    Number(value || 0);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return "0";
  }

  const label =
    new Intl.NumberFormat(
      "en-SG",
    ).format(
      Math.abs(number),
    );

  if (number > 0) {
    return `+${label}`;
  }

  if (number < 0) {
    return `-${label}`;
  }

  return "0";
}

function dateTimeSingapore(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-SG",
    {
      timeZone:
        "Asia/Singapore",

      dateStyle:
        "medium",

      timeStyle:
        "short",
    },
  ).format(
    new Date(value),
  );
}

function dateSingapore(
  value: string,
) {
  return new Intl.DateTimeFormat(
    "en-SG",
    {
      timeZone:
        "Asia/Singapore",

      dateStyle:
        "medium",
    },
  ).format(
    new Date(value),
  );
}

function healthColour(
  status: string,
) {
  const clean =
    String(status || "")
      .toUpperCase();

  if (
    clean === "HEALTHY"
  ) {
    return "#16a34a";
  }

  if (
    clean === "WATCH" ||
    clean === "WARNING"
  ) {
    return "#d97706";
  }

  return "#dc2626";
}

function healthCard(
  label: string,
  status: string,
) {
  const colour =
    healthColour(
      status,
    );

  return `
    <td style="
      width:25%;
      padding:8px;
      vertical-align:top;
    ">
      <div style="
        border:1px solid #e2e8f0;
        border-radius:14px;
        padding:14px;
        background:#ffffff;
      ">
        <div style="
          color:#64748b;
          font-size:11px;
          font-weight:800;
          text-transform:uppercase;
          letter-spacing:.08em;
        ">
          ${htmlEscape(label)}
        </div>

        <div style="
          margin-top:8px;
          color:${colour};
          font-size:18px;
          font-weight:900;
        ">
          ${htmlEscape(status)}
        </div>
      </div>
    </td>
  `;
}

function metricRow(
  label: string,
  value: string,
) {
  return `
    <tr>
      <td style="
        padding:9px 12px;
        border-bottom:1px solid #edf2f7;
        color:#64748b;
      ">
        ${htmlEscape(label)}
      </td>

      <td style="
        padding:9px 12px;
        border-bottom:1px solid #edf2f7;
        text-align:right;
        font-weight:800;
        color:#0f172a;
      ">
        ${htmlEscape(value)}
      </td>
    </tr>
  `;
}

export function buildAgentEconomyReportHtml({
  report,
  transactionCount,
}: {
  report: AgentEconomyHealthReport;
  transactionCount: number;
}) {
  const reasons =
    report
      .overall_health
      .reasons ||
    [];

  const reasonHtml =
    reasons.length > 0
      ? reasons
          .map(
            (
              reason,
            ) => `
              <li style="
                margin:6px 0;
                color:#475569;
              ">
                ${htmlEscape(reason)}
              </li>
            `,
          )
          .join("")
      : `
          <li style="
            margin:6px 0;
            color:#475569;
          ">
            No health warnings detected.
          </li>
        `;

  const overallColour =
    healthColour(
      report
        .overall_health
        .status,
    );

  return `
<!doctype html>
<html>
  <body style="
    margin:0;
    background:#f1f5f9;
    font-family:Arial,Helvetica,sans-serif;
    color:#0f172a;
  ">
    <div style="
      max-width:760px;
      margin:0 auto;
      padding:28px 18px;
    ">
      <div style="
        border-radius:22px;
        padding:26px;
        background:#041124;
        color:white;
      ">
        <div style="
          color:#7ee8ff;
          font-size:11px;
          font-weight:900;
          letter-spacing:.16em;
          text-transform:uppercase;
        ">
          Dreamscape Agent Economy
        </div>

        <h1 style="
          margin:12px 0 0;
          font-size:30px;
          line-height:1.1;
        ">
          ${
            report.report_mode ===
            "DAILY"
              ? "Daily Economy Health Report"
              : "Current Economy Health Report"
          }
        </h1>

        <p style="
          margin:12px 0 0;
          color:#94a3b8;
          font-size:14px;
          line-height:1.6;
        ">
          ${htmlEscape(
            dateTimeSingapore(
              report.window.start,
            ),
          )}
          →
          ${htmlEscape(
            dateTimeSingapore(
              report.window.end,
            ),
          )}
          · Singapore Time
        </p>

        <div style="
          display:inline-block;
          margin-top:20px;
          border-radius:999px;
          padding:9px 14px;
          background:${overallColour};
          color:white;
          font-size:12px;
          font-weight:900;
        ">
          OVERALL ${htmlEscape(
            report
              .overall_health
              .status,
          )}
        </div>
      </div>

      <table
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="
          margin-top:14px;
          table-layout:fixed;
        "
      >
        <tr>
          ${healthCard(
            "Economy",
            report.economy.status,
          )}

          ${healthCard(
            "Stocks",
            report.stocks.status,
          )}

          ${healthCard(
            "Property",
            report.property.status,
          )}

          ${healthCard(
            "Runtime",
            report.runtime.status,
          )}
        </tr>
      </table>

      <div style="
        margin-top:14px;
        border-radius:18px;
        background:white;
        padding:20px;
      ">
        <h2 style="
          margin:0 0 12px;
          font-size:20px;
        ">
          Economy activity
        </h2>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="font-size:14px;"
        >
          ${metricRow(
            "Transactions",
            numberLabel(
              report
                .economy
                .transactions
                .total,
            ),
          )}

          ${metricRow(
            "Agents with transactions",
            numberLabel(
              report
                .economy
                .transactions
                .agents_with_transactions,
            ),
          )}

          ${metricRow(
            "DT earned",
            numberLabel(
              report
                .economy
                .transactions
                .dt_earned,
            ),
          )}

          ${metricRow(
            "DT spent",
            numberLabel(
              report
                .economy
                .transactions
                .dt_spent,
            ),
          )}

          ${metricRow(
            "DT net",
            signedNumberLabel(
              report
                .economy
                .transactions
                .dt_net,
            ),
          )}

          ${metricRow(
            "DG earned",
            numberLabel(
              report
                .economy
                .transactions
                .dg_earned,
            ),
          )}

          ${metricRow(
            "DG spent",
            numberLabel(
              report
                .economy
                .transactions
                .dg_spent,
            ),
          )}

          ${metricRow(
            "DG net",
            signedNumberLabel(
              report
                .economy
                .transactions
                .dg_net,
            ),
          )}

          ${metricRow(
            "Total bot DT held",
            numberLabel(
              report
                .economy
                .wallet_integrity
                .total_dt_balance,
            ),
          )}

          ${metricRow(
            "Total bot DG held",
            numberLabel(
              report
                .economy
                .wallet_integrity
                .total_dg_balance,
            ),
          )}
        </table>
      </div>

      <div style="
        margin-top:14px;
        border-radius:18px;
        background:white;
        padding:20px;
      ">
        <h2 style="
          margin:0 0 12px;
          font-size:20px;
        ">
          Market health
        </h2>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="font-size:14px;"
        >
          ${metricRow(
            "Active stocks",
            numberLabel(
              report
                .stocks
                .market
                .active_stocks,
            ),
          )}

          ${metricRow(
            "Average stock movement",
            `${
              report
                .stocks
                .market
                .average_change_pct
            }%`,
          )}

          ${metricRow(
            "Largest stock movement",
            `${
              report
                .stocks
                .market
                .largest_absolute_move_pct
            }%`,
          )}

          ${metricRow(
            "Bot stock exposure",
            numberLabel(
              report
                .stocks
                .bot_exposure
                .total_market_value,
            ),
          )}

          ${metricRow(
            "Property units",
            numberLabel(
              report
                .property
                .market
                .total_units,
            ),
          )}

          ${metricRow(
            "Property availability",
            `${
              report
                .property
                .market
                .availability_pct
            }%`,
          )}

          ${metricRow(
            "Bot property exposure",
            numberLabel(
              report
                .property
                .bot_exposure
                .total_market_value,
            ),
          )}
        </table>
      </div>

      <div style="
        margin-top:14px;
        border-radius:18px;
        background:white;
        padding:20px;
      ">
        <h2 style="
          margin:0 0 12px;
          font-size:20px;
        ">
          Runtime health
        </h2>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="font-size:14px;"
        >
          ${metricRow(
            "Total agents",
            numberLabel(
              report
                .runtime
                .population
                .total_agents,
            ),
          )}

          ${metricRow(
            "Active agents",
            numberLabel(
              report
                .runtime
                .population
                .active_agents,
            ),
          )}

          ${metricRow(
            "Execution enabled",
            numberLabel(
              report
                .runtime
                .population
                .execution_enabled_agents,
            ),
          )}

          ${metricRow(
            "Auto-paused",
            numberLabel(
              report
                .runtime
                .population
                .auto_paused_agents,
            ),
          )}

          ${metricRow(
            "Open critical failures",
            numberLabel(
              report
                .runtime
                .failures
                .open_critical_failures,
            ),
          )}

          ${metricRow(
            "Stale sessions",
            numberLabel(
              report
                .runtime
                .sessions
                .stale_open_sessions,
            ),
          )}
        </table>
      </div>

      <div style="
        margin-top:14px;
        border-radius:18px;
        background:white;
        padding:20px;
      ">
        <h2 style="
          margin:0 0 10px;
          font-size:20px;
        ">
          Health notes
        </h2>

        <ul style="
          margin:0;
          padding-left:20px;
          font-size:14px;
          line-height:1.6;
        ">
          ${reasonHtml}
        </ul>
      </div>

      <div style="
        margin-top:14px;
        border-radius:18px;
        background:#e0f2fe;
        padding:18px 20px;
        color:#0c4a6e;
        font-size:13px;
        line-height:1.6;
      ">
        <strong>
          Full transaction ledger attached
        </strong>

        <br/>

        The attached CSV contains all
        ${htmlEscape(
          transactionCount,
        )}
        bot transactions within this report window,
        including earnings and spending.

        <br/><br/>

        Report generated
        ${htmlEscape(
          dateTimeSingapore(
            report.generated_at,
          ),
        )}.
      </div>
    </div>
  </body>
</html>
  `;
}

async function loadReportRecipient(
  admin: SupabaseClient,
) {
  const {
    data,
    error,
  } =
    await admin
      .from(
        "agent_runtime_settings",
      )
      .select(
        "failure_email_recipient",
      )
      .eq(
        "singleton_key",
        "global",
      )
      .maybeSingle();

  if (error) {
    throw new Error(
      `Could not load report recipient: ${error.message}`,
    );
  }

  const recipient =
    String(
      data
        ?.failure_email_recipient ||
      "",
    ).trim();

  if (!recipient) {
    throw new Error(
      "Agent report email recipient is not configured.",
    );
  }

  return recipient;
}

export async function sendAgentEconomyReportEmail({
  admin,
  mode,
  asOf,
}: {
  admin: SupabaseClient;
  mode: AgentReportMode;
  asOf?: string;
}) {
  const reportMode =
    safeMode(mode);

  const timestamp =
    asOf ||
    new Date().toISOString();

  const [
    report,
    transactions,
    recipient,
  ] =
    await Promise.all([
      loadAgentEconomyReport({
        admin,
        mode:
          reportMode,
        asOf:
          timestamp,
      }),

      loadAgentReportTransactions({
        admin,
        mode:
          reportMode,
        asOf:
          timestamp,
      }),

      loadReportRecipient(
        admin,
      ),
    ]);

  const resendApiKey =
    process.env
      .RESEND_API_KEY
      ?.trim();

  const fromEmail =
    process.env
      .RESEND_FROM
      ?.trim() ||
    "Guru Kids Pro <admin@gurukidspro.com>";

  if (!resendApiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured.",
    );
  }
  

  const csv =
    agentTransactionsToCsv(
      transactions,
    );

  const reportDate =
    dateSingapore(
      report.window.start,
    );

  const subject =
    `Dreamscape Agent ${
      reportMode === "DAILY"
        ? "Daily"
        : "Current"
    } Report · ${reportDate} · ${
      report
        .overall_health
        .status
    }`;

  const filenameDate =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          "Asia/Singapore",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      },
    )
      .format(
        new Date(
          report.window.start,
        ),
      );

  const response =
    await fetch(
      "https://api.resend.com/emails",
      {
        method:
          "POST",

        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,

          "Content-Type":
            "application/json",
        },

        body:
          JSON.stringify({
            from:
              fromEmail,

            to: [
              recipient,
            ],

            subject,

            html:
              buildAgentEconomyReportHtml({
                report,

                transactionCount:
                  transactions.length,
              }),

            attachments: [
              {
                filename:
                  `dreamscape-agent-transactions-${filenameDate}.csv`,

                content:
                  Buffer
                    .from(
                      csv,
                      "utf8",
                    )
                    .toString(
                      "base64",
                    ),
              },
            ],

            tags: [
              {
                name:
                  "system",

                value:
                  "dreamscape_agents",
              },

              {
                name:
                  "type",

                value:
                  reportMode ===
                  "DAILY"
                    ? "daily_economy_report"
                    : "current_economy_report",
              },
            ],
          }),
      },
    );

  const payload =
    (
      await response
        .json()
        .catch(
          () => ({}),
        )
    ) as {
      id?: string;
      message?: string;
      error?: {
        message?: string;
      };
    };

  if (
    !response.ok ||
    !payload.id
  ) {
    throw new Error(
      payload.message ||
      payload
        .error
        ?.message ||
      `Resend returned HTTP ${response.status}.`,
    );
  }

  return {
    sent:
      true,

    recipient,

    resendEmailId:
      payload.id,

    reportMode,

    generatedAt:
      report.generated_at,

    transactionCount:
      transactions.length,

    overallHealth:
      report
        .overall_health
        .status,
  };
}