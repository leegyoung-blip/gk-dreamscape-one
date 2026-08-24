"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  completeAffiliateOnboarding,
  type OnboardingFormState,
} from "./actions";
import styles from "../affiliate.module.css";

const initialState: OnboardingFormState = {};

function ErrorText({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className={styles.fieldError}>{messages[0]}</p>;
}

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
  partner: {
    commission_rate: number;
    partner_type: string;
  };
}) {
  const [state, formAction, pending] = useActionState(
    completeAffiliateOnboarding,
    initialState,
  );

  const isSingapore = application.country
    .trim()
    .toLowerCase()
    .includes("singapore");

  return (
    <form action={formAction} className={styles.form} noValidate>
      <input type="hidden" name="token" value={token} />

      {state.error ? (
        <div className={styles.formError}>{state.error}</div>
      ) : null}

      <div className={styles.approvalBadge}>
        <span>Approved commission rate</span>
        <strong>{partner.commission_rate}%</strong>
        <small>
          {partner.partner_type === "kol"
            ? "Approved creator partnership"
            : "Dreamscape Affiliate Regular"}
        </small>
      </div>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>1</span>
          <div>
            <h2>Approved identity</h2>
            <p>
              These details come from the application that was reviewed and cannot
              be changed during onboarding.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label>
            Legal name
            <input value={application.legal_name} readOnly disabled />
          </label>

          <label>
            Business name
            <input
              value={application.business_name || "Not supplied"}
              readOnly
              disabled
            />
          </label>

          <label>
            Approved email
            <input value={application.email} readOnly disabled />
          </label>

          <label>
            Country
            <input value={application.country} readOnly disabled />
          </label>

          <label className={styles.fullWidth}>
            Mobile number <b>*</b>
            <input
              name="phone"
              defaultValue={application.phone}
              required
              autoComplete="tel"
            />
            <ErrorText messages={state.fieldErrors?.phone} />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>2</span>
          <div>
            <h2>Payout information</h2>
            <p>
              Sensitive PayNow identifiers are encrypted before they are stored.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label>
            Payout method
            <input
              value={
                isSingapore
                  ? "PayNow (Singapore)"
                  : "International arrangement"
              }
              readOnly
              disabled
            />
          </label>

          <label>
            Payee name <b>*</b>
            <input name="payee_name" required autoComplete="name" />
            <ErrorText messages={state.fieldErrors?.payeeName} />
          </label>

          {isSingapore ? (
            <>
              <label>
                PayNow proxy type <b>*</b>
                <select name="paynow_proxy_type" defaultValue="mobile" required>
                  <option value="mobile">Mobile number</option>
                  <option value="uen">UEN</option>
                  <option value="nric_fin">
                    NRIC / FIN, only where necessary
                  </option>
                </select>
                <ErrorText messages={state.fieldErrors?.paynowProxyType} />
              </label>

              <label>
                PayNow proxy value <b>*</b>
                <input
                  name="paynow_proxy_value"
                  required
                  autoComplete="off"
                  inputMode="text"
                />
                <ErrorText messages={state.fieldErrors?.paynowProxyValue} />
              </label>
            </>
          ) : (
            <div className={`${styles.infoBox} ${styles.fullWidth}`}>
              International payout arrangements will be confirmed separately by
              Guru Kids Pro. Activating your affiliate account does not itself
              confirm a particular international payment channel or fee.
            </div>
          )}
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>3</span>
          <div>
            <h2>Final agreement</h2>
            <p>
              Confirm the key programme rules before your affiliate account is
              activated.
            </p>
          </div>
        </div>

        <div className={styles.declarations}>
          <label>
            <input type="checkbox" name="terms_accepted" required />
            I accept the current{" "}
            <Link href="/affiliate-terms" target="_blank">
              Affiliate Programme Terms
            </Link>
            .
          </label>

          <label>
            <input type="checkbox" name="privacy_accepted" required />
            I have read the current{" "}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            , including the handling of payout information.
          </label>

          <label>
            <input type="checkbox" name="payout_confirmed" required />
            I confirm that the payout and contact information I supplied is
            accurate and belongs to the approved Affiliate or approved business.
          </label>

          <label>
            <input type="checkbox" name="commission_accepted" required />
            I understand that my approved commission rate is{" "}
            <strong>{partner.commission_rate}%</strong> and applies only according
            to the Affiliate Programme Terms.
          </label>

          <label>
            <input type="checkbox" name="eligibility_accepted" required />
            I understand that commission applies only to eligible public
            Dreamscape subscriptions validly attributed to my assigned affiliate
            referral code.
          </label>

          <label>
            <input type="checkbox" name="period_accepted" required />
            I understand that one eligible referred customer can generate
            commission for no more than 12 consecutive months, and eligibility
            may end earlier under the Programme Terms.
          </label>

          <label>
            <input type="checkbox" name="disclosure_accepted" required />
            I will clearly disclose my affiliate relationship where required when
            promoting Dreamscape.
          </label>

          <label>
            <input type="checkbox" name="conduct_accepted" required />
            I will not use misleading claims, spam, self-referrals, multi-level
            referrals, unauthorised advertising, fake accounts, or tracking
            manipulation.
          </label>

          <label>
            <input type="checkbox" name="reversal_accepted" required />
            I understand that refunds, reversals, chargebacks, fraud, payment
            failures, and other ineligible transactions may reduce, withhold, or
            reverse commission.
          </label>
        </div>
      </section>

      <div className={styles.submitPanel}>
        <div>
          <strong>Activate your affiliate account</strong>
          <p>
            A unique affiliate referral code will be created after successful
            submission. Your affiliate tracking flow will use this separate code,
            not Dreamscape&apos;s ordinary member referral rewards.
          </p>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Activating..." : "Activate Account"}
        </button>
      </div>
    </form>
  );
}
