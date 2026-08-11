import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/affiliate/auth";
import {
  getReferralDestinationPath,
  getSiteUrl,
} from "@/lib/affiliate/config";
import { createAdminClient } from "@/lib/supabase/admin";
import CopyAffiliateDetails from "./CopyAffiliateDetails";
import styles from "../affiliate.module.css";

export default async function AffiliateWelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/affiliate/welcome");

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
    `?ref=${encodeURIComponent(partner.referral_code)}`;

  return (
    <main className={styles.centeredPage}>
      <section
        className={`${styles.successCard} ${styles.welcomeCard}`}
      >
        <div className={styles.successIcon}>✓</div>

        <p className={styles.eyebrow}>
          Affiliate account active
        </p>

        <h1>
          You are officially a Dreamscape Affiliate
          Partner.
        </h1>

        <p>
          Your approved commission rate is{" "}
          <strong>
            {Number(partner.commission_rate)}%
          </strong>
          . Use your official link or code for every
          eligible referral.
        </p>

        <CopyAffiliateDetails
          referralCode={partner.referral_code}
          referralLink={referralLink}
        />

        <div className={styles.infoGrid}>
          <div>
            <strong>Qualifying period</strong>
            <p>
              Monthly commission begins only after
              the first paid billing cycle. Annual
              commission is released monthly across
              the paid service year.
            </p>
          </div>

          <div>
            <strong>Payout timing</strong>
            <p>
              Eligible commission is collated monthly
              and scheduled between the 7th and 10th
              of the following month.
            </p>
          </div>

          <div>
            <strong>Promotion rules</strong>
            <p>
              Use truthful claims, disclose the
              affiliate relationship and avoid
              unauthorised discounts or guaranteed
              outcomes.
            </p>
          </div>
        </div>

        <div className={styles.buttonRow}>
          <Link
            href="/affiliate/dashboard"
            className={styles.primaryLink}
          >
            Open Affiliate Dashboard
          </Link>

          <Link
            href="/affiliate-terms"
            className={styles.secondaryLink}
          >
            Read Affiliate Terms
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
