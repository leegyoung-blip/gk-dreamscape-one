"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { completeAffiliateOnboarding, type OnboardingFormState } from "./actions";
import styles from "../affiliate.module.css";

const initialState: OnboardingFormState = {};

export default function OnboardingForm({
  token,
  application,
  partner,
}: {
  token: string;
  application: {
    legal_name: string;
    business_name: string | null;
    phone: string;
    country: string;
    email: string;
  };
  partner: { commission_rate: number; partner_type: string };
}) {
  const [state, formAction, pending] = useActionState(
    completeAffiliateOnboarding,
    initialState,
  );
  const [payoutMethod, setPayoutMethod] = useState(
    application.country.toLowerCase().includes("singapore")
      ? "paynow"
      : "international_manual",
  );

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="token" value={token} />
      {state.error ? <div className={styles.formError}>{state.error}</div> : null}

      <div className={styles.approvalBadge}>
        <span>Approved commission rate</span>
        <strong>{partner.commission_rate}%</strong>
        <small>{partner.partner_type === "kol" ? "KOL Creator Partnership" : "Dreamscape Affiliate Partner"}</small>
      </div>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}><span>1</span><div><h2>Confirm your details</h2><p>Use the same approved identity and email address.</p></div></div>
        <div className={styles.formGrid}>
          <label>Legal name <b>*</b><input name="legal_name" defaultValue={application.legal_name} required /></label>
          <label>Business name<input name="business_name" defaultValue={application.business_name ?? ""} /></label>
          <label>Approved email<input value={application.email} readOnly disabled /></label>
          <label>Mobile number <b>*</b><input name="phone" defaultValue={application.phone} required /></label>
          <label className={styles.fullWidth}>Country <b>*</b><input name="country" defaultValue={application.country} required /></label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}><span>2</span><div><h2>Payout information</h2><p>Your payout details are encrypted and restricted to authorised administration.</p></div></div>
        <div className={styles.formGrid}>
          <label>
            Payout method <b>*</b>
            <select name="payout_method" value={payoutMethod} onChange={(event) => setPayoutMethod(event.target.value)}>
              <option value="paynow">PayNow (Singapore)</option>
              <option value="international_manual">International arrangement</option>
            </select>
          </label>
          <label>Payee name <b>*</b><input name="payee_name" required /></label>
          {payoutMethod === "paynow" ? (
            <>
              <label>
                PayNow proxy type <b>*</b>
                <select name="paynow_proxy_type" defaultValue="mobile" required>
                  <option value="mobile">Mobile number</option>
                  <option value="uen">UEN</option>
                  <option value="nric_fin">NRIC / FIN, only where necessary</option>
                </select>
              </label>
              <label>PayNow proxy value <b>*</b><input name="paynow_proxy_value" required autoComplete="off" /></label>
            </>
          ) : (
            <div className={`${styles.infoBox} ${styles.fullWidth}`}>Guru Kids Pro will confirm international payout arrangements separately by email.</div>
          )}
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}><span>3</span><div><h2>Final agreement</h2><p>Complete these confirmations to activate your account.</p></div></div>
        <div className={styles.declarations}>
          <label><input type="checkbox" name="terms_accepted" required />I accept the current <Link href="/terms#affiliate" target="_blank">Affiliate Programme Terms</Link>.</label>
          <label><input type="checkbox" name="payout_confirmed" required />I confirm that my payout and contact information is accurate.</label>
          <label><input type="checkbox" name="billing_rule_accepted" required />I understand that commission starts only after an eligible customer completes the first paid billing cycle.</label>
          <label><input type="checkbox" name="participation_rule_accepted" required />I understand that recurring commission ends when the subscription or my programme participation ends.</label>
          <label><input type="checkbox" name="brand_rules_accepted" required />I agree to follow Dreamscape’s advertising and brand rules.</label>
        </div>
      </section>

      <div className={styles.submitPanel}>
        <div><strong>Activate your affiliate account</strong><p>Your referral code and link will be created after successful submission.</p></div>
        <button type="submit" disabled={pending}>{pending ? "Activating..." : "Activate Account"}</button>
      </div>
    </form>
  );
}
