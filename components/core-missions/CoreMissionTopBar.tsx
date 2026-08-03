"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import { canEditCore } from "@/lib/core-missions/catalogue";

type ScreenMode = "desktop" | "tablet" | "mobile";

type DreamTokenTransaction = {
  id: string;
  amount: number;
  title: string | null;
  created_at: string | null;
};

type DreamGemTransaction = {
  id: string;
  amount: number;
  title: string | null;
  source: string | null;
  created_at: string | null;
};

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
      } else if (width < 1180 || height > width) {
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

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-SG", {
    timeZone: "Asia/Singapore",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatGemSource(source: string | null) {
  switch (source) {
    case "class_attendance":
      return "Class attendance";
    case "core_mission":
      return "Core Mission";
    case "think_mission":
      return "Think Mission";
    case "redemption":
      return "Reward redemption";
    case "admin_adjustment":
      return "Admin adjustment";
    case "reversal":
      return "Reversal";
    default:
      return "Dream Gem activity";
  }
}

export default function CoreMissionTopBar({
  backHref,
  backLabel,
}: {
  backHref: string;
  backLabel: string;
}) {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";

  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [assets, setAssets] = useState<ProfileAssetBreakdown>({
    cash: 0,
    property: 0,
    stocks: 0,
  });
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [gemBalance, setGemBalance] = useState(0);
  const [gemTransactions, setGemTransactions] = useState<
    DreamGemTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  const [assetsOpen, setAssetsOpen] = useState(false);
  const [gemsOpen, setGemsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const assetTotal = assets.cash + assets.property + assets.stocks;
  const editorAllowed = canEditCore(role);
  const buttonHeight = isMobile ? 40 : 46;

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
        setRole(null);
        setAssets({ cash: 0, property: 0, stocks: 0 });
        setTokenTransactions([]);
        setGemBalance(0);
        setGemTransactions([]);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const [
        profileResult,
        tokenBalanceResult,
        tokenTransactionsResult,
        stocksResult,
        holdingsResult,
        propertiesResult,
        propertyHoldingsResult,
        gemTransactionsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("role,tier,dream_gem_balance")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual"),
        supabase
          .from("dream_token_transactions")
          .select("id,amount,title,created_at")
          .eq("user_id", user.id)
          .eq("token_kind", "virtual")
          .order("created_at", { ascending: false })
          .limit(8),
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
        supabase
          .from("dream_gem_transactions")
          .select("id,amount,title,source,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (!mounted) return;

      if (profileResult.error) {
        console.warn(
          "Could not load Core profile wallet details:",
          profileResult.error.message,
        );
        setRole(null);
        setGemBalance(0);
      } else {
        const profileRole =
          profileResult.data?.role || profileResult.data?.tier || null;
        setRole(profileRole ? String(profileRole) : null);
        setGemBalance(
          Math.max(0, Number(profileResult.data?.dream_gem_balance || 0)),
        );
      }

      const cash = tokenBalanceResult.error
        ? 0
        : (tokenBalanceResult.data || []).reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0,
          );

      if (tokenBalanceResult.error) {
        console.warn(
          "Could not load Dream Token cash balance:",
          tokenBalanceResult.error.message,
        );
      }

      const stockPriceMap = new Map(
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
                Number(stockPriceMap.get(holding.symbol) || 0),
            0,
          );

      if (stocksResult.error || holdingsResult.error) {
        console.warn(
          "Could not load stock assets:",
          stocksResult.error?.message || holdingsResult.error?.message,
        );
      }

      const propertyPriceMap = new Map(
        ((propertiesResult.data || []) as PropertyRow[]).map((property) => [
          property.id,
          Number(property.current_value || 0),
        ]),
      );

      const property = propertyHoldingsResult.error
        ? 0
        : ((propertyHoldingsResult.data || []) as PropertyHoldingRow[]).reduce(
            (sum, holding) =>
              sum +
              Number(holding.quantity || 0) *
                Number(propertyPriceMap.get(holding.property_id) || 0),
            0,
          );

      if (propertiesResult.error || propertyHoldingsResult.error) {
        console.warn(
          "Could not load property assets:",
          propertiesResult.error?.message ||
            propertyHoldingsResult.error?.message,
        );
      }

      setAssets({ cash, property, stocks });

      if (tokenTransactionsResult.error) {
        console.warn(
          "Could not load Dream Token transactions:",
          tokenTransactionsResult.error.message,
        );
        setTokenTransactions([]);
      } else {
        setTokenTransactions(
          (tokenTransactionsResult.data || []).map((row) => ({
            id: String(row.id),
            amount: Number(row.amount || 0),
            title: row.title ? String(row.title) : null,
            created_at: row.created_at ? String(row.created_at) : null,
          })),
        );
      }

      if (gemTransactionsResult.error) {
        console.warn(
          "Could not load Dream Gem transactions:",
          gemTransactionsResult.error.message,
        );
        setGemTransactions([]);
      } else {
        setGemTransactions(
          (gemTransactionsResult.data || []).map((row) => ({
            id: String(row.id),
            amount: Number(row.amount || 0),
            title: row.title ? String(row.title) : null,
            source: row.source ? String(row.source) : null,
            created_at: row.created_at ? String(row.created_at) : null,
          })),
        );
      }

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
    window.addEventListener("dream-tokens-updated", refreshWallets);
    window.addEventListener("dream-gems-updated", refreshWallets);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshWallets);
      window.removeEventListener("dream-tokens-updated", refreshWallets);
      window.removeEventListener("dream-gems-updated", refreshWallets);
    };
  }, []);

  useEffect(() => {
    if (!assetsOpen && !gemsOpen && !menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setAssetsOpen(false);
        setGemsOpen(false);
        setMenuOpen(false);
      }
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [assetsOpen, gemsOpen, menuOpen]);

  function closeEverything() {
    setAssetsOpen(false);
    setGemsOpen(false);
    setMenuOpen(false);
  }

  function openAssets() {
    setMenuOpen(false);
    setGemsOpen(false);
    setAssetsOpen(true);
  }

  function openGems() {
    setMenuOpen(false);
    setAssetsOpen(false);
    setGemsOpen(true);
  }

  return (
    <div className="relative z-50 flex items-start justify-between gap-3">
      {(assetsOpen || gemsOpen || menuOpen) && (
        <button
          type="button"
          aria-label="Close wallet panels"
          onClick={closeEverything}
          className="fixed inset-0 z-[58] cursor-default border-0 bg-transparent"
        />
      )}

      <Link
        href={backHref}
        className="relative z-[70] inline-flex items-center rounded-full border border-cyan-200/40 bg-[#020813]/65 text-white no-underline shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
        style={{
          height: buttonHeight,
          padding: isMobile ? "0 14px" : "0 22px",
          gap: isMobile ? 8 : 12,
          fontSize: isMobile ? 11 : 14,
          letterSpacing: isMobile ? "0.05em" : "0.08em",
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: isMobile ? 15 : 18 }}>←</span>
        {backLabel}
      </Link>

      {isDesktop ? (
        <div className="relative z-[70] flex items-center gap-3">
          {editorAllowed && (
            <Link
              href="/curriculum-developer"
              className="inline-flex items-center justify-center rounded-full border border-violet-200/35 bg-violet-400/15 px-[18px] text-xs font-black uppercase tracking-[0.1em] text-violet-100 no-underline shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
              style={{ height: buttonHeight }}
            >
              Curriculum Editor
            </Link>
          )}

          <button
            type="button"
            onClick={() => {
              setGemsOpen(false);
              setAssetsOpen((current) => !current);
            }}
            aria-expanded={assetsOpen}
            aria-haspopup="menu"
            className="inline-flex items-center rounded-full border border-cyan-300/50 bg-[linear-gradient(145deg,rgba(2,14,28,0.76),rgba(2,8,19,0.84))] px-[18px] text-white shadow-[0_16px_36px_rgba(0,0,0,0.28),0_0_22px_rgba(83,215,255,0.14)] backdrop-blur-2xl"
            style={{
              height: buttonHeight,
              gap: 10,
              fontSize: 13,
              letterSpacing: "0.06em",
              fontWeight: 800,
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <span className="grid h-[25px] w-[25px] place-items-center rounded-full border border-cyan-300/55 bg-cyan-300/10 text-cyan-100">
              ◈
            </span>
            <span>Profile Assets</span>
            <strong className="text-cyan-200">
              {loading ? "..." : formatDT(assetTotal)}
            </strong>
            <span
              aria-hidden="true"
              style={{
                transform: assetsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            >
              ▾
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAssetsOpen(false);
              setGemsOpen((current) => !current);
            }}
            aria-expanded={gemsOpen}
            aria-haspopup="menu"
            className="inline-flex items-center rounded-full border border-violet-200/55 bg-[linear-gradient(145deg,rgba(50,22,88,0.82),rgba(13,8,35,0.9))] px-4 text-white shadow-[0_16px_36px_rgba(0,0,0,0.28),0_0_22px_rgba(192,132,252,0.18)] backdrop-blur-2xl"
            style={{
              height: buttonHeight,
              gap: 9,
              fontSize: 13,
              letterSpacing: "0.06em",
              fontWeight: 800,
              textTransform: "uppercase",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <span className="grid h-[25px] w-[25px] place-items-center rounded-[9px] border border-violet-200/65 bg-violet-300/15 text-violet-100">
              ◆
            </span>
            <span>Dream Gems</span>
            <strong className="text-violet-100">
              {loading ? "..." : formatDG(gemBalance)}
            </strong>
            <span
              aria-hidden="true"
              style={{
                transform: gemsOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 180ms ease",
              }}
            >
              ▾
            </span>
          </button>

          <Link
            href="/learning-missions/core/rover"
            className="inline-flex items-center justify-center rounded-full border border-cyan-200/40 bg-[#020813]/65 px-[20px] text-sm font-extrabold text-white no-underline shadow-[0_16px_36px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
            style={{ height: buttonHeight }}
          >
            My Rover ›
          </Link>
        </div>
      ) : (
        <div className="relative z-[70]">
          <button
            type="button"
            onClick={() => {
              setAssetsOpen(false);
              setGemsOpen(false);
              setMenuOpen((current) => !current);
            }}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            className="inline-flex items-center rounded-full border border-cyan-200/45 bg-[#020813]/72 text-white shadow-[0_16px_36px_rgba(0,0,0,0.3)] backdrop-blur-2xl"
            style={{
              height: buttonHeight,
              padding: isMobile ? "0 14px" : "0 18px",
              gap: 9,
              fontSize: isMobile ? 11 : 13,
              fontWeight: 800,
              letterSpacing: "0.08em",
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
              className="absolute right-0 top-[calc(100%+9px)] z-[72] grid gap-2 rounded-[20px] border border-cyan-200/25 bg-[linear-gradient(145deg,rgba(3,20,39,0.99),rgba(3,10,25,0.99))] p-[10px] text-white shadow-[0_28px_72px_rgba(0,0,0,0.58),0_0_28px_rgba(83,215,255,0.12)] backdrop-blur-2xl"
              style={{
                width: isMobile
                  ? "min(330px, calc(100vw - 32px))"
                  : 360,
              }}
            >
              <button type="button" onClick={openAssets} style={compactMenuItem}>
                <span className="text-cyan-200">◈</span>
                <span>Profile Assets</span>
                <strong className="whitespace-nowrap text-cyan-200">
                  {loading ? "..." : formatDT(assetTotal)}
                </strong>
              </button>

              <button
                type="button"
                onClick={openGems}
                style={{
                  ...compactMenuItem,
                  border: "1px solid rgba(216,180,254,0.22)",
                  background: "rgba(192,132,252,0.08)",
                }}
              >
                <span className="text-violet-100">◆</span>
                <span>Dream Gems</span>
                <strong className="whitespace-nowrap text-violet-100">
                  {loading ? "..." : formatDG(gemBalance)}
                </strong>
              </button>

              {editorAllowed && (
                <Link
                  href="/curriculum-developer"
                  onClick={closeEverything}
                  style={compactMenuLink}
                >
                  <span className="text-violet-100">✎</span>
                  <span>Curriculum Editor</span>
                  <span>›</span>
                </Link>
              )}

              <Link
                href="/learning-missions/core/rover"
                onClick={closeEverything}
                style={compactMenuLink}
              >
                <span className="text-cyan-200">◇</span>
                <span>My Rover</span>
                <span>›</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {assetsOpen && (
        <WalletPanel
          kind="assets"
          isMobile={isMobile}
          userEmail={userEmail}
          loading={loading}
          assetTotal={assetTotal}
          assets={assets}
          tokenTransactions={tokenTransactions}
          gemBalance={gemBalance}
          gemTransactions={gemTransactions}
          onClose={() => setAssetsOpen(false)}
        />
      )}

      {gemsOpen && (
        <WalletPanel
          kind="gems"
          isMobile={isMobile}
          userEmail={userEmail}
          loading={loading}
          assetTotal={assetTotal}
          assets={assets}
          tokenTransactions={tokenTransactions}
          gemBalance={gemBalance}
          gemTransactions={gemTransactions}
          onClose={() => setGemsOpen(false)}
        />
      )}
    </div>
  );
}

const compactMenuItem: CSSProperties = {
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

const compactMenuLink: CSSProperties = {
  ...compactMenuItem,
  textDecoration: "none",
};

function WalletPanel({
  kind,
  isMobile,
  userEmail,
  loading,
  assetTotal,
  assets,
  tokenTransactions,
  gemBalance,
  gemTransactions,
  onClose,
}: {
  kind: "assets" | "gems";
  isMobile: boolean;
  userEmail: string | null;
  loading: boolean;
  assetTotal: number;
  assets: ProfileAssetBreakdown;
  tokenTransactions: DreamTokenTransaction[];
  gemBalance: number;
  gemTransactions: DreamGemTransaction[];
  onClose: () => void;
}) {
  const isAssets = kind === "assets";

  return (
    <div
      role="menu"
      className={[
        "fixed z-[75] overflow-x-hidden overflow-y-auto rounded-[20px] border text-white shadow-[0_28px_72px_rgba(0,0,0,0.58)] backdrop-blur-2xl",
        isAssets
          ? "border-cyan-200/30 bg-[linear-gradient(145deg,rgba(3,20,39,0.99),rgba(3,10,25,0.99))]"
          : "border-violet-200/35 bg-[linear-gradient(145deg,rgba(35,16,65,0.99),rgba(10,8,29,0.99))]",
      ].join(" ")}
      style={{
        top: isMobile ? 74 : 82,
        right: isMobile ? 12 : 22,
        width: isMobile ? "min(390px, calc(100vw - 24px))" : 390,
        maxHeight: "calc(100dvh - 96px)",
      }}
    >
      <div
        className={[
          "border-b p-[18px]",
          isAssets ? "border-cyan-200/15" : "border-violet-200/15",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p
              className={[
                "m-0 text-[11px] font-black uppercase tracking-[0.16em]",
                isAssets ? "text-cyan-200" : "text-violet-100",
              ].join(" ")}
            >
              {isAssets ? "Profile Assets" : "Dream Gem Wallet"}
            </p>

            <strong className="mt-2 block text-[32px] leading-none tracking-[-0.04em]">
              {loading
                ? "Loading..."
                : isAssets
                  ? formatDT(assetTotal)
                  : formatDG(gemBalance)}
            </strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close wallet"
            className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.06] text-lg text-white"
          >
            ×
          </button>
        </div>

        {!isAssets && (
          <p className="mt-3 text-xs leading-5 text-white/55">
            Dream Gems are premium learning rewards that can be redeemed for
            selected rewards. They cannot be exchanged for cash.
          </p>
        )}
      </div>

      <div className="p-3">
        {!userEmail ? (
          <Link
            href="/login"
            onClick={onClose}
            className="flex min-h-[52px] items-center justify-center rounded-[14px] border border-cyan-200/25 bg-cyan-300/10 text-xs font-extrabold text-white no-underline"
          >
            Log in to view your wallet
          </Link>
        ) : isAssets ? (
          <>
            <div className="grid gap-2">
              {[
                ["Cash", assets.cash, "✦"],
                ["Property", assets.property, "⌂"],
                ["Stocks", assets.stocks, "↗"],
              ].map(([label, value, icon]) => (
                <div
                  key={String(label)}
                  className="grid min-h-[58px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-[10px] rounded-[14px] border border-cyan-200/10 bg-white/[0.035] px-3 py-[10px]"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-[11px] border border-cyan-200/20 bg-cyan-300/10 font-black text-cyan-200">
                    {icon}
                  </span>
                  <strong className="text-[13px]">{label}</strong>
                  <strong className="whitespace-nowrap text-xs text-emerald-200">
                    {loading ? "—" : formatDT(Number(value))}
                  </strong>
                </div>
              ))}
            </div>

            <p className="mx-1 mb-[10px] mt-4 text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/45">
              Latest cash transactions
            </p>

            {loading ? (
              <WalletMessage text="Loading transactions..." />
            ) : tokenTransactions.length === 0 ? (
              <WalletMessage text="No Dream Token transactions yet." />
            ) : (
              <div className="grid gap-2">
                {tokenTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    amount={transaction.amount}
                    title={
                      transaction.title ||
                      (transaction.amount >= 0
                        ? "Dream Token reward"
                        : "Dream Token spend")
                    }
                    subtitle={formatDate(transaction.created_at)}
                    suffix="DT"
                    gem={false}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mx-1 mb-[10px] text-[10px] font-extrabold uppercase tracking-[0.13em] text-white/45">
              Latest Dream Gem activity
            </p>

            {loading ? (
              <WalletMessage text="Loading Dream Gems..." />
            ) : gemTransactions.length === 0 ? (
              <WalletMessage text="No Dream Gem transactions yet." />
            ) : (
              <div className="grid gap-2">
                {gemTransactions.map((transaction) => (
                  <TransactionRow
                    key={transaction.id}
                    amount={transaction.amount}
                    title={transaction.title || "Dream Gem activity"}
                    subtitle={[
                      formatGemSource(transaction.source),
                      formatDate(transaction.created_at),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    suffix="DG"
                    gem
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function WalletMessage({ text }: { text: string }) {
  return (
    <div className="rounded-[14px] bg-white/[0.035] px-[14px] py-5 text-center text-[13px] leading-5 text-white/55">
      {text}
    </div>
  );
}

function TransactionRow({
  amount,
  title,
  subtitle,
  suffix,
  gem,
}: {
  amount: number;
  title: string;
  subtitle: string;
  suffix: "DT" | "DG";
  gem: boolean;
}) {
  const positive = amount >= 0;

  return (
    <div
      className={[
        "grid min-h-[60px] grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-[10px] rounded-[14px] border bg-white/[0.035] px-3 py-[10px]",
        gem ? "border-violet-200/10" : "border-cyan-200/10",
      ].join(" ")}
    >
      <span
        className={[
          "grid h-8 w-8 place-items-center rounded-[11px] border font-black",
          positive
            ? gem
              ? "border-violet-300/40 bg-violet-300/10 text-violet-100"
              : "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
            : "border-orange-300/30 bg-orange-300/10 text-orange-200",
        ].join(" ")}
      >
        {positive ? (gem ? "◆" : "+") : "−"}
      </span>

      <span className="min-w-0">
        <strong className="block overflow-hidden text-ellipsis whitespace-nowrap text-xs">
          {title}
        </strong>
        <span className="mt-1 block text-[10px] text-white/40">
          {subtitle}
        </span>
      </span>

      <strong
        className={[
          "whitespace-nowrap text-xs",
          positive
            ? gem
              ? "text-violet-100"
              : "text-emerald-200"
            : "text-orange-200",
        ].join(" ")}
      >
        {positive ? "+" : ""}
        {amount} {suffix}
      </strong>
    </div>
  );
}
