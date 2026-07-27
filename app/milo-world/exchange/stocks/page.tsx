"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
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

type PricePoint = {
  id: string;
  symbol: string;
  price_date: string;
  price: number;
  created_at: string;
};

type NewsEvent = {
  id: string;
  symbol: string;
  event_date: string;
  visible_from: string;
  status: "published" | "teaser";
  headline: string;
  description: string;
  impact_label: "positive" | "negative" | "neutral" | "unknown";
  display_order: number;
  created_at: string;
};



function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function checkScreenSize() {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      if (width <= 820) {
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

function formatShortDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-SG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(`${value}T00:00:00`));
  } catch {
    return value;
  }
}

function ResponsiveScrollStyles() {
  return (
    <style>{`
      .milo-stock-page,
      .milo-stock-page * {
        box-sizing: border-box;
      }

      .milo-stock-page button,
      .milo-stock-page input,
      .milo-stock-page a {
        -webkit-tap-highlight-color: transparent;
      }

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

      .milo-market-strip {
        scroll-snap-type: x proximity;
        overscroll-behavior-inline: contain;
      }

      .milo-market-card {
        scroll-snap-align: start;
      }

      @media (max-width: 820px) {
        .milo-stock-page {
          overflow-x: hidden;
        }

        .milo-mobile-nav > * {
          min-width: 0;
        }
      }

      @media (max-width: 430px) {
        .milo-summary-grid {
          grid-template-columns: 1fr !important;
        }
      }
    `}</style>
  );
}

