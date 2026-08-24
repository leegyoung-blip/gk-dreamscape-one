import Link from "next/link";
import { requireAdmin } from "@/lib/affiliate/auth";
import InviteAffiliateForm from "./InviteAffiliateForm";
import styles from "@/app/affiliate/affiliate.module.css";

export const metadata = {
  title: "Invite Affiliate | Dreamscape One Admin",
};

export default async function InviteAffiliatePage() {
  await requireAdmin();

  return (
    <main className={styles.adminPage}>
      <div className={styles.backRow}>
        <Link href="/admin/affiliates">← Affiliate applications</Link>
        <Link href="/admin/affiliates/finance">Affiliate finance →</Link>
      </div>

      <header className={styles.adminHeader}>
        <div>
          <p className={styles.eyebrow}>Direct partner invitation</p>
          <h1>Invite an affiliate</h1>
          <p>
            Use this for partners you have already chosen to work with. They
            bypass the public application form and go directly to secure
            onboarding.
          </p>
        </div>
      </header>

      <section className={styles.adminCard}>
        <h2>How this works</h2>
        <p>
          Dreamscape will create an approved-pending affiliate record, generate
          a single-use onboarding link valid for 7 days, and email it to the
          partner. The partner still has to sign in with the invited email,
          register payout details, and personally accept the current Affiliate
          Programme Terms and Privacy Policy before the account becomes active.
        </p>
      </section>

      <InviteAffiliateForm />
    </main>
  );
}
