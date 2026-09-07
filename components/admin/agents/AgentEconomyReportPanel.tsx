"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

import type {
  AgentEconomyHealthReport,
  AgentReportTransaction,
} from "@/lib/agents/reporting/types";

function numberLabel(
  value: number |
    null |
    undefined,
) {
  return Number(
    value || 0,
  ).toLocaleString(
    "en-SG",
  );
}

function signedLabel(
  value: number |
    null |
    undefined,
) {
  const number =
    Number(value || 0);

  if (number > 0) {
    return `+${number.toLocaleString(
      "en-SG",
    )}`;
  }

  return number
    .toLocaleString(
      "en-SG",
    );
}

function dateTimeSg(
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

function healthClass(
  status: string,
) {
  const clean =
    String(status || "")
      .toUpperCase();

  if (
    clean === "HEALTHY"
  ) {
    return "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100";
  }

  if (
    clean === "WATCH" ||
    clean === "WARNING"
  ) {
    return "border-amber-300/25 bg-amber-400/[0.08] text-amber-100";
  }

  return "border-rose-300/25 bg-rose-400/[0.08] text-rose-100";
}

function HealthCard({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <article
      className={`rounded-2xl border p-4 ${healthClass(
        status,
      )}`}
    >
      <p className="text-[10px] font-black uppercase tracking-[0.14em] opacity-55">
        {label}
      </p>

      <strong className="mt-2 block text-lg font-black">
        {status}
      </strong>
    </article>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
        {label}
      </p>

      <strong className="mt-2 block text-lg font-black text-white/85">
        {value}
      </strong>
    </div>
  );
}

const CSV_COLUMNS:
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
    String(value);

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

function transactionsToCsv(
  rows: AgentReportTransaction[],
) {
  return [
    CSV_COLUMNS.join(
      ",",
    ),

    ...rows.map(
      (
        row,
      ) =>
        CSV_COLUMNS
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
  ].join(
    "\r\n",
  );
}

export default function AgentEconomyReportPanel({
  failureEmailRecipient,
}: {
  failureEmailRecipient: string;
}) {
  const [
    report,
    setReport,
  ] =
    useState<
      AgentEconomyHealthReport |
      null
    >(null);

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      AgentReportTransaction[]
    >([]);

  const [
    busy,
    setBusy,
  ] =
    useState<
      "generate" |
      "email" |
      null
    >(null);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    notice,
    setNotice,
  ] =
    useState("");

  async function token() {
    const {
      data: {
        session,
      },
    } =
      await supabase
        .auth
        .getSession();

    return (
      session
        ?.access_token ||
      null
    );
  }

  async function generateCurrentReport() {
    setBusy(
      "generate",
    );

    setError("");
    setNotice("");

    try {
      const accessToken =
        await token();

      if (!accessToken) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response =
        await fetch(
          "/api/admin/agents/report?mode=CURRENT",
          {
            method:
              "GET",

            cache:
              "no-store",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,
            },
          },
        );

      const payload =
        (
          await response
            .json()
        ) as {
          ok?: boolean;

          error?: string;

          report?:
            AgentEconomyHealthReport;

          transactions?:
            AgentReportTransaction[];
        };

      if (
        !response.ok ||
        !payload.report
      ) {
        throw new Error(
          payload.error ||
          "Current report could not be generated.",
        );
      }

      setReport(
        payload.report,
      );

      setTransactions(
        payload.transactions ||
        [],
      );

      setNotice(
        `Current report generated with ${
          (
            payload.transactions ||
            []
          ).length
        } transaction rows.`,
      );
    } catch (
      generateError
    ) {
      setError(
        generateError instanceof
          Error
          ? generateError.message
          : "Current report could not be generated.",
      );
    }

    setBusy(
      null,
    );
  }

  function downloadTransactions() {
    if (
      !report ||
      transactions.length === 0
    ) {
      return;
    }

    const csv =
      transactionsToCsv(
        transactions,
      );

    const blob =
      new Blob(
        [
          csv,
        ],
        {
          type:
            "text/csv;charset=utf-8",
        },
      );

    const url =
      URL.createObjectURL(
        blob,
      );

    const anchor =
      document.createElement(
        "a",
      );

    const date =
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
            report
              .window
              .start,
          ),
        );

    anchor.href =
      url;

    anchor.download =
      `dreamscape-agent-current-transactions-${date}.csv`;

    document.body.appendChild(
      anchor,
    );

    anchor.click();

    anchor.remove();

    URL.revokeObjectURL(
      url,
    );
  }

  async function sendToEmail() {
    if (!report) {
      return;
    }

    setBusy(
      "email",
    );

    setError("");
    setNotice("");

    try {
      const accessToken =
        await token();

      if (!accessToken) {
        throw new Error(
          "Please sign in again.",
        );
      }

      const response =
        await fetch(
          "/api/admin/agents/report",
          {
            method:
              "POST",

            headers: {
              Authorization:
                `Bearer ${accessToken}`,

              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                action:
                  "send_email",

                mode:
                  "CURRENT",

                /*
                 * Keep the emailed report
                 * on the exact same snapshot
                 * as the report currently
                 * displayed on screen.
                 */
                asOf:
                  report
                    .generated_at,
              }),
          },
        );

      const payload =
        (
          await response
            .json()
        ) as {
          ok?: boolean;

          error?: string;

          result?: {
            sent?: boolean;
            recipient?: string;
            transactionCount?: number;
          };
        };

      if (
        !response.ok ||
        !payload
          .result
          ?.sent
      ) {
        throw new Error(
          payload.error ||
          "Report email could not be sent.",
        );
      }

      setNotice(
        `Current report emailed to ${
          payload
            .result
            .recipient ||
          failureEmailRecipient
        } with ${
          payload
            .result
            .transactionCount ||
          transactions.length
        } transaction rows attached.`,
      );
    } catch (
      sendError
    ) {
      setError(
        sendError instanceof
          Error
          ? sendError.message
          : "Report email could not be sent.",
      );
    }

    setBusy(
      null,
    );
  }

  return (
    <section className="mt-6 rounded-[30px] border border-cyan-300/14 bg-[linear-gradient(145deg,rgba(8,48,71,0.48),rgba(5,18,40,0.82))] p-5 backdrop-blur-xl sm:p-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7ee8ff]">
            Phase 4B-2 Economy Reporting
          </p>

          <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
            Economy Health Report
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/48">
            Generate a read-only snapshot of
            bot earnings, spending, wallet
            integrity, stocks, property and
            runtime health. Report generation
            does not pause or modify the agents.
          </p>
        </div>

        <button
          type="button"
          disabled={
            busy !==
            null
          }
          onClick={() =>
            void generateCurrentReport()
          }
          className="min-h-12 rounded-2xl border border-cyan-200/28 bg-cyan-300/12 px-6 text-xs font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:bg-cyan-300/18 disabled:opacity-40"
        >
          {busy ===
          "generate"
            ? "Generating..."
            : "Generate Current Report"}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/15 px-4 py-3 text-xs leading-5 text-white/40">
        Email recipient:{" "}
        <strong className="text-white/65">
          {failureEmailRecipient ||
            "Not configured"}
        </strong>
        {" · "}
        Current report window:
        today 00:00 Singapore Time → now.
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/[0.07] px-4 py-3 text-sm text-emerald-100">
          {notice}
        </div>
      ) : null}

      {!report ? (
        <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-6 text-sm leading-6 text-white/38">
          No report has been generated yet.
          Press{" "}
          <strong className="text-white/65">
            Generate Current Report
          </strong>{" "}
          whenever you want a live snapshot.
        </div>
      ) : (
        <>
          <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                Report window
              </p>

              <strong className="mt-2 block text-sm text-white/75">
                {dateTimeSg(
                  report
                    .window
                    .start,
                )}
                {" → "}
                {dateTimeSg(
                  report
                    .window
                    .end,
                )}
              </strong>
            </div>

            <span
              className={`w-fit rounded-full border px-4 py-2 text-xs font-black uppercase ${healthClass(
                report
                  .overall_health
                  .status,
              )}`}
            >
              Overall{" "}
              {
                report
                  .overall_health
                  .status
              }
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              label="Economy"
              status={
                report
                  .economy
                  .status
              }
            />

            <HealthCard
              label="Stocks"
              status={
                report
                  .stocks
                  .status
              }
            />

            <HealthCard
              label="Property"
              status={
                report
                  .property
                  .status
              }
            />

            <HealthCard
              label="Runtime"
              status={
                report
                  .runtime
                  .status
              }
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Transactions"
              value={numberLabel(
                report
                  .economy
                  .transactions
                  .total,
              )}
            />

            <Metric
              label="Agents Active in Economy"
              value={numberLabel(
                report
                  .economy
                  .transactions
                  .agents_with_transactions,
              )}
            />

            <Metric
              label="Bot DT Held"
              value={`${numberLabel(
                report
                  .economy
                  .wallet_integrity
                  .total_dt_balance,
              )} DT`}
            />

            <Metric
              label="Bot DG Held"
              value={`${numberLabel(
                report
                  .economy
                  .wallet_integrity
                  .total_dg_balance,
              )} DG`}
            />
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-3">
            <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-100/55">
                DT Economy
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    Earned
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .transactions
                        .dt_earned,
                    )}{" "}
                    DT
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    Spent
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .transactions
                        .dt_spent,
                    )}{" "}
                    DT
                  </strong>
                </div>

                <div className="flex justify-between gap-4 border-t border-white/8 pt-3">
                  <span className="text-white/40">
                    Net
                  </span>

                  <strong>
                    {signedLabel(
                      report
                        .economy
                        .transactions
                        .dt_net,
                    )}{" "}
                    DT
                  </strong>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-violet-100/55">
                DG Economy
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    Earned
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .transactions
                        .dg_earned,
                    )}{" "}
                    DG
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    Spent
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .transactions
                        .dg_spent,
                    )}{" "}
                    DG
                  </strong>
                </div>

                <div className="flex justify-between gap-4 border-t border-white/8 pt-3">
                  <span className="text-white/40">
                    Net
                  </span>

                  <strong>
                    {signedLabel(
                      report
                        .economy
                        .transactions
                        .dg_net,
                    )}{" "}
                    DG
                  </strong>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/55">
                Integrity
              </p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    DT mismatches
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .wallet_integrity
                        .dt_mismatch_agents,
                    )}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    DG mismatches
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .wallet_integrity
                        .dg_mismatch_agents,
                    )}
                  </strong>
                </div>

                <div className="flex justify-between gap-4">
                  <span className="text-white/40">
                    Budget violations
                  </span>

                  <strong>
                    {numberLabel(
                      report
                        .economy
                        .controls
                        .dt_budget_violations +
                      report
                        .economy
                        .controls
                        .dg_budget_violations,
                    )}
                  </strong>
                </div>
              </div>
            </article>
          </div>

          <div className="mt-4 grid gap-5 xl:grid-cols-2">
            <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                Stock Market
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric
                  label="Active Stocks"
                  value={numberLabel(
                    report
                      .stocks
                      .market
                      .active_stocks,
                  )}
                />

                <Metric
                  label="Average Move"
                  value={`${
                    report
                      .stocks
                      .market
                      .average_change_pct
                  }%`}
                />

                <Metric
                  label="Largest Move"
                  value={`${
                    report
                      .stocks
                      .market
                      .largest_absolute_move_pct
                  }%`}
                />

                <Metric
                  label="Bot Exposure"
                  value={numberLabel(
                    report
                      .stocks
                      .bot_exposure
                      .total_market_value,
                  )}
                />
              </div>
            </article>

            <article className="rounded-2xl border border-white/8 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                Property Market
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <Metric
                  label="Property Units"
                  value={numberLabel(
                    report
                      .property
                      .market
                      .total_units,
                  )}
                />

                <Metric
                  label="Available Units"
                  value={numberLabel(
                    report
                      .property
                      .market
                      .available_units,
                  )}
                />

                <Metric
                  label="Availability"
                  value={`${
                    report
                      .property
                      .market
                      .availability_pct
                  }%`}
                />

                <Metric
                  label="Bot Exposure"
                  value={numberLabel(
                    report
                      .property
                      .bot_exposure
                      .total_market_value,
                  )}
                />
              </div>
            </article>
          </div>

          <article className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
              Runtime Health
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <Metric
                label="Active Agents"
                value={numberLabel(
                  report
                    .runtime
                    .population
                    .active_agents,
                )}
              />

              <Metric
                label="Execution Enabled"
                value={numberLabel(
                  report
                    .runtime
                    .population
                    .execution_enabled_agents,
                )}
              />

              <Metric
                label="Auto-paused"
                value={numberLabel(
                  report
                    .runtime
                    .population
                    .auto_paused_agents,
                )}
              />

              <Metric
                label="Critical Failures"
                value={numberLabel(
                  report
                    .runtime
                    .failures
                    .open_critical_failures,
                )}
              />

              <Metric
                label="Stale Sessions"
                value={numberLabel(
                  report
                    .runtime
                    .sessions
                    .stale_open_sessions,
                )}
              />
            </div>
          </article>

          <article className="mt-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
              Health Notes
            </p>

            {report
              .overall_health
              .reasons
              ?.length ? (
              <div className="mt-3 space-y-2">
                {report
                  .overall_health
                  .reasons
                  .map(
                    (
                      reason,
                      index,
                    ) => (
                      <p
                        key={`${reason}-${index}`}
                        className="text-sm leading-6 text-white/55"
                      >
                        • {reason}
                      </p>
                    ),
                  )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-emerald-100/70">
                No health warnings detected.
              </p>
            )}
          </article>

          <article className="mt-4 rounded-2xl border border-white/8 bg-black/15 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                  Transaction Ledger
                </p>

                <strong className="mt-2 block text-lg">
                  {transactions.length.toLocaleString(
                    "en-SG",
                  )}{" "}
                  transactions
                </strong>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    transactions.length ===
                    0
                  }
                  onClick={
                    downloadTransactions
                  }
                  className="min-h-11 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-xs font-black uppercase tracking-[0.1em] disabled:opacity-40"
                >
                  Download Transactions CSV
                </button>

                <button
                  type="button"
                  disabled={
                    busy !==
                    null
                  }
                  onClick={() =>
                    void sendToEmail()
                  }
                  className="min-h-11 rounded-xl border border-violet-300/22 bg-violet-300/[0.09] px-4 text-xs font-black uppercase tracking-[0.1em] text-violet-100 disabled:opacity-40"
                >
                  {busy ===
                  "email"
                    ? "Sending..."
                    : "Send to Email"}
                </button>
              </div>
            </div>

            <div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-white/8">
              <table className="w-full min-w-[1050px] border-collapse text-left">
                <thead className="sticky top-0 bg-[#061632] text-[10px] font-black uppercase tracking-[0.1em] text-white/40">
                  <tr>
                    <th className="px-3 py-3">
                      Time
                    </th>

                    <th className="px-3 py-3">
                      Agent
                    </th>

                    <th className="px-3 py-3">
                      Currency
                    </th>

                    <th className="px-3 py-3">
                      Direction
                    </th>

                    <th className="px-3 py-3">
                      Amount
                    </th>

                    <th className="px-3 py-3">
                      Type
                    </th>

                    <th className="px-3 py-3">
                      Description
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {transactions.map(
                    (
                      transaction,
                    ) => (
                      <tr
                        key={`${transaction.currency_code}-${transaction.transaction_id}`}
                        className="border-t border-white/[0.06]"
                      >
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-white/45">
                          {dateTimeSg(
                            transaction
                              .occurred_at,
                          )}
                        </td>

                        <td className="px-3 py-3">
                          <strong className="block text-xs">
                            {
                              transaction
                                .agent_code
                            }
                          </strong>

                          <span className="mt-1 block text-[10px] text-white/35">
                            {
                              transaction
                                .agent_name
                            }
                          </span>
                        </td>

                        <td className="px-3 py-3 text-xs font-black">
                          {
                            transaction
                              .currency_code
                          }
                        </td>

                        <td className="px-3 py-3 text-xs capitalize text-white/55">
                          {
                            transaction
                              .direction
                          }
                        </td>

                        <td className="px-3 py-3 text-xs font-black">
                          {numberLabel(
                            transaction
                              .amount,
                          )}
                        </td>

                        <td className="px-3 py-3 text-xs text-white/55">
                          {
                            transaction
                              .transaction_type
                          }
                        </td>

                        <td className="max-w-[340px] px-3 py-3 text-xs leading-5 text-white/45">
                          {
                            transaction
                              .description ||
                            transaction
                              .title ||
                            "—"
                          }
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </>
      )}
    </section>
  );
}