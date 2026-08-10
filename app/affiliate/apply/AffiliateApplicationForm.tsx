"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  submitAffiliateApplication,
  type ApplicationFormState,
} from "./actions";
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

      {/* Keep the current server action/database contract unchanged. */}
      <input type="hidden" name="programme_requested" value="standard" />

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
            <input
              name="country"
              defaultValue="Singapore"
              required
              autoComplete="country-name"
            />
          </label>
          <label>
            Applicant type <b>*</b>
            <select name="applicant_type" required defaultValue="">
              <option value="" disabled>
                Select one
              </option>
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
          <label>
            Instagram profile
            <input
              name="instagram"
              type="url"
              placeholder="https://instagram.com/..."
            />
          </label>
          <label>
            TikTok profile
            <input
              name="tiktok"
              type="url"
              placeholder="https://tiktok.com/@..."
            />
          </label>
          <label>
            Facebook page
            <input
              name="facebook"
              type="url"
              placeholder="https://facebook.com/..."
            />
          </label>
          <label>
            YouTube channel
            <input
              name="youtube"
              type="url"
              placeholder="https://youtube.com/..."
            />
          </label>
          <label>
            LinkedIn profile
            <input
              name="linkedin"
              type="url"
              placeholder="https://linkedin.com/..."
            />
          </label>
          <label>
            Other relevant link
            <input name="other_social" type="url" placeholder="https://" />
          </label>
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
            <textarea
              name="audience_description"
              required
              rows={4}
              placeholder="Briefly tell us who you reach and why Dreamscape may be relevant to them. A short answer is fine."
            />
            <ErrorText messages={state.fieldErrors?.audienceDescription} />
          </label>
          <label>
            Approximate audience size
            <input
              name="audience_size"
              type="number"
              min="0"
              inputMode="numeric"
            />
          </label>
          <label>
            Main audience countries
            <input name="audience_countries" placeholder="Singapore, Malaysia..." />
          </label>
          <label className={styles.fullWidth}>
            How do you plan to promote Dreamscape? <b>*</b>
            <textarea
              name="promotion_plan"
              required
              rows={4}
              placeholder="Briefly describe how you plan to share or promote Dreamscape. A short answer is fine."
            />
            <ErrorText messages={state.fieldErrors?.promotionPlan} />
          </label>
          <label>
            Expected referrals per month
            <input
              name="expected_referrals"
              type="number"
              min="0"
              inputMode="numeric"
            />
          </label>
        </div>

        <div
          style={{
            marginTop: "26px",
            padding: "22px",
            borderRadius: "22px",
            border: "1px solid rgba(142,232,255,0.24)",
            background:
              "linear-gradient(145deg, rgba(14,61,92,0.56), rgba(5,19,44,0.72))",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#8ee8ff",
                  fontSize: "11px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                Current application tier
              </p>
              <h3 style={{ margin: "8px 0 0", fontSize: "24px" }}>
                Affiliate Regular
              </h3>
            </div>

            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                minHeight: "30px",
                padding: "6px 11px",
                borderRadius: "999px",
                border: "1px solid rgba(126,255,200,0.28)",
                background: "rgba(52,211,153,0.1)",
                color: "#b8fbd9",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Available now
            </span>
          </div>

          <p
            style={{
              margin: "15px 0 0",
              color: "rgba(255,255,255,0.68)",
              fontSize: "14px",
              lineHeight: 1.65,
            }}
          >
            This form applies only for the free Regular Affiliate tier: 10%
            recurring commission on eligible subscriptions, for up to 12
            consecutive months per eligible referred customer. Affiliate Plus and
            Affiliate Pro are coming soon and cannot be selected or applied for yet.
          </p>

          <Link
            href="/affiliate"
            style={{
              marginTop: "14px",
              display: "inline-flex",
              color: "#8ee8ff",
              fontSize: "13px",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            Compare the planned affiliate tiers →
          </Link>
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
          <label>
            <input type="checkbox" name="age_confirmed" required />I confirm
            that I am at least 18 years old.
          </label>
          <label>
            <input type="checkbox" name="information_confirmed" required />I
            confirm that the information submitted is accurate and complete.
          </label>
          <label>
            <input type="checkbox" name="terms_accepted" required />I agree to
            the{" "}
            <Link href="/affiliate-terms" target="_blank">
              Affiliate Programme Terms
            </Link>
            .
          </label>
          <label>
            <input type="checkbox" name="privacy_accepted" required />I agree
            to the{" "}
            <Link href="/privacy" target="_blank">
              Privacy Policy
            </Link>
            .
          </label>
          <label>
            <input type="checkbox" name="conduct_accepted" required />I will not
            use misleading claims, spam, self-referrals, multi-level referrals or
            unauthorised advertising.
          </label>
        </div>
      </section>

      <div className={styles.honeypot} aria-hidden="true">
        <label>
          Company website
          <input name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className={styles.submitPanel}>
        <div>
          <strong>Ready to apply for Affiliate Regular?</strong>
          <p>
            Submitting an application does not guarantee approval. Reviews normally
            take 3–5 business days.
          </p>
        </div>
        <button type="submit" disabled={pending}>
          {pending ? "Submitting..." : "Submit Regular Application"}
        </button>
      </div>
    </form>
  );
}
