import Link from "next/link";
import { requireAdmin } from "@/lib/affiliate/auth";
import {
  approveAffiliatePayoutBatch,
  cancelAffiliatePayoutBatch,
  createAffiliateFinanceAdjustment,
  createAffiliatePayoutBatch,
  markAffiliatePayoutPaid,
  unverifyAffiliatePayoutProfile,
  verifyAffiliatePayoutProfile,
} from "./actions";
import styles from "@/app/affiliate/affiliate.module.css";

function money(value: unknown, currency = "SGD") {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function date(value: unknown) {
  if (!value) return "—";

  const parsed = new Date(String(value));

  if (!Number.isFinite(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function dateTime(value: unknown) {
  if (!value) return "—";

  const parsed = new Date(String(value));

  if (!Number.isFinite(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString("en-SG");
}

function currentMonthEnd() {
  const now = new Date();

  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth() + 1,
      0,
    ),
  )
    .toISOString()
    .slice(0, 10);
}

export default async function AffiliateFinanceAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
}) {
  const messages = await searchParams;
  const { admin } = await requireAdmin();

  const [
    summaryResult,
    batchesResult,
    payoutsResult,
    commissionsResult,
    adjustmentsResult,
  ] = await Promise.all([
    admin
      .from("dreamscape_affiliate_finance_summary")
      .select("*")
      .order("partner_number", {
        ascending: true,
      }),
    admin
      .from("dreamscape_affiliate_payout_batches")
      .select("*")
      .order("period_end", {
        ascending: false,
      })
      .limit(24),
    admin
      .from("dreamscape_affiliate_payout_admin_overview")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
    admin
      .from("dreamscape_affiliate_commission_admin_overview")
      .select("*")
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
    admin
      .from("dreamscape_affiliate_adjustments")
      .select(
        "id,affiliate_partner_id,adjustment_type,currency,amount,reason,effective_at,status,created_at",
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100),
  ]);

  const queryError =
    summaryResult.error ||
    batchesResult.error ||
    payoutsResult.error ||
    commissionsResult.error ||
    adjustmentsResult.error;

  const summaries =
    summaryResult.data || [];

  const batches =
    batchesResult.data || [];

  const payouts =
    payoutsResult.data || [];

  const commissions =
    commissionsResult.data || [];

  const adjustments =
    adjustmentsResult.data || [];

  const totalPending = summaries.reduce(
    (sum, row) =>
      sum +
      Number(
        row.pending_unmatured_amount || 0,
      ) +
      Number(
        row.matured_unassigned_amount || 0,
      ) +
      Number(
        row.pending_adjustment_balance || 0,
      ),
    0,
  );

  const totalScheduled = summaries.reduce(
    (sum, row) =>
      sum +
      Number(
        row.scheduled_payout_amount || 0,
      ),
    0,
  );

  const lifetimePaid = summaries.reduce(
    (sum, row) =>
      sum +
      Number(
        row.lifetime_paid_amount || 0,
      ),
    0,
  );

  const unverifiedCount =
    summaries.filter(
      (row) =>
        row.affiliate_status === "active" &&
        !row.payout_verified_at,
    ).length;

  return (
    <main className={styles.adminPage}>
      <div className={styles.backRow}>
        <Link href="/admin/affiliates">
          ← Affiliate applications
        </Link>
        <Link href="/admin/billing/finance">
          Billing finance →
        </Link>
      </div>

      <header className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>
            Dreamscape Administration
          </p>
          <h1>Affiliate finance</h1>
          <p>
            Commission ledger, refund adjustments,
            payout verification and monthly payout
            batches.
          </p>
        </div>

        <Link
          href="/affiliate/dashboard"
          className={styles.secondaryLink}
          target="_blank"
        >
          Open affiliate dashboard
        </Link>
      </header>

      {messages.success ? (
        <div className={styles.successBanner}>
          {messages.success}
        </div>
      ) : null}

      {messages.error ? (
        <div className={styles.formError}>
          {messages.error}
        </div>
      ) : null}

      {queryError ? (
        <div className={styles.formError}>
          {queryError.message}
        </div>
      ) : null}

      <section className={styles.infoGrid}>
        <div>
          <strong>Unpaid balance</strong>
          <p>{money(totalPending)}</p>
        </div>

        <div>
          <strong>Scheduled payouts</strong>
          <p>{money(totalScheduled)}</p>
        </div>

        <div>
          <strong>Lifetime paid</strong>
          <p>{money(lifetimePaid)}</p>
        </div>

        <div>
          <strong>Profiles awaiting verification</strong>
          <p>{unverifiedCount}</p>
        </div>
      </section>

      <div className={styles.adminDetailGrid}>
        <div>
          <section className={styles.adminCard}>
            <h2>Partner finance status</h2>

            <div className={styles.tableScroll}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Rate</th>
                    <th>Future</th>
                    <th>Matured</th>
                    <th>Adjustments</th>
                    <th>Scheduled</th>
                    <th>Paid</th>
                    <th>Payout profile</th>
                  </tr>
                </thead>

                <tbody>
                  {summaries.map((row) => (
                    <tr key={row.affiliate_partner_id}>
                      <td>
                        <strong>
                          {row.business_name ||
                            row.legal_name}
                        </strong>
                        <span>
                          {row.partner_number}
                          <br />
                          {row.email}
                        </span>
                      </td>

                      <td>
                        {Number(
                          row.commission_rate || 0,
                        )}
                        %
                      </td>

                      <td>
                        {money(
                          row.pending_unmatured_amount,
                        )}
                      </td>

                      <td>
                        {money(
                          row.matured_unassigned_amount,
                        )}
                      </td>

                      <td>
                        {money(
                          row.pending_adjustment_balance,
                        )}
                      </td>

                      <td>
                        {money(
                          row.scheduled_payout_amount,
                        )}
                      </td>

                      <td>
                        {money(
                          row.lifetime_paid_amount,
                        )}
                      </td>

                      <td>
                        {row.payout_method ? (
                          <>
                            <strong>
                              {row.payout_verified_at
                                ? "Verified"
                                : "Unverified"}
                            </strong>
                            <span>
                              {row.payout_method}
                              {row.paynow_proxy_last4
                                ? ` · ending ${row.paynow_proxy_last4}`
                                : ""}
                              <br />
                              {row.payee_name}
                            </span>

                            {row.payout_verified_at ? (
                              <form
                                action={
                                  unverifyAffiliatePayoutProfile
                                }
                                className={
                                  styles.inlineForm
                                }
                              >
                                <input
                                  type="hidden"
                                  name="affiliate_partner_id"
                                  value={
                                    row.affiliate_partner_id
                                  }
                                />
                                <button
                                  type="submit"
                                  className={
                                    styles.secondaryButton
                                  }
                                >
                                  Unverify
                                </button>
                              </form>
                            ) : (
                              <form
                                action={
                                  verifyAffiliatePayoutProfile
                                }
                                className={
                                  styles.inlineForm
                                }
                              >
                                <input
                                  type="hidden"
                                  name="affiliate_partner_id"
                                  value={
                                    row.affiliate_partner_id
                                  }
                                />
                                <button
                                  type="submit"
                                  className={
                                    styles.approveButton
                                  }
                                >
                                  Verify
                                </button>
                              </form>
                            )}
                          </>
                        ) : (
                          "No payout profile"
                        )}
                      </td>
                    </tr>
                  ))}

                  {!summaries.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className={
                          styles.emptyCell
                        }
                      >
                        No affiliate partners yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.adminCard}>
            <h2>Payout batches</h2>

            <div className={styles.tableScroll}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Batch</th>
                    <th>Period</th>
                    <th>Window</th>
                    <th>Status</th>
                    <th>Payouts</th>
                    <th>Total</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {batches.map((batch) => (
                    <tr key={batch.id}>
                      <td>
                        <strong>
                          {batch.batch_number}
                        </strong>
                      </td>

                      <td>
                        {date(batch.period_start)}
                        {" – "}
                        {date(batch.period_end)}
                      </td>

                      <td>
                        {date(
                          batch.payout_window_start,
                        )}
                        {" – "}
                        {date(
                          batch.payout_window_end,
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            styles.statusPill
                          }
                        >
                          {String(
                            batch.status,
                          ).replaceAll("_", " ")}
                        </span>
                      </td>

                      <td>
                        {batch.payout_count}
                      </td>

                      <td>
                        {money(
                          batch.total_amount,
                          batch.currency,
                        )}
                      </td>

                      <td>
                        {batch.status ===
                        "draft" ? (
                          <>
                            <form
                              action={
                                approveAffiliatePayoutBatch
                              }
                              className={
                                styles.inlineForm
                              }
                            >
                              <input
                                type="hidden"
                                name="batch_id"
                                value={batch.id}
                              />
                              <button
                                type="submit"
                                className={
                                  styles.approveButton
                                }
                              >
                                Approve
                              </button>
                            </form>

                            <form
                              action={
                                cancelAffiliatePayoutBatch
                              }
                              className={
                                styles.inlineForm
                              }
                            >
                              <input
                                type="hidden"
                                name="batch_id"
                                value={batch.id}
                              />
                              <input
                                name="reason"
                                required
                                placeholder="Cancellation reason"
                              />
                              <button
                                type="submit"
                                className={
                                  styles.rejectButton
                                }
                              >
                                Cancel
                              </button>
                            </form>
                          </>
                        ) : batch.status ===
                          "approved" ? (
                          <form
                            action={
                              cancelAffiliatePayoutBatch
                            }
                            className={
                              styles.inlineForm
                            }
                          >
                            <input
                              type="hidden"
                              name="batch_id"
                              value={batch.id}
                            />
                            <input
                              name="reason"
                              required
                              placeholder="Cancellation reason"
                            />
                            <button
                              type="submit"
                              className={
                                styles.rejectButton
                              }
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}

                  {!batches.length ? (
                    <tr>
                      <td
                        colSpan={7}
                        className={
                          styles.emptyCell
                        }
                      >
                        No payout batches yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.adminCard}>
            <h2>Affiliate payouts</h2>

            <div className={styles.tableScroll}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Batch</th>
                    <th>Commission</th>
                    <th>Adjustments</th>
                    <th>Net payout</th>
                    <th>Status</th>
                    <th>Payout details</th>
                    <th>Payment</th>
                  </tr>
                </thead>

                <tbody>
                  {payouts.map((payout) => (
                    <tr key={payout.payout_id}>
                      <td>
                        <strong>
                          {payout.business_name ||
                            payout.legal_name}
                        </strong>
                        <span>
                          {payout.partner_number}
                        </span>
                      </td>

                      <td>
                        {payout.batch_number}
                      </td>

                      <td>
                        {money(
                          payout.release_total,
                          payout.currency,
                        )}
                      </td>

                      <td>
                        {money(
                          payout.adjustment_total,
                          payout.currency,
                        )}
                      </td>

                      <td>
                        <strong>
                          {money(
                            payout.net_payout,
                            payout.currency,
                          )}
                        </strong>
                      </td>

                      <td>
                        {String(
                          payout.payout_status,
                        ).replaceAll("_", " ")}
                      </td>

                      <td>
                        {payout.payout_method}
                        {payout.paynow_proxy_last4
                          ? ` · ending ${payout.paynow_proxy_last4}`
                          : ""}
                        <br />
                        {payout.payee_name}
                      </td>

                      <td>
                        {payout.payout_status ===
                        "approved" ? (
                          <form
                            action={
                              markAffiliatePayoutPaid
                            }
                            className={
                              styles.inlineForm
                            }
                          >
                            <input
                              type="hidden"
                              name="payout_id"
                              value={
                                payout.payout_id
                              }
                            />
                            <input
                              name="payout_reference"
                              required
                              placeholder="Bank/PayNow reference"
                            />
                            <button
                              type="submit"
                              className={
                                styles.approveButton
                              }
                            >
                              Mark paid
                            </button>
                          </form>
                        ) : payout.payout_status ===
                          "paid" ? (
                          <>
                            <strong>
                              {payout.payout_reference}
                            </strong>
                            <span>
                              {dateTime(
                                payout.paid_at,
                              )}
                            </span>
                          </>
                        ) : (
                          "Awaiting batch approval"
                        )}
                      </td>
                    </tr>
                  ))}

                  {!payouts.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className={
                          styles.emptyCell
                        }
                      >
                        No affiliate payouts
                        prepared yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.adminCard}>
            <h2>Recent commission ledger</h2>

            <div className={styles.tableScroll}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Partner</th>
                    <th>Subscription</th>
                    <th>Plan</th>
                    <th>Payment</th>
                    <th>Sequence</th>
                    <th>Rate</th>
                    <th>Commission</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {commissions.map(
                    (commission) => (
                      <tr key={commission.id}>
                        <td>
                          <strong>
                            {commission.affiliate_business_name ||
                              commission.affiliate_legal_name}
                          </strong>
                          <span>
                            {commission.partner_number}
                          </span>
                        </td>

                        <td>
                          {
                            commission.subscription_reference
                          }
                          <span>
                            {
                              commission.learner_name
                            }
                          </span>
                        </td>

                        <td>
                          {commission.plan_name}
                        </td>

                        <td>
                          {money(
                            commission.net_revenue,
                            commission.currency,
                          )}
                        </td>

                        <td>
                          #
                          {
                            commission.payment_sequence
                          }
                        </td>

                        <td>
                          {Number(
                            commission.commission_rate ||
                              0,
                          )}
                          %
                        </td>

                        <td>
                          {money(
                            commission.commission_amount,
                            commission.currency,
                          )}
                        </td>

                        <td>
                          {String(
                            commission.status,
                          ).replaceAll("_", " ")}
                          <span>
                            {
                              commission.eligibility_reason
                            }
                          </span>
                        </td>
                      </tr>
                    ),
                  )}

                  {!commissions.length ? (
                    <tr>
                      <td
                        colSpan={8}
                        className={
                          styles.emptyCell
                        }
                      >
                        No commission ledger
                        entries yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.adminCard}>
            <h2>Recent adjustments</h2>

            <div className={styles.tableScroll}>
              <table className={styles.adminTable}>
                <thead>
                  <tr>
                    <th>Partner ID</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Effective</th>
                  </tr>
                </thead>

                <tbody>
                  {adjustments.map(
                    (adjustment) => (
                      <tr key={adjustment.id}>
                        <td>
                          {
                            adjustment.affiliate_partner_id
                          }
                        </td>
                        <td>
                          {
                            adjustment.adjustment_type
                          }
                        </td>
                        <td>
                          {money(
                            adjustment.amount,
                            adjustment.currency,
                          )}
                        </td>
                        <td>
                          {adjustment.reason}
                        </td>
                        <td>
                          {adjustment.status}
                        </td>
                        <td>
                          {dateTime(
                            adjustment.effective_at,
                          )}
                        </td>
                      </tr>
                    ),
                  )}

                  {!adjustments.length ? (
                    <tr>
                      <td
                        colSpan={6}
                        className={
                          styles.emptyCell
                        }
                      >
                        No adjustments recorded.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className={styles.adminActionsColumn}>
          <section className={styles.adminCard}>
            <h2>Prepare monthly payout batch</h2>

            <p>
              Use the final date of the commission
              month. Eligible balances are scheduled
              for the 7th–10th of the following
              month.
            </p>

            <form
              action={createAffiliatePayoutBatch}
              className={styles.adminForm}
            >
              <label>
                Commission month
                <input
                  type="date"
                  name="period_end"
                  defaultValue={
                    currentMonthEnd()
                  }
                  required
                />
              </label>

              <label>
                Currency
                <input
                  name="currency"
                  defaultValue="SGD"
                  maxLength={3}
                  required
                />
              </label>

              <button
                type="submit"
                className={styles.approveButton}
              >
                Prepare draft batch
              </button>
            </form>
          </section>

          <section className={styles.adminCard}>
            <h2>Manual adjustment</h2>

            <p>
              Use a negative amount for a clawback
              or correction, or a positive amount
              for an approved credit.
            </p>

            <form
              action={
                createAffiliateFinanceAdjustment
              }
              className={styles.adminForm}
            >
              <label>
                Affiliate
                <select
                  name="affiliate_partner_id"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select partner
                  </option>

                  {summaries.map((row) => (
                    <option
                      key={
                        row.affiliate_partner_id
                      }
                      value={
                        row.affiliate_partner_id
                      }
                    >
                      {row.partner_number} —{" "}
                      {row.business_name ||
                        row.legal_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Amount
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  required
                />
              </label>

              <label>
                Currency
                <input
                  name="currency"
                  defaultValue="SGD"
                  maxLength={3}
                  required
                />
              </label>

              <label>
                Reason
                <textarea
                  name="reason"
                  rows={4}
                  required
                />
              </label>

              <button
                type="submit"
                className={styles.secondaryButton}
              >
                Record adjustment
              </button>
            </form>
          </section>

          <section className={styles.adminCard}>
            <h2>Operating rule</h2>

            <p>
              Do not approve a batch until payout
              profiles have been checked. Do not
              mark a payout paid until the outgoing
              bank/PayNow transfer has actually
              completed.
            </p>
          </section>
        </aside>
      </div>
    </main>
  );
}
