"use client";

import { useState } from "react";
import { FINANCIAL_ADVISORS } from "../lib/financial-advisors";
import type { FinancialAdvisorId } from "../lib/financial-learning-engine-types";

export default function FinancialAdvisorAvatar({
  advisorId,
  size = 56,
}: {
  advisorId: FinancialAdvisorId;
  size?: number;
}) {
  const advisor = FINANCIAL_ADVISORS[advisorId];
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      aria-label={`${advisor.name} avatar`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: "999px",
        border: `1px solid ${advisor.accent}55`,
        background: `radial-gradient(circle at 35% 25%, ${advisor.glow}, rgba(5,14,31,0.96))`,
        boxShadow: `0 0 26px ${advisor.glow}`,
        overflow: "hidden",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: advisor.accent,
        fontSize: `${Math.round(size * 0.34)}px`,
        fontWeight: 900,
      }}
    >
      {!imageFailed ? (
        <img
          src={advisor.imageSrc}
          alt=""
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
        />
      ) : (
        advisor.fallbackInitial
      )}
    </div>
  );
}
