import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import {
  getReferralDestinationPath,
  getSiteUrl,
} from "@/lib/affiliate/config";
import { createAdminClient } from "@/lib/supabase/admin";
import CopyAffiliateDetails from "../welcome/CopyAffiliateDetails";
import styles from "../affiliate.module.css";

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
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

export default async function AffiliateDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/affiliate/dashboard");
  }

  const admin = createAdminClient();

  const { data: partner, error: partnerError } =
    await admin
      .from("affiliate_partners")
      .select(
        "id,partner_number,legal_name,business_name,email,partner_type,commission_rate,referral_code,status,activated_at",
      )
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (partnerError) {
    throw new Error(partnerError.message);
  }

  if (!partner?.referral_code) {
    redirect("/affiliate/apply");
  }

  const [
    summaryResult,
    profileResult,
    commissionsResult,
    releasesResult,
    payoutsResult,
    adjustmentsResult,
  ] = await Promise.all([
    admin
      .from("dreamscape_affiliate_finance_summary")
      .select("*")
      .eq("affiliate_partner_id", partner.id)
      .maybeSingle(),

    admin
      .from("affiliate_payout_profiles")
      .select(
        "payout_country,payout_method,paynow_proxy_type,paynow_proxy_last4,payee_name,verified_at,updated_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .maybeSingle(),

    admin
      .from("dreamscape_affiliate_commission_admin_overview")
      .select(
        "id,created_at,payment_paid_at,status,eligibility_reason,payment_sequence,billing_cycle,currency,gross_revenue,refund_amount,net_revenue,commission_rate,commission_amount,subscription_reference,learner_name,plan_name,release_count,scheduled_release_total",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50),

    admin
      .from("dreamscape_affiliate_commission_releases")
      .select(
        "id,commission_id,installment_no,installment_count,currency,amount,available_at,status,paid_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("available_at", {
        ascending: true,
      })
      .limit(100),

    admin
      .from("dreamscape_affiliate_payout_admin_overview")
      .select(
        "payout_id,batch_number,period_start,period_end,payout_window_start,payout_window_end,payout_status,currency,release_total,adjustment_total,net_payout,payout_method,paynow_proxy_last4,payout_reference,paid_at,created_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50),

    admin
      .from("dreamscape_affiliate_adjustments")
      .select(
        "id,adjustment_type,currency,amount,reason,effective_at,status,created_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(50),
  ]);

  const queryError =
    summaryResult.error ||
    profileResult.error ||
    commissionsResult.error ||
    releasesResult.error ||
    payoutsResult.error ||
    adjustmentsResult.error;

  if (queryError) {
    throw new Error(queryError.message);
  }

  const summary = summaryResult.data;
  const profile = profileResult.data;

  const commissions =
    commissionsResult.data || [];

  const releases =
    releasesResult.data || [];

  const payouts =
    payoutsResult.data || [];

  const adjustments =
    adjustmentsResult.data || [];

  const referralLink =
    `${getSiteUrl()}${getReferralDestinationPath()}` +
    `?ref=${encodeURIComponent(partner.referral_code)}`;

  const availableBalance =
    Number(
      summary?.matured_unassigned_amount || 0,
    ) +
    Number(
      summary?.pending_adjustment_balance || 0,
    );

  return (
    <main className={styles.page}>
      <header className={styles.heroCompact}>
        <p className={styles.eyebrow}>
          Dreamscape Affiliate Programme
        </p>

        <h1>Affiliate dashboard</h1>

        <p>
          Track referral earnings, commission
          releases and payout history.
        </p>
      </header>

      <section className={styles.infoGrid}>
        <div>
          <strong>Approved rate</strong>
          <p>
            {Number(
              partner.commission_rate || 0,
            )}
            %
          </p>
        </div>

        <div>
          <strong>Future commission</strong>
          <p>
            {money(
              summary?.pending_unmatured_amount,
            )}
          </p>
        </div>

        <div>
          <strong>Available balance</strong>
          <p>{money(availableBalance)}</p>
        </div>

        <div>
          <strong>Scheduled payout</strong>
          <p>
            {money(
              summary?.scheduled_payout_amount,
            )}
          </p>
        </div>

        <div>
          <strong>Lifetime paid</strong>
          <p>
            {money(
              summary?.lifetime_paid_amount,
            )}
          </p>
        </div>

        <div>
          <strong>Next release</strong>
          <p>
            {date(summary?.next_release_at)}
          </p>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2>Your affiliate details</h2>

        <p>
          Partner number:{" "}
          <strong>
            {partner.partner_number}
          </strong>
          {" · "}
          Status:{" "}
          <strong>
            {String(partner.status).replaceAll(
              "_",
              " ",
            )}
          </strong>
        </p>

        <CopyAffiliateDetails
          referralCode={partner.referral_code}
          referralLink={referralLink}
        />
      </section>

      <section className={styles.adminCard}>
        <h2>Payout profile</h2>

        {profile ? (
          <dl className={styles.detailList}>
            <div>
              <dt>Status</dt>
              <dd>
                {profile.verified_at
                  ? "Verified"
                  : "Awaiting verification"}
              </dd>
            </div>

            <div>
              <dt>Method</dt>
              <dd>
                {String(
                  profile.payout_method,
                ).replaceAll("_", " ")}
              </dd>
            </div>

            <div>
              <dt>Payee</dt>
              <dd>{profile.payee_name}</dd>
            </div>

            <div>
              <dt>Country</dt>
              <dd>
                {profile.payout_country}
              </dd>
            </div>

            <div>
              <dt>PayNow</dt>
              <dd>
                {profile.paynow_proxy_last4
                  ? `${profile.paynow_proxy_type || "proxy"} ending ${profile.paynow_proxy_last4}`
                  : "—"}
              </dd>
            </div>

            <div>
              <dt>Verified</dt>
              <dd>
                {dateTime(
                  profile.verified_at,
                )}
              </dd>
            </div>
          </dl>
        ) : (
          <p>
            No payout profile is registered.
            Contact Guru Kids Pro support.
          </p>
        )}

        <p>
          For security, full PayNow details are
          never displayed on this page. Contact
          support if payout information needs to
          be changed.
        </p>
      </section>

      <section className={styles.adminCard}>
        <h2>Commission ledger</h2>

        <div className={styles.tableScroll}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Learner</th>
                <th>Plan</th>
                <th>Payment</th>
                <th>Cycle</th>
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
                      {date(
                        commission.payment_paid_at ||
                          commission.created_at,
                      )}
                    </td>

                    <td>
                      {commission.learner_name}
                      <span>
                        {
                          commission.subscription_reference
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
                      {Number(
                        commission.refund_amount ||
                          0,
                      ) > 0 ? (
                        <span>
                          Refund:{" "}
                          {money(
                            commission.refund_amount,
                            commission.currency,
                          )}
                        </span>
                      ) : null}
                    </td>

                    <td>
                      #
                      {
                        commission.payment_sequence
                      }
                      <span>
                        {
                          commission.billing_cycle
                        }
                      </span>
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
                    className={styles.emptyCell}
                  >
                    No commission activity yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2>Commission release schedule</h2>

        <div className={styles.tableScroll}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Release</th>
                <th>Available</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Paid</th>
              </tr>
            </thead>

            <tbody>
              {releases.map((release) => (
                <tr key={release.id}>
                  <td>
                    {release.installment_no} of{" "}
                    {
                      release.installment_count
                    }
                  </td>

                  <td>
                    {date(
                      release.available_at,
                    )}
                  </td>

                  <td>
                    {money(
                      release.amount,
                      release.currency,
                    )}
                  </td>

                  <td>
                    {String(
                      release.status,
                    ).replaceAll("_", " ")}
                  </td>

                  <td>
                    {date(release.paid_at)}
                  </td>
                </tr>
              ))}

              {!releases.length ? (
                <tr>
                  <td
                    colSpan={5}
                    className={styles.emptyCell}
                  >
                    No commission releases
                    scheduled yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2>Payout history</h2>

        <div className={styles.tableScroll}>
          <table className={styles.adminTable}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Commission month</th>
                <th>Payout window</th>
                <th>Commission</th>
                <th>Adjustments</th>
                <th>Net payout</th>
                <th>Status</th>
                <th>Reference</th>
              </tr>
            </thead>

            <tbody>
              {payouts.map((payout) => (
                <tr key={payout.payout_id}>
                  <td>
                    {payout.batch_number}
                  </td>

                  <td>
                    {date(
                      payout.period_start,
                    )}
                    {" – "}
                    {date(
                      payout.period_end,
                    )}
                  </td>

                  <td>
                    {date(
                      payout.payout_window_start,
                    )}
                    {" – "}
                    {date(
                      payout.payout_window_end,
                    )}
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
                    {payout.payout_reference ||
                      "—"}
                    {payout.paid_at ? (
                      <span>
                        {date(
                          payout.paid_at,
                        )}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}

              {!payouts.length ? (
                <tr>
                  <td
                    colSpan={8}
                    className={styles.emptyCell}
                  >
                    No payouts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {adjustments.length ? (
        <section className={styles.adminCard}>
          <h2>Adjustments</h2>

          <div className={styles.tableScroll}>
            <table className={styles.adminTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {adjustments.map(
                  (adjustment) => (
                    <tr key={adjustment.id}>
                      <td>
                        {date(
                          adjustment.effective_at,
                        )}
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
                        {
                          adjustment.reason
                        }
                      </td>
                      <td>
                        {
                          adjustment.status
                        }
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className={styles.buttonRow}>
        <Link
          href="/affiliate-terms"
          className={styles.primaryLink}
        >
          Affiliate Terms
        </Link>

        <a
          href="mailto:admin@gurukidspro.com"
          className={styles.secondaryLink}
        >
          Contact Support
        </a>
      </div>
    </main>
  );
}
