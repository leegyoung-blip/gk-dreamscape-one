"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { fetchDreamTokenBalance } from "@/lib/wallet/dreamTokenBalance";

type ScreenMode = "desktop" | "tablet" | "mobile";

type StockRow = {
  symbol: string;
  current_price: number;
};

type StockHoldingRow = {
  symbol: string;
  quantity: number;
};

type PropertyRow = {
  id: string;
  current_value: number;
};

type PropertyHoldingRow = {
  property_id: string;
  quantity: number;
};

type ProfileAssetBreakdown = {
  cash: number;
  property: number;
  stocks: number;
};

function useResponsiveMode() {
  const [mode, setMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      const height = window.innerHeight;

      if (width <= 720) {
        setMode("mobile");
      } else if (width <= 1180 || height > width) {
        setMode("tablet");
      } else {
        setMode("desktop");
      }
    }

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return mode;
}

function formatDT(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DT`;
}

function formatDG(value: number) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-SG")} DG`;
}

/*
 * Dream Token and Dream Gem transaction history is shown only on /profile.
 * These controls show current balances; Profile Assets opens the cash,
 * property and stock breakdown, and the Dream Gem balance is display-only.
 */
export default function DashboardTopControls() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const buttonHeight = isMobile ? 40 : 46;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [assets, setAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [gemBalance, setGemBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  const [assetsOpen, setAssetsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const assetTotal = assets.cash + assets.property + assets.stocks;

  useEffect(() => {
    let mounted = true;

    async function loadWallets() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserEmail(null);
        setAssets({ cash: 0, property: 0, stocks: 0 });
        setGemBalance(0);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const [
        profileResult,
        tokenBalanceResult,
        stocksResult,
        holdingsResult,
        propertiesResult,
        propertyHoldingsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("dream_gem_balance")
          .eq("id", user.id)
          .maybeSingle(),
        fetchDreamTokenBalance(supabase, user.id),
        supabase
          .from("milo_exchange_stocks")
          .select("symbol,current_price")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_holdings")
          .select("symbol,quantity")
          .eq("user_id", user.id),
        supabase
          .from("milo_exchange_properties")
          .select("id,current_value")
          .eq("is_active", true),
        supabase
          .from("milo_exchange_property_holdings")
          .select("property_id,quantity")
          .eq("user_id", user.id),
      ]);

      if (!mounted) return;

      if (profileResult.error) {
        console.warn(
          "Could not load dashboard Dream Gem balance:",
          profileResult.error.message,
        );
        setGemBalance(0);
      } else {
        setGemBalance(
          Math.max(
            0,
            Number(profileResult.data?.dream_gem_balance || 0),
          ),
        );
      }

      const cash = tokenBalanceResult.error
        ? 0
        : tokenBalanceResult.data;

      if (tokenBalanceResult.error) {
        console.warn(
          "Could not load dashboard Dream Token balance:",
          tokenBalanceResult.error.message,
        );
      }

      const stockPrices = new Map(
        ((stocksResult.data || []) as StockRow[]).map((stock) => [
          stock.symbol,
          Number(stock.current_price || 0),
        ]),
      );

      const stocks = holdingsResult.error
        ? 0
        : ((holdingsResult.data || []) as StockHoldingRow[]).reduce(
            (sum, holding) =>
              sum +
              Number(holding.quantity || 0) *
                Number(stockPrices.get(holding.symbol) || 0),
            0,
          );

      if (stocksResult.error || holdingsResult.error) {
        console.warn(
          "Could not load dashboard stock assets:",
          stocksResult.error?.message ||
            holdingsResult.error?.message,
        );
      }

      const propertyPrices = new Map(
        ((propertiesResult.data || []) as PropertyRow[]).map(
          (property) => [
            property.id,
            Number(property.current_value || 0),
          ],
        ),
      );

      const property = propertyHoldingsResult.error
        ? 0
        : (
            (propertyHoldingsResult.data ||
              []) as PropertyHoldingRow[]
          ).reduce(
            (sum, holding) =>
              sum +
              Number(holding.quantity || 0) *
                Number(
                  propertyPrices.get(holding.property_id) || 0,
                ),
            0,
          );

      if (
        propertiesResult.error ||
        propertyHoldingsResult.error
      ) {
        console.warn(
          "Could not load dashboard property assets:",
          propertiesResult.error?.message ||
            propertyHoldingsResult.error?.message,
        );
      }

      setAssets({ cash, property, stocks });

      setLoading(false);
    }

    void loadWallets();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadWallets();
    });

    function refreshWallets() {
      void loadWallets();
    }

    window.addEventListener("focus", refreshWallets);
    window.addEventListener(
      "dream-tokens-updated",
      refreshWallets,
    );
    window.addEventListener(
      "dream-gems-updated",
      refreshWallets,
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshWallets);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshWallets,
      );
      window.removeEventListener(
        "dream-gems-updated",
        refreshWallets,
      );
    };
  }, []);

  useEffect(() => {
    if (!assetsOpen && !menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeEverything();
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () =>
      document.removeEventListener("keydown", closeOnEscape);
  }, [assetsOpen, menuOpen]);

  function closeEverything() {
    setAssetsOpen(false);
    setMenuOpen(false);
  }

  function openAssets() {
    setMenuOpen(false);
    setAssetsOpen(true);
  }

  const baseTopButton: CSSProperties = {
    height: buttonHeight,
    borderRadius: 999,
    border: "1px solid rgba(116,200,255,0.45)",
    background: "rgba(2,8,19,0.62)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 16px 36px rgba(0,0,0,0.28)",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
  };

  return (
    <>
      {(assetsOpen || menuOpen) && (
        <button
          type="button"
          aria-label="Close account panels"
          onClick={closeEverything}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 68,
            border: 0,
            background: "transparent",
            cursor: "default",
          }}
        />
      )}

      <Link
        href="/learning-missions"
        style={{
          ...baseTopButton,
          position: "fixed",
          top: isMobile ? 12 : 18,
          left: isMobile ? 12 : 18,
          zIndex: 70,
          padding: isMobile ? "0 14px" : "0 22px",
          gap: isMobile ? 8 : 12,
          textDecoration: "none",
          fontSize: isMobile ? 11 : 14,
          letterSpacing: isMobile ? "0.05em" : "0.08em",
          textTransform: "uppercase",
          fontWeight: 800,
        }}
      >
        <span style={{ fontSize: isMobile ? 15 : 18 }}>←</span>
        {isMobile ? "Missions" : "Learning Missions"}
      </Link>

      {isDesktop ? (
        <div
          style={{
            position: "fixed",
            top: 18,
            right: 18,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ position: "relative", zIndex: 72 }}>
            <button
              type="button"
              onClick={() => {
                setAssetsOpen((current) => !current);
              }}
              aria-expanded={assetsOpen}
              aria-haspopup="menu"
              style={{
                ...baseTopButton,
                padding: "0 18px",
                gap: 10,
                border: "1px solid rgba(83,215,255,0.55)",
                background:
                  "linear-gradient(145deg, rgba(2,14,28,0.74), rgba(2,8,19,0.82))",
                fontSize: 14,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                boxShadow: assetsOpen
                  ? "0 16px 38px rgba(0,0,0,0.34), 0 0 30px rgba(83,215,255,0.28)"
                  : "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(83,215,255,0.16)",
              }}
            >
              <span
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "radial-gradient(circle, rgba(83,215,255,0.38), rgba(2,8,19,0.8))",
                  border: "1px solid rgba(83,215,255,0.6)",
                  color: "#bdf6ff",
                  fontSize: 12,
                  boxShadow: "0 0 14px rgba(83,215,255,0.32)",
                }}
              >
                ◈
              </span>

              <span>Profile Assets</span>
              <strong style={{ color: "#53d7ff", fontSize: 14 }}>
                {loading ? "..." : formatDT(assetTotal)}
              </strong>
              <span
                aria-hidden="true"
                style={{
                  color: "#8ee8ff",
                  transform: assetsOpen
                    ? "rotate(180deg)"
                    : "rotate(0deg)",
                  transition: "transform 180ms ease",
                }}
              >
                ▾
              </span>
            </button>
          </div>

          <div style={{ position: "relative", zIndex: 73 }}>
            <div
              data-wallet-balance="dream-gems"
              aria-label={
                loading
                  ? "Dream Gems balance loading"
                  : `Dream Gems balance ${formatDG(gemBalance)}`
              }
              style={{
                ...baseTopButton,
                padding: "0 16px",
                gap: 9,
                border: "1px solid rgba(216,180,254,0.62)",
                background:
                  "linear-gradient(145deg, rgba(50,22,88,0.82), rgba(13,8,35,0.88))",
                fontSize: 14,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                boxShadow:
                  "0 16px 36px rgba(0,0,0,0.28), 0 0 22px rgba(192,132,252,0.2)",
              }}
            >
              <span
                style={{
                  width: 25,
                  height: 25,
                  borderRadius: 9,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "radial-gradient(circle, rgba(216,180,254,0.42), rgba(30,12,58,0.9))",
                  border: "1px solid rgba(216,180,254,0.72)",
                  color: "#f3e8ff",
                  fontSize: 14,
                  boxShadow: "0 0 14px rgba(192,132,252,0.38)",
                }}
              >
                ◆
              </span>

              <span>Dream Gems</span>
              <strong style={{ color: "#e9d5ff", fontSize: 14 }}>
                {loading ? "..." : formatDG(gemBalance)}
              </strong>
            </div>
          </div>

          <Link
            href={userEmail ? "/profile" : "/login"}
            style={{
              ...baseTopButton,
              padding: "0 22px",
              gap: 10,
              textDecoration: "none",
              fontSize: 14,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {userEmail ? "My Account" : "Log In"}
          </Link>
        </div>
      ) : (
        <div
          style={{
            position: "fixed",
            top: isMobile ? 12 : 18,
            right: isMobile ? 12 : 18,
            zIndex: 74,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setAssetsOpen(false);
              setMenuOpen((current) => !current);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            style={{
              ...baseTopButton,
              padding: isMobile ? "0 14px" : "0 18px",
              gap: 9,
              border: "1px solid rgba(126,232,255,0.5)",
              fontSize: isMobile ? 11 : 13,
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16 }}>☰</span>
            Menu
          </button>

          {menuOpen && (
            <div
              role="menu"
              style={{
                position: "absolute",
                top: "calc(100% + 9px)",
                right: 0,
                width: isMobile
                  ? "min(330px, calc(100vw - 24px))"
                  : 350,
                borderRadius: 20,
                border: "1px solid rgba(126,232,255,0.3)",
                background:
                  "linear-gradient(145deg, rgba(3,20,39,0.99), rgba(3,10,25,0.99))",
                boxShadow:
                  "0 28px 72px rgba(0,0,0,0.58), 0 0 28px rgba(83,215,255,0.14)",
                backdropFilter: "blur(22px)",
                WebkitBackdropFilter: "blur(22px)",
                padding: 10,
                display: "grid",
                gap: 8,
                color: "white",
              }}
            >
              <button
                type="button"
                onClick={openAssets}
                style={compactMenuItemStyle}
              >
                <span style={{ color: "#8ee8ff" }}>◈</span>
                <span>Profile Assets</span>
                <strong
                  style={{
                    color: "#53d7ff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "..." : formatDT(assetTotal)}
                </strong>
              </button>

              <div
                data-wallet-balance="dream-gems"
                style={{
                  ...compactMenuItemStyle,
                  border: "1px solid rgba(216,180,254,0.22)",
                  background: "rgba(192,132,252,0.08)",
                  cursor: "default",
                }}
              >
                <span style={{ color: "#e9d5ff" }}>◆</span>
                <span>Dream Gems</span>
                <strong
                  style={{
                    color: "#e9d5ff",
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "..." : formatDG(gemBalance)}
                </strong>
              </div>

              <Link
                href={userEmail ? "/profile" : "/login"}
                onClick={closeEverything}
                style={{
                  ...compactMenuItemStyle,
                  textDecoration: "none",
                }}
              >
                <span>◎</span>
                <span>{userEmail ? "My Account" : "Log In"}</span>
                <span>›</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {assetsOpen && (
        <WalletPanel
          isMobile={isMobile}
          userEmail={userEmail}
          loading={loading}
          assetTotal={assetTotal}
          assets={assets}
          onClose={() => setAssetsOpen(false)}
        />
      )}
    </>
  );
}

const compactMenuItemStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  borderRadius: 14,
  border: "1px solid rgba(126,232,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
  display: "grid",
  gridTemplateColumns: "30px minmax(0,1fr) auto",
  alignItems: "center",
  gap: 10,
  padding: "10px 13px",
  textAlign: "left",
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  fontFamily: "inherit",
};

function WalletPanel({
  isMobile,
  userEmail,
  loading,
  assetTotal,
  assets,
  onClose,
}: {
  isMobile: boolean;
  userEmail: string | null;
  loading: boolean;
  assetTotal: number;
  assets: ProfileAssetBreakdown;
  onClose: () => void;
}) {
  return (
    <div
      role="menu"
      style={{
        position: "fixed",
        top: isMobile ? 64 : 74,
        right: isMobile ? 12 : 18,
        zIndex: 76,
        width: isMobile
          ? "min(390px, calc(100vw - 24px))"
          : 390,
        maxHeight: isMobile
          ? "calc(100dvh - 78px)"
          : "calc(100dvh - 92px)",
        overflowX: "hidden",
        overflowY: "auto",
        borderRadius: 20,
        border: "1px solid rgba(126,232,255,0.3)",
        background:
          "linear-gradient(145deg, rgba(3,20,39,0.99), rgba(3,10,25,0.99))",
        boxShadow:
          "0 28px 72px rgba(0,0,0,0.58), 0 0 32px rgba(83,215,255,0.12)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        color: "white",
      }}
    >
      <div
        style={{
          padding: 18,
          borderBottom: "1px solid rgba(126,232,255,0.13)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: 11,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Profile Assets
            </p>

            <strong
              style={{
                display: "block",
                marginTop: 8,
                fontSize: 32,
                lineHeight: 1,
                letterSpacing: "-0.04em",
              }}
            >
              {loading ? "Loading..." : formatDT(assetTotal)}
            </strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet"
            style={{
              width: 36,
              height: 36,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontSize: 18,
              cursor: "pointer",
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ padding: 12 }}>
        {!userEmail ? (
          <Link
            href="/login"
            onClick={onClose}
            style={{
              minHeight: 52,
              borderRadius: 14,
              border: "1px solid rgba(126,232,255,0.24)",
              background: "rgba(83,215,255,0.08)",
              color: "white",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 800,
            }}
          >
            Log in to view your wallet
          </Link>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {[
              ["Cash", assets.cash, "✦"],
              ["Property", assets.property, "⌂"],
              ["Stocks", assets.stocks, "↗"],
            ].map(([label, value, icon]) => (
              <div
                key={String(label)}
                style={{
                  minHeight: 58,
                  borderRadius: 14,
                  border: "1px solid rgba(126,232,255,0.12)",
                  background: "rgba(255,255,255,0.035)",
                  display: "grid",
                  gridTemplateColumns: "34px minmax(0,1fr) auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 12px",
                }}
              >
                <span
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 11,
                    border: "1px solid rgba(83,215,255,0.26)",
                    background: "rgba(83,215,255,0.09)",
                    color: "#8ee8ff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                  }}
                >
                  {icon}
                </span>

                <strong style={{ fontSize: 13 }}>{label}</strong>

                <strong
                  style={{
                    color: "#9fffd2",
                    fontSize: 12,
                    whiteSpace: "nowrap",
                  }}
                >
                  {loading ? "—" : formatDT(Number(value))}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
