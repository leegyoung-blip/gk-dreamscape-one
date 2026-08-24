"use client";

import { useState } from "react";
import styles from "../affiliate.module.css";

export default function CopyAffiliateDetails({
  referralCode,
  referralLink,
}: {
  referralCode: string;
  referralLink: string;
}) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [copyError, setCopyError] = useState(false);

  async function copy(value: string, type: "code" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopyError(false);
      setCopied(type);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      setCopied(null);
      setCopyError(true);
      window.setTimeout(() => setCopyError(false), 2500);
    }
  }

  return (
    <>
      <div className={styles.copyGrid}>
        <div>
          <span>Affiliate referral code</span>
          <strong>{referralCode}</strong>
          <button type="button" onClick={() => copy(referralCode, "code")}>
            {copied === "code" ? "Copied" : "Copy code"}
          </button>
        </div>

        <div>
          <span>Affiliate link</span>
          <strong className={styles.breakText}>{referralLink}</strong>
          <button type="button" onClick={() => copy(referralLink, "link")}>
            {copied === "link" ? "Copied" : "Copy link"}
          </button>
        </div>
      </div>

      {copyError ? (
        <p className={styles.fieldError}>
          Your browser blocked clipboard access. Select the code or link and copy
          it manually.
        </p>
      ) : null}
    </>
  );
}
