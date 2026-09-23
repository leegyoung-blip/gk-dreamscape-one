"use client";

import { useEffect } from "react";

export default function TokenPurchaseGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="bank-token-purchase-title"
      aria-describedby="bank-token-purchase-description"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 220,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(9px)",
        WebkitBackdropFilter: "blur(9px)",
      }}
    >
      <section
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: "28px",
          border: "1px solid rgba(126,232,255,0.28)",
          background:
            "linear-gradient(145deg, rgba(6,24,48,0.99), rgba(10,8,29,0.99))",
          boxShadow:
            "0 36px 120px rgba(0,0,0,0.68), inset 0 0 60px rgba(83,215,255,0.05)",
          color: "white",
          padding: "34px 28px 28px",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: "64px",
            height: "64px",
            margin: "0 auto",
            borderRadius: "20px",
            border: "1px solid rgba(126,232,255,0.34)",
            background: "rgba(83,215,255,0.11)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
          }}
        >
          ◈
        </div>

        <p
          style={{
            margin: "20px 0 0",
            color: "#8ee8ff",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Milo’s Bank
        </p>

        <h3
          id="bank-token-purchase-title"
          style={{
            margin: "10px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(34px, 8vw, 46px)",
            lineHeight: 1,
            fontWeight: 400,
            letterSpacing: "-0.04em",
          }}
        >
          Dream Token purchases are not available yet.
        </h3>

        <p
          id="bank-token-purchase-description"
          style={{
            margin: "16px auto 0",
            maxWidth: "420px",
            color: "rgba(255,255,255,0.66)",
            fontSize: "14px",
            lineHeight: 1.65,
          }}
        >
          The existing Shopify token products have been preserved, but checkout
          remains disabled until the payment and account-crediting flow is ready.
          No payment has been taken.
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            marginTop: "24px",
            width: "100%",
            height: "50px",
            borderRadius: "14px",
            border: "1px solid rgba(126,232,255,0.42)",
            background:
              "linear-gradient(135deg, rgba(83,215,255,0.24), rgba(120,99,255,0.24))",
            color: "white",
            fontWeight: 900,
            fontSize: "12px",
            letterSpacing: "0.09em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Back to Milo’s Bank
        </button>
      </section>
    </div>
  );
}
