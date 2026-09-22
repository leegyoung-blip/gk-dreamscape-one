"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import MiloExchangeGuide from "../components/MiloExchangeGuide";

type ScreenMode = "desktop" | "tablet" | "mobile";
type ExchangeSection = "portfolio" | "market" | "trade";

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


type EmploymentCompany = {
  symbol: string;
  company_name: string;
  sector: string;
  health_score: number;
  hiring_index: number;
  workforce_sentiment: number;
  hiring_status: string;
  salary_index_bps: number;
  base_headcount: number;
  named_employee_count: number;
  avg_named_employee_income: number;
  recent_promotions: number;
  recent_hires: number;
  recent_layoffs: number;
  latest_published_headline: string | null;
  latest_published_impact: string | null;
  current_price: number;
  previous_price: number;
  description: string;
  updated_at: string | null;
};

type EmploymentResident = {
  resident_id: string;
  display_name: string;
  avatar_key: string | null;
  occupation: string;
  employment_status: string | null;
  employer_name: string | null;
  employer_kind: string | null;
  employer_stock_symbol: string | null;
  employment_stability: number;
  career_level: number;
  monthly_income: number;
  financial_pressure: number;
};

type EmploymentStats = {
  listed_companies: number;
  listed_company_workers: number;
  private_or_community_workers: number;
  self_employed: number;
  studying: number;
  between_jobs: number;
};

type EmploymentDashboard = {
  companies: EmploymentCompany[];
  residents: EmploymentResident[];
  stats: EmploymentStats;
};

type StockMarketState = {
  symbol: string;
  name: string;
  sector: string;
  current_price: number;
  previous_price: number;
  fundamental_score: number;
  fair_value_price: number;
  company_health: number;
  hiring_index: number;
  workforce_sentiment: number;
  player_buy_qty: number;
  player_sell_qty: number;
  agent_buy_qty: number;
  agent_sell_qty: number;
  fundamental_component_bps: number;
  player_flow_component_bps: number;
  agent_flow_component_bps: number;
  momentum_component_bps: number;
  noise_component_bps: number;
  daily_change_bps: number;
  market_mood: string;
  market_reason: string | null;
  last_settlement_date: string | null;
  last_settled_at: string | null;
};

type StockMarketOverall = {
  advancing: number;
  declining: number;
  unchanged: number;
  average_change_bps: number;
  market_mood: string;
  last_settled_at: string | null;
  active_synthetic_agents: number;
  price_movement_enabled: boolean;
};

type StockMarketDashboard = {
  market: StockMarketState[];
  overall: StockMarketOverall;
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
        width: 100%;
        min-width: 0;
      }

      .milo-market-card {
        width: 100%;
        min-width: 0;
      }

      .milo-responsive-chart {
        width: 100%;
        min-width: 0;
        overflow: hidden;
      }

      .milo-responsive-chart svg {
        display: block;
        width: 100%;
        max-width: 100%;
        height: auto;
      }

      .milo-content-column,
      .milo-content-column > *,
      .milo-market-layout,
      .milo-market-layout > * {
        min-width: 0;
        max-width: 100%;
      }

      @media (max-width: 820px) {
        .milo-stock-page {
          overflow-x: hidden;
        }

        .milo-mobile-nav > * {
          min-width: 0;
        }
      }

      /* Mobile portrait only: keep charts/data inside the viewport. */
      @media (max-width: 820px) and (orientation: portrait) {
        .milo-responsive-chart {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }

        .milo-responsive-chart svg {
          display: block;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
        }

        /* Any real HTML table added to this page will fit first, then scroll
           horizontally only when its columns need more room. */
        .milo-stock-page table {
          width: 100%;
          max-width: 100%;
          border-collapse: collapse;
        }

        .milo-stock-page .milo-table-scroll,
        .milo-stock-page .milo-data-scroll {
          width: 100%;
          max-width: 100%;
          min-width: 0;
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior-x: contain;
        }

        .milo-stock-page .milo-table-scroll > table,
        .milo-stock-page .milo-data-scroll > table {
          min-width: max-content;
        }
      }

      /* On very narrow portrait phones, preserve readable chart labels and
         allow the chart itself to scroll instead of widening the whole page. */
      @media (max-width: 430px) and (orientation: portrait) {
        .milo-responsive-chart svg {
          width: 540px !important;
          max-width: none !important;
          min-width: 540px !important;
        }
      }

      @media (max-width: 620px) {
        .milo-market-strip {
          grid-template-columns: 1fr !important;
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

  const width = 1000;
  const height = isMobile ? 430 : 390;
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
      className="milo-responsive-chart"
      style={{
        width: "100%",
        minWidth: 0,
        overflow: "hidden",
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
        role="img"
        aria-label="Five-year fictional stock price history"
        preserveAspectRatio="xMidYMid meet"
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          height: "auto",
          aspectRatio: `${width} / ${height}`,
        }}
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


function PortfolioRing({
  cash,
  holdings,
  stocks,
  isMobile,
}: {
  cash: number;
  holdings: Holding[];
  stocks: Stock[];
  isMobile: boolean;
}) {
  const stockParts = holdings
    .map((holding, index) => {
      const stock = stocks.find((item) => item.symbol === holding.symbol);
      return {
        label: holding.symbol,
        value: stock ? holding.quantity * stock.current_price : 0,
        color: [
          "#8ee8ff",
          "#ffd18a",
          "#a9f5c7",
          "#c6b8ff",
          "#ffb6d9",
          "#9bb7ff",
        ][index % 6],
      };
    })
    .filter((item) => item.value > 0);

  const parts = [
    { label: "Cash", value: Math.max(0, cash), color: "#ffffff" },
    ...stockParts,
  ];
  const total = parts.reduce((sum, item) => sum + item.value, 0);

  let cursor = 0;
  const gradientStops =
    total > 0
      ? parts
          .map((item) => {
            const start = cursor;
            cursor += (item.value / total) * 100;
            return `${item.color} ${start}% ${cursor}%`;
          })
          .join(", ")
      : "rgba(255,255,255,0.16) 0% 100%";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "220px minmax(0, 1fr)",
        gap: "24px",
        alignItems: "center",
      }}
    >
      <div
        aria-label="Portfolio allocation ring chart"
        style={{
          position: "relative",
          width: isMobile ? "190px" : "220px",
          aspectRatio: "1",
          margin: isMobile ? "0 auto" : 0,
          borderRadius: "50%",
          background: `conic-gradient(${gradientStops})`,
          boxShadow: "0 0 42px rgba(83,215,255,0.12)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "22%",
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            background: "#071126",
            border: "1px solid rgba(132,218,255,0.18)",
            padding: "10px",
          }}
        >
          <div>
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.48)",
                fontSize: "10px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Total
            </span>
            <strong
              style={{
                display: "block",
                marginTop: "5px",
                fontSize: isMobile ? "22px" : "25px",
              }}
            >
              {formatNumber(total)} DT
            </strong>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: "10px", minWidth: 0 }}>
        {parts.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.label}
              style={{
                display: "grid",
                gridTemplateColumns: "12px minmax(0, 1fr) auto",
                alignItems: "center",
                gap: "10px",
                padding: "11px 12px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.045)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: item.color,
                }}
              />
              <span style={{ minWidth: 0, fontWeight: 800 }}>{item.label}</span>
              <span
                style={{
                  color: "rgba(255,255,255,0.66)",
                  fontSize: "12px",
                  textAlign: "right",
                }}
              >
                {formatNumber(item.value)} DT · {percent.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
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
  const [dreamTokens, setDreamTokens] = useState(0);

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [employmentCompanies, setEmploymentCompanies] = useState<EmploymentCompany[]>([]);
  const [employmentResidents, setEmploymentResidents] = useState<EmploymentResident[]>([]);
  const [employmentStats, setEmploymentStats] = useState<EmploymentStats>({
    listed_companies: 0,
    listed_company_workers: 0,
    private_or_community_workers: 0,
    self_employed: 0,
    studying: 0,
    between_jobs: 0,
  });

  const [stockMarketStates, setStockMarketStates] = useState<StockMarketState[]>([]);
  const [stockMarketOverall, setStockMarketOverall] = useState<StockMarketOverall>({
    advancing: 0,
    declining: 0,
    unchanged: 0,
    average_change_bps: 0,
    market_mood: "steady",
    last_settled_at: null,
    active_synthetic_agents: 0,
    price_movement_enabled: false,
  });

  const [selectedSymbol, setSelectedSymbol] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeSection, setActiveSection] = useState<ExchangeSection>("portfolio");

  const [pageMessage, setPageMessage] = useState("");
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

  const selectedCompanyEconomy = useMemo(() => {
    if (!selectedStock) return undefined;
    return employmentCompanies.find((company) => company.symbol === selectedStock.symbol);
  }, [employmentCompanies, selectedStock]);

  const selectedCompanyEmployees = useMemo(() => {
    if (!selectedStock) return [];
    return employmentResidents.filter(
      (resident) =>
        resident.employer_stock_symbol === selectedStock.symbol &&
        resident.employment_status === "employed"
    );
  }, [employmentResidents, selectedStock]);

  const selectedMarketState = useMemo(() => {
    if (!selectedStock) return undefined;
    return stockMarketStates.find((item) => item.symbol === selectedStock.symbol);
  }, [selectedStock, stockMarketStates]);

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (!userId || !selectedSymbol) return;
    loadPriceHistory(selectedSymbol);
  }, [userId, selectedSymbol]);

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
      loadDreamTokens(user.id),
      loadStocks(),
      loadHoldings(user.id),
      loadTrades(user.id),
      loadNewsEvents(),
      loadStockMarketDashboard(),
    ]);

    await loadEmploymentDashboard();

    setLoading(false);
  }

  async function loadDreamTokens(_id: string) {
    const { data, error } = await supabase.rpc(
      "get_my_virtual_dream_token_balance"
    );

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      setDreamTokens(0);
      return;
    }

    setDreamTokens(Number(data || 0));
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

  async function loadPriceHistory(symbol: string) {
    if (!symbol) return;

    const { data, error } = await supabase.rpc(
      "get_milo_exchange_stock_price_history",
      { p_symbol: symbol, p_limit: 800 }
    );

    if (error) {
      console.warn("Could not load price history:", error.message);
      setPriceHistory([]);
      return;
    }

    const rows = (Array.isArray(data) ? data : []) as PricePoint[];
    setPriceHistory(
      rows.map((row) => ({
        ...row,
        price: Number(row.price || 0),
      }))
    );
  }

  async function loadStockMarketDashboard() {
    const { data, error } = await supabase.rpc(
      "get_milo_exchange_stock_market_dashboard"
    );

    if (error) {
      console.warn("Could not load Living City stock market:", error.message);
      setStockMarketStates([]);
      return;
    }

    const dashboard = (data || {}) as Partial<StockMarketDashboard>;
    const market = ((dashboard.market || []) as StockMarketState[]).map((row) => ({
      ...row,
      current_price: Number(row.current_price || 0),
      previous_price: Number(row.previous_price || 0),
      fundamental_score: Number(row.fundamental_score || 0),
      fair_value_price: Number(row.fair_value_price || 0),
      company_health: Number(row.company_health || 0),
      hiring_index: Number(row.hiring_index || 0),
      workforce_sentiment: Number(row.workforce_sentiment || 0),
      player_buy_qty: Number(row.player_buy_qty || 0),
      player_sell_qty: Number(row.player_sell_qty || 0),
      agent_buy_qty: Number(row.agent_buy_qty || 0),
      agent_sell_qty: Number(row.agent_sell_qty || 0),
      fundamental_component_bps: Number(row.fundamental_component_bps || 0),
      player_flow_component_bps: Number(row.player_flow_component_bps || 0),
      agent_flow_component_bps: Number(row.agent_flow_component_bps || 0),
      momentum_component_bps: Number(row.momentum_component_bps || 0),
      noise_component_bps: Number(row.noise_component_bps || 0),
      daily_change_bps: Number(row.daily_change_bps || 0),
    }));
    setStockMarketStates(market);

    const overall = (dashboard.overall || {}) as Partial<StockMarketOverall>;
    setStockMarketOverall({
      advancing: Number(overall.advancing || 0),
      declining: Number(overall.declining || 0),
      unchanged: Number(overall.unchanged || 0),
      average_change_bps: Number(overall.average_change_bps || 0),
      market_mood: String(overall.market_mood || "steady"),
      last_settled_at: overall.last_settled_at ? String(overall.last_settled_at) : null,
      active_synthetic_agents: Number(overall.active_synthetic_agents || 0),
      price_movement_enabled: Boolean(overall.price_movement_enabled),
    });
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

  async function loadEmploymentDashboard() {
    const { data, error } = await supabase.rpc("get_milo_exchange_employment_dashboard");

    if (error) {
      console.warn("Could not load company employment dashboard:", error.message);
      setEmploymentCompanies([]);
      setEmploymentResidents([]);
      return;
    }

    const dashboard = (data || {}) as Partial<EmploymentDashboard>;
    setEmploymentCompanies(
      (dashboard.companies || []).map((item) => ({
        ...item,
        health_score: Number(item.health_score || 0),
        hiring_index: Number(item.hiring_index || 0),
        workforce_sentiment: Number(item.workforce_sentiment || 0),
        salary_index_bps: Number(item.salary_index_bps || 10000),
        base_headcount: Number(item.base_headcount || 0),
        named_employee_count: Number(item.named_employee_count || 0),
        avg_named_employee_income: Number(item.avg_named_employee_income || 0),
        recent_promotions: Number(item.recent_promotions || 0),
        recent_hires: Number(item.recent_hires || 0),
        recent_layoffs: Number(item.recent_layoffs || 0),
        current_price: Number(item.current_price || 0),
        previous_price: Number(item.previous_price || 0),
      }))
    );
    setEmploymentResidents(
      (dashboard.residents || []).map((item) => ({
        ...item,
        employment_stability: Number(item.employment_stability || 0),
        career_level: Number(item.career_level || 1),
        monthly_income: Number(item.monthly_income || 0),
        financial_pressure: Number(item.financial_pressure || 0),
      }))
    );
    const stats = dashboard.stats || ({} as EmploymentStats);
    setEmploymentStats({
      listed_companies: Number(stats.listed_companies || 0),
      listed_company_workers: Number(stats.listed_company_workers || 0),
      private_or_community_workers: Number(stats.private_or_community_workers || 0),
      self_employed: Number(stats.self_employed || 0),
      studying: Number(stats.studying || 0),
      between_jobs: Number(stats.between_jobs || 0),
    });
  }

  function companyStatusLabel(value: string) {
    if (value === "expanding") return "Expanding";
    if (value === "hiring") return "Hiring";
    if (value === "cautious") return "Cautious";
    if (value === "contracting") return "Contracting";
    return "Steady";
  }

  function companyStatusColor(value: string) {
    if (value === "expanding") return "#79f2ce";
    if (value === "hiring") return "#8ee8ff";
    if (value === "cautious") return "#ffd18a";
    if (value === "contracting") return "#ff9292";
    return "rgba(255,255,255,0.72)";
  }

  function marketMoodLabel(value: string) {
    if (value === "strong_rise") return "Strong Rise";
    if (value === "rising") return "Rising";
    if (value === "strong_fall") return "Strong Fall";
    if (value === "falling") return "Falling";
    return "Steady";
  }

  function marketMoodColor(value: string) {
    if (value === "strong_rise" || value === "rising") return "#79f2ce";
    if (value === "strong_fall" || value === "falling") return "#ff9292";
    return "#ffd18a";
  }

  function formatBpsAsPercent(value: number) {
    const pct = Number(value || 0) / 100;
    return `${pct > 0 ? "+" : ""}${pct.toFixed(2)}%`;
  }

  function formatNetShares(buys: number, sells: number) {
    const net = Number(buys || 0) - Number(sells || 0);
    if (net === 0) return "Balanced";
    return `${net > 0 ? "+" : ""}${net} shares`;
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

  async function refreshUserData() {
    if (!userId) return;

    await Promise.all([
      loadDreamTokens(userId),
      loadHoldings(userId),
      loadTrades(userId),
      loadStocks(),
      loadNewsEvents(),
      loadEmploymentDashboard(),
      loadStockMarketDashboard(),
      selectedSymbol ? loadPriceHistory(selectedSymbol) : Promise.resolve(),
    ]);
  }

  async function executeStockTrade(side: "buy" | "sell") {
    if (!userId || !selectedStock || actionLoading) return;

    setTradeMessage("");

    const qty = Math.max(1, Math.floor(Number(quantity) || 1));

    // Client checks are only for quick feedback. The RPC re-checks the
    // authoritative wallet, market price and holdings inside one DB transaction.
    if (side === "buy") {
      const estimatedTotal = qty * selectedStock.current_price;
      if (estimatedTotal > dreamTokens) {
        setTradeMessage("You do not have enough Dreamscape Tokens for this trade.");
        return;
      }
    } else {
      const existingHolding = getHolding(selectedStock.symbol);
      if (!existingHolding || existingHolding.quantity < qty) {
        setTradeMessage("You do not have enough shares to sell.");
        return;
      }
    }

    setActionLoading(true);

    const { data, error } = await supabase.rpc("trade_milo_exchange_stock", {
      p_symbol: selectedStock.symbol,
      p_side: side,
      p_quantity: qty,
    });

    if (error) {
      console.warn("Stock trade failed:", error.message);
      setTradeMessage(`Trade failed: ${error.message}`);
      setActionLoading(false);
      await refreshUserData();
      return;
    }

    const result = (data || {}) as Record<string, unknown>;

    if (result.ok === false) {
      const reason = String(result.reason || "trade_failed");
      const message =
        reason === "insufficient_tokens"
          ? "You do not have enough Dreamscape Tokens for this trade."
          : reason === "insufficient_shares"
          ? "You do not have enough shares to sell."
          : reason === "stock_not_found"
          ? "This stock is no longer available for trading."
          : reason === "invalid_quantity"
          ? "Choose at least 1 share."
          : reason === "invalid_side"
          ? "That trade type is not supported."
          : reason === "not_authenticated"
          ? "Please log in again before trading."
          : String(result.message || "The trade could not be completed.");

      setTradeMessage(message);
      setActionLoading(false);
      await refreshUserData();
      return;
    }

    const tradedQuantity = Number(result.quantity || qty);
    const symbol = String(result.symbol || selectedStock.symbol);
    const price = Number(result.price || selectedStock.current_price);

    setTradeMessage(
      String(
        result.message ||
          `${side === "buy" ? "Bought" : "Sold"} ${tradedQuantity} share${
            tradedQuantity === 1 ? "" : "s"
          } of ${symbol} at ${formatNumber(price)} DT.`
      )
    );

    window.dispatchEvent(new Event("dream-tokens-updated"));
    await refreshUserData();
    setActionLoading(false);
  }

  async function buyStock() {
    await executeStockTrade("buy");
  }

  async function sellStock() {
    await executeStockTrade("sell");
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
        eyebrow="Exchange Access"
        title="Log in to enter Milo’s Stock Exchange"
      >
        <p>
          Log in to save your fictional portfolio, trades and market progress.
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

  const sidebarItems: {
    id: ExchangeSection;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      id: "portfolio",
      label: "My Portfolio",
      description: "Holdings, allocation and P/L",
      icon: "◉",
    },
    {
      id: "market",
      label: "Market",
      description: "Stocks, graphs and news",
      icon: "⌁",
    },
    {
      id: "trade",
      label: "Trade",
      description: "Buy or sell stocks",
      icon: "⇄",
    },
  ];

  const sectionTitle =
    activeSection === "portfolio"
      ? "My Portfolio"
      : activeSection === "market"
      ? "Market"
      : "Trade";

  const selectedHolding = selectedStock
    ? getHolding(selectedStock.symbol)
    : undefined;

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
            marginBottom: isMobile ? "18px" : "24px",
          }}
        >
          <Link
            href="/milo-world/exchange"
            style={{ ...navButtonStyle, width: isMobile ? "100%" : "auto" }}
          >
            ← Exchange Home
          </Link>

          <div
            className="milo-mobile-nav"
            style={{
              display: isMobile ? "grid" : "flex",
              gridTemplateColumns: isMobile ? "1fr 1fr" : undefined,
              gap: "10px",
              width: isMobile ? "100%" : "auto",
            }}
          >
            <Link
              href="/milo-world/exchange/property"
              style={{
                ...navButtonStyle,
                color: "#ffd18a",
                background: "rgba(255,209,138,0.1)",
                width: isMobile ? "100%" : "auto",
              }}
            >
              Property
            </Link>
            <Link
              href="/profile"
              style={{
                ...navButtonStyle,
                width: isMobile ? "100%" : "auto",
              }}
            >
              My Account
            </Link>
          </div>
        </header>

        <section
          style={{
            marginBottom: "20px",
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "flex-start" : "flex-end",
            gap: "14px",
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
              Milo’s Stock Exchange
            </p>
            <h1
              style={{
                margin: "8px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: isMobile ? "38px" : isCompact ? "50px" : "60px",
                fontWeight: 500,
                lineHeight: 1,
              }}
            >
              {sectionTitle}
            </h1>
            {pageMessage && (
              <p style={{ margin: "12px 0 0", color: "#ffd18a", fontWeight: 800 }}>
                {pageMessage}
              </p>
            )}
          </div>

          <div
            style={{
              borderRadius: "16px",
              padding: "11px 14px",
              background: "rgba(83,215,255,0.1)",
              border: "1px solid rgba(132,218,255,0.22)",
            }}
          >
            <span
              style={{
                display: "block",
                color: "rgba(255,255,255,0.48)",
                fontSize: "10px",
                fontWeight: 900,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Available Cash
            </span>
            <strong style={{ display: "block", marginTop: "4px", fontSize: "21px" }}>
              {formatNumber(dreamTokens)} DT
            </strong>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "230px minmax(0, 1fr)",
            gap: isMobile ? "14px" : "18px",
            alignItems: "start",
          }}
        >
          <aside data-milo-guide="stock-navigation"
            style={{
              ...glassPanel,
              padding: isMobile ? "10px" : "14px",
              position: isDesktop ? "sticky" : "relative",
              top: isDesktop ? "18px" : undefined,
              zIndex: 8,
            }}
          >
            <nav
              aria-label="Stock exchange sections"
              className="milo-scrollbar"
              style={{
                display: isCompact ? "flex" : "grid",
                gap: "8px",
                overflowX: isCompact ? "auto" : "visible",
                paddingBottom: isCompact ? "2px" : 0,
              }}
            >
              {sidebarItems.map((item) => {
                const active = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    style={{
                      width: isCompact ? (isMobile ? "176px" : "210px") : "100%",
                      flex: isCompact
                        ? `0 0 ${isMobile ? "176px" : "210px"}`
                        : undefined,
                      minHeight: isCompact ? "62px" : "76px",
                      borderRadius: "17px",
                      border: active
                        ? "1px solid rgba(132,218,255,0.52)"
                        : "1px solid rgba(255,255,255,0.08)",
                      background: active
                        ? "rgba(83,215,255,0.14)"
                        : "rgba(255,255,255,0.04)",
                      color: "white",
                      padding: "12px",
                      display: "grid",
                      gridTemplateColumns: "30px minmax(0, 1fr)",
                      gap: "9px",
                      alignItems: "center",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "10px",
                        display: "grid",
                        placeItems: "center",
                        background: active
                          ? "rgba(142,232,255,0.17)"
                          : "rgba(255,255,255,0.06)",
                        color: active ? "#8ee8ff" : "rgba(255,255,255,0.62)",
                        fontSize: "17px",
                        fontWeight: 900,
                      }}
                    >
                      {item.icon}
                    </span>
                    <span style={{ minWidth: 0 }}>
                      <strong style={{ display: "block", fontSize: "14px" }}>
                        {item.label}
                      </strong>
                      {!isMobile && (
                        <small
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: "rgba(255,255,255,0.42)",
                            lineHeight: 1.3,
                          }}
                        >
                          {item.description}
                        </small>
                      )}
                    </span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="milo-content-column" style={{ minWidth: 0, width: "100%", maxWidth: "100%" }}>
            {activeSection === "portfolio" && (
              <div style={{ display: "grid", gap: "18px" }}>
                <section data-milo-guide="stock-portfolio-summary"
                  className="milo-summary-grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile
                      ? "1fr 1fr"
                      : "repeat(4, minmax(0, 1fr))",
                    gap: "12px",
                  }}
                >
                  {[
                    {
                      label: "Total Value",
                      value: `${formatNumber(totalEstimatedValue)} DT`,
                      note: "Cash + stocks",
                      color: "white",
                    },
                    {
                      label: "Cash",
                      value: `${formatNumber(dreamTokens)} DT`,
                      note: "Available to trade",
                      color: "white",
                    },
                    {
                      label: "Stocks",
                      value: `${formatNumber(portfolioValue)} DT`,
                      note: "Current market value",
                      color: "#ffd18a",
                    },
                    {
                      label: "Unrealised P/L",
                      value: `${portfolioProfitLoss >= 0 ? "+" : "−"}${formatNumber(
                        Math.abs(portfolioProfitLoss)
                      )} DT`,
                      note:
                        portfolioCostBasis > 0
                          ? `${portfolioProfitLoss >= 0 ? "+" : ""}${portfolioProfitLossPercent.toFixed(
                              1
                            )}% overall`
                          : "No holdings yet",
                      color: portfolioProfitLoss >= 0 ? "#8ee8ff" : "#ffb0b0",
                    },
                  ].map((item) => (
                    <article
                      key={item.label}
                      style={{
                        ...glassPanel,
                        borderRadius: "20px",
                        padding: isMobile ? "15px" : "18px",
                        minWidth: 0,
                      }}
                    >
                      <span
                        style={{
                          display: "block",
                          color: "rgba(255,255,255,0.48)",
                          fontSize: "10px",
                          fontWeight: 900,
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                        }}
                      >
                        {item.label}
                      </span>
                      <strong
                        style={{
                          display: "block",
                          marginTop: "7px",
                          color: item.color,
                          fontSize: isMobile ? "19px" : "23px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {item.value}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          marginTop: "5px",
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "11px",
                        }}
                      >
                        {item.note}
                      </span>
                    </article>
                  ))}
                </section>

                <section data-milo-guide="stock-allocation" style={{ ...glassPanel, padding: isMobile ? "20px" : "26px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#8ee8ff",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Allocation
                  </p>
                  <h2
                    style={{
                      margin: "8px 0 22px",
                      fontFamily: 'Georgia, "Times New Roman", serif',
                      fontSize: isMobile ? "30px" : "36px",
                      fontWeight: 500,
                    }}
                  >
                    Portfolio Breakdown
                  </h2>
                  <PortfolioRing
                    cash={dreamTokens}
                    holdings={holdings}
                    stocks={stocks}
                    isMobile={isMobile}
                  />
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
                    gap: "18px",
                  }}
                >
                  <div style={{ ...glassPanel, padding: isMobile ? "20px" : "24px", minWidth: 0 }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: "30px",
                        fontWeight: 500,
                      }}
                    >
                      Individual Stocks
                    </h2>

                    {holdings.length === 0 ? (
                      <p style={{ color: "rgba(255,255,255,0.58)" }}>
                        You do not own any fictional stocks yet.
                      </p>
                    ) : (
                      <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
                        {holdings.map((holding) => {
                          const stock = stocks.find(
                            (item) => item.symbol === holding.symbol
                          );
                          if (!stock) return null;
                          const value = holding.quantity * stock.current_price;
                          const cost =
                            holding.quantity * Number(holding.average_price || 0);
                          const pl = value - cost;
                          const plPercent = cost > 0 ? (pl / cost) * 100 : 0;

                          return (
                            <button
                              key={holding.id}
                              type="button"
                              onClick={() => {
                                setSelectedSymbol(holding.symbol);
                                setActiveSection("market");
                              }}
                              style={{
                                width: "100%",
                                borderRadius: "16px",
                                border: "1px solid rgba(255,255,255,0.09)",
                                background: "rgba(255,255,255,0.045)",
                                color: "white",
                                padding: "14px",
                                display: "grid",
                                gridTemplateColumns: isMobile
                                  ? "1fr auto"
                                  : "minmax(0, 1.3fr) repeat(3, minmax(90px, .7fr))",
                                gap: "10px",
                                alignItems: "center",
                                textAlign: "left",
                                cursor: "pointer",
                                fontFamily: "inherit",
                              }}
                            >
                              <span>
                                <strong style={{ display: "block" }}>{stock.symbol}</strong>
                                <small style={{ color: "rgba(255,255,255,0.45)" }}>
                                  {holding.quantity} shares · Avg {holding.average_price} DT
                                </small>
                              </span>
                              {!isMobile && (
                                <span>
                                  <small style={{ display: "block", color: "rgba(255,255,255,0.42)" }}>
                                    Price
                                  </small>
                                  <strong>{stock.current_price} DT</strong>
                                </span>
                              )}
                              {!isMobile && (
                                <span>
                                  <small style={{ display: "block", color: "rgba(255,255,255,0.42)" }}>
                                    Value
                                  </small>
                                  <strong>{formatNumber(value)} DT</strong>
                                </span>
                              )}
                              <strong
                                style={{
                                  color: pl >= 0 ? "#8ee8ff" : "#ffb0b0",
                                  textAlign: "right",
                                }}
                              >
                                {pl >= 0 ? "+" : "−"}
                                {formatNumber(Math.abs(pl))} DT
                                <small style={{ display: "block" }}>
                                  {pl >= 0 ? "+" : ""}
                                  {plPercent.toFixed(1)}%
                                </small>
                              </strong>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
                    <h2
                      style={{
                        margin: 0,
                        fontFamily: 'Georgia, "Times New Roman", serif',
                        fontSize: "30px",
                        fontWeight: 500,
                      }}
                    >
                      Trade History
                    </h2>
                    {trades.length === 0 ? (
                      <p style={{ color: "rgba(255,255,255,0.58)" }}>No trades yet.</p>
                    ) : (
                      <div
                        className="milo-scrollbar"
                        style={{
                          marginTop: "16px",
                          display: "grid",
                          gap: "9px",
                          maxHeight: isDesktop ? "390px" : undefined,
                          overflowY: isDesktop ? "auto" : "visible",
                          paddingRight: isDesktop ? "4px" : 0,
                        }}
                      >
                        {trades.map((trade) => (
                          <div
                            key={trade.id}
                            style={{
                              borderRadius: "15px",
                              background: "rgba(255,255,255,0.045)",
                              border: "1px solid rgba(255,255,255,0.08)",
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
                              <strong>
                                {trade.side === "buy" ? "Bought" : "Sold"}{" "}
                                {trade.quantity} {trade.symbol}
                              </strong>
                              <strong
                                style={{
                                  color:
                                    trade.side === "buy" ? "#ffb0b0" : "#8ee8ff",
                                }}
                              >
                                {trade.side === "buy" ? "−" : "+"}
                                {formatNumber(trade.total)} DT
                              </strong>
                            </div>
                            <small
                              style={{
                                display: "block",
                                marginTop: "5px",
                                color: "rgba(255,255,255,0.42)",
                              }}
                            >
                              {formatDateTime(trade.created_at)}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {activeSection === "market" && (
              <div className="milo-market-layout" style={{ display: "grid", gap: "18px", minWidth: 0, width: "100%" }}>
                <section data-milo-guide="stock-market-list" style={{ ...glassPanel, padding: isMobile ? "14px" : "22px", minWidth: 0, width: "100%", overflow: "hidden" }}>
                  <div
                    className="milo-market-strip"
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "repeat(2, minmax(0, 1fr))"
                        : "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: "10px",
                      width: "100%",
                      minWidth: 0,
                    }}
                  >
                    {stocks.map((stock) => {
                      const holding = getHolding(stock.symbol);
                      const active = selectedStock?.symbol === stock.symbol;
                      const change = getChangePercent(stock);
                      return (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => setSelectedSymbol(stock.symbol)}
                          style={{
                            width: "100%",
                            minWidth: 0,
                            minHeight: isMobile ? "104px" : "112px",
                            padding: "15px",
                            borderRadius: "18px",
                            border: active
                              ? "1px solid rgba(132,218,255,0.58)"
                              : "1px solid rgba(255,255,255,0.09)",
                            background: active
                              ? "rgba(83,215,255,0.14)"
                              : "rgba(255,255,255,0.045)",
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
                            <strong style={{ fontSize: "17px" }}>{stock.symbol}</strong>
                            <strong
                              style={{
                                color: change >= 0 ? "#8ee8ff" : "#ffb0b0",
                                fontSize: "13px",
                              }}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(1)}%
                            </strong>
                          </div>
                          <span
                            style={{
                              display: "block",
                              marginTop: "8px",
                              color: "rgba(255,255,255,0.64)",
                              fontSize: "13px",
                              lineHeight: 1.35,
                              overflowWrap: "anywhere",
                            }}
                          >
                            {stock.name}
                          </span>
                          <div
                            style={{
                              marginTop: "14px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <strong style={{ color: "#ffd18a" }}>
                              {stock.current_price} DT
                            </strong>
                            <small style={{ color: "rgba(255,255,255,0.44)" }}>
                              Own {holding?.quantity || 0}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {selectedStock ? (
                  <>
                    <section data-milo-guide="stock-analysis"
                      style={{
                        ...glassPanel,
                        padding: isMobile ? "16px" : "26px",
                        minWidth: 0,
                        width: "100%",
                        maxWidth: "100%",
                        overflow: "hidden",
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
                              fontSize: "11px",
                              letterSpacing: "0.2em",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            {selectedStock.sector}
                          </p>
                          <h2
                            style={{
                              margin: "8px 0 0",
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              fontSize: "clamp(28px, 4vw, 40px)",
                              fontWeight: 500,
                            }}
                          >
                            {selectedStock.symbol} Price Timeline
                          </h2>
                          <p
                            style={{
                              margin: "10px 0 0",
                              color: "rgba(255,255,255,0.58)",
                              lineHeight: 1.5,
                              maxWidth: "760px",
                            }}
                          >
                            {selectedStock.description}
                          </p>
                        </div>
                        <div
                          style={{
                            borderRadius: "16px",
                            padding: "11px 14px",
                            background: "rgba(255,209,138,0.08)",
                            border: "1px solid rgba(255,209,138,0.18)",
                          }}
                        >
                          <small
                            style={{
                              display: "block",
                              color: "rgba(255,255,255,0.45)",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Current Price
                          </small>
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
                      data-milo-guide="stock-company-economy"
                      style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          justifyContent: "space-between",
                          gap: "12px",
                          alignItems: isMobile ? "stretch" : "flex-end",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              color: "#79f2ce",
                              fontSize: "11px",
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Company & Jobs
                          </p>
                          <h2
                            style={{
                              margin: "8px 0 0",
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              fontSize: isMobile ? "30px" : "36px",
                              fontWeight: 500,
                            }}
                          >
                            {selectedStock.name} in the Dreamscape economy
                          </h2>
                          <p
                            style={{
                              margin: "8px 0 0",
                              maxWidth: "820px",
                              color: "rgba(255,255,255,0.5)",
                              fontSize: "12px",
                              lineHeight: 1.5,
                            }}
                          >
                            Company conditions can affect pay, promotions and job security for residents who work here.
                            {employmentStats.listed_company_workers} named resident{employmentStats.listed_company_workers === 1 ? "" : "s"} currently work across listed companies; many others work elsewhere.
                          </p>
                        </div>
                        <div
                          style={{
                            borderRadius: "999px",
                            padding: "7px 12px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: companyStatusColor(selectedCompanyEconomy?.hiring_status || "steady"),
                            fontSize: "11px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {companyStatusLabel(selectedCompanyEconomy?.hiring_status || "steady")}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "15px",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,minmax(0,1fr))",
                          gap: "9px",
                        }}
                      >
                        {[
                          ["Company Health", `${selectedCompanyEconomy?.health_score || 0}/100`],
                          ["Hiring Climate", `${selectedCompanyEconomy?.hiring_index || 0}/100`],
                          ["Workforce Mood", `${selectedCompanyEconomy?.workforce_sentiment || 0}/100`],
                          ["Named Residents", selectedCompanyEmployees.length],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: "14px",
                              padding: "11px 12px",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.07)",
                            }}
                          >
                            <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px" }}>{label}</small>
                            <strong style={{ display: "block", marginTop: "4px", fontSize: "17px" }}>{value}</strong>
                          </div>
                        ))}
                      </div>

                      {selectedCompanyEconomy?.latest_published_headline && (
                        <div
                          style={{
                            marginTop: "12px",
                            padding: "10px 12px",
                            borderRadius: "13px",
                            background: "rgba(142,232,255,0.045)",
                            color: "rgba(255,255,255,0.56)",
                            fontSize: "11px",
                            lineHeight: 1.45,
                          }}
                        >
                          Latest published company signal: <strong style={{ color: "white" }}>{selectedCompanyEconomy.latest_published_headline}</strong>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: "13px",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(220px,1fr))",
                          gap: "8px",
                        }}
                      >
                        {selectedCompanyEmployees.length === 0 ? (
                          <div
                            style={{
                              borderRadius: "14px",
                              border: "1px dashed rgba(255,255,255,0.12)",
                              padding: "14px",
                              color: "rgba(255,255,255,0.45)",
                              fontSize: "11px",
                            }}
                          >
                            No named resident currently works here. The company still has a larger simulated workforce.
                          </div>
                        ) : (
                          selectedCompanyEmployees.map((resident) => {
                            const avatar = resident.avatar_key
                              ? `/milo-world/property-exchange/residents/${resident.avatar_key}.jpg`
                              : null;
                            return (
                              <article
                                key={resident.resident_id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "46px minmax(0,1fr) auto",
                                  gap: "9px",
                                  alignItems: "center",
                                  borderRadius: "14px",
                                  padding: "9px 10px",
                                  background: "rgba(255,255,255,0.035)",
                                  border: "1px solid rgba(255,255,255,0.07)",
                                  minWidth: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: "46px",
                                    height: "46px",
                                    borderRadius: "50%",
                                    overflow: "hidden",
                                    background: "rgba(142,232,255,0.08)",
                                  }}
                                >
                                  {avatar && (
                                    <img
                                      src={avatar}
                                      alt={resident.display_name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 28%" }}
                                    />
                                  )}
                                </div>
                                <span style={{ minWidth: 0 }}>
                                  <strong style={{ display: "block", fontSize: "11px" }}>{resident.display_name}</strong>
                                  <small style={{ display: "block", marginTop: "3px", color: "rgba(255,255,255,0.42)", fontSize: "9px" }}>
                                    {resident.occupation}
                                  </small>
                                </span>
                                <span style={{ textAlign: "right" }}>
                                  <small style={{ display: "block", color: "rgba(255,255,255,0.35)", fontSize: "8px" }}>Income</small>
                                  <strong style={{ fontSize: "10px", whiteSpace: "nowrap" }}>{formatNumber(resident.monthly_income)} DT</strong>
                                </span>
                              </article>
                            );
                          })
                        )}
                      </div>
                    </section>

                    <section
                      data-milo-guide="stock-market-forces"
                      style={{ ...glassPanel, padding: isMobile ? "18px" : "24px" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: isMobile ? "column" : "row",
                          justifyContent: "space-between",
                          alignItems: isMobile ? "stretch" : "flex-end",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <p
                            style={{
                              margin: 0,
                              color: "#ffd18a",
                              fontSize: "11px",
                              letterSpacing: "0.18em",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Living Market
                          </p>
                          <h2
                            style={{
                              margin: "8px 0 0",
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              fontSize: isMobile ? "30px" : "36px",
                              fontWeight: 500,
                            }}
                          >
                            What moved {selectedStock.symbol}?
                          </h2>
                          <p
                            style={{
                              margin: "8px 0 0",
                              maxWidth: "840px",
                              color: "rgba(255,255,255,0.5)",
                              fontSize: "12px",
                              lineHeight: 1.5,
                            }}
                          >
                            Prices settle once each day. Company fundamentals set a fair-value anchor, while real player trades and Dreamscape’s synthetic investors add modest supply-and-demand pressure. Daily movement is capped to keep the fictional market stable.
                          </p>
                        </div>
                        <div
                          style={{
                            borderRadius: "999px",
                            padding: "7px 12px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            color: marketMoodColor(selectedMarketState?.market_mood || "steady"),
                            fontSize: "11px",
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {marketMoodLabel(selectedMarketState?.market_mood || "steady")}
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: "15px",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(5,minmax(0,1fr))",
                          gap: "9px",
                        }}
                      >
                        {[
                          ["Fundamentals", `${selectedMarketState?.fundamental_score || 0}/100`],
                          ["Fair Value", `${formatNumber(selectedMarketState?.fair_value_price || selectedStock.current_price)} DT`],
                          ["Player Flow", formatNetShares(selectedMarketState?.player_buy_qty || 0, selectedMarketState?.player_sell_qty || 0)],
                          ["Agent Flow", formatNetShares(selectedMarketState?.agent_buy_qty || 0, selectedMarketState?.agent_sell_qty || 0)],
                          ["Last Move", formatBpsAsPercent(selectedMarketState?.daily_change_bps || 0)],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: "14px",
                              padding: "11px 12px",
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid rgba(255,255,255,0.07)",
                              minWidth: 0,
                            }}
                          >
                            <small style={{ color: "rgba(255,255,255,0.4)", fontSize: "9px" }}>{label}</small>
                            <strong style={{ display: "block", marginTop: "4px", fontSize: "15px", overflowWrap: "anywhere" }}>{value}</strong>
                          </div>
                        ))}
                      </div>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "grid",
                          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1.5fr) minmax(240px,.5fr)",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            borderRadius: "14px",
                            padding: "11px 12px",
                            background: "rgba(255,209,138,0.045)",
                            border: "1px solid rgba(255,209,138,0.1)",
                            color: "rgba(255,255,255,0.58)",
                            fontSize: "11px",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong style={{ color: "white" }}>Market explanation:</strong>{" "}
                          {selectedMarketState?.market_reason || "The Living City market is waiting for its first daily settlement."}
                        </div>
                        <div
                          style={{
                            borderRadius: "14px",
                            padding: "11px 12px",
                            background: "rgba(142,232,255,0.04)",
                            border: "1px solid rgba(142,232,255,0.09)",
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "10px",
                            lineHeight: 1.5,
                          }}
                        >
                          <strong style={{ color: "#8ee8ff" }}>{stockMarketOverall.active_synthetic_agents}</strong> synthetic investors are connected to the market.
                          {stockMarketOverall.last_settled_at && (
                            <> Last settlement: {formatDateTime(stockMarketOverall.last_settled_at)}.</>
                          )}
                        </div>
                      </div>
                    </section>

                    <section
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                        gap: "18px",
                      }}
                    >
                      <div style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
                        <h2
                          style={{
                            margin: 0,
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontSize: "30px",
                            fontWeight: 500,
                          }}
                        >
                          Market News
                        </h2>
                        {selectedPastNews.length === 0 ? (
                          <p style={{ color: "rgba(255,255,255,0.58)" }}>
                            No published market news yet.
                          </p>
                        ) : (
                          <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                            {selectedPastNews.map((event) => (
                              <article
                                key={event.id}
                                style={{
                                  borderRadius: "15px",
                                  background: "rgba(255,255,255,0.04)",
                                  border: "1px solid rgba(255,255,255,0.08)",
                                  padding: "13px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    gap: "10px",
                                  }}
                                >
                                  <small style={{ color: "#8ee8ff", fontWeight: 900 }}>
                                    {formatShortDate(event.event_date)}
                                  </small>
                                  <small
                                    style={{
                                      color:
                                        event.impact_label === "positive"
                                          ? "#8ee8ff"
                                          : event.impact_label === "negative"
                                          ? "#ffb0b0"
                                          : "rgba(255,255,255,0.5)",
                                      fontWeight: 900,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {event.impact_label}
                                  </small>
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
                                    color: "rgba(255,255,255,0.56)",
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

                      <div style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
                        <h2
                          style={{
                            margin: 0,
                            fontFamily: 'Georgia, "Times New Roman", serif',
                            fontSize: "30px",
                            fontWeight: 500,
                          }}
                        >
                          Upcoming Events
                        </h2>
                        <p
                          style={{
                            color: "rgba(255,255,255,0.46)",
                            fontSize: "13px",
                            lineHeight: 1.45,
                          }}
                        >
                          Future price effects stay hidden until release.
                        </p>
                        {selectedUpcomingNews.length === 0 ? (
                          <p style={{ color: "rgba(255,255,255,0.58)" }}>
                            No upcoming market events yet.
                          </p>
                        ) : (
                          <div style={{ marginTop: "14px", display: "grid", gap: "10px" }}>
                            {selectedUpcomingNews.map((event) => (
                              <article
                                key={event.id}
                                style={{
                                  borderRadius: "15px",
                                  background: "rgba(255,209,138,0.04)",
                                  border: "1px solid rgba(255,209,138,0.12)",
                                  padding: "13px",
                                }}
                              >
                                <small style={{ color: "#ffd18a", fontWeight: 900 }}>
                                  {formatShortDate(event.event_date)}
                                </small>
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
                                    color: "rgba(255,255,255,0.56)",
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
                    </section>

                    <button
                      type="button"
                      onClick={() => setActiveSection("trade")}
                      style={{
                        ...primaryButton,
                        justifySelf: "start",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
                      Trade {selectedStock.symbol}
                    </button>
                  </>
                ) : (
                  <section style={{ ...glassPanel, padding: "28px" }}>
                    Select a stock to view its graph and news.
                  </section>
                )}
              </div>
            )}

            {activeSection === "trade" && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "minmax(0, 1fr) minmax(330px, 420px)",
                  gap: "18px",
                  alignItems: "start",
                }}
              >
                <section style={{ ...glassPanel, padding: isMobile ? "20px" : "24px" }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#8ee8ff",
                      fontSize: "11px",
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      fontWeight: 900,
                    }}
                  >
                    Choose Stock
                  </p>
                  <div
                    style={{
                      marginTop: "15px",
                      display: "grid",
                      gridTemplateColumns: isMobile
                        ? "1fr"
                        : "repeat(2, minmax(0, 1fr))",
                      gap: "10px",
                    }}
                  >
                    {stocks.map((stock) => {
                      const active = selectedStock?.symbol === stock.symbol;
                      const change = getChangePercent(stock);
                      return (
                        <button
                          key={stock.symbol}
                          type="button"
                          onClick={() => setSelectedSymbol(stock.symbol)}
                          style={{
                            borderRadius: "17px",
                            border: active
                              ? "1px solid rgba(132,218,255,0.55)"
                              : "1px solid rgba(255,255,255,0.09)",
                            background: active
                              ? "rgba(83,215,255,0.14)"
                              : "rgba(255,255,255,0.045)",
                            color: "white",
                            padding: "15px",
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
                            <strong>{stock.symbol}</strong>
                            <strong
                              style={{
                                color: change >= 0 ? "#8ee8ff" : "#ffb0b0",
                                fontSize: "13px",
                              }}
                            >
                              {change >= 0 ? "+" : ""}
                              {change.toFixed(1)}%
                            </strong>
                          </div>
                          <span
                            style={{
                              display: "block",
                              marginTop: "7px",
                              color: "rgba(255,255,255,0.56)",
                              fontSize: "13px",
                            }}
                          >
                            {stock.name}
                          </span>
                          <div
                            style={{
                              marginTop: "12px",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <strong style={{ color: "#ffd18a" }}>
                              {stock.current_price} DT
                            </strong>
                            <small style={{ color: "rgba(255,255,255,0.44)" }}>
                              Own {getHolding(stock.symbol)?.quantity || 0}
                            </small>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <aside data-milo-guide="stock-trade-panel"
                  style={{
                    ...glassPanel,
                    padding: isMobile ? "20px" : "24px",
                    position: isDesktop ? "sticky" : "relative",
                    top: isDesktop ? "18px" : undefined,
                  }}
                >
                  {selectedStock ? (
                    <>
                      <p
                        style={{
                          margin: 0,
                          color: "#8ee8ff",
                          fontSize: "11px",
                          letterSpacing: "0.2em",
                          textTransform: "uppercase",
                          fontWeight: 900,
                        }}
                      >
                        Order Ticket
                      </p>
                      <h2
                        style={{
                          margin: "8px 0 0",
                          fontFamily: 'Georgia, "Times New Roman", serif',
                          fontSize: "38px",
                          fontWeight: 500,
                        }}
                      >
                        {selectedStock.symbol}
                      </h2>
                      <p
                        style={{
                          margin: "7px 0 0",
                          color: "rgba(255,255,255,0.52)",
                          fontSize: "13px",
                        }}
                      >
                        {selectedStock.name}
                      </p>

                      <div
                        style={{
                          marginTop: "17px",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            borderRadius: "15px",
                            padding: "13px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.09)",
                          }}
                        >
                          <small
                            style={{
                              display: "block",
                              color: "rgba(255,255,255,0.42)",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            Price
                          </small>
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
                            padding: "13px",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.09)",
                          }}
                        >
                          <small
                            style={{
                              display: "block",
                              color: "rgba(255,255,255,0.42)",
                              textTransform: "uppercase",
                              fontWeight: 900,
                            }}
                          >
                            You Own
                          </small>
                          <strong style={{ display: "block", marginTop: "5px" }}>
                            {selectedHolding?.quantity || 0}
                          </strong>
                        </div>
                      </div>

                      <label style={{ marginTop: "16px", display: "grid", gap: "7px" }}>
                        <span
                          style={{
                            color: "rgba(255,255,255,0.54)",
                            fontSize: "11px",
                            fontWeight: 900,
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
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
                          onChange={(event) => setQuantity(Number(event.target.value))}
                          style={inputStyle}
                        />
                      </label>

                      <div
                        style={{
                          marginTop: "12px",
                          borderRadius: "15px",
                          padding: "13px",
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "10px",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.09)",
                        }}
                      >
                        <span style={{ color: "rgba(255,255,255,0.5)" }}>
                          Order Total
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
                            height: "48px",
                            borderRadius: "14px",
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
                            height: "48px",
                            borderRadius: "14px",
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

                      <button
                        type="button"
                        onClick={() => setActiveSection("market")}
                        style={{
                          marginTop: "14px",
                          width: "100%",
                          border: 0,
                          background: "transparent",
                          color: "#8ee8ff",
                          fontWeight: 800,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        View graph and news →
                      </button>
                    </>
                  ) : (
                    <p>Select a stock to begin trading.</p>
                  )}
                </aside>
              </div>
            )}
          </div>
        </div>

      </div>
      <MiloExchangeGuide
        page="stocks"
        isMobile={isMobile}
        onStepChange={(step) => {
          if (step.section && step.section !== activeSection) {
            setActiveSection(step.section);
          }
        }}
      />
    </main>
  );
}
