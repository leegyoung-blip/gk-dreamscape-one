import Link from "next/link";
import styles from "../affiliate.module.css";

export default async function ApplicationReceivedPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  const params = await searchParams;
  return (
    <main className={styles.centeredPage}>
      <section className={styles.successCard}>
        <div className={styles.successIcon}>✓</div>
        <p className={styles.eyebrow}>Application received</p>
        <h1>Thank you for applying.</h1>
        <p>We have sent a confirmation email. Applications are normally reviewed within 3–5 business days.</p>
        {params.ref ? <div className={styles.referenceBox}>Application reference: <strong>{params.ref}</strong></div> : null}
        <p className={styles.muted}>We will contact you at the email address in your application. Payout details are collected only after approval.</p>
        <Link href="/" className={styles.primaryLink}>Return to Dreamscape</Link>
      </section>
    </main>
  );
}
