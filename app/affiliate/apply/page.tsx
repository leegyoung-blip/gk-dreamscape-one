import type { Metadata } from "next";
import Link from "next/link";
import AffiliateApplicationForm from "./AffiliateApplicationForm";
import styles from "./apply.module.css";

export const metadata: Metadata = {
  title: "Affiliate Application | Dreamscape One",
  description:
    "Apply for the currently available Dreamscape Regular Affiliate tier with 10% recurring commission.",
};

export default function AffiliateApplicationPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/affiliate" className={styles.backLink}>
            ← Affiliate Programme
          </Link>
          <Link href="/affiliate-terms" className={styles.termsLink}>
            Programme Terms
          </Link>
        </div>
      </header>

      <section className={styles.hero}>
        <p className={styles.eyebrow}>Regular Affiliate · Available now</p>
        <h1>Apply to become a Dreamscape Affiliate.</h1>
        <p>
          The current application is for <strong>Affiliate Regular only</strong>:
          free participation after approval, a 10% recurring commission rate,
          and a maximum commission period of 12 consecutive months per eligible
          referred customer. Affiliate Plus and Affiliate Pro are coming soon.
        </p>

        <div className={styles.summaryGrid}>
          <article>
            <span>Joining fee</span>
            <strong>Free</strong>
          </article>
          <article>
            <span>Regular commission</span>
            <strong>10%</strong>
          </article>
          <article>
            <span>Maximum period</span>
            <strong>12 months</strong>
          </article>
        </div>
      </section>

      <section className={styles.formShell}>
        <AffiliateApplicationForm />
      </section>

      <footer className={styles.footer}>
        <p>Dreamscape One — Powered by Guru Kids Pro</p>
        <div>
          <Link href="/affiliate">Affiliate Programme</Link>
          <Link href="/affiliate-terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
        </div>
      </footer>
    </main>
  );
}
