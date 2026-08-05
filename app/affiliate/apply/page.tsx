import type { Metadata } from "next";
import Link from "next/link";
import AffiliateApplicationForm from "./AffiliateApplicationForm";
import styles from "../affiliate.module.css";

export const metadata: Metadata = {
  title: "Apply | Dreamscape Affiliate Programme",
  description: "Apply to become a Dreamscape Affiliate Partner.",
};

export default function AffiliateApplicationPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Dreamscape Affiliate Programme</p>
        <h1>Help more children discover Dreamscape.</h1>
        <p className={styles.heroText}>
          Apply to earn commission by introducing eligible families to
          Dreamscape Student Access.
        </p>

        <div className={styles.statGrid}>
          <div>
            <strong>10%</strong>
            <span>regular Affiliate commission</span>
          </div>
          <div>
            <strong>Up to 20%</strong>
            <span>for approved KOL or creator partners</span>
          </div>
          <div>
            <strong>12 months</strong>
            <span>maximum per referred customer</span>
          </div>
        </div>
      </header>

      <section className={styles.introCard}>
        <div>
          <span>01</span>
          <strong>Educators</strong>
          <p>Private tutors and education professionals.</p>
        </div>
        <div>
          <span>02</span>
          <strong>Child-focused businesses</strong>
          <p>Childcare, enrichment and family-service providers.</p>
        </div>
        <div>
          <span>03</span>
          <strong>Parenting creators</strong>
          <p>Parenting, education and family-focused creators.</p>
        </div>
      </section>

      <section className={styles.introCard}>
        <div>
          <span>01</span>
          <strong>Use your exact referral code</strong>
          <p>
            Link clicks or cookies alone do not create attribution. The assigned
            referral code must be recorded successfully.
          </p>
        </div>
        <div>
          <span>02</span>
          <strong>Monthly PayNow payouts</strong>
          <p>
            Eligible commissions are collated monthly and normally scheduled
            between the 7th and 10th of the following month.
          </p>
        </div>
        <div>
          <span>03</span>
          <strong>No current minimum payout</strong>
          <p>
            Programme approval and the full Affiliate Programme Terms apply.
          </p>
        </div>
      </section>

      <p style={{ textAlign: "center", margin: "0 auto 28px", maxWidth: 760 }}>
        Review the <Link href="/affiliate-terms">Affiliate Programme Terms</Link>{" "}
        before applying.
      </p>

      <AffiliateApplicationForm />
    </main>
  );
}
