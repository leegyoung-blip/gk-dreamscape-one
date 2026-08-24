import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import { getReferralDestinationPath, getSiteUrl } from "@/lib/affiliate/config";
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
    `${getSiteUrl()}${getReferralDestinationPath()}` +
    `?affiliate_ref=${encodeURIComponent(partner.referral_code)}`;

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
          rewards and will be used for affiliate attribution.
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
              An eligible referred customer can generate commission for up to 12
              consecutive months from the first successful eligible subscription
              payment, subject to the Programme Terms.
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
          <strong>Affiliate tracking</strong>
          <p style={{ marginBottom: 0 }}>
            Your affiliate identity and referral code are now active. The dedicated
            click/signup/subscription attribution layer is connected in Phase 3.
            Until that phase is deployed, keep your code available and do not rely
            on link-only attribution.
          </p>
        </div>

        <div className={styles.buttonRow}>
          <Link href="/affiliate" className={styles.primaryLink}>
            View Affiliate Programme
          </Link>

          <Link href="/affiliate-terms" className={styles.secondaryLink}>
            Read Affiliate Terms
          </Link>

          <Link href="/" className={styles.secondaryLink}>
            Go to Dreamscape
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
