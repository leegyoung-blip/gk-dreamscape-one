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

  async function copy(value: string, type: "code" | "link") {
    await navigator.clipboard.writeText(value);
    setCopied(type);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <div className={styles.copyGrid}>
      <div>
        <span>Referral code</span>
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
  );
}
