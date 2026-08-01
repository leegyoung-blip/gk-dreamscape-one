import type { Metadata } from "next";
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
        <p className={styles.heroText}>Apply to earn recurring commission by introducing eligible families to Dreamscape Student Access.</p>
        <div className={styles.statGrid}>
          <div><strong>20%</strong><span>standard recurring commission</span></div>
          <div><strong>Monthly</strong><span>PayNow payout schedule</span></div>
          <div><strong>No minimum</strong><span>current payout threshold</span></div>
        </div>
      </header>

      <section className={styles.introCard}>
        <div><span>01</span><strong>Educators</strong><p>Private tutors and education professionals.</p></div>
        <div><span>02</span><strong>Child-focused businesses</strong><p>Childcare, enrichment and family-service providers.</p></div>
        <div><span>03</span><strong>Parenting creators</strong><p>Parenting, education and family-focused creators.</p></div>
      </section>

      <AffiliateApplicationForm />
    </main>
  );
}
