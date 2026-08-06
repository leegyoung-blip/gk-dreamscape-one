"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const DAILY_REFERRAL_PROMPT_PREFIX = "dreamscape-daily-referral-prompt";

function getSingaporeDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getPromptStorageKey() {
  return `${DAILY_REFERRAL_PROMPT_PREFIX}:${getSingaporeDateKey()}`;
}

export function canOfferDailyReferralPrompt() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(getPromptStorageKey()) !== "shown";
}

function markPromptShown() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(getPromptStorageKey(), "shown");
}

type DailyActivityReferralPromptProps = {
  open: boolean;
  onClose: () => void;
};

export default function DailyActivityReferralPrompt({
  open,
  onClose,
}: DailyActivityReferralPromptProps) {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareAvailable, setShareAvailable] = useState(false);

  useEffect(() => {
    setShareAvailable(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadReferralCode() {
      if (!open) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) {
        onClose();
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data?.referral_code) {
        onClose();
        return;
      }

      setReferralCode(String(data.referral_code));
      markPromptShown();
    }

    void loadReferralCode();

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open || !referralCode) return null;

  const referralLink =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}/signup?ref=${encodeURIComponent(
          referralCode,
        )}`;

  async function copyReferralLink() {
    if (!referralLink) return;

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(referralLink);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = referralLink;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function shareReferralLink() {
    if (!referralLink) return;

    if (typeof navigator.share !== "function") {
      await copyReferralLink();
      return;
    }

    try {
      await navigator.share({
        title: "Join me on Dreamscape One",
        text:
          "Join me on Dreamscape One, earn Dream Tokens and compete with me in multiplayer quizzes.",
        url: referralLink,
      });
      onClose();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        await copyReferralLink();
      }
    }
  }

  return (
    <aside
      aria-label="Invite a friend to Dreamscape One"
      style={{
        position: "fixed",
        zIndex: 120,
        right: "clamp(12px, 2vw, 24px)",
        bottom: "clamp(12px, 2vw, 24px)",
        width: "min(430px, calc(100vw - 24px))",
        padding: "20px",
        borderRadius: "22px",
        border: "1px solid rgba(142,232,255,0.34)",
        background:
          "radial-gradient(circle at 100% 0%, rgba(197,140,255,0.17), transparent 38%), linear-gradient(145deg, rgba(6,27,50,0.98), rgba(3,10,25,0.99))",
        boxShadow:
          "0 28px 85px rgba(0,0,0,0.56), 0 0 30px rgba(83,215,255,0.1)",
        color: "white",
      }}
    >
      <button
        type="button"
        aria-label="Dismiss friend invitation"
        onClick={onClose}
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          width: "34px",
          height: "34px",
          borderRadius: "999px",
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.76)",
          fontSize: "20px",
          cursor: "pointer",
        }}
      >
        ×
      </button>

      <p
        style={{
          margin: 0,
          color: "#8ee8ff",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
        }}
      >
        Optional Friend Challenge
      </p>

      <h3
        style={{
          margin: "8px 38px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "27px",
          fontWeight: 400,
          lineHeight: 1.1,
        }}
      >
        Compete with friends
      </h3>

      <p
        style={{
          margin: "12px 0 0",
          color: "rgba(255,255,255,0.68)",
          fontSize: "14px",
          lineHeight: 1.58,
        }}
      >
        Share your existing Dreamscape invite link, then challenge your friends
        in multiplayer quizzes. When a friend successfully joins using your
        code, they receive 10 DT and you receive 20 DT. The referral also counts
        towards your profile objectives.
      </p>

      <div
        style={{
          marginTop: "16px",
          display: "flex",
          flexWrap: "wrap",
          gap: "9px",
        }}
      >
        <button
          type="button"
          onClick={() => void shareReferralLink()}
          style={{
            minHeight: "43px",
            padding: "10px 16px",
            border: "none",
            borderRadius: "999px",
            background: "linear-gradient(90deg, #53d7ff, #c58cff)",
            color: "#130723",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {shareAvailable ? "Share Invite" : copied ? "Link Copied" : "Copy Link"}
        </button>

        {shareAvailable && (
          <button
            type="button"
            onClick={() => void copyReferralLink()}
            style={{
              minHeight: "43px",
              padding: "10px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(142,232,255,0.22)",
              background: "rgba(255,255,255,0.045)",
              color: "white",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {copied ? "Link Copied" : "Copy Link"}
          </button>
        )}

        <button
          type="button"
          onClick={onClose}
          style={{
            minHeight: "43px",
            padding: "10px 13px",
            border: "none",
            borderRadius: "999px",
            background: "transparent",
            color: "rgba(255,255,255,0.5)",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Not Now
        </button>
      </div>
    </aside>
  );
}
