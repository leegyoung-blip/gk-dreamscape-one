"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

/*
 * "Get Student Access" call to action, shown to signed-in learners whose
 * student rewards access has been checked and is not active. It previously
 * lived inside the Dream Gem wallet panel; wallet balances no longer open
 * panels, so pages render it in their own layout instead. Copy, link and
 * styling are unchanged.
 */
export default function StudentAccessPrompt({
  style,
}: {
  style?: CSSProperties;
}) {
  return (
    <div
      data-student-access-prompt=""
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(216,180,254,0.26)",
        background: "rgba(192,132,252,0.08)",
        padding: "16px",
        color: "white",
        pointerEvents: "auto",
        ...style,
      }}
    >
      <strong
        style={{
          display: "block",
          color: "white",
          fontSize: "14px",
        }}
      >
        Get Student Access for bigger rewards
      </strong>
      <p
        style={{
          margin: "7px 0 0",
          color: "rgba(255,255,255,0.6)",
          fontSize: "12px",
          lineHeight: 1.5,
        }}
      >
        Your Dream Gem wallet is ready and currently starts at 0. Student
        Access unlocks eligible Core and Think activities that can award Dream
        Gems.
      </p>
      <Link
        href="/pricing"
        style={{
          marginTop: "13px",
          minHeight: "46px",
          borderRadius: "13px",
          background: "linear-gradient(135deg, #c084fc, #7c3aed)",
          color: "white",
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 14px",
          fontSize: "11px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Get Student Access
      </Link>
    </div>
  );
}
