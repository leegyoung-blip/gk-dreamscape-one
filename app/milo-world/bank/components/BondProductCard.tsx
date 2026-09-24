"use client";

import type { BankScreenMode } from "../lib/bank-types";
import type { BondProduct } from "../lib/bond-types";
import { bondReturnPercent } from "../lib/bond-api";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function BondProductCard({
  product,
  eligibleDt,
  screenMode,
  onSelect,
}: {
  product: BondProduct;
  eligibleDt: number;
  screenMode: BankScreenMode;
  onSelect: (product: BondProduct) => void;
}) {
  const isMobile = screenMode === "mobile";
  const canAffordMinimum = eligibleDt >= product.minInvestment;
  const returnPercent = bondReturnPercent(product.returnRateBps);

  return (
    <article
      style={{
        position: "relative",
        minHeight: isMobile ? "300px" : "330px",
        overflow: "hidden",
        borderRadius: "24px",
        border: product.badge
          ? "1px solid rgba(255,209,138,0.34)"
          : "1px solid rgba(126,232,255,0.16)",
        background: product.badge
          ? "radial-gradient(circle at 82% 8%, rgba(255,209,138,0.12), transparent 34%), linear-gradient(145deg, rgba(30,27,38,0.94), rgba(7,13,28,0.96))"
          : "radial-gradient(circle at 84% 8%, rgba(83,215,255,0.09), transparent 34%), linear-gradient(145deg, rgba(7,27,48,0.94), rgba(5,11,27,0.96))",
        boxShadow: "0 20px 54px rgba(0,0,0,0.20)",
        padding: isMobile ? "20px" : "22px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: "150px",
          height: "150px",
          borderRadius: "999px",
          right: "-58px",
          top: "-58px",
          border: product.badge
            ? "1px solid rgba(255,209,138,0.18)"
            : "1px solid rgba(126,232,255,0.11)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <span
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "15px",
            border: "1px solid rgba(126,232,255,0.18)",
            background: "rgba(83,215,255,0.07)",
            color: product.badge ? "#ffd18a" : "#8ee8ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          ◆
        </span>

        {product.badge && (
          <span
            style={{
              minHeight: "28px",
              padding: "0 10px",
              borderRadius: "999px",
              border: "1px solid rgba(255,209,138,0.28)",
              background: "rgba(255,190,90,0.08)",
              color: "#ffd18a",
              display: "inline-flex",
              alignItems: "center",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {product.badge}
          </span>
        )}
      </div>

      <p
        style={{
          margin: "24px 0 0",
          color: "#8ee8ff",
          fontSize: "9px",
          fontWeight: 900,
          letterSpacing: "0.15em",
          textTransform: "uppercase",
        }}
      >
        {product.termDays}-Day Bank Bond
      </p>

      <h3
        style={{
          margin: "8px 0 0",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: isMobile ? "30px" : "34px",
          lineHeight: 1,
          fontWeight: 500,
          letterSpacing: "-0.035em",
        }}
      >
        {product.name}
      </h3>

      <p
        style={{
          margin: "11px 0 0",
          minHeight: isMobile ? "auto" : "42px",
          color: "rgba(255,255,255,0.50)",
          fontSize: "12px",
          lineHeight: 1.55,
        }}
      >
        {product.description}
      </p>

      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0,1fr))",
          gap: "8px",
        }}
      >
        {[
          ["Term", `${product.termDays} days`],
          ["Return", `${returnPercent}%`],
          ["From", formatDt(product.minInvestment)],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              minHeight: "64px",
              borderRadius: "14px",
              border: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(255,255,255,0.03)",
              padding: "10px",
            }}
          >
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.36)",
                fontSize: "8px",
                fontWeight: 850,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "6px",
                color: label === "Return" ? "#9fffd2" : "white",
                fontSize: "13px",
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => canAffordMinimum && onSelect(product)}
        disabled={!canAffordMinimum}
        style={{
          marginTop: "auto",
          minHeight: "48px",
          borderRadius: "14px",
          border: canAffordMinimum
            ? "1px solid rgba(126,232,255,0.36)"
            : "1px solid rgba(255,255,255,0.08)",
          background: canAffordMinimum
            ? "linear-gradient(135deg, rgba(83,215,255,0.18), rgba(93,79,211,0.15))"
            : "rgba(255,255,255,0.03)",
          color: canAffordMinimum ? "white" : "rgba(255,255,255,0.30)",
          cursor: canAffordMinimum ? "pointer" : "not-allowed",
          fontFamily: "inherit",
          fontSize: "10px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {canAffordMinimum ? "Choose Bond →" : `Need ${formatDt(product.minInvestment)}`}
      </button>
    </article>
  );
}
