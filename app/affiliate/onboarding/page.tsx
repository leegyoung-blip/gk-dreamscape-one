import Link from "next/link";
import { getCurrentUser } from "@/lib/affiliate/auth";
import { hashToken } from "@/lib/affiliate/security";
import { createAdminClient } from "@/lib/supabase/admin";
import OnboardingForm from "./OnboardingForm";
import styles from "../affiliate.module.css";

export default async function AffiliateOnboardingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return <OnboardingError message="The approval link is missing." />;
  }

  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const { data: tokenRow } = await admin
    .from("affiliate_onboarding_tokens")
    .select("application_id, partner_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (!tokenRow || tokenRow.used_at || new Date(tokenRow.expires_at).getTime() <= Date.now()) {
    return <OnboardingError message="This approval link is invalid, expired, or already used. Email admin@gurukidspro.com for a new link." />;
  }

  const [{ data: application }, { data: partner }] = await Promise.all([
    admin.from("affiliate_applications").select("legal_name, business_name, phone, country, email").eq("id", tokenRow.application_id).single(),
    admin.from("affiliate_partners").select("commission_rate, partner_type").eq("id", tokenRow.partner_id).single(),
  ]);

  if (!application || !partner) {
    return <OnboardingError message="The approved affiliate record could not be found." />;
  }

  const user = await getCurrentUser();
  const next = encodeURIComponent(`/affiliate/onboarding?token=${token}`);

  if (!user) {
    return (
      <main className={styles.centeredPage}>
        <section className={styles.successCard}>
          <p className={styles.eyebrow}>Application approved</p>
          <h1>Sign in to complete registration.</h1>
          <p>Use the approved email address: <strong>{application.email}</strong></p>
          <div className={styles.buttonRow}>
            <Link href={`/login?next=${next}`} className={styles.primaryLink}>Sign in</Link>
            <Link href={`/signup?next=${next}&email=${encodeURIComponent(application.email)}`} className={styles.secondaryLink}>Create account</Link>
          </div>
        </section>
      </main>
    );
  }

  if (user.email?.toLowerCase() !== application.email.toLowerCase()) {
    return <OnboardingError message={`You are signed in as ${user.email}. Sign out and use ${application.email}.`} />;
  }

  return (
    <main className={styles.page}>
      <header className={styles.heroCompact}>
        <p className={styles.eyebrow}>Approved Affiliate Registration</p>
        <h1>Welcome to the Dreamscape Affiliate Programme.</h1>
        <p>Confirm your information, register your payout method and accept the current programme terms.</p>
      </header>
      <OnboardingForm token={token} application={application} partner={{ commission_rate: Number(partner.commission_rate), partner_type: partner.partner_type }} />
    </main>
  );
}

function OnboardingError({ message }: { message: string }) {
  return (
    <main className={styles.centeredPage}>
      <section className={styles.successCard}>
        <div className={styles.errorIcon}>!</div>
        <p className={styles.eyebrow}>Affiliate onboarding</p>
        <h1>We could not open this registration.</h1>
        <p>{message}</p>
        <a href="mailto:admin@gurukidspro.com" className={styles.primaryLink}>Contact Guru Kids Pro</a>
      </section>
    </main>
  );
}
