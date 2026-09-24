"use client";

import { useState } from "react";
import type { BondHolding } from "../lib/bond-types";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function BondSettlementModal({
  holding,
  open,
  loading,
  onClose,
  onSettle,
}: {
  holding: BondHolding | null;
  open: boolean;
  loading: boolean;
  onClose: () => void;
  onSettle: (id: string) => Promise<BondHolding>;
}) {
  const [error, setError] = useState<string | null>(null);

  if (!open || !holding) return null;

  async function settle() {
    if (loading) return;
    setError(null);
    try {
      await onSettle(holding.id);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not collect this Bond.");
    }
  }

  return (
    <div
      role="presentation"
      onClick={() => !loading && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 192,
        padding: "18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.74)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Collect Bond return"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: "min(500px, 100%)",
          borderRadius: "28px",
          border: "1px solid rgba(255,209,138,0.30)",
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,209,138,0.14), transparent 36%), linear-gradient(145deg, rgba(32,24,27,0.997), rgba(7,9,24,0.997))",
          boxShadow: "0 38px 120px rgba(0,0,0,0.68)",
          padding: "28px",
          color: "white",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "66px",
            height: "66px",
            margin: "0 auto",
            borderRadius: "21px",
            border: "1px solid rgba(255,209,138,0.32)",
            background: "rgba(255,209,138,0.08)",
            color: "#ffd18a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "27px",
          }}
        >
          ◆
        </div>
        <p
          style={{
            margin: "18px 0 0",
            color: "#ffd18a",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          Bond Matured
        </p>
        <h2
          style={{
            margin: "8px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "38px",
            lineHeight: 1,
            fontWeight: 500,
            letterSpacing: "-0.045em",
          }}
        >
          Collect your return.
        </h2>
        <p
          style={{
            margin: "13px auto 0",
            maxWidth: "390px",
            color: "rgba(255,255,255,0.55)",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          Your principal will become available again and the earned interest will be added to your Dream Token balance.
        </p>

        <div
          style={{
            marginTop: "20px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "9px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              borderRadius: "15px",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              padding: "14px",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.36)", fontSize: "9px", fontWeight: 850, textTransform: "uppercase" }}>
              Principal unlocked
            </span>
            <strong style={{ display: "block", marginTop: "6px", fontSize: "18px" }}>
              {formatDt(holding.principal)}
            </strong>
          </div>
          <div
            style={{
              borderRadius: "15px",
              border: "1px solid rgba(93,255,181,0.14)",
              background: "rgba(93,255,181,0.045)",
              padding: "14px",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.36)", fontSize: "9px", fontWeight: 850, textTransform: "uppercase" }}>
              Interest earned
            </span>
            <strong style={{ display: "block", marginTop: "6px", color: "#9fffd2", fontSize: "18px" }}>
              +{formatDt(holding.interestAmount)}
            </strong>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "14px",
              borderRadius: "13px",
              border: "1px solid rgba(255,160,130,0.22)",
              background: "rgba(255,120,90,0.07)",
              padding: "11px 12px",
              color: "#ffc0a0",
              fontSize: "11px",
              lineHeight: 1.45,
              textAlign: "left",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              minHeight: "48px",
              borderRadius: "13px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              color: "rgba(255,255,255,0.68)",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Not Yet
          </button>
          <button
            type="button"
            onClick={settle}
            disabled={loading}
            style={{
              minHeight: "48px",
              borderRadius: "13px",
              border: "1px solid rgba(255,209,138,0.40)",
              background: "linear-gradient(135deg, rgba(255,190,90,0.22), rgba(190,117,44,0.18))",
              color: "white",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              fontSize: "10px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {loading ? "Collecting…" : "Collect Return"}
          </button>
        </div>
      </section>
    </div>
  );
}
