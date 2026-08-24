"use client";

import { useActionState } from "react";
import {
  inviteAffiliatePartner,
  type InviteAffiliateFormState,
} from "./actions";
import styles from "@/app/affiliate/affiliate.module.css";

const initialState: InviteAffiliateFormState = {};

function ErrorText({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className={styles.fieldError}>{messages[0]}</p>;
}

export default function InviteAffiliateForm() {
  const [state, formAction, pending] = useActionState(
    inviteAffiliatePartner,
    initialState,
  );

  return (
    <form action={formAction} className={styles.adminForm} noValidate>
      {state.error ? <div className={styles.formError}>{state.error}</div> : null}

      <section className={styles.adminCard}>
        <h2>Partner details</h2>

        <div className={styles.formGrid}>
          <label>
            Legal / contact name <b>*</b>
            <input name="legal_name" required autoComplete="name" />
            <ErrorText messages={state.fieldErrors?.legalName} />
          </label>

          <label>
            Display name
            <input name="display_name" autoComplete="nickname" />
          </label>

          <label>
            Email address <b>*</b>
            <input name="email" type="email" required autoComplete="email" />
            <ErrorText messages={state.fieldErrors?.email} />
          </label>

          <label>
            Mobile number <b>*</b>
            <input name="phone" required autoComplete="tel" />
            <ErrorText messages={state.fieldErrors?.phone} />
          </label>

          <label>
            Country <b>*</b>
            <input
              name="country"
              defaultValue="Singapore"
              required
              autoComplete="country-name"
            />
            <ErrorText messages={state.fieldErrors?.country} />
          </label>

          <label>
            Business / organisation name
            <input name="business_name" autoComplete="organization" />
          </label>

          <label>
            UEN / registration number
            <input name="registration_number" />
          </label>

          <label>
            Partner type <b>*</b>
            <select name="partner_type" defaultValue="standard" required>
              <option value="standard">Standard Affiliate</option>
              <option value="educator">Educator</option>
              <option value="business">Child-focused business</option>
              <option value="kol">KOL / creator</option>
            </select>
            <ErrorText messages={state.fieldErrors?.partnerType} />
          </label>

          <label>
            Approved commission rate <b>*</b>
            <div className={styles.inputSuffix}>
              <input
                name="commission_rate"
                type="number"
                min="1"
                max="20"
                step="0.01"
                defaultValue={10}
                required
              />
              <span>%</span>
            </div>
            <ErrorText messages={state.fieldErrors?.commissionRate} />
          </label>

          <label className={styles.fullWidth}>
            Internal notes
            <textarea
              name="admin_notes"
              rows={4}
              placeholder="Optional: why this partner was invited, agreed commercial terms, campaign context, etc."
            />
          </label>
        </div>
      </section>

      <section className={styles.adminCard}>
        <h2>What the affiliate will receive</h2>
        <p>
          They will receive a secure 7-day onboarding email. No application form
          is required. During onboarding they must authenticate using this email,
          confirm payout information, and accept the current programme terms.
        </p>

        <div className={styles.infoBox}>
          Standard Affiliate defaults to 10%. Only enter a different approved
          rate if Dreamscape has expressly agreed it with this partner. The
          current admin maximum is 20%.
        </div>

        <button
          type="submit"
          className={styles.approveButton}
          disabled={pending}
          style={{ marginTop: "20px" }}
        >
          {pending
            ? "Creating invitation..."
            : "Create Affiliate & Send Onboarding"}
        </button>
      </section>
    </form>
  );
}
