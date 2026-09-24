"use client";

import { useEffect, useMemo, useState } from "react";
import type { BankScreenMode } from "../lib/bank-types";
import type { BondHolding, BondProduct } from "../lib/bond-types";
import { useBankBonds } from "../hooks/useBankBonds";
import BondHistory from "./BondHistory";
import BondHoldingCard from "./BondHoldingCard";
import BondProductCard from "./BondProductCard";
import BondPurchaseModal from "./BondPurchaseModal";
import BondSettlementCelebration from "./BondSettlementCelebration";
import BondSettlementModal from "./BondSettlementModal";

function formatDt(value: number) {
  return `${Math.round(value).toLocaleString("en-SG")} DT`;
}

export default function BondsPanel({
  screenMode,
  isLoggedIn,
}: {
  screenMode: BankScreenMode;
  isLoggedIn: boolean;
}) {
  const isMobile = screenMode === "mobile";
  const bonds = useBankBonds();
  const [purchaseProduct, setPurchaseProduct] = useState<BondProduct | null>(null);
  const [collectHolding, setCollectHolding] = useState<BondHolding | null>(null);
  const [celebrationHolding, setCelebrationHolding] = useState<BondHolding | null>(null);

  const currentHoldings = useMemo(
    () =>
      bonds.holdings
        .filter((holding) => holding.status === "active" || holding.status === "matured")
        .sort((a, b) => {
          if (a.status === b.status) return new Date(a.maturesAt).getTime() - new Date(b.maturesAt).getTime();
          return a.status === "matured" ? -1 : 1;
        }),
    [bonds.holdings],
  );

  useEffect(() => {
    if (!isLoggedIn || currentHoldings.length === 0) return;

    const active = currentHoldings.filter((holding) => holding.status === "active");
    if (active.length === 0) return;

    const nextMaturity = Math.min(...active.map((holding) => new Date(holding.maturesAt).getTime()));
    const delay = Math.max(1000, Math.min(60000, nextMaturity - Date.now() + 750));
    const timeout = window.setTimeout(() => bonds.refresh(), delay);
    return () => window.clearTimeout(timeout);
  }, [bonds.refresh, currentHoldings, isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <section
        style={{
          marginTop: "18px",
          minHeight: "360px",
          borderRadius: isMobile ? "24px" : "28px",
          border: "1px solid rgba(126,232,255,0.14)",
          background: "linear-gradient(145deg, rgba(7,25,47,0.82), rgba(6,9,26,0.9))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "28px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "520px" }}>
          <div
            style={{
              width: "66px",
              height: "66px",
              margin: "0 auto",
              borderRadius: "21px",
              border: "1px solid rgba(126,232,255,0.24)",
              background: "rgba(83,215,255,0.08)",
              color: "#8ee8ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "27px",
            }}
          >
            ◆
          </div>
          <h2
            style={{
              margin: "18px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "42px",
              lineHeight: 1,
              fontWeight: 500,
            }}
          >
            Put earned DT to work.
          </h2>
          <p style={{ margin: "14px auto 0", color: "rgba(255,255,255,0.54)", fontSize: "13px", lineHeight: 1.6 }}>
            Log in to buy Dreamscape Bank Bonds and learn how fixed returns and maturity work.
          </p>
          <a
            href="/login"
            style={{
              marginTop: "20px",
              minHeight: "48px",
              padding: "0 20px",
              borderRadius: "13px",
              border: "1px solid rgba(126,232,255,0.38)",
              background: "rgba(83,215,255,0.12)",
              color: "white",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "11px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            Log In
          </a>
        </div>
      </section>
    );
  }

  async function settleBond(id: string) {
    const settled = await bonds.settleBond(id);
    setCelebrationHolding(settled);
    return settled;
  }

  return (
    <section style={{ marginTop: "18px" }}>
      <div
        style={{
          borderRadius: isMobile ? "24px" : "28px",
          border: "1px solid rgba(126,232,255,0.16)",
          background:
            "radial-gradient(circle at 84% 0%, rgba(255,209,138,0.08), transparent 32%), radial-gradient(circle at 12% 10%, rgba(83,215,255,0.08), transparent 30%), linear-gradient(145deg, rgba(7,28,50,0.88), rgba(5,11,28,0.94))",
          padding: isMobile ? "20px" : "26px 28px",
          boxShadow: "0 24px 70px rgba(0,0,0,0.20)",
        }}
      >
        <div>
          <p style={{ margin: 0, color: "#8ee8ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            Bank Bonds
          </p>
          <h2
            style={{
              margin: "8px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "36px" : "44px",
              lineHeight: 1,
              fontWeight: 500,
              letterSpacing: "-0.035em",
            }}
          >
            Lock it. Let it grow.
          </h2>
          <p style={{ margin: "11px 0 0", maxWidth: "720px", color: "rgba(255,255,255,0.52)", fontSize: "13px", lineHeight: 1.55 }}>
            Choose a term, set aside eligible earned DT, and collect your principal plus a fixed Dreamscape return when the Bond matures.
          </p>
        </div>

        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0,1fr))",
            gap: "9px",
          }}
        >
          {[
            ["Eligible to invest", formatDt(bonds.eligibility.eligibleDt), "✦"],
            ["In active Bonds", formatDt(bonds.eligibility.activePrincipal), "◆"],
            ["Pending interest", formatDt(bonds.eligibility.pendingInterest), "+"],
            ["Interest earned", formatDt(bonds.eligibility.settledInterest), "✓"],
          ].map(([label, value, icon]) => (
            <div
              key={label}
              style={{
                minHeight: "78px",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.075)",
                background: "rgba(255,255,255,0.032)",
                padding: "13px 14px",
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "30px minmax(0,1fr)",
                gap: "9px",
                alignItems: "center",
              }}
            >
              {!isMobile && (
                <span
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "10px",
                    border: "1px solid rgba(126,232,255,0.16)",
                    background: "rgba(83,215,255,0.05)",
                    color: label === "Interest earned" ? "#9fffd2" : "#8ee8ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 900,
                  }}
                >
                  {icon}
                </span>
              )}
              <span>
                <small style={{ display: "block", color: "rgba(255,255,255,0.38)", fontSize: "8px", fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  {label}
                </small>
                <strong style={{ display: "block", marginTop: "5px", color: label === "Interest earned" ? "#9fffd2" : "white", fontSize: isMobile ? "14px" : "16px" }}>
                  {bonds.loading ? "—" : value}
                </strong>
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "14px",
            borderRadius: "14px",
            border: "1px solid rgba(255,209,138,0.12)",
            background: "rgba(255,209,138,0.035)",
            padding: "11px 13px",
            color: "rgba(255,255,255,0.46)",
            fontSize: "10px",
            lineHeight: 1.5,
          }}
        >
          Bank Bonds are part of the fictional Dreamscape economy. Their returns are game mechanics for learning and are not real-world investment products or cash returns.
        </div>
      </div>

      {bonds.error && !bonds.loading && (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            borderRadius: "14px",
            border: "1px solid rgba(255,160,130,0.22)",
            background: "rgba(255,120,90,0.07)",
            color: "#ffc0a0",
            padding: "12px 14px",
            fontSize: "11px",
            lineHeight: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span>{bonds.error}</span>
          <button
            type="button"
            onClick={() => bonds.refresh()}
            style={{
              minHeight: "34px",
              padding: "0 12px",
              borderRadius: "10px",
              border: "1px solid rgba(255,192,160,0.24)",
              background: "rgba(255,255,255,0.04)",
              color: "#ffd6c1",
              cursor: "pointer",
              fontFamily: "inherit",
              fontSize: "9px",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Try Again
          </button>
        </div>
      )}

      <div style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: "12px" }}>
          <div>
            <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              Bond Catalogue
            </p>
            <h3 style={{ margin: "6px 0 0", fontSize: isMobile ? "24px" : "28px", letterSpacing: "-0.03em" }}>
              Available Bonds
            </h3>
          </div>
          <span style={{ color: "rgba(255,255,255,0.34)", fontSize: "10px" }}>
            {bonds.products.length} products
          </span>
        </div>

        <div
          style={{
            marginTop: "13px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : screenMode === "compact" ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))",
            gap: "12px",
          }}
        >
          {bonds.products.map((product) => (
            <BondProductCard
              key={product.id}
              product={product}
              eligibleDt={bonds.eligibility.eligibleDt}
              screenMode={screenMode}
              onSelect={setPurchaseProduct}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: "28px" }}>
        <p style={{ margin: 0, color: "#8ee8ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>
          Portfolio
        </p>
        <h3 style={{ margin: "6px 0 0", fontSize: isMobile ? "24px" : "28px", letterSpacing: "-0.03em" }}>
          Your Bonds
        </h3>

        {bonds.loading ? (
          <div
            style={{
              marginTop: "13px",
              borderRadius: "20px",
              border: "1px solid rgba(126,232,255,0.10)",
              background: "rgba(255,255,255,0.025)",
              padding: "30px",
              textAlign: "center",
              color: "rgba(255,255,255,0.42)",
              fontSize: "12px",
            }}
          >
            Loading your Bonds…
          </div>
        ) : currentHoldings.length === 0 ? (
          <div
            style={{
              marginTop: "13px",
              borderRadius: "20px",
              border: "1px solid rgba(126,232,255,0.10)",
              background: "rgba(255,255,255,0.025)",
              padding: "30px",
              textAlign: "center",
            }}
          >
            <div style={{ color: "#8ee8ff", fontSize: "24px" }}>◆</div>
            <strong style={{ display: "block", marginTop: "9px", fontSize: "16px" }}>No active Bonds yet.</strong>
            <p style={{ margin: "7px auto 0", maxWidth: "460px", color: "rgba(255,255,255,0.42)", fontSize: "11px", lineHeight: 1.5 }}>
              Choose a Bond above to see how fixed returns and maturity work inside Dreamscape.
            </p>
          </div>
        ) : (
          <div
            style={{
              marginTop: "13px",
              display: "grid",
              gridTemplateColumns: screenMode === "desktop" ? "repeat(2,minmax(0,1fr))" : "1fr",
              gap: "12px",
            }}
          >
            {currentHoldings.map((holding) => (
              <BondHoldingCard
                key={holding.id}
                holding={holding}
                screenMode={screenMode}
                onCollect={setCollectHolding}
              />
            ))}
          </div>
        )}
      </div>

      <BondHistory holdings={bonds.holdings} screenMode={screenMode} />

      <BondPurchaseModal
        product={purchaseProduct}
        eligibleDt={bonds.eligibility.eligibleDt}
        open={Boolean(purchaseProduct)}
        loading={bonds.actionLoading}
        onClose={() => setPurchaseProduct(null)}
        onPurchase={bonds.buyBond}
      />

      <BondSettlementModal
        holding={collectHolding}
        open={Boolean(collectHolding)}
        loading={bonds.actionLoading}
        onClose={() => setCollectHolding(null)}
        onSettle={settleBond}
      />

      <BondSettlementCelebration
        holding={celebrationHolding}
        open={Boolean(celebrationHolding)}
        onClose={() => setCelebrationHolding(null)}
      />
    </section>
  );
}
