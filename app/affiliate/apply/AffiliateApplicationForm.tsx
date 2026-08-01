"use client";

import { useActionState } from "react";
import Link from "next/link";
import { submitAffiliateApplication, type ApplicationFormState } from "./actions";
import styles from "../affiliate.module.css";

const initialState: ApplicationFormState = {};

function ErrorText({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className={styles.fieldError}>{messages[0]}</p>;
}

export default function AffiliateApplicationForm() {
  const [state, formAction, pending] = useActionState(
    submitAffiliateApplication,
    initialState,
  );

  return (
    <form action={formAction} className={styles.form} noValidate>
      {state.error ? <div className={styles.formError}>{state.error}</div> : null}

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>1</span>
          <div>
            <h2>Applicant information</h2>
            <p>Tell us who will be responsible for the affiliate account.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label>
            Full legal name <b>*</b>
            <input name="legal_name" required autoComplete="name" />
            <ErrorText messages={state.fieldErrors?.legalName} />
          </label>
          <label>
            Preferred or display name
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
            <input name="country" defaultValue="Singapore" required autoComplete="country-name" />
          </label>
          <label>
            Applicant type <b>*</b>
            <select name="applicant_type" required defaultValue="">
              <option value="" disabled>Select one</option>
              <option value="individual">Individual</option>
              <option value="sole_proprietor">Sole proprietor</option>
              <option value="registered_business">Registered business</option>
              <option value="content_creator">Content creator</option>
            </select>
          </label>
          <label>
            Business name
            <input name="business_name" autoComplete="organization" />
          </label>
          <label>
            UEN or registration number
            <input name="registration_number" />
          </label>
          <label className={styles.fullWidth}>
            Website
            <input name="website" type="url" placeholder="https://" />
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>2</span>
          <div>
            <h2>Promotion channels</h2>
            <p>Share the platforms and communities you expect to use.</p>
          </div>
        </div>

        <fieldset className={styles.checkboxGrid}>
          <legend>Select all that apply</legend>
          {[
            "Instagram",
            "TikTok",
            "Facebook",
            "YouTube",
            "Website or blog",
            "Email newsletter",
            "Tuition centre",
            "Childcare or enrichment centre",
            "Private tutoring",
            "Parent community",
            "Other",
          ].map((channel) => (
            <label key={channel} className={styles.choiceCard}>
              <input type="checkbox" name="promotion_channels" value={channel} />
              <span>{channel}</span>
            </label>
          ))}
        </fieldset>
        <ErrorText messages={state.fieldErrors?.promotionChannels} />

        <div className={styles.formGrid}>
          <label>Instagram profile<input name="instagram" type="url" placeholder="https://instagram.com/..." /></label>
          <label>TikTok profile<input name="tiktok" type="url" placeholder="https://tiktok.com/@..." /></label>
          <label>Facebook page<input name="facebook" type="url" placeholder="https://facebook.com/..." /></label>
          <label>YouTube channel<input name="youtube" type="url" placeholder="https://youtube.com/..." /></label>
          <label>LinkedIn profile<input name="linkedin" type="url" placeholder="https://linkedin.com/..." /></label>
          <label>Other relevant link<input name="other_social" type="url" placeholder="https://" /></label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>3</span>
          <div>
            <h2>Audience and promotion plan</h2>
            <p>Audience relevance and promotion quality matter more than follower count.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.fullWidth}>
            Describe your main audience <b>*</b>
            <textarea name="audience_description" required rows={5} placeholder="Who do you reach, and why would Dreamscape be relevant to them?" />
            <ErrorText messages={state.fieldErrors?.audienceDescription} />
          </label>
          <label>
            Approximate audience size
            <input name="audience_size" type="number" min="0" inputMode="numeric" />
          </label>
          <label>
            Main audience countries
            <input name="audience_countries" placeholder="Singapore, Malaysia..." />
          </label>
          <label className={styles.fullWidth}>
            How do you plan to promote Dreamscape? <b>*</b>
            <textarea name="promotion_plan" required rows={6} placeholder="Describe the content, outreach or referral approach you plan to use." />
            <ErrorText messages={state.fieldErrors?.promotionPlan} />
          </label>
          <label>
            Expected referrals per month
            <input name="expected_referrals" type="number" min="0" inputMode="numeric" />
          </label>
          <label>
            Programme interest <b>*</b>
            <select name="programme_requested" defaultValue="standard" required>
              <option value="standard">Standard Affiliate Programme</option>
              <option value="kol">KOL Creator Partnership</option>
              <option value="unsure">Not sure yet</option>
            </select>
          </label>
        </div>
      </section>

      <section className={styles.formSection}>
        <div className={styles.sectionTitle}>
          <span>4</span>
          <div>
            <h2>Declarations</h2>
            <p>These confirmations are required before submission.</p>
          </div>
        </div>

        <div className={styles.declarations}>
          <label><input type="checkbox" name="age_confirmed" required />I confirm that I am at least 18 years old.</label>
          <label><input type="checkbox" name="information_confirmed" required />I confirm that the information submitted is accurate and complete.</label>
          <label>
            <input type="checkbox" name="terms_accepted" required />
            I agree to the <Link href="/affiliate-terms" target="_blank">Affiliate Programme Terms</Link>.
          </label>
          <label>
            <input type="checkbox" name="privacy_accepted" required />
            I agree to the <Link href="/privacy" target="_blank">Privacy Policy</Link>.
          </label>
          <label><input type="checkbox" name="conduct_accepted" required />I will not use misleading claims, spam, self-referrals, multi-level referrals or unauthorised advertising.</label>
        </div>
      </section>

      <div className={styles.honeypot} aria-hidden="true">
        <label>Company website<input name="company_website" tabIndex={-1} autoComplete="off" /></label>
      </div>

      <div className={styles.submitPanel}>
        <div>
          <strong>Ready to apply?</strong>
          <p>Submitting an application does not guarantee approval. Reviews normally take 3–5 business days.</p>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit Application"}
        </button>
      </div>
    </form>
  );
}
