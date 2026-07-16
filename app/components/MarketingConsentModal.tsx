"use client";

import { useEffect, useState } from "react";

// Change this import only if your Supabase client is stored elsewhere.
import { createClient } from "@/lib/supabase/client";

type ConsentActor = "self_13_plus" | "parent_guardian";

const CONSENT_VERSION = "marketing-email-v1-2026-07";

export default function MarketingConsentModal() {
  const supabase = createClient();

  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedActor, setSelectedActor] =
    useState<ConsentActor | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function checkMarketingConsent() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          if (isMounted) {
            setIsChecking(false);
            setIsOpen(false);
          }
          return;
        }

        const { data, error } = await supabase
          .from("marketing_consents")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Unable to check marketing consent:", error);
          return;
        }

        if (isMounted) {
          // No row means this is a new user who has not answered.
          setIsOpen(!data);
        }
      } catch (error) {
        console.error("Marketing consent check failed:", error);
      } finally {
        if (isMounted) {
          setIsChecking(false);
        }
      }
    }

    checkMarketingConsent();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  async function saveDecision(
    consentGiven: boolean,
    decisionMadeBy:
      | "self_13_plus"
      | "parent_guardian"
      | "declined"
  ) {
    setErrorMessage("");

    if (consentGiven && decisionMadeBy === "declined") {
      return;
    }

    if (consentGiven && !selectedActor) {
      setErrorMessage(
        "Please confirm who is providing consent before choosing Yes."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setErrorMessage(
          "Your session could not be found. Please refresh the page and try again."
        );
        return;
      }

      const finalActor = consentGiven
        ? selectedActor
        : "declined";

      const { error } = await supabase
        .from("marketing_consents")
        .insert({
          user_id: user.id,
          email_at_consent: user.email ?? "",
          consent_given: consentGiven,
          decision_made_by: finalActor,
          consent_version: CONSENT_VERSION,
        });

      if (error) {
        // A duplicate row means the decision was already saved elsewhere.
        if (error.code === "23505") {
          setIsOpen(false);
          return;
        }

        console.error("Unable to save marketing consent:", error);
        setErrorMessage(
          "We could not save your choice. Please try again."
        );
        return;
      }

      setIsOpen(false);
    } catch (error) {
      console.error("Marketing consent submission failed:", error);
      setErrorMessage(
        "Something went wrong while saving your choice. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isChecking || !isOpen) {
    return null;
  }

  return (
    <div className="marketing-consent-overlay" role="presentation">
      <section
        className="marketing-consent-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="marketing-consent-title"
        aria-describedby="marketing-consent-description"
      >
        <div className="marketing-consent-icon" aria-hidden="true">
          ✉
        </div>

        <h2 id="marketing-consent-title">
          Receive Dreamscape updates?
        </h2>

        <p id="marketing-consent-description">
          We would like to send occasional emails about new
          Dreamscape One features, learning activities, products
          and special offers.
        </p>

        <p className="marketing-consent-optional">
          This is optional. Your choice will not affect your
          account or access to Dreamscape One.
        </p>

        <div className="marketing-consent-options">
          <label
            className={
              selectedActor === "self_13_plus"
                ? "consent-option selected"
                : "consent-option"
            }
          >
            <input
              type="radio"
              name="consent-actor"
              value="self_13_plus"
              checked={selectedActor === "self_13_plus"}
              onChange={() => setSelectedActor("self_13_plus")}
            />

            <span>
              I am aged 13 or older and I am making this choice
              for myself.
            </span>
          </label>

          <label
            className={
              selectedActor === "parent_guardian"
                ? "consent-option selected"
                : "consent-option"
            }
          >
            <input
              type="radio"
              name="consent-actor"
              value="parent_guardian"
              checked={selectedActor === "parent_guardian"}
              onChange={() => setSelectedActor("parent_guardian")}
            />

            <span>
              I am the parent or guardian making this choice for
              the account holder.
            </span>
          </label>
        </div>

        <p className="marketing-consent-child-note">
          Users below 13 should ask a parent or guardian to make
          this choice.
        </p>

        {errorMessage && (
          <p className="marketing-consent-error" role="alert">
            {errorMessage}
          </p>
        )}

        <div className="marketing-consent-buttons">
          <button
            type="button"
            className="consent-button consent-button-secondary"
            disabled={isSubmitting}
            onClick={() => saveDecision(false, "declined")}
          >
            No thanks
          </button>

          <button
            type="button"
            className="consent-button consent-button-primary"
            disabled={isSubmitting || !selectedActor}
            onClick={() =>
              saveDecision(
                true,
                selectedActor ?? "self_13_plus"
              )
            }
          >
            {isSubmitting ? "Saving..." : "Yes, send me updates"}
          </button>
        </div>
      </section>

      <style jsx>{`
        .marketing-consent-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(5, 7, 18, 0.82);
          backdrop-filter: blur(10px);
        }

        .marketing-consent-modal {
          width: min(100%, 520px);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 24px;
          background:
            radial-gradient(
              circle at top,
              rgba(124, 92, 255, 0.2),
              transparent 42%
            ),
            #111426;
          color: #ffffff;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        }

        .marketing-consent-icon {
          display: grid;
          width: 52px;
          height: 52px;
          margin-bottom: 18px;
          place-items: center;
          border-radius: 16px;
          background: rgba(136, 107, 255, 0.18);
          font-size: 26px;
        }

        h2 {
          margin: 0 0 12px;
          font-size: clamp(24px, 5vw, 32px);
          line-height: 1.1;
        }

        p {
          margin: 0;
          color: rgba(255, 255, 255, 0.78);
          font-size: 15px;
          line-height: 1.6;
        }

        .marketing-consent-optional {
          margin-top: 10px;
          color: rgba(255, 255, 255, 0.6);
          font-size: 13px;
        }

        .marketing-consent-options {
          display: grid;
          gap: 10px;
          margin-top: 22px;
        }

        .consent-option {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.04);
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease;
        }

        .consent-option.selected {
          border-color: rgba(151, 126, 255, 0.85);
          background: rgba(126, 94, 255, 0.14);
        }

        .consent-option input {
          width: 18px;
          height: 18px;
          margin-top: 2px;
          accent-color: #967aff;
        }

        .consent-option span {
          color: rgba(255, 255, 255, 0.88);
          font-size: 14px;
          line-height: 1.45;
        }

        .marketing-consent-child-note {
          margin-top: 14px;
          font-size: 12px;
        }

        .marketing-consent-error {
          margin-top: 14px;
          color: #ffaaaa;
          font-size: 13px;
        }

        .marketing-consent-buttons {
          display: grid;
          grid-template-columns: 1fr 1.4fr;
          gap: 10px;
          margin-top: 24px;
        }

        .consent-button {
          min-height: 48px;
          padding: 12px 15px;
          border: 0;
          border-radius: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .consent-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .consent-button-secondary {
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.07);
          color: #ffffff;
        }

        .consent-button-primary {
          background: #ffffff;
          color: #151225;
        }

        @media (max-width: 520px) {
          .marketing-consent-overlay {
            align-items: flex-end;
            padding: 12px;
          }

          .marketing-consent-modal {
            padding: 22px 18px;
            border-radius: 22px;
          }

          .marketing-consent-buttons {
            grid-template-columns: 1fr;
          }

          .consent-button-primary {
            grid-row: 1;
          }
        }
      `}</style>
    </div>
  );
}