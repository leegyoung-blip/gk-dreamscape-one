"use client";

import { useEffect } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import TokenPurchasePanel from "./TokenPurchasePanel";

export default function TokenPurchaseModal({
  open,
  onClose,
  screenMode,
}: {
  open: boolean;
  onClose: () => void;
  screenMode: BankScreenMode;
}) {
  const isMobile = screenMode === "mobile";

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Add Dream Tokens"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 180,
        display: "flex",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "center",
        padding: isMobile ? "10px" : "28px",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          width: isMobile ? "calc(100vw - 20px)" : "min(980px, calc(100vw - 56px))",
          maxHeight: isMobile ? "calc(100dvh - 20px)" : "90dvh",
          overflowY: "auto",
          borderRadius: isMobile ? "22px" : "30px",
          border: "1px solid rgba(126,232,255,0.22)",
          background:
            "linear-gradient(145deg, rgba(4,18,38,0.995), rgba(8,8,25,0.995))",
          boxShadow:
            "0 42px 130px rgba(0,0,0,0.66), inset 0 0 60px rgba(83,215,255,0.04)",
          padding: isMobile ? "54px 12px 12px" : "58px 18px 18px",
          color: "white",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close Dream Token top-up"
          style={{
            position: "absolute",
            top: isMobile ? "12px" : "16px",
            right: isMobile ? "12px" : "16px",
            zIndex: 4,
            width: "40px",
            height: "40px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.07)",
            color: "white",
            fontSize: "22px",
            cursor: "pointer",
          }}
        >
          ×
        </button>

        <TokenPurchasePanel />
      </section>
    </div>
  );
}
