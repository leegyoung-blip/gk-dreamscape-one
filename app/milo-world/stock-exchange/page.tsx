"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ScreenMode = "desktop" | "tablet" | "mobile";

type Profile = {
  id: string;
  email: string | null;
  role: string | null;
  tier: string | null;
  milo_exchange_age_band: string | null;
  milo_exchange_unlocked: boolean | null;
  milo_exchange_locked_until: string | null;
  milo_exchange_age_verified_at: string | null;
  milo_exchange_age_verification_method: string | null;
  milo_exchange_terms_accepted_at: string | null;
};

type Stock = {
  symbol: string;
  name: string;
  sector: string;
  description: string;
  current_price: number;
  previous_price: number;
  is_active: boolean;
  display_order: number;
  updated_at: string;
};

type Holding = {
  id: string;
  user_id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  created_at: string;
  updated_at: string;
};

type Trade = {
  id: string;
  user_id: string;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  total: number;
  created_at: string;
};

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1180 || isPortrait) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  return screenMode;
}

function calculateAge(dateString: string) {
  const today = new Date();
  const birthDate = new Date(`${dateString}T00:00:00`);

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function getAgeBand(age: number) {
  if (age < 13) return "under_13";
  if (age < 16) return "13_15";
  if (age < 18) return "16_17";
  return "18_plus";
}

function getSixteenthBirthday(dateString: string) {
  const birthDate = new Date(`${dateString}T00:00:00`);
  birthDate.setFullYear(birthDate.getFullYear() + 16);
  return birthDate.toISOString().slice(0, 10);
}

function getTodayDateOnly() {
  return new Date().toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString();
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function ResponsiveScrollStyles() {
  return (
    <style>{`
      .milo-scrollbar {
        scrollbar-width: thin;
        scrollbar-color: rgba(132, 218, 255, 0.45) rgba(255,255,255,0.14);
      }

      .milo-scrollbar::-webkit-scrollbar {
        height: 8px;
        width: 8px;
      }

      .milo-scrollbar::-webkit-scrollbar-thumb {
        background: rgba(132, 218, 255, 0.45);
        border-radius: 999px;
      }
    `}</style>
  );
}

export default function MiloStockExchangePage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";
  const isMobile = screenMode === "mobile";
  const isCompact = screenMode !== "desktop";

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dreamTokens, setDreamTokens] = useState(0);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [dob, setDob] = useState("");
  const [confirmAge, setConfirmAge] = useState(false);
  const [confirmTerms, setConfirmTerms] = useState(false);

  const [pageMessage, setPageMessage] = useState("");
  const [gateError, setGateError] = useState("");
  const [tradeMessage, setTradeMessage] = useState("");

  const selectedStock =
    stocks.find((stock) => stock.symbol === selectedSymbol) || stocks[0];

  const portfolioValue = useMemo(() => {
    return holdings.reduce((total, holding) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      if (!stock) return total;
      return total + holding.quantity * stock.current_price;
    }, 0);
  }, [holdings, stocks]);

  const totalEstimatedValue = dreamTokens + portfolioValue;

  const isLockedUnder16 = useMemo(() => {
    if (!profile?.milo_exchange_locked_until) return false;
    if (profile.milo_exchange_unlocked) return false;
    return profile.milo_exchange_locked_until > getTodayDateOnly();
  }, [profile]);

  const canEnterExchange =
    Boolean(profile?.milo_exchange_unlocked) &&
    Boolean(profile?.milo_exchange_terms_accepted_at) &&
    (profile?.milo_exchange_age_band === "16_17" ||
      profile?.milo_exchange_age_band === "18_plus");

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setPageMessage("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([
      loadProfile(user.id),
      loadDreamTokens(user.id),
      loadStocks(),
      loadHoldings(user.id),
      loadTrades(user.id),
    ]);

    setLoading(false);
  }

  async function loadProfile(id: string) {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        `
        id,
        email,
        role,
        tier,
        milo_exchange_age_band,
        milo_exchange_unlocked,
        milo_exchange_locked_until,
        milo_exchange_age_verified_at,
        milo_exchange_age_verification_method,
        milo_exchange_terms_accepted_at
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Could not load profile:", error.message);
      setPageMessage("Could not load your profile.");
      return;
    }

    setProfile(data as Profile);
  }

  async function loadDreamTokens(id: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", id)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      setDreamTokens(0);
      return;
    }

    const total = data?.reduce((sum, row) => sum + (row.amount || 0), 0) || 0;
    setDreamTokens(total);
  }

  async function loadStocks() {
    const { data, error } = await supabase
      .from("milo_exchange_stocks")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("Could not load stocks:", error.message);
      setPageMessage("Could not load Milo’s fictional stocks.");
      return;
    }

    const nextStocks = (data || []) as Stock[];
    setStocks(nextStocks);

    if (nextStocks.length > 0) {
      setSelectedSymbol((current) => current || nextStocks[0].symbol);
    }
  }

  async function loadHoldings(id: string) {
    const { data, error } = await supabase
      .from("milo_exchange_holdings")
      .select("*")
      .eq("user_id", id)
      .order("symbol", { ascending: true });

    if (error) {
      console.warn("Could not load holdings:", error.message);
      return;
    }

    setHoldings((data || []) as Holding[]);
  }

  async function loadTrades(id: string) {
    const { data, error } = await supabase
      .from("milo_exchange_trades")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(8);

    if (error) {
      console.warn("Could not load trades:", error.message);
      return;
    }

    setTrades((data || []) as Trade[]);
  }

  function getHolding(symbol: string) {
    return holdings.find((holding) => holding.symbol === symbol);
  }

  function getChangePercent(stock: Stock) {
    if (!stock.previous_price) return 0;
    return (
      ((stock.current_price - stock.previous_price) / stock.previous_price) *
      100
    );
  }

  async function handleAgeVerification() {
    if (!userId) return;

    setGateError("");

    if (!dob) {
      setGateError("Please enter your date of birth.");
      return;
    }

    if (!confirmAge) {
      setGateError("Please confirm that your date of birth is accurate.");
      return;
    }

    if (!confirmTerms) {
      setGateError(
        "Please confirm that you understand this is a fictional market simulator."
      );
      return;
    }

    const age = calculateAge(dob);

    if (Number.isNaN(age) || age < 0 || age > 120) {
      setGateError("Please enter a valid date of birth.");
      return;
    }

    const ageBand = getAgeBand(age);
    const now = new Date().toISOString();

    setActionLoading(true);

    if (age < 16) {
      const lockedUntil = getSixteenthBirthday(dob);

      const { error } = await supabase
        .from("profiles")
        .update({
          milo_exchange_age_band: ageBand,
          milo_exchange_unlocked: false,
          milo_exchange_locked_until: lockedUntil,
          milo_exchange_age_verified_at: now,
          milo_exchange_age_verification_method: "self_declared_dob",
          milo_exchange_terms_accepted_at: null,
        })
        .eq("id", userId);

      setActionLoading(false);

      if (error) {
        console.warn("Age gate update failed:", error.message);
        setGateError(
          "Could not save your age check. Check the profiles update policy."
        );
        return;
      }

      await loadProfile(userId);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        milo_exchange_age_band: ageBand,
        milo_exchange_unlocked: true,
        milo_exchange_locked_until: null,
        milo_exchange_age_verified_at: now,
        milo_exchange_age_verification_method: "self_declared_dob",
        milo_exchange_terms_accepted_at: now,
      })
      .eq("id", userId);

    setActionLoading(false);

    if (error) {
      console.warn("Age gate update failed:", error.message);
      setGateError(
        "Could not unlock Milo’s Stock Exchange. Check the profiles update policy."
      );
      return;
    }

    await loadProfile(userId);
  }

  async function addTokenTransaction(
    id: string,
    amount: number,
    title: string
  ) {
    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: id,
      amount,
      token_kind: "virtual",
      type: amount < 0 ? "spend" : "earn",
      title,
    });

    if (error) {
      console.warn("Token transaction failed:", error.message);
      return false;
    }

    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  async function refreshUserData() {
    if (!userId) return;

    await Promise.all([
      loadProfile(userId),
      loadDreamTokens(userId),
      loadHoldings(userId),
      loadTrades(userId),
    ]);
  }

  async function buyStock() {
    if (!userId || !selectedStock || !canEnterExchange) return;

    setTradeMessage("");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const total = qty * selectedStock.current_price;

    if (total > dreamTokens) {
      setTradeMessage("You do not have enough Dreamscape Tokens for this trade.");
      return;
    }

    setActionLoading(true);

    const tokenSaved = await addTokenTransaction(
      userId,
      -total,
      `Bought ${qty} ${selectedStock.symbol} in Milo’s Stock Exchange`
    );

    if (!tokenSaved) {
      setActionLoading(false);
      setTradeMessage("Could not deduct Dreamscape Tokens.");
      return;
    }

    const existingHolding = getHolding(selectedStock.symbol);

    if (existingHolding) {
      const currentTotalCost =
        existingHolding.quantity * existingHolding.average_price;
      const newQuantity = existingHolding.quantity + qty;
      const newAveragePrice = Math.round(
        (currentTotalCost + total) / newQuantity
      );

      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .update({
          quantity: newQuantity,
          average_price: newAveragePrice,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingHolding.id);

      if (holdingError) {
        console.warn("Holding update failed:", holdingError.message);
        setTradeMessage(
          "Tokens were deducted, but the holding update failed. Please check Supabase policies."
        );
        setActionLoading(false);
        await refreshUserData();
        return;
      }
    } else {
      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .insert({
          user_id: userId,
          symbol: selectedStock.symbol,
          quantity: qty,
          average_price: selectedStock.current_price,
        });

      if (holdingError) {
        console.warn("Holding insert failed:", holdingError.message);
        setTradeMessage(
          "Tokens were deducted, but the holding insert failed. Please check Supabase policies."
        );
        setActionLoading(false);
        await refreshUserData();
        return;
      }
    }

    await supabase.from("milo_exchange_trades").insert({
      user_id: userId,
      symbol: selectedStock.symbol,
      side: "buy",
      quantity: qty,
      price: selectedStock.current_price,
      total,
    });

    setTradeMessage(
      `Bought ${qty} share${qty === 1 ? "" : "s"} of ${selectedStock.symbol}.`
    );

    await refreshUserData();
    setActionLoading(false);
  }

  async function sellStock() {
    if (!userId || !selectedStock || !canEnterExchange) return;

    setTradeMessage("");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));
    const existingHolding = getHolding(selectedStock.symbol);

    if (!existingHolding || existingHolding.quantity < qty) {
      setTradeMessage("You do not have enough shares to sell.");
      return;
    }

    const total = qty * selectedStock.current_price;
    const remainingQuantity = existingHolding.quantity - qty;

    setActionLoading(true);

    if (remainingQuantity <= 0) {
      const { error: deleteError } = await supabase
        .from("milo_exchange_holdings")
        .delete()
        .eq("id", existingHolding.id);

      if (deleteError) {
        console.warn("Holding delete failed:", deleteError.message);
        setTradeMessage("Could not update your holding. Please try again.");
        setActionLoading(false);
        return;
      }
    } else {
      const { error: holdingError } = await supabase
        .from("milo_exchange_holdings")
        .update({
          quantity: remainingQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingHolding.id);

      if (holdingError) {
        console.warn("Holding update failed:", holdingError.message);
        setTradeMessage("Could not update your holding. Please try again.");
        setActionLoading(false);
        return;
      }
    }

    const tokenSaved = await addTokenTransaction(
      userId,
      total,
      `Sold ${qty} ${selectedStock.symbol} in Milo’s Stock Exchange`
    );

    if (!tokenSaved) {
      setTradeMessage(
        "The holding was updated, but the token credit failed. Please check Supabase policies."
      );
      setActionLoading(false);
      await refreshUserData();
      return;
    }

    await supabase.from("milo_exchange_trades").insert({
      user_id: userId,
      symbol: selectedStock.symbol,
      side: "sell",
      quantity: qty,
      price: selectedStock.current_price,
      total,
    });

    setTradeMessage(
      `Sold ${qty} share${qty === 1 ? "" : "s"} of ${selectedStock.symbol}.`
    );

    await refreshUserData();
    setActionLoading(false);
  }

  const pageShell: CSSProperties = {
    position: "relative",
    minHeight: "100vh",
    background: "#020817",
    color: "white",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    overflowX: "hidden",
  };

  const contentWrap: CSSProperties = {
    position: "relative",
    zIndex: 5,
    width: "min(1180px, calc(100% - 36px))",
    margin: "0 auto",
    padding: isMobile ? "18px 0 80px" : "28px 0 90px",
  };

  const glassPanel: CSSProperties = {
    borderRadius: isMobile ? "22px" : "30px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(5, 13, 28, 0.68)",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.46), inset 0 0 42px rgba(83,215,255,0.04)",
    backdropFilter: "blur(18px)",
    WebkitBackdropFilter: "blur(18px)",
  };

  const navButtonStyle: CSSProperties = {
    minHeight: isMobile ? "38px" : "42px",
    padding: isMobile ? "0 14px" : "0 22px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.08em" : "0.16em",
    fontSize: isMobile ? "11px" : "13px",
    fontWeight: 800,
    border: "1px solid rgba(132,218,255,0.22)",
    background: "rgba(5,13,28,0.62)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    boxShadow: "0 14px 34px rgba(0,0,0,0.28)",
  };

  const primaryButton: CSSProperties = {
    minHeight: "48px",
    padding: "0 24px",
    borderRadius: "999px",
    border: "1px solid rgba(132,218,255,0.32)",
    background: "rgba(83,215,255,0.16)",
    color: "white",
    fontWeight: 900,
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 0 24px rgba(83,215,255,0.12)",
  };

  const secondaryButton: CSSProperties = {
    ...primaryButton,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "none",
  };

  const inputStyle: CSSProperties = {
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "0 16px",
    fontSize: "15px",
    outline: "none",
    fontFamily: "inherit",
  };

  function Background() {
    return (
      <>
        <video
          src="/milo-world/milo-world-bg-loop.mp4"
          poster="/milo-world/milo-world-bg.png"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            zIndex: 0,
            transform: "scale(1.01)",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(to bottom, rgba(2,8,23,0.2), rgba(2,8,23,0.44) 42%, rgba(2,8,23,0.88)), linear-gradient(to right, rgba(2,8,23,0.4), transparent 45%, rgba(2,8,23,0.36))",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            boxShadow: "inset 0 0 190px rgba(0,0,0,0.78)",
          }}
        />
      </>
    );
  }

  function CenterPanel({
    eyebrow,
    title,
    children,
  }: {
    eyebrow: string;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <main style={pageShell}>
        <ResponsiveScrollStyles />
        <Background />

        <div
          style={{
            position: "relative",
            zIndex: 5,
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: isMobile ? "18px" : "32px",
          }}
        >
          <section
            style={{
              ...glassPanel,
              width: "min(760px, 100%)",
              padding: isMobile ? "24px" : "38px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              {eyebrow}
            </p>

            <h1
              style={{
                margin: "14px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "40px" : "58px",
                fontWeight: 500,
                lineHeight: 1,
                color: "white",
              }}
            >
              {title}
            </h1>

            <div
              style={{
                marginTop: "22px",
                color: "rgba(255,255,255,0.78)",
                fontSize: "16px",
                lineHeight: 1.65,
              }}
            >
              {children}
            </div>
          </section>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <CenterPanel eyebrow="Milo’s Stock Exchange" title="Loading...">
        <p>Preparing Milo’s fictional market.</p>
      </CenterPanel>
    );
  }

  if (!userId) {
    return (
      <CenterPanel
        eyebrow="16+ Feature"
        title="Log in to enter Milo’s Stock Exchange"
      >
        <p>
          This feature uses your Dreamscape profile to check access and save
          your fictional portfolio.
        </p>

        <div
          style={{
            marginTop: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <Link href="/login" style={primaryButton}>
            Log In
          </Link>

          <Link href="/milo-world" style={secondaryButton}>
            Back to Milo’s World
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (isLockedUnder16) {
    return (
      <CenterPanel
        eyebrow="Locked Feature"
        title="Milo’s Stock Exchange is for users aged 16 and above."
      >
        <p>
          This exchange is locked for your account. You can still earn
          Dreamscape Tokens in the Activity Lab and use other Dreamscape
          features.
        </p>

        {profile?.milo_exchange_locked_until && (
          <p style={{ color: "rgba(255,255,255,0.58)", fontSize: "14px" }}>
            This feature can be reviewed again from{" "}
            {profile.milo_exchange_locked_until}.
          </p>
        )}

        <div style={{ marginTop: "24px" }}>
          <Link href="/milo-world" style={primaryButton}>
            Back to Milo’s World
          </Link>
        </div>
      </CenterPanel>
    );
  }

  if (!canEnterExchange) {
    return (
      <CenterPanel
        eyebrow="Age Check Required"
        title="Milo’s Stock Exchange is for users aged 16 and above."
      >
        <p>
          Please verify your age before entering. This is a fictional market
          simulator using earned Dreamscape Tokens only.
        </p>

        <div style={{ marginTop: "24px", display: "grid", gap: "16px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span
              style={{
                color: "rgba(255,255,255,0.72)",
                fontSize: "12px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Date of birth
            </span>

            <input
              type="date"
              value={dob}
              onChange={(event) => setDob(event.target.value)}
              style={inputStyle}
            />
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr",
              gap: "12px",
              alignItems: "start",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
            }}
          >
            <input
              type="checkbox"
              checked={confirmAge}
              onChange={(event) => setConfirmAge(event.target.checked)}
              style={{ marginTop: "4px" }}
            />
            <span>I confirm that my date of birth is accurate.</span>
          </label>

          <label
            style={{
              display: "grid",
              gridTemplateColumns: "20px 1fr",
              gap: "12px",
              alignItems: "start",
              color: "rgba(255,255,255,0.78)",
              lineHeight: 1.55,
            }}
          >
            <input
              type="checkbox"
              checked={confirmTerms}
              onChange={(event) => setConfirmTerms(event.target.checked)}
              style={{ marginTop: "4px" }}
            />
            <span>
              I understand this is a fictional market simulator. Dreamscape
              Tokens have no cash value, cannot be purchased here, and cannot be
              cashed out.
            </span>
          </label>

          {gateError && (
            <p style={{ color: "#ffb0b0", fontWeight: 800 }}>{gateError}</p>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            <button
              type="button"
              onClick={handleAgeVerification}
              disabled={actionLoading}
              style={{
                ...primaryButton,
                opacity: actionLoading ? 0.6 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Checking..." : "Continue"}
            </button>

            <Link href="/milo-world" style={secondaryButton}>
              Back to Milo’s World
            </Link>
          </div>
        </div>
      </CenterPanel>
    );
  }

  return (
    <main className="milo-scrollbar" style={pageShell}>
      <ResponsiveScrollStyles />
      <Background />

      <div style={contentWrap}>
        <header
          style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "stretch" : "center",
            gap: "12px",
            marginBottom: isMobile ? "22px" : "28px",
          }}
        >
          <Link href="/milo-world" style={navButtonStyle}>
            ← Milo’s World
          </Link>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              justifyContent: isMobile ? "flex-start" : "flex-end",
            }}
          >
            {["16+ Fictional Market", "No token purchasing"].map((label) => (
              <span
                key={label}
                style={{
                  minHeight: "38px",
                  padding: "0 14px",
                  borderRadius: "999px",
                  display: "inline-flex",
                  alignItems: "center",
                  color: "#8ee8ff",
                  fontSize: "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(132,218,255,0.2)",
                  background: "rgba(5,13,28,0.62)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                {label}
              </span>
            ))}
          </div>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 320px",
            gap: "18px",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              ...glassPanel,
              padding: isMobile ? "24px" : "36px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Milo’s Stock Exchange
            </p>

            <h1
              style={{
                margin: "16px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "44px" : isCompact ? "58px" : "74px",
                fontWeight: 500,
                lineHeight: 0.95,
                color: "white",
                textShadow: "0 18px 60px rgba(0,0,0,0.45)",
              }}
            >
              Build your Dreamscape portfolio.
            </h1>

            <p
              style={{
                margin: "22px 0 0",
                maxWidth: "760px",
                color: "rgba(255,255,255,0.78)",
                fontSize: isMobile ? "16px" : "18px",
                lineHeight: 1.7,
              }}
            >
              Buy and sell fictional Dreamscape stocks using earned Dreamscape
              Tokens. No real money. No cash-out. No real financial advice.
            </p>

            {pageMessage && (
              <p style={{ color: "#ffd18a", fontWeight: 800 }}>{pageMessage}</p>
            )}
          </div>

          <div
            style={{
              ...glassPanel,
              padding: "28px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: "220px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.58)",
                fontSize: "13px",
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Available Tokens
            </p>

            <strong
              style={{
                marginTop: "12px",
                color: "white",
                fontSize: "46px",
                lineHeight: 1,
                letterSpacing: "-0.06em",
              }}
            >
              {formatNumber(dreamTokens)} DT
            </strong>

            <span
              style={{
                display: "block",
                marginTop: "12px",
                color: "rgba(255,255,255,0.58)",
                fontSize: "14px",
                lineHeight: 1.45,
              }}
            >
              Earned from Dreamscape gameplay
            </span>
          </div>
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          {[
            ["Portfolio Value", `${formatNumber(portfolioValue)} DT`],
            ["Total Estimated Value", `${formatNumber(totalEstimatedValue)} DT`],
            ["Token Purchases", "Disabled"],
          ].map(([label, value]) => (
            <article
              key={label}
              style={{
                ...glassPanel,
                padding: "22px",
              }}
            >
              <span
                style={{
                  color: "rgba(255,255,255,0.58)",
                  fontWeight: 800,
                }}
              >
                {label}
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "10px",
                  fontSize: "28px",
                  letterSpacing: "-0.04em",
                }}
              >
                {value}
              </strong>
            </article>
          ))}
        </section>

        <section
          style={{
            marginTop: "18px",
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 360px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <section
            style={{
              ...glassPanel,
              padding: isMobile ? "22px" : "28px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "13px",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Market
            </p>

            <h2
              style={{
                margin: "12px 0 22px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "34px" : "42px",
                fontWeight: 500,
                lineHeight: 1,
                color: "white",
              }}
            >
              Fictional Dreamscape Stocks
            </h2>

            {stocks.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.7)" }}>
                No active fictional stocks found. Check the
                milo_exchange_stocks table.
              </p>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: "14px",
                }}
              >
                {stocks.map((stock) => {
                  const holding = getHolding(stock.symbol);
                  const isSelected = selectedSymbol === stock.symbol;
                  const change = getChangePercent(stock);

                  return (
                    <button
                      key={stock.symbol}
                      type="button"
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      style={{
                        minHeight: "178px",
                        padding: "18px",
                        borderRadius: "22px",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        background: isSelected
                          ? "rgba(83,215,255,0.14)"
                          : "rgba(5,13,28,0.52)",
                        border: isSelected
                          ? "1px solid rgba(132,218,255,0.62)"
                          : "1px solid rgba(132,218,255,0.18)",
                        boxShadow: isSelected
                          ? "0 0 36px rgba(83,215,255,0.16)"
                          : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                        }}
                      >
                        <strong style={{ fontSize: "18px" }}>
                          {stock.symbol}
                        </strong>

                        <span
                          style={{
                            color: change >= 0 ? "#8ee8ff" : "#ffb0b0",
                            fontWeight: 900,
                          }}
                        >
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      </div>

                      <h3
                        style={{
                          margin: "14px 0 0",
                          fontSize: "20px",
                          lineHeight: 1.15,
                        }}
                      >
                        {stock.name}
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "14px",
                        }}
                      >
                        {stock.sector}
                      </p>

                      <div
                        style={{
                          marginTop: "22px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "12px",
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <span
                          style={{
                            color: "#ffd18a",
                            fontWeight: 900,
                          }}
                        >
                          {stock.current_price} DT
                        </span>

                        <small>You own {holding?.quantity || 0}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <aside
            style={{
              ...glassPanel,
              padding: "28px",
              position: isDesktop ? "sticky" : "relative",
              top: isDesktop ? "24px" : "auto",
            }}
          >
            {selectedStock ? (
              <>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "13px",
                    letterSpacing: "0.24em",
                    textTransform: "uppercase",
                    fontWeight: 900,
                  }}
                >
                  Trade
                </p>

                <h2
                  style={{
                    margin: "12px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "36px",
                    fontWeight: 500,
                    lineHeight: 1,
                  }}
                >
                  {selectedStock.name}
                </h2>

                <p
                  style={{
                    color: "rgba(255,255,255,0.68)",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedStock.description}
                </p>

                <div
                  style={{
                    marginTop: "18px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.58)" }}>
                    Current Price
                  </span>
                  <strong>{selectedStock.current_price} DT</strong>
                </div>

                <label
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      color: "rgba(255,255,255,0.72)",
                      fontSize: "12px",
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Quantity
                  </span>

                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value))}
                    style={inputStyle}
                  />
                </label>

                <div
                  style={{
                    marginTop: "18px",
                    borderRadius: "18px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    padding: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <span style={{ color: "rgba(255,255,255,0.58)" }}>
                    Estimated Total
                  </span>
                  <strong>
                    {formatNumber(
                      Math.max(1, Math.floor(Number(quantity) || 1)) *
                        selectedStock.current_price
                    )}{" "}
                    DT
                  </strong>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <button
                    type="button"
                    onClick={buyStock}
                    disabled={actionLoading}
                    style={{
                      height: "48px",
                      borderRadius: "14px",
                      border: "1px solid rgba(132,218,255,0.3)",
                      background: "rgba(83,215,255,0.16)",
                      color: "white",
                      fontWeight: 900,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    Buy
                  </button>

                  <button
                    type="button"
                    onClick={sellStock}
                    disabled={actionLoading}
                    style={{
                      height: "48px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.22)",
                      background: "rgba(255,255,255,0.08)",
                      color: "white",
                      fontWeight: 900,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      opacity: actionLoading ? 0.6 : 1,
                    }}
                  >
                    Sell
                  </button>
                </div>

                {tradeMessage && (
                  <p
                    style={{
                      marginTop: "16px",
                      color: "#ffd18a",
                      fontWeight: 800,
                      lineHeight: 1.5,
                    }}
                  >
                    {tradeMessage}
                  </p>
                )}
              </>
            ) : (
              <p>Select a stock to begin trading.</p>
            )}
          </aside>
        </section>

        <section
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "22px" : "28px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "13px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Portfolio
          </p>

          <h2
            style={{
              margin: "12px 0 22px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "42px",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            Your Holdings
          </h2>

          {holdings.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.68)" }}>
              You do not own any fictional stocks yet. Choose a stock above to
              start building your Dreamscape portfolio.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {!isMobile && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 0.6fr 0.8fr 0.9fr",
                    gap: "12px",
                    padding: "0 14px 8px",
                    color: "rgba(255,255,255,0.52)",
                    fontSize: "12px",
                    fontWeight: 900,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  <span>Stock</span>
                  <span>Qty</span>
                  <span>Avg Price</span>
                  <span>Current Value</span>
                </div>
              )}

              {holdings.map((holding) => {
                const stock = stocks.find((item) => item.symbol === holding.symbol);
                if (!stock) return null;

                return (
                  <div
                    key={holding.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "1.4fr 0.6fr 0.8fr 0.9fr",
                      gap: isMobile ? "8px" : "12px",
                      padding: "16px",
                      borderRadius: "16px",
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                  >
                    <span>
                      <strong>{holding.symbol}</strong>
                      <small
                        style={{
                          display: "block",
                          marginTop: "4px",
                          color: "rgba(255,255,255,0.52)",
                        }}
                      >
                        {stock.name}
                      </small>
                    </span>

                    <span>{holding.quantity}</span>
                    <span>{holding.average_price} DT</span>
                    <span>
                      {formatNumber(holding.quantity * stock.current_price)} DT
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "22px" : "28px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#8ee8ff",
              fontSize: "13px",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              fontWeight: 900,
            }}
          >
            Recent Activity
          </p>

          <h2
            style={{
              margin: "12px 0 22px",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "34px" : "42px",
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            Trade History
          </h2>

          {trades.length === 0 ? (
            <p style={{ color: "rgba(255,255,255,0.68)" }}>No trades yet.</p>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  style={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    justifyContent: "space-between",
                    gap: "12px",
                    padding: "16px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  <div>
                    <strong>
                      {trade.side === "buy" ? "Bought" : "Sold"}{" "}
                      {trade.quantity} {trade.symbol}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        marginTop: "4px",
                        color: "rgba(255,255,255,0.52)",
                        fontSize: "13px",
                      }}
                    >
                      {formatDateTime(trade.created_at)}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      color: "#ffd18a",
                      fontWeight: 900,
                    }}
                  >
                    {formatNumber(trade.total)} DT
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section
          style={{
            ...glassPanel,
            marginTop: "18px",
            padding: isMobile ? "22px" : "28px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: isMobile ? "32px" : "40px",
              fontWeight: 500,
            }}
          >
            Simulator Notice
          </h2>

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.65,
            }}
          >
            Milo’s Stock Exchange is a fictional game simulator. It does not use
            real companies, real securities, real money, or financial advice.
            Dreamscape Tokens have no cash value, cannot be purchased on this
            exchange, and cannot be cashed out.
          </p>
        </section>
      </div>
    </main>
  );
}