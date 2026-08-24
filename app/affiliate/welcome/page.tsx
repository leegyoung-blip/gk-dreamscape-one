import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import {
  getAffiliateReferralPath,
  getSiteUrl,
} from "@/lib/affiliate/config";
import { createAdminClient } from "@/lib/supabase/admin";
import CopyAffiliateDetails from "./CopyAffiliateDetails";
import styles from "../affiliate.module.css";

export default async function AffiliateWelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/affiliate/welcome");
  }

  const admin = createAdminClient();
  const { data: partner } = await admin
    .from("affiliate_partners")
    .select(
      "partner_number, legal_name, business_name, partner_type, commission_rate, referral_code, status, activated_at",
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!partner?.referral_code) {
    redirect("/affiliate/apply");
  }

  const referralLink =
    `${getSiteUrl()}${getAffiliateReferralPath(partner.referral_code)}`;

  return (
    <main className={styles.centeredPage}>
      <section className={`${styles.successCard} ${styles.welcomeCard}`}>
        <div className={styles.successIcon}>✓</div>

        <p className={styles.eyebrow}>Affiliate account active</p>

        <h1>You are officially a Dreamscape Affiliate Partner.</h1>

        <p>
          Your approved commission rate is{" "}
          <strong>{Number(partner.commission_rate)}%</strong>. Your assigned
          affiliate code is separate from Dreamscape&apos;s ordinary member referral
          rewards and is the final identifier used for affiliate attribution.
        </p>

        {notice ? <div className={styles.formError}>{notice}</div> : null}

        <CopyAffiliateDetails
          referralCode={partner.referral_code}
          referralLink={referralLink}
        />

        <div className={styles.infoGrid}>
          <div>
            <strong>Commission period</strong>
            <p>
              Eligible completed billing cycles can generate commission for up to
              12 consecutive months from the referred customer&apos;s first
              successful eligible subscription payment.
            </p>
          </div>

          <div>
            <strong>Payout timing</strong>
            <p>
              Eligible Singapore commission is collated monthly and scheduled for
              PayNow payout between the 7th and 10th of the following month.
            </p>
          </div>

          <div>
            <strong>Promotion rules</strong>
            <p>
              Use truthful claims, disclose your affiliate relationship where
              required, and do not use spam, self-referrals, fake accounts, or
              unauthorised advertising.
            </p>
          </div>
        </div>

        <div className={styles.infoBox}>
          <strong>Affiliate tracking is active</strong>
          <p style={{ marginBottom: 0 }}>
            Share the referral link above. Dreamscape records the affiliate code
            before checkout and saves that code on the subscription contract. The
            recorded contract attribution, not a verbal claim or link click alone,
            determines commission eligibility.
          </p>
        </div>

        <div className={styles.buttonRow}>
          <Link href="/affiliate/dashboard" className={styles.primaryLink}>
            Open Affiliate Dashboard
          </Link>

          <Link href="/affiliate-terms" className={styles.secondaryLink}>
            Read Affiliate Terms
          </Link>

          <Link href="/affiliate" className={styles.secondaryLink}>
            View Affiliate Programme
          </Link>

          <a
            href="mailto:admin@gurukidspro.com"
            className={styles.secondaryLink}
          >
            Contact Support
          </a>
        </div>
      </section>
    </main>
  );
}
