import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import {
  getAffiliateReferralPath,
  getSiteUrl,
} from "@/lib/affiliate/config";
import { createAdminClient } from "@/lib/supabase/admin";
import CopyAffiliateDetails from "../welcome/CopyAffiliateDetails";
import styles from "./dashboard.module.css";

type CommissionRow = {
  id: string;
  created_at: string | null;
  payment_paid_at: string | null;
  status: string | null;
  eligibility_reason: string | null;
  payment_sequence: number | null;
  billing_cycle: string | null;
  currency: string | null;
  gross_revenue: number | string | null;
  refund_amount: number | string | null;
  net_revenue: number | string | null;
  commission_rate: number | string | null;
  commission_amount: number | string | null;
  plan_name: string | null;
  payable_at: string | null;
};

type ReleaseRow = {
  id: string;
  installment_no: number;
  installment_count: number;
  currency: string | null;
  amount: number | string | null;
  available_at: string | null;
  status: string | null;
  paid_at: string | null;
};

type PayoutRow = {
  payout_id: string;
  batch_number: string | null;
  period_start: string | null;
  period_end: string | null;
  payout_window_start: string | null;
  payout_window_end: string | null;
  payout_status: string | null;
  currency: string | null;
  release_total: number | string | null;
  adjustment_total: number | string | null;
  net_payout: number | string | null;
  payout_reference: string | null;
  paid_at: string | null;
  created_at: string | null;
};

type AdjustmentRow = {
  id: string;
  adjustment_type: string | null;
  currency: string | null;
  amount: number | string | null;
  reason: string | null;
  effective_at: string | null;
  status: string | null;
  created_at: string | null;
};

type ReferralContractRow = {
  id: string;
  reference: string;
  plan_id: string;
  status: string;
  affiliate_attributed_at: string | null;
  created_at: string;
  first_paid_at: string | null;
};

function money(value: unknown, currency = "SGD") {
  return new Intl.NumberFormat("en-SG", {
    style: "currency",
    currency: String(currency || "SGD").toUpperCase(),
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

  return parsed.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function percentage(numerator: number, denominator: number) {
  if (denominator <= 0) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}

function humanise(value: unknown) {
  return String(value || "—")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function commissionStatusText(row: CommissionRow) {
  if (row.status === "ineligible" && row.eligibility_reason) {
    return `Ineligible · ${humanise(row.eligibility_reason)}`;
  }

  if (row.status === "pending" && row.payable_at) {
    return `Pending · ${date(row.payable_at)}`;
  }

  return humanise(row.status);
}

function statusClass(value: unknown) {
  const status = String(value || "").toLowerCase();

  if (["active", "paid", "payable", "eligible", "succeeded"].includes(status)) {
    return styles.statusPositive;
  }

  if (["pending", "scheduled", "setup_pending", "cancel_at_period_end"].includes(status)) {
    return styles.statusPending;
  }

  if (["reversed", "rejected", "cancelled", "canceled", "terminated", "ineligible"].includes(status)) {
    return styles.statusNegative;
  }

  return styles.statusNeutral;
}

export default async function AffiliateDashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/affiliate/dashboard");
  }

  const admin = createAdminClient();

  const { data: partner, error: partnerError } = await admin
    .from("affiliate_partners")
    .select(
      "id,partner_number,legal_name,business_name,email,partner_type,commission_rate,referral_code,status,activated_at,created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
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
    recentContractsResult,
    linkClicksResult,
    acceptedClicksResult,
    attributedContractsResult,
    paidContractsResult,
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
        "id,created_at,payment_paid_at,status,eligibility_reason,payment_sequence,billing_cycle,currency,gross_revenue,refund_amount,net_revenue,commission_rate,commission_amount,plan_name,payable_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("dreamscape_affiliate_commission_releases")
      .select(
        "id,installment_no,installment_count,currency,amount,available_at,status,paid_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("available_at", { ascending: true })
      .limit(100),

    admin
      .from("dreamscape_affiliate_payout_admin_overview")
      .select(
        "payout_id,batch_number,period_start,period_end,payout_window_start,payout_window_end,payout_status,currency,release_total,adjustment_total,net_payout,payout_reference,paid_at,created_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("dreamscape_affiliate_adjustments")
      .select(
        "id,adjustment_type,currency,amount,reason,effective_at,status,created_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(50),

    admin
      .from("dreamscape_subscription_contracts")
      .select(
        "id,reference,plan_id,status,affiliate_attributed_at,created_at,first_paid_at",
      )
      .eq("affiliate_partner_id", partner.id)
      .order("created_at", { ascending: false })
      .limit(20),

    admin
      .from("affiliate_referral_clicks")
      .select("id", { count: "exact", head: true })
      .eq("clicked_partner_id", partner.id),

    admin
      .from("affiliate_referral_clicks")
      .select("id", { count: "exact", head: true })
      .eq("attributed_partner_id", partner.id)
      .eq("attribution_status", "accepted"),

    admin
      .from("dreamscape_subscription_contracts")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_partner_id", partner.id),

    admin
      .from("dreamscape_subscription_contracts")
      .select("id", { count: "exact", head: true })
      .eq("affiliate_partner_id", partner.id)
      .not("first_paid_at", "is", null),
  ]);

  const queryError =
    summaryResult.error ||
    profileResult.error ||
    commissionsResult.error ||
    releasesResult.error ||
    payoutsResult.error ||
    adjustmentsResult.error ||
    recentContractsResult.error ||
    linkClicksResult.error ||
    acceptedClicksResult.error ||
    attributedContractsResult.error ||
    paidContractsResult.error;

  if (queryError) {
    throw new Error(queryError.message);
  }

  const recentContracts = (recentContractsResult.data || []) as ReferralContractRow[];
  const planIds = Array.from(
    new Set(recentContracts.map((contract) => contract.plan_id).filter(Boolean)),
  );

  let planNameById = new Map<string, string>();

  if (planIds.length) {
    const { data: planRows, error: planError } = await admin
      .from("dreamscape_subscription_plans")
      .select("id,display_name,plan_code")
      .in("id", planIds);

    if (planError) {
      throw new Error(planError.message);
    }

    planNameById = new Map(
      (planRows || []).map((plan) => [
        String(plan.id),
        String(plan.display_name || plan.plan_code || "Dreamscape plan"),
      ]),
    );
  }

  const summary = summaryResult.data;
  const profile = profileResult.data;
  const commissions = (commissionsResult.data || []) as CommissionRow[];
  const releases = (releasesResult.data || []) as ReleaseRow[];
  const payouts = (payoutsResult.data || []) as PayoutRow[];
  const adjustments = (adjustmentsResult.data || []) as AdjustmentRow[];

  const linkClicks = Number(linkClicksResult.count || 0);
  const acceptedClicks = Number(acceptedClicksResult.count || 0);
  const attributedContracts = Number(attributedContractsResult.count || 0);
  const paidContracts = Number(paidContractsResult.count || 0);

  const availableBalance =
    Number(summary?.matured_unassigned_amount || 0) +
    Number(summary?.pending_adjustment_balance || 0);

  const referralLink =
    `${getSiteUrl()}${getAffiliateReferralPath(String(partner.referral_code))}`;

  const partnerStatus = String(partner.status || "");
  const isActive = partnerStatus === "active";

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <Link href="/affiliate" className={styles.brandLink}>
          <span aria-hidden="true">✦</span>
          Dreamscape Affiliates
        </Link>

        <nav className={styles.topNav} aria-label="Affiliate dashboard navigation">
          <Link href="/affiliate-terms">Programme Terms</Link>
          <Link href="/profile">My Account</Link>
        </nav>
      </header>

      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Affiliate dashboard</p>
          <h1>
            Welcome back, {partner.business_name || partner.legal_name}.
          </h1>
          <p className={styles.heroText}>
            Track your Dreamscape referral activity, commission and payout
            progress from one place.
          </p>
        </div>

        <div className={styles.heroStatus}>
          <span className={`${styles.statusPill} ${statusClass(partnerStatus)}`}>
            {humanise(partnerStatus)}
          </span>
          <strong>{Number(partner.commission_rate || 0)}%</strong>
          <small>approved commission rate</small>
        </div>
      </section>

      {!isActive ? (
        <div className={styles.notice}>
          Your affiliate account is currently <strong>{humanise(partnerStatus)}</strong>.
          Referral links only attribute new customers while the partner account is
          active. Contact support if you believe this status is incorrect.
        </div>
      ) : null}

      <section className={styles.shareCard}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.eyebrow}>Your referral identity</p>
            <h2>Share your official affiliate link.</h2>
            <p>
              The `/r/` link records your affiliate attribution before sending the
              visitor to Dreamscape pricing. Your code is the final attribution
              identifier saved on eligible subscription contracts.
            </p>
          </div>
          <span className={styles.partnerNumber}>{partner.partner_number}</span>
        </div>

        <CopyAffiliateDetails
          referralCode={String(partner.referral_code)}
          referralLink={referralLink}
        />
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Performance</p>
          <h2>Referral activity</h2>
        </div>

        <div className={styles.metricGrid}>
          <article className={styles.metricCard}>
            <span>Link clicks</span>
            <strong>{linkClicks.toLocaleString("en-SG")}</strong>
            <p>Recorded visits to your affiliate link.</p>
          </article>

          <article className={styles.metricCard}>
            <span>Accepted attribution</span>
            <strong>{acceptedClicks.toLocaleString("en-SG")}</strong>
            <p>Clicks where your affiliate attribution won.</p>
          </article>

          <article className={styles.metricCard}>
            <span>Attributed subscriptions</span>
            <strong>{attributedContracts.toLocaleString("en-SG")}</strong>
            <p>Subscription setups carrying your affiliate code.</p>
          </article>

          <article className={styles.metricCard}>
            <span>Paying subscriptions</span>
            <strong>{paidContracts.toLocaleString("en-SG")}</strong>
            <p>Attributed subscriptions with a successful payment.</p>
          </article>
        </div>

        <div className={styles.conversionRow}>
          <div>
            <span>Click → subscription</span>
            <strong>{percentage(attributedContracts, linkClicks)}</strong>
          </div>
          <div>
            <span>Click → paid</span>
            <strong>{percentage(paidContracts, linkClicks)}</strong>
          </div>
          <p>
            Click tracking begins from the affiliate attribution system launch;
            earlier referrals are not reconstructed as historical clicks.
          </p>
        </div>
      </section>

      <section className={styles.sectionBlock}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Earnings</p>
          <h2>Commission overview</h2>
        </div>

        <div className={styles.earningsGrid}>
          <article className={styles.earningsCard}>
            <span>Future commission</span>
            <strong>{money(summary?.pending_unmatured_amount)}</strong>
            <p>Recorded commission not yet available for payout.</p>
          </article>

          <article className={styles.earningsCard}>
            <span>Available balance</span>
            <strong>{money(availableBalance)}</strong>
            <p>Matured commission plus pending account adjustments.</p>
          </article>

          <article className={styles.earningsCard}>
            <span>Scheduled payout</span>
            <strong>{money(summary?.scheduled_payout_amount)}</strong>
            <p>Already assigned to an upcoming payout batch.</p>
          </article>

          <article className={styles.earningsCard}>
            <span>Lifetime paid</span>
            <strong>{money(summary?.lifetime_paid_amount)}</strong>
            <p>Total affiliate payout recorded as paid.</p>
          </article>
        </div>

        <div className={styles.nextRelease}>
          <span>Next scheduled commission release</span>
          <strong>{date(summary?.next_release_at)}</strong>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.eyebrow}>Recent referrals</p>
            <h2>Attributed subscriptions</h2>
            <p>
              Customer names and email addresses are intentionally not shown in
              the affiliate dashboard.
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Attributed</th>
                <th>Reference</th>
                <th>Plan</th>
                <th>Subscription status</th>
                <th>First paid</th>
              </tr>
            </thead>
            <tbody>
              {recentContracts.map((contract) => (
                <tr key={contract.id}>
                  <td>{date(contract.affiliate_attributed_at || contract.created_at)}</td>
                  <td>
                    <strong className={styles.referenceText}>{contract.reference}</strong>
                  </td>
                  <td>{planNameById.get(contract.plan_id) || "Dreamscape plan"}</td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(contract.status)}`}>
                      {humanise(contract.status)}
                    </span>
                  </td>
                  <td>{date(contract.first_paid_at)}</td>
                </tr>
              ))}

              {!recentContracts.length ? (
                <tr>
                  <td colSpan={5} className={styles.emptyCell}>
                    No attributed subscriptions yet. Share your official referral
                    link to get started.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.eyebrow}>Commission activity</p>
            <h2>Commission ledger</h2>
            <p>
              Each row is tied to an eligible subscription payment. Refunds and
              reversals remain visible for a complete audit trail.
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Paid</th>
                <th>Plan</th>
                <th>Billing cycle</th>
                <th>Net revenue</th>
                <th>Rate</th>
                <th>Commission</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((commission) => (
                <tr key={commission.id}>
                  <td>{date(commission.payment_paid_at || commission.created_at)}</td>
                  <td>{commission.plan_name || "Dreamscape plan"}</td>
                  <td>
                    #{commission.payment_sequence || "—"}
                    <span className={styles.cellSubtext}>
                      {humanise(commission.billing_cycle)}
                    </span>
                  </td>
                  <td>
                    {money(commission.net_revenue, commission.currency || "SGD")}
                    {Number(commission.refund_amount || 0) > 0 ? (
                      <span className={styles.cellSubtext}>
                        Refund {money(commission.refund_amount, commission.currency || "SGD")}
                      </span>
                    ) : null}
                  </td>
                  <td>{Number(commission.commission_rate || 0)}%</td>
                  <td>
                    <strong>
                      {money(commission.commission_amount, commission.currency || "SGD")}
                    </strong>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(commission.status)}`}>
                      {commissionStatusText(commission)}
                    </span>
                  </td>
                </tr>
              ))}

              {!commissions.length ? (
                <tr>
                  <td colSpan={7} className={styles.emptyCell}>
                    No commission activity yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.twoColumnGrid}>
        <article className={styles.panel}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Release schedule</p>
            <h2>Upcoming commission</h2>
          </div>

          <div className={styles.compactList}>
            {releases.slice(0, 12).map((release) => (
              <div key={release.id}>
                <div>
                  <strong>{date(release.available_at)}</strong>
                  <span>
                    Release {release.installment_no} of {release.installment_count}
                  </span>
                </div>
                <div className={styles.listRight}>
                  <strong>{money(release.amount, release.currency || "SGD")}</strong>
                  <span className={`${styles.statusPill} ${statusClass(release.status)}`}>
                    {humanise(release.status)}
                  </span>
                </div>
              </div>
            ))}

            {!releases.length ? (
              <p className={styles.emptyMessage}>No commission releases scheduled yet.</p>
            ) : null}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Account</p>
            <h2>Payout profile</h2>
          </div>

          {profile ? (
            <dl className={styles.detailGrid}>
              <div>
                <dt>Verification</dt>
                <dd>{profile.verified_at ? "Verified" : "Awaiting verification"}</dd>
              </div>
              <div>
                <dt>Method</dt>
                <dd>{humanise(profile.payout_method)}</dd>
              </div>
              <div>
                <dt>Payee</dt>
                <dd>{profile.payee_name}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{profile.payout_country}</dd>
              </div>
              <div>
                <dt>PayNow</dt>
                <dd>
                  {profile.paynow_proxy_last4
                    ? `${humanise(profile.paynow_proxy_type)} ending ${profile.paynow_proxy_last4}`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt>Verified at</dt>
                <dd>{dateTime(profile.verified_at)}</dd>
              </div>
            </dl>
          ) : (
            <p className={styles.emptyMessage}>
              No payout profile is registered. Contact Guru Kids Pro support.
            </p>
          )}

          <p className={styles.securityNote}>
            Full PayNow identifiers are encrypted and are never displayed here.
            Contact support if payout information needs to be changed.
          </p>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeadingRow}>
          <div>
            <p className={styles.eyebrow}>Payouts</p>
            <h2>Payout history</h2>
            <p>
              Singapore affiliate payouts are scheduled within the programme payout
              window after commission becomes eligible.
            </p>
          </div>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Batch</th>
                <th>Commission period</th>
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
                  <td>{payout.batch_number || "—"}</td>
                  <td>
                    {date(payout.period_start)} – {date(payout.period_end)}
                  </td>
                  <td>
                    {date(payout.payout_window_start)} – {date(payout.payout_window_end)}
                  </td>
                  <td>{money(payout.release_total, payout.currency || "SGD")}</td>
                  <td>{money(payout.adjustment_total, payout.currency || "SGD")}</td>
                  <td>
                    <strong>{money(payout.net_payout, payout.currency || "SGD")}</strong>
                  </td>
                  <td>
                    <span className={`${styles.statusPill} ${statusClass(payout.payout_status)}`}>
                      {humanise(payout.payout_status)}
                    </span>
                  </td>
                  <td>
                    {payout.payout_reference || "—"}
                    {payout.paid_at ? (
                      <span className={styles.cellSubtext}>{date(payout.paid_at)}</span>
                    ) : null}
                  </td>
                </tr>
              ))}

              {!payouts.length ? (
                <tr>
                  <td colSpan={8} className={styles.emptyCell}>
                    No payouts yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {adjustments.length ? (
        <section className={styles.panel}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>Account adjustments</p>
            <h2>Adjustments</h2>
          </div>

          <div className={styles.tableScroll}>
            <table className={styles.table}>
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
                {adjustments.map((adjustment) => (
                  <tr key={adjustment.id}>
                    <td>{date(adjustment.effective_at || adjustment.created_at)}</td>
                    <td>{humanise(adjustment.adjustment_type)}</td>
                    <td>{money(adjustment.amount, adjustment.currency || "SGD")}</td>
                    <td>{adjustment.reason || "—"}</td>
                    <td>
                      <span className={`${styles.statusPill} ${statusClass(adjustment.status)}`}>
                        {humanise(adjustment.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className={styles.accountFooter}>
        <div>
          <span>Partner number</span>
          <strong>{partner.partner_number}</strong>
        </div>
        <div>
          <span>Partner type</span>
          <strong>{humanise(partner.partner_type)}</strong>
        </div>
        <div>
          <span>Activated</span>
          <strong>{date(partner.activated_at)}</strong>
        </div>

        <nav>
          <Link href="/affiliate-terms">Affiliate Terms</Link>
          <Link href="/affiliate">Programme Overview</Link>
          <a href="mailto:admin@gurukidspro.com">Contact Support</a>
        </nav>
      </section>
    </main>
  );
}