function PriceHistoryChart({
  points,
  isMobile,
}: {
  points: PricePoint[];
  isMobile: boolean;
}) {
  if (points.length === 0) {
    return (
      <div
        style={{
          minHeight: "260px",
          borderRadius: "22px",
          border: "1px dashed rgba(132,218,255,0.24)",
          background: "rgba(5,13,28,0.42)",
          display: "grid",
          placeItems: "center",
          color: "rgba(255,255,255,0.58)",
          textAlign: "center",
          padding: "24px",
        }}
      >
        Price history has not been added for this stock yet.
      </div>
    );
  }

  const width = isMobile ? 680 : 900;
  const height = isMobile ? 270 : 340;
  const paddingLeft = 52;
  const paddingRight = 24;
  const paddingTop = 24;
  const paddingBottom = 44;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const prices = points.map((point) => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(1, maxPrice - minPrice);
  const paddedMin = Math.max(0, minPrice - Math.ceil(priceRange * 0.12));
  const paddedMax = maxPrice + Math.ceil(priceRange * 0.12);
  const paddedRange = Math.max(1, paddedMax - paddedMin);

  function getX(index: number) {
    if (points.length === 1) return paddingLeft;
    return paddingLeft + (index / (points.length - 1)) * chartWidth;
  }

  function getY(price: number) {
    return paddingTop + ((paddedMax - price) / paddedRange) * chartHeight;
  }

  const path = points
    .map((point, index) => {
      const x = getX(index);
      const y = getY(point.price);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const firstPoint = points[0];
  const middlePoint = points[Math.floor(points.length / 2)];
  const lastPoint = points[points.length - 1];

  const yLabels = [
    paddedMax,
    Math.round((paddedMax + paddedMin) / 2),
    paddedMin,
  ];

  return (
    <div
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: "22px",
        border: "1px solid rgba(132,218,255,0.18)",
        background:
          "linear-gradient(180deg, rgba(5,13,28,0.56), rgba(5,13,28,0.34))",
        padding: isMobile ? "12px" : "18px",
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        role="img"
        aria-label="Five-year fictional stock price history"
        style={{ display: "block", minWidth: isMobile ? "640px" : "100%" }}
      >
        <defs>
          <linearGradient id="miloChartGlow" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(142,232,255,0.26)" />
            <stop offset="100%" stopColor="rgba(142,232,255,0.02)" />
          </linearGradient>
        </defs>

        {yLabels.map((label) => {
          const y = getY(label);

          return (
            <g key={label}>
              <line
                x1={paddingLeft}
                x2={width - paddingRight}
                y1={y}
                y2={y}
                stroke="rgba(255,255,255,0.1)"
              />
              <text
                x={14}
                y={y + 4}
                fill="rgba(255,255,255,0.54)"
                fontSize="13"
                fontWeight="700"
              >
                {label} DT
              </text>
            </g>
          );
        })}

        <path
          d={`${path} L ${getX(points.length - 1)} ${
            height - paddingBottom
          } L ${paddingLeft} ${height - paddingBottom} Z`}
          fill="url(#miloChartGlow)"
        />

        <path
          d={path}
          fill="none"
          stroke="#8ee8ff"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, index) => {
          const showPoint =
            index === 0 || index === points.length - 1 || index % 4 === 0;

          if (!showPoint) return null;

          return (
            <g key={`${point.symbol}-${point.price_date}`}>
              <circle
                cx={getX(index)}
                cy={getY(point.price)}
                r="6"
                fill="#8ee8ff"
                stroke="rgba(5,13,28,0.88)"
                strokeWidth="3"
              />

              <text
                x={getX(index)}
                y={getY(point.price) - 14}
                fill="rgba(255,255,255,0.72)"
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
              >
                {point.price}
              </text>
            </g>
          );
        })}

        {[firstPoint, middlePoint, lastPoint].map((point, index) => {
          const pointIndex = points.findIndex(
            (item) => item.price_date === point.price_date
          );

          return (
            <text
              key={`${point.price_date}-${index}`}
              x={getX(pointIndex)}
              y={height - 14}
              fill="rgba(255,255,255,0.54)"
              fontSize="13"
              fontWeight="700"
              textAnchor={
                index === 0 ? "start" : index === 2 ? "end" : "middle"
              }
            >
              {formatShortDate(point.price_date)}
            </text>
          );
        })}
      </svg>
    </div>
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
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);

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

  const portfolioCostBasis = useMemo(() => {
    return holdings.reduce(
      (total, holding) =>
        total + holding.quantity * Number(holding.average_price || 0),
      0
    );
  }, [holdings]);

  const portfolioProfitLoss = portfolioValue - portfolioCostBasis;
  const portfolioProfitLossPercent =
    portfolioCostBasis > 0
      ? (portfolioProfitLoss / portfolioCostBasis) * 100
      : 0;

  const totalEstimatedValue = dreamTokens + portfolioValue;

  const selectedPriceHistory = useMemo(() => {
    if (!selectedStock) return [];

    return priceHistory.filter((point) => point.symbol === selectedStock.symbol);
  }, [priceHistory, selectedStock]);

  const selectedNewsEvents = useMemo(() => {
    if (!selectedStock) return [];

    return newsEvents.filter((event) => event.symbol === selectedStock.symbol);
  }, [newsEvents, selectedStock]);

  const selectedPastNews = useMemo(() => {
    return selectedNewsEvents.filter((event) => event.status === "published");
  }, [selectedNewsEvents]);

  const selectedUpcomingNews = useMemo(() => {
    return selectedNewsEvents.filter((event) => event.status === "teaser");
  }, [selectedNewsEvents]);

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
      loadPriceHistory(),
      loadNewsEvents(),
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

  async function loadPriceHistory() {
    const { data, error } = await supabase
      .from("milo_exchange_price_history")
      .select("*")
      .order("price_date", { ascending: true });

    if (error) {
      console.warn("Could not load price history:", error.message);
      return;
    }

    setPriceHistory((data || []) as PricePoint[]);
  }

  async function loadNewsEvents() {
    const { data, error } = await supabase
      .from("milo_exchange_news_events")
      .select("*")
      .order("event_date", { ascending: true })
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("Could not load news events:", error.message);
      return;
    }

    setNewsEvents((data || []) as NewsEvent[]);
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
      loadStocks(),
      loadPriceHistory(),
      loadNewsEvents(),
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
      `Bought ${qty} share${qty === 1 ? "" : "s"} of ${
        selectedStock.symbol
      }.`
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
      `Sold ${qty} share${qty === 1 ? "" : "s"} of ${
        selectedStock.symbol
      }.`
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
    width: isMobile
      ? "min(100%, calc(100% - 20px))"
      : "min(1680px, calc(100% - 36px))",
    margin: "0 auto",
    padding: isMobile ? "12px 0 64px" : "28px 0 90px",
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
    minHeight: isMobile ? "44px" : "42px",
    padding: isMobile ? "0 12px" : "0 22px",
    borderRadius: "999px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    color: "rgba(255,255,255,0.9)",
    textDecoration: "none",
    textTransform: "uppercase",
    letterSpacing: isMobile ? "0.08em" : "0.16em",
    fontSize: isMobile ? "10px" : "13px",
    fontWeight: 800,
    whiteSpace: "nowrap",
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
    fontFamily: "inherit",
  };

  const secondaryButton: CSSProperties = {
    ...primaryButton,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow: "none",
  };

  const inputStyle: CSSProperties = {
    width: "100%",
    minWidth: 0,
    height: "48px",
    borderRadius: "14px",
    border: "1px solid rgba(132,218,255,0.2)",
    background: "rgba(255,255,255,0.1)",
    color: "white",
    padding: "0 16px",
    fontSize: "16px",
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
    children: ReactNode;
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

          <Link href="/milo-world/exchange" style={secondaryButton}>
            Back to Milo’s Exchange
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
          <Link href="/milo-world/exchange" style={primaryButton}>
            Back to Milo’s Exchange
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

            <Link href="/milo-world/exchange" style={secondaryButton}>
              Back to Milo’s Exchange
            </Link>
          </div>
        </div>
      </CenterPanel>
    );
  }

  return (
    <main className="milo-stock-page milo-scrollbar" style={pageShell}>
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
            marginBottom: isMobile ? "24px" : "30px",
          }}
        >
          <Link
            href="/milo-world/exchange"
            style={{
              ...navButtonStyle,
              width: isMobile ? "100%" : "auto",
            }}
          >
            ← Exchange Home
          </Link>

          <div
            className="milo-mobile-nav"
            style={{
              display: isMobile ? "grid" : "flex",
              gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
              flexWrap: "wrap",
              gap: "10px",
              width: isMobile ? "100%" : "auto",
              justifyContent: isMobile ? "stretch" : "flex-end",
            }}
          >
            <span
              style={{
                ...navButtonStyle,
                color: "#8ee8ff",
                border: "1px solid rgba(132,218,255,0.34)",
                background: "rgba(83,215,255,0.12)",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Stock Exchange
            </span>

            <Link
              href="/milo-world/exchange/property"
              style={{
                ...navButtonStyle,
                color: "#ffd18a",
                border: "1px solid rgba(255,209,138,0.26)",
                background: "rgba(255,209,138,0.1)",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Property Exchange
            </Link>

            <Link
              href="/profile"
              style={{
                ...navButtonStyle,
                width: isMobile ? "100%" : "auto",
                gridColumn: isMobile ? "1 / -1" : undefined,
              }}
            >
              My Account
            </Link>
          </div>
        </header>

        <section
          style={{
            marginBottom: "18px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: "18px",
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "38px" : isCompact ? "54px" : "68px",
                fontWeight: 500,
                lineHeight: 0.98,
                color: "white",
                textShadow: "0 18px 60px rgba(0,0,0,0.45)",
              }}
            >
              Milo’s Stock Exchange
            </h1>

            {pageMessage && (
              <p
                style={{
                  margin: "14px 0 0",
                  color: "#ffd18a",
                  fontWeight: 800,
                }}
              >
                {pageMessage}
              </p>
            )}
          </div>
        </section>

        <section
          className="milo-summary-grid"
          style={{
            marginBottom: "18px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr 1fr"
              : isCompact
              ? "repeat(3, minmax(0, 1fr))"
              : "repeat(5, minmax(0, 1fr))",
            gap: isMobile ? "10px" : "14px",
          }}
        >
          {[
            {
              label: "Available Tokens",
              value: `${formatNumber(dreamTokens)} DT`,
              color: "white",
              note: "Ready to use",
            },
            {
              label: "Portfolio Value",
              value: `${formatNumber(portfolioValue)} DT`,
              color: "white",
              note: "Current market value",
            },
            {
              label: "Overall Stock P/L",
              value: `${portfolioProfitLoss >= 0 ? "+" : "−"}${formatNumber(
                Math.abs(portfolioProfitLoss)
              )} DT`,
              color: portfolioProfitLoss >= 0 ? "#8ee8ff" : "#ffb0b0",
              note:
                portfolioCostBasis > 0
                  ? `${portfolioProfitLoss >= 0 ? "+" : ""}${portfolioProfitLossPercent.toFixed(
                      1
                    )}% · Cost ${formatNumber(portfolioCostBasis)} DT`
                  : "No holdings yet",
            },
            {
              label: "Estimated Total",
              value: `${formatNumber(totalEstimatedValue)} DT`,
              color: "white",
              note: "Tokens + stocks",
            },
            {
              label: "Token Purchases",
              value: "Disabled",
              color: "#ffd18a",
              note: "Earned tokens only",
            },
          ].map((item) => (
            <article
              key={item.label}
              style={{
                ...glassPanel,
                minWidth: 0,
                gridColumn:
                  item.label === "Token Purchases" && isMobile
                    ? "1 / -1"
                    : undefined,
                borderRadius: "20px",
                padding: isMobile ? "15px" : "18px",
              }}
            >
              <span
                style={{
                  display: "block",
                  color: "rgba(255,255,255,0.52)",
                  fontSize: isMobile ? "10px" : "12px",
                  fontWeight: 900,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {item.label}
              </span>

              <strong
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: item.color,
                  fontSize: isMobile ? "19px" : "24px",
                  letterSpacing: "-0.03em",
                  overflowWrap: "anywhere",
                }}
              >
                {item.value}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "6px",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: isMobile ? "10px" : "11px",
                  lineHeight: 1.35,
                }}
              >
                {item.note}
              </span>
            </article>
          ))}
        </section>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "260px minmax(0, 1fr) 350px",
            gap: isMobile ? "14px" : "18px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              ...glassPanel,
              padding: isMobile ? "18px" : "20px",
              position: isDesktop ? "sticky" : "relative",
              top: isDesktop ? "18px" : "auto",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "12px",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Market
            </p>

            <h2
              style={{
                margin: "10px 0 18px",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "30px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              Stocks
            </h2>

            {stocks.length === 0 ? (
              <p style={{ color: "rgba(255,255,255,0.68)", lineHeight: 1.55 }}>
                No active fictional stocks found.
              </p>
            ) : (
              <div
                className="milo-market-strip milo-scrollbar"
                style={{
                  display: isCompact ? "flex" : "grid",
                  gap: "10px",
                  overflowX: isCompact ? "auto" : "visible",
                  paddingBottom: isCompact ? "8px" : 0,
                }}
              >
                {stocks.map((stock) => {
                  const holding = getHolding(stock.symbol);
                  const isSelected = selectedStock?.symbol === stock.symbol;
                  const change = getChangePercent(stock);

                  return (
                    <button
                      key={stock.symbol}
                      className="milo-market-card"
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSymbol(stock.symbol)}
                      style={{
                        width: isCompact
                          ? isMobile
                            ? "min(78vw, 240px)"
                            : "220px"
                          : "100%",
                        flex: isCompact
                          ? isMobile
                            ? "0 0 min(78vw, 240px)"
                            : "0 0 220px"
                          : undefined,
                        minHeight: "112px",
                        padding: "15px",
                        borderRadius: "18px",
                        color: "white",
                        textAlign: "left",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        background: isSelected
                          ? "rgba(83,215,255,0.15)"
                          : "rgba(255,255,255,0.055)",
                        border: isSelected
                          ? "1px solid rgba(132,218,255,0.58)"
                          : "1px solid rgba(132,218,255,0.14)",
                        boxShadow: isSelected
                          ? "0 0 26px rgba(83,215,255,0.12)"
                          : "none",
                        transition:
                          "border-color 180ms ease, background 180ms ease, transform 180ms ease",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <strong style={{ fontSize: "17px" }}>
                          {stock.symbol}
                        </strong>

                        <span
                          style={{
                            color: change >= 0 ? "#8ee8ff" : "#ffb0b0",
                            fontSize: "13px",
                            fontWeight: 900,
                          }}
                        >
                          {change >= 0 ? "+" : ""}
                          {change.toFixed(1)}%
                        </span>
                      </div>

                      <span
                        style={{
                          display: "block",
                          marginTop: "8px",
                          color: "rgba(255,255,255,0.72)",
                          fontSize: "13px",
                          lineHeight: 1.35,
                        }}
                      >
                        {stock.name}
                      </span>

                      <div
                        style={{
                          marginTop: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "10px",
                        }}
                      >
                        <strong style={{ color: "#ffd18a", fontSize: "17px" }}>
                          {stock.current_price} DT
                        </strong>

                        <small style={{ color: "rgba(255,255,255,0.48)" }}>
                          Own {holding?.quantity || 0}
                        </small>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <div style={{ minWidth: 0, display: "grid", gap: "18px" }}>
            {selectedStock ? (
              <>
                <section
                  style={{
                    ...glassPanel,
                    padding: isMobile ? "20px" : "26px",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      justifyContent: "space-between",
                      alignItems: isMobile ? "flex-start" : "flex-end",
                      gap: "14px",
                      marginBottom: "18px",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          margin: 0,
                          color: "#8ee8ff",
                          fontSize: "12px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontWeight: 900,
                        }}
                      >
                        {selectedStock.sector}
                      </p>

                      <h2
                        style={{
                          margin: "9px 0 0",
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: isMobile ? "34px" : "42px",
                          fontWeight: 500,
                          lineHeight: 1,
                        }}
                      >
                        {selectedStock.symbol} Price Timeline
                      </h2>

                      <p
                        style={{
                          margin: "12px 0 0",
                          maxWidth: "760px",
                          color: "rgba(255,255,255,0.62)",
                          fontSize: "14px",
                          lineHeight: 1.55,
                        }}
                      >
                        {selectedStock.description}
                      </p>
                    </div>

                    <div
                      style={{
                        flex: "0 0 auto",
                        borderRadius: "18px",
                        padding: "12px 15px",
                        background: "rgba(255,209,138,0.09)",
                        border: "1px solid rgba(255,209,138,0.18)",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        Current Price
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "#ffd18a",
                          fontSize: "22px",
                        }}
                      >
                        {selectedStock.current_price} DT
                      </strong>
                    </div>
                  </div>

                  <PriceHistoryChart
                    points={selectedPriceHistory}
                    isMobile={isMobile}
                  />
                </section>

                <section
                  style={{
                    ...glassPanel,
                    padding: isMobile ? "20px" : "24px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: "16px",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "20px",
                        border: "1px solid rgba(132,218,255,0.12)",
                        background: "rgba(255,255,255,0.045)",
                        padding: "18px",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: "21px" }}>
                        Market News
                      </h3>

                      {selectedPastNews.length === 0 ? (
                        <p style={{ color: "rgba(255,255,255,0.58)" }}>
                          No published market news yet.
                        </p>
                      ) : (
                        <div
                          style={{
                            marginTop: "14px",
                            display: "grid",
                            gap: "10px",
                          }}
                        >
                          {selectedPastNews.map((event) => (
                            <article
                              key={event.id}
                              style={{
                                borderRadius: "15px",
                                background: "rgba(5,13,28,0.42)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                padding: "13px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  gap: "8px",
                                }}
                              >
                                <span
                                  style={{
                                    color: "#8ee8ff",
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {formatShortDate(event.event_date)}
                                </span>

                                <span
                                  style={{
                                    color:
                                      event.impact_label === "positive"
                                        ? "#8ee8ff"
                                        : event.impact_label === "negative"
                                        ? "#ffb0b0"
                                        : "rgba(255,255,255,0.5)",
                                    fontSize: "11px",
                                    fontWeight: 900,
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {event.impact_label}
                                </span>
                              </div>

                              <strong
                                style={{
                                  display: "block",
                                  marginTop: "8px",
                                  lineHeight: 1.35,
                                }}
                              >
                                {event.headline}
                              </strong>

                              <p
                                style={{
                                  margin: "7px 0 0",
                                  color: "rgba(255,255,255,0.58)",
                                  fontSize: "13px",
                                  lineHeight: 1.45,
                                }}
                              >
                                {event.description}
                              </p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      style={{
                        borderRadius: "20px",
                        border: "1px solid rgba(255,209,138,0.14)",
                        background: "rgba(255,209,138,0.045)",
                        padding: "18px",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: "21px" }}>
                        Upcoming Events
                      </h3>

                      <p
                        style={{
                          margin: "8px 0 0",
                          color: "rgba(255,255,255,0.52)",
                          fontSize: "13px",
                          lineHeight: 1.45,
                        }}
                      >
                        Future price effects remain hidden until release.
                      </p>

                      {selectedUpcomingNews.length === 0 ? (
                        <p style={{ color: "rgba(255,255,255,0.58)" }}>
                          No upcoming market events yet.
                        </p>
                      ) : (
                        <div
                          style={{
                            marginTop: "14px",
                            display: "grid",
                            gap: "10px",
                          }}
                        >
                          {selectedUpcomingNews.map((event) => (
                            <article
                              key={event.id}
                              style={{
                                borderRadius: "15px",
                                background: "rgba(5,13,28,0.42)",
                                border: "1px solid rgba(255,209,138,0.12)",
                                padding: "13px",
                              }}
                            >
                              <span
                                style={{
                                  color: "#ffd18a",
                                  fontSize: "11px",
                                  fontWeight: 900,
                                  textTransform: "uppercase",
                                }}
                              >
                                {formatShortDate(event.event_date)}
                              </span>

                              <strong
                                style={{
                                  display: "block",
                                  marginTop: "8px",
                                  lineHeight: 1.35,
                                }}
                              >
                                {event.headline}
                              </strong>

                              <p
                                style={{
                                  margin: "7px 0 0",
                                  color: "rgba(255,255,255,0.58)",
                                  fontSize: "13px",
                                  lineHeight: 1.45,
                                }}
                              >
                                {event.description}
                              </p>
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              </>
            ) : (
              <section
                style={{
                  ...glassPanel,
                  minHeight: "420px",
                  padding: "28px",
                  display: "grid",
                  placeItems: "center",
                  color: "rgba(255,255,255,0.62)",
                  textAlign: "center",
                }}
              >
                Select a stock to view its graph and news.
              </section>
            )}
          </div>

          <aside
            style={{
              display: "grid",
              gap: "18px",
              position: isDesktop ? "sticky" : "relative",
              top: isDesktop ? "18px" : "auto",
              minWidth: 0,
            }}
          >
            <section
              style={{
                ...glassPanel,
                padding: isMobile ? "20px" : "22px",
              }}
            >
              {selectedStock ? (
                <>
                  <p
                    style={{
                      margin: 0,
                      color: "#8ee8ff",
                      fontSize: "12px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Trade
                  </p>

                  <h2
                    style={{
                      margin: "10px 0 0",
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: "31px",
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    {selectedStock.symbol}
                  </h2>

                  <div
                    style={{
                      marginTop: "16px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: "15px",
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "13px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        Price
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "#ffd18a",
                        }}
                      >
                        {selectedStock.current_price} DT
                      </strong>
                    </div>

                    <div
                      style={{
                        borderRadius: "15px",
                        background: "rgba(255,255,255,0.07)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        padding: "13px",
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "11px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                        }}
                      >
                        You own
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "5px",
                        }}
                      >
                        {getHolding(selectedStock.symbol)?.quantity || 0}
                      </strong>
                    </div>
                  </div>

                  <label
                    style={{
                      marginTop: "16px",
                      display: "grid",
                      gap: "7px",
                    }}
                  >
                    <span
                      style={{
                        color: "rgba(255,255,255,0.62)",
                        fontSize: "11px",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        fontWeight: 900,
                      }}
                    >
                      Quantity
                    </span>

                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      step={1}
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(Number(event.target.value))
                      }
                      style={inputStyle}
                    />
                  </label>

                  <div
                    style={{
                      marginTop: "12px",
                      borderRadius: "15px",
                      background: "rgba(255,255,255,0.07)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      padding: "13px",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.52)" }}>
                      Total
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
                      marginTop: "14px",
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={buyStock}
                      disabled={actionLoading}
                      style={{
                        height: "46px",
                        borderRadius: "13px",
                        border: "1px solid rgba(132,218,255,0.3)",
                        background: "rgba(83,215,255,0.16)",
                        color: "white",
                        fontWeight: 900,
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        opacity: actionLoading ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      Buy
                    </button>

                    <button
                      type="button"
                      onClick={sellStock}
                      disabled={actionLoading}
                      style={{
                        height: "46px",
                        borderRadius: "13px",
                        border: "1px solid rgba(255,255,255,0.18)",
                        background: "rgba(255,255,255,0.07)",
                        color: "white",
                        fontWeight: 900,
                        cursor: actionLoading ? "not-allowed" : "pointer",
                        opacity: actionLoading ? 0.6 : 1,
                        fontFamily: "inherit",
                      }}
                    >
                      Sell
                    </button>
                  </div>

                  {tradeMessage && (
                    <p
                      style={{
                        margin: "13px 0 0",
                        color: "#ffd18a",
                        fontSize: "13px",
                        fontWeight: 800,
                        lineHeight: 1.45,
                      }}
                    >
                      {tradeMessage}
                    </p>
                  )}
                </>
              ) : (
                <p>Select a stock to begin trading.</p>
              )}
            </section>

            <section
              style={{
                ...glassPanel,
                padding: isMobile ? "20px" : "22px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#8ee8ff",
                  fontSize: "12px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Portfolio
              </p>

              <h2
                style={{
                  margin: "10px 0 8px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: "28px",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                My Holdings
              </h2>

              <p
                style={{
                  margin: "0 0 16px",
                  color: "rgba(255,255,255,0.42)",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                P/L compares each current holding value with its average
                purchase cost.
              </p>

              {holdings.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.58)",
                    fontSize: "13px",
                    lineHeight: 1.5,
                  }}
                >
                  You do not own any fictional stocks yet.
                </p>
              ) : (
                <div
                  className="milo-scrollbar"
                  style={{
                    display: "grid",
                    gap: "9px",
                    maxHeight: isDesktop ? "300px" : "none",
                    overflowY: isDesktop ? "auto" : "visible",
                    paddingRight: isDesktop ? "4px" : 0,
                  }}
                >
                  {holdings.map((holding) => {
                    const stock = stocks.find(
                      (item) => item.symbol === holding.symbol
                    );
                    if (!stock) return null;

                    const holdingValue =
                      holding.quantity * stock.current_price;
                    const holdingCost =
                      holding.quantity * Number(holding.average_price || 0);
                    const holdingProfitLoss = holdingValue - holdingCost;
                    const holdingProfitLossPercent =
                      holdingCost > 0
                        ? (holdingProfitLoss / holdingCost) * 100
                        : 0;

                    return (
                      <button
                        key={holding.id}
                        type="button"
                        onClick={() => setSelectedSymbol(holding.symbol)}
                        style={{
                          borderRadius: "15px",
                          border:
                            selectedStock?.symbol === holding.symbol
                              ? "1px solid rgba(132,218,255,0.4)"
                              : "1px solid rgba(255,255,255,0.09)",
                          background:
                            selectedStock?.symbol === holding.symbol
                              ? "rgba(83,215,255,0.11)"
                              : "rgba(255,255,255,0.055)",
                          padding: "12px",
                          color: "white",
                          textAlign: "left",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: "10px",
                          }}
                        >
                          <strong>{holding.symbol}</strong>
                          <strong style={{ color: "#ffd18a" }}>
                            {formatNumber(holdingValue)} DT
                          </strong>
                        </div>

                        <div
                          style={{
                            marginTop: "6px",
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            gap: "6px 10px",
                            color: "rgba(255,255,255,0.48)",
                            fontSize: "12px",
                          }}
                        >
                          <span>{holding.quantity} shares</span>
                          <span>Avg {holding.average_price} DT</span>
                        </div>

                        <div
                          style={{
                            marginTop: "7px",
                            display: "flex",
                            flexWrap: "wrap",
                            justifyContent: "space-between",
                            gap: "6px 10px",
                            fontSize: "12px",
                            fontWeight: 900,
                          }}
                        >
                          <span style={{ color: "rgba(255,255,255,0.42)" }}>
                            P/L
                          </span>
                          <span
                            style={{
                              color:
                                holdingProfitLoss >= 0
                                  ? "#8ee8ff"
                                  : "#ffb0b0",
                            }}
                          >
                            {holdingProfitLoss >= 0 ? "+" : "−"}
                            {formatNumber(Math.abs(holdingProfitLoss))} DT (
                            {holdingProfitLoss >= 0 ? "+" : ""}
                            {holdingProfitLossPercent.toFixed(1)}%)
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <section
              style={{
                ...glassPanel,
                padding: isMobile ? "20px" : "22px",
              }}
            >
              <p
                style={{
                  margin: 0,
                  color: "#8ee8ff",
                  fontSize: "12px",
                  letterSpacing: "0.2em",
                  textTransform: "uppercase",
                  fontWeight: 900,
                }}
              >
                Recent Activity
              </p>

              <h2
                style={{
                  margin: "10px 0 16px",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: "28px",
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                Trade History
              </h2>

              {trades.length === 0 ? (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255,255,255,0.58)",
                    fontSize: "13px",
                  }}
                >
                  No trades yet.
                </p>
              ) : (
                <div
                  className="milo-scrollbar"
                  style={{
                    display: "grid",
                    gap: "9px",
                    maxHeight: isDesktop ? "330px" : "none",
                    overflowY: isDesktop ? "auto" : "visible",
                    paddingRight: isDesktop ? "4px" : 0,
                  }}
                >
                  {trades.map((trade) => (
                    <div
                      key={trade.id}
                      style={{
                        borderRadius: "15px",
                        background: "rgba(255,255,255,0.055)",
                        border: "1px solid rgba(255,255,255,0.09)",
                        padding: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                        }}
                      >
                        <strong style={{ fontSize: "13px" }}>
                          {trade.side === "buy" ? "Bought" : "Sold"}{" "}
                          {trade.quantity} {trade.symbol}
                        </strong>
                        <strong
                          style={{
                            color:
                              trade.side === "buy" ? "#ffb0b0" : "#8ee8ff",
                            fontSize: "13px",
                          }}
                        >
                          {trade.side === "buy" ? "−" : "+"}
                          {formatNumber(trade.total)} DT
                        </strong>
                      </div>

                      <span
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "rgba(255,255,255,0.42)",
                          fontSize: "11px",
                        }}
                      >
                        {formatDateTime(trade.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        </section>

        <section
          style={{
            marginTop: "28px",
            display: "flex",
            flexDirection: isMobile ? "column-reverse" : "row",
            justifyContent: "flex-end",
            alignItems: isMobile ? "stretch" : "flex-end",
            gap: isMobile ? "4px" : "12px",
          }}
        >
          <div
            style={{
              position: "relative",
              width: isMobile ? "100%" : "min(470px, 42vw)",
              marginBottom: isMobile ? 0 : "76px",
              borderRadius: "24px 24px 6px 24px",
              border: "1px solid rgba(132,218,255,0.28)",
              background: "rgba(5,13,28,0.86)",
              boxShadow:
                "0 24px 70px rgba(0,0,0,0.42), 0 0 28px rgba(83,215,255,0.08)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              padding: isMobile ? "18px" : "21px 23px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "12px",
                letterSpacing: "0.17em",
                textTransform: "uppercase",
                fontWeight: 900,
              }}
            >
              Milo says
            </p>

            <p
              style={{
                margin: "9px 0 0",
                color: "rgba(255,255,255,0.78)",
                fontSize: isMobile ? "14px" : "15px",
                lineHeight: 1.6,
              }}
            >
              Choose a fictional stock on the left, study its price graph and
              market news in the middle, then trade and track your stock holdings
              on the right. Return to Exchange Home for your overall portfolio,
              leaderboard, friends and complete transaction history.
            </p>

            {!isMobile && (
              <span
                style={{
                  position: "absolute",
                  right: "-18px",
                  bottom: "14px",
                  width: 0,
                  height: 0,
                  borderTop: "14px solid transparent",
                  borderBottom: "14px solid transparent",
                  borderLeft: "18px solid rgba(132,218,255,0.28)",
                }}
              />
            )}
          </div>

          <img
            src="/milo-world/milo-character.png"
            alt="Milo"
            style={{
              width: "auto",
              height: isMobile ? "150px" : "210px",
              objectFit: "contain",
              alignSelf: isMobile ? "flex-end" : "auto",
              marginRight: isMobile ? "8px" : 0,
              filter: "drop-shadow(0 18px 40px rgba(0,0,0,0.58))",
              pointerEvents: "none",
            }}
          />
        </section>
      </div>
    </main>
  );
}