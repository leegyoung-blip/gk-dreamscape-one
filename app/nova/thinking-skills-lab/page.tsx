"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

const NOVA_WORLD_HREF = "/inventor";
const DAILY_LIMIT = 3;
const CLUE_COST = 5;
const COLOUR_MAX_ATTEMPTS = 15;

type GameId = "colour-code" | "set-finder" | "tower-memory";
type ScreenMode = "desktop" | "tablet" | "mobile";

type ColourOption = {
  id: string;
  name: string;
  hex: string;
};

type GameDefinition = {
  id: GameId;
  title: string;
  shortTitle: string;
  description: string;
  skill: string;
  icon: string;
  accent: string;
  rewardText: string;
};

type DailyGameStatus = {
  completed: number;
  clues: number;
};

type LabStatus = {
  activityDate: string;
  tokenBalance: number;
  totalSessions: number;
  bestScore: number;
  games: Record<GameId, DailyGameStatus>;
};

type CompletionResult = {
  reward: number;
  tokenBalance: number;
  completedCount: number;
};

type ClueResult = {
  clueCost: number;
  cluesUsed: number;
  tokenBalance: number;
};

type ProfileAssetBreakdown = {
  cash: number;
  property: number;
  stocks: number;
};

type DreamTokenTransaction = {
  id: string;
  amount: number;
  type: string | null;
  title: string | null;
  created_at: string | null;
};

type StockRow = {
  symbol: string;
  current_price: number | string | null;
};

type StockHoldingRow = {
  symbol: string;
  quantity: number | string | null;
};

type PropertyRow = {
  id: string;
  current_value: number | string | null;
};

type PropertyHoldingRow = {
  property_id: string;
  quantity: number | string | null;
};

type RpcStatusPayload = {
  activity_date?: string;
  token_balance?: number;
  total_sessions?: number;
  best_score?: number;
  games?: Record<
    GameId,
    {
      completed?: number;
      clues?: number;
    }
  >;
};

type RpcCompletionPayload = {
  reward?: number;
  token_balance?: number;
  completed_count?: number;
};

type RpcCluePayload = {
  clue_cost?: number;
  clues_used?: number;
  token_balance?: number;
};

const COLOURS: ColourOption[] = [
  { id: "blue", name: "Blue", hex: "#45A7FF" },
  { id: "yellow", name: "Yellow", hex: "#FFD84A" },
  { id: "pink", name: "Pink", hex: "#FF6FB5" },
  { id: "green", name: "Green", hex: "#57D58A" },
  { id: "purple", name: "Purple", hex: "#9B7CFF" },
  { id: "orange", name: "Orange", hex: "#FF9F43" },
];

const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "colour-code",
    title: "Colour Code",
    shortTitle: "Colour Code",
    description:
      "Crack a four-light code. Colours may repeat, so study every clue carefully.",
    skill: "Deduction",
    icon: "●",
    accent: "#66D9FF",
    rewardText: "20 DT each",
  },
  {
    id: "set-finder",
    title: "SET Finder",
    shortTitle: "SET Finder",
    description:
      "Compare colour, shape, number, and pattern to find three valid SETs.",
    skill: "Flexible thinking",
    icon: "◇",
    accent: "#A98BFF",
    rewardText: "20 DT each",
  },
  {
    id: "tower-memory",
    title: "Tower Memory",
    shortTitle: "Tower Memory",
    description:
      "Study and rebuild towers that grow from four to six and then eight blocks.",
    skill: "Working memory",
    icon: "▦",
    accent: "#6FE7B1",
    rewardText: "5 / 10 / 15 DT",
  },
];

const EMPTY_PROFILE_ASSETS: ProfileAssetBreakdown = {
  cash: 0,
  property: 0,
  stocks: 0,
};

const EMPTY_STATUS: LabStatus = {
  activityDate: "",
  tokenBalance: 0,
  totalSessions: 0,
  bestScore: 0,
  games: {
    "colour-code": { completed: 0, clues: 0 },
    "set-finder": { completed: 0, clues: 0 },
    "tower-memory": { completed: 0, clues: 0 },
  },
};

function useResponsiveMode() {
  const [screenMode, setScreenMode] = useState<ScreenMode>("desktop");

  useEffect(() => {
    function updateMode() {
      const width = window.innerWidth;

      if (width <= 720) {
        setScreenMode("mobile");
      } else if (width <= 1120) {
        setScreenMode("tablet");
      } else {
        setScreenMode("desktop");
      }
    }

    updateMode();
    window.addEventListener("resize", updateMode);

    return () => window.removeEventListener("resize", updateMode);
  }, []);

  return screenMode;
}

function useMidnightCountdown(activityDate: string) {
  const [countdown, setCountdown] = useState("--:--:--");

  useEffect(() => {
    function updateCountdown() {
      const now = Date.now();
      const singaporeNow = new Date(now + 8 * 60 * 60 * 1000);
      const nextMidnightUtc =
        Date.UTC(
          singaporeNow.getUTCFullYear(),
          singaporeNow.getUTCMonth(),
          singaporeNow.getUTCDate() + 1,
          0,
          0,
          0
        ) -
        8 * 60 * 60 * 1000;

      const difference = Math.max(0, nextMidnightUtc - now);
      const hours = Math.floor(difference / 3_600_000);
      const minutes = Math.floor((difference % 3_600_000) / 60_000);
      const seconds = Math.floor((difference % 60_000) / 1000);

      setCountdown(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}:${String(seconds).padStart(2, "0")}`
      );
    }

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => window.clearInterval(timer);
  }, [activityDate]);

  return countdown;
}

function normaliseStatus(payload: RpcStatusPayload | null): LabStatus {
  const games = payload?.games;

  return {
    activityDate: String(payload?.activity_date ?? ""),
    tokenBalance: Number(payload?.token_balance ?? 0),
    totalSessions: Number(payload?.total_sessions ?? 0),
    bestScore: Number(payload?.best_score ?? 0),
    games: {
      "colour-code": {
        completed: Number(games?.["colour-code"]?.completed ?? 0),
        clues: Number(games?.["colour-code"]?.clues ?? 0),
      },
      "set-finder": {
        completed: Number(games?.["set-finder"]?.completed ?? 0),
        clues: Number(games?.["set-finder"]?.clues ?? 0),
      },
      "tower-memory": {
        completed: Number(games?.["tower-memory"]?.completed ?? 0),
        clues: Number(games?.["tower-memory"]?.clues ?? 0),
      },
    },
  };
}

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seedText: string) {
  let seed = hashString(seedText);

  return function random() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seededShuffle<T>(items: T[], seedText: string) {
  const random = seededRandom(seedText);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

function colourById(id: string) {
  return COLOURS.find((colour) => colour.id === id) ?? COLOURS[0];
}

function makeSeed(
  userId: string,
  activityDate: string,
  gameId: GameId,
  questionNumber: number,
  suffix = ""
) {
  return `${userId}:${activityDate}:${gameId}:${questionNumber}:${suffix}`;
}

function formatDreamTokenAmount(value: number) {
  return `${Math.max(0, Math.round(value)).toLocaleString("en-US")} DT`;
}

function formatDreamTokenTransactionDate(value: string | null) {
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

function formatSupabaseError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}

export default function ThinkingSkillsLabPage() {
  const screenMode = useResponsiveMode();
  const isDesktop = screenMode === "desktop";

  const [selectedGame, setSelectedGame] =
    useState<GameId>("colour-code");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [status, setStatus] = useState<LabStatus>(EMPTY_STATUS);
  const [profileAssets, setProfileAssets] =
    useState<ProfileAssetBreakdown>(EMPTY_PROFILE_ASSETS);
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [profileAssetsLoading, setProfileAssetsLoading] = useState(true);
  const [profileAssetsOpen, setProfileAssetsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [gameVersion, setGameVersion] = useState(0);

  const countdown = useMidnightCountdown(status.activityDate);
  const activeGame =
    GAME_DEFINITIONS.find((game) => game.id === selectedGame) ??
    GAME_DEFINITIONS[0];
  const activeStatus = status.games[selectedGame];
  const currentQuestion = Math.min(
    DAILY_LIMIT,
    activeStatus.completed + 1
  );
  const dailyComplete = activeStatus.completed >= DAILY_LIMIT;
  const displayedProfileAssets = useMemo(
    () => ({
      cash: profileAssets.cash,
      property: profileAssets.property,
      stocks: profileAssets.stocks,
    }),
    [profileAssets.cash, profileAssets.property, profileAssets.stocks]
  );
  const profileAssetsTotal =
    displayedProfileAssets.cash +
    displayedProfileAssets.property +
    displayedProfileAssets.stocks;

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setProfileAssetsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setUserId(null);
      setStatus(EMPTY_STATUS);
      setProfileAssets(EMPTY_PROFILE_ASSETS);
      setTokenTransactions([]);
      setProfileAssetsLoading(false);
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [
      statusResult,
      balanceResult,
      recentTransactionsResult,
      stocksResult,
      stockHoldingsResult,
      propertiesResult,
      propertyHoldingsResult,
    ] = await Promise.all([
      supabase.rpc("thinking_lab_get_status"),
      supabase
        .from("dream_token_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("token_kind", "virtual"),
      supabase
        .from("dream_token_transactions")
        .select("id,amount,type,title,created_at")
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
    ]);

    if (statusResult.error) {
      console.error(
        "Could not load Thinking Skills Lab status:",
        statusResult.error
      );
      setNotice(formatSupabaseError(statusResult.error));
      setProfileAssetsLoading(false);
      setLoading(false);
      return;
    }

    const nextStatus = normaliseStatus(
      (statusResult.data ?? null) as RpcStatusPayload | null
    );

    const cashValue = balanceResult.error
      ? 0
      : (balanceResult.data ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        );

    if (balanceResult.error) {
      console.warn(
        "Could not load Dreamscape Tokens:",
        balanceResult.error.message
      );
    }

    if (recentTransactionsResult.error) {
      console.warn(
        "Could not load recent Dreamscape Token transactions:",
        recentTransactionsResult.error.message
      );
      setTokenTransactions([]);
    } else {
      setTokenTransactions(
        (recentTransactionsResult.data ?? []).map((transaction) => ({
          id: String(transaction.id),
          amount: Number(transaction.amount ?? 0),
          type: transaction.type ? String(transaction.type) : null,
          title: transaction.title ? String(transaction.title) : null,
          created_at: transaction.created_at
            ? String(transaction.created_at)
            : null,
        }))
      );
    }

    const stockPrices = new Map(
      ((stocksResult.data ?? []) as StockRow[]).map((stock) => [
        stock.symbol,
        Number(stock.current_price ?? 0),
      ])
    );
    const stockValue = stockHoldingsResult.error
      ? 0
      : ((stockHoldingsResult.data ?? []) as StockHoldingRow[]).reduce(
          (total, holding) =>
            total +
            Number(holding.quantity ?? 0) *
              Number(stockPrices.get(holding.symbol) ?? 0),
          0
        );

    const propertyPrices = new Map(
      ((propertiesResult.data ?? []) as PropertyRow[]).map((property) => [
        String(property.id),
        Number(property.current_value ?? 0),
      ])
    );
    const propertyValue = propertyHoldingsResult.error
      ? 0
      : (
          (propertyHoldingsResult.data ?? []) as PropertyHoldingRow[]
        ).reduce(
          (total, holding) =>
            total +
            Number(holding.quantity ?? 0) *
              Number(propertyPrices.get(String(holding.property_id)) ?? 0),
          0
        );

    if (stocksResult.error || stockHoldingsResult.error) {
      console.warn(
        "Could not load stock assets:",
        stocksResult.error?.message ?? stockHoldingsResult.error?.message
      );
    }

    if (propertiesResult.error || propertyHoldingsResult.error) {
      console.warn(
        "Could not load property assets:",
        propertiesResult.error?.message ??
          propertyHoldingsResult.error?.message
      );
    }

    setStatus({
      ...nextStatus,
      tokenBalance: cashValue,
    });
    setProfileAssets({
      cash: cashValue,
      property: propertyValue,
      stocks: stockValue,
    });
    setProfileAssetsLoading(false);
    setLoading(false);
  }, []);

  const refreshCashAndTransactions = useCallback(
    async (accountUserId: string) => {
      const [balanceResult, recentTransactionsResult] = await Promise.all([
        supabase
          .from("dream_token_transactions")
          .select("amount")
          .eq("user_id", accountUserId)
          .eq("token_kind", "virtual"),
        supabase
          .from("dream_token_transactions")
          .select("id,amount,type,title,created_at")
          .eq("user_id", accountUserId)
          .eq("token_kind", "virtual")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      if (balanceResult.error) {
        console.warn(
          "Could not refresh Dreamscape Tokens:",
          balanceResult.error.message
        );
      } else {
        const cashValue = (balanceResult.data ?? []).reduce(
          (sum, row) => sum + Number(row.amount ?? 0),
          0
        );

        setProfileAssets((current) => ({
          ...current,
          cash: cashValue,
        }));

        setStatus((current) => ({
          ...current,
          tokenBalance: cashValue,
        }));
      }

      if (recentTransactionsResult.error) {
        console.warn(
          "Could not refresh recent Dreamscape Token transactions:",
          recentTransactionsResult.error.message
        );
      } else {
        setTokenTransactions(
          (recentTransactionsResult.data ?? []).map((transaction) => ({
            id: String(transaction.id),
            amount: Number(transaction.amount ?? 0),
            type: transaction.type ? String(transaction.type) : null,
            title: transaction.title ? String(transaction.title) : null,
            created_at: transaction.created_at
              ? String(transaction.created_at)
              : null,
          }))
        );
      }
    },
    []
  );

  useEffect(() => {
    loadStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadStatus();
    });

    function refreshAllAssets() {
      loadStatus();
    }

    function refreshTokenAssets() {
      if (userId) {
        refreshCashAndTransactions(userId);
      }
    }

    window.addEventListener("focus", refreshAllAssets);
    window.addEventListener("dream-tokens-updated", refreshTokenAssets);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener("focus", refreshAllAssets);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshTokenAssets
      );
    };
  }, [loadStatus, refreshCashAndTransactions, userId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const singaporeDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Singapore",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());

      if (status.activityDate && singaporeDate !== status.activityDate) {
        loadStatus();
        setGameVersion((current) => current + 1);
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [loadStatus, status.activityDate]);

  useEffect(() => {
    setMenuOpen(false);
    setNotice("");
    setGameVersion((current) => current + 1);
  }, [selectedGame]);

  useEffect(() => {
    if (!profileAssetsOpen) return;

    function closeProfileAssets(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileAssetsOpen(false);
    }

    document.addEventListener("keydown", closeProfileAssets);
    return () => document.removeEventListener("keydown", closeProfileAssets);
  }, [profileAssetsOpen]);

  const buyClue = useCallback(
    async (gameId: GameId, questionNumber: number) => {
      if (!userId) {
        throw new Error("Please log in before buying a clue.");
      }

      const { data, error } = await supabase.rpc(
        "thinking_lab_buy_clue",
        {
          p_game_id: gameId,
          p_question_number: questionNumber,
        }
      );

      if (error) throw error;

      const payload = (data ?? {}) as RpcCluePayload;
      const result: ClueResult = {
        clueCost: Number(payload.clue_cost ?? CLUE_COST),
        cluesUsed: Number(payload.clues_used ?? 0),
        tokenBalance: Number(payload.token_balance ?? 0),
      };

      setStatus((current) => ({
        ...current,
        tokenBalance: result.tokenBalance,
        games: {
          ...current.games,
          [gameId]: {
            ...current.games[gameId],
            clues: result.cluesUsed,
          },
        },
      }));

      setProfileAssets((current) => ({
        ...current,
        cash: result.tokenBalance,
      }));

      await refreshCashAndTransactions(userId);
      window.dispatchEvent(new Event("dream-tokens-updated"));

      setNotice(`Clue revealed for ${result.clueCost} DT.`);
      return result;
    },
    [refreshCashAndTransactions, userId]
  );

  const completeQuestion = useCallback(
    async (
      gameId: GameId,
      questionNumber: number,
      score: number
    ) => {
      if (!userId) {
        throw new Error("Please log in to save rewards and progress.");
      }

      const { data, error } = await supabase.rpc(
        "thinking_lab_complete_question",
        {
          p_game_id: gameId,
          p_question_number: questionNumber,
          p_score: Math.max(0, Math.round(score)),
        }
      );

      if (error) throw error;

      const payload = (data ?? {}) as RpcCompletionPayload;
      const result: CompletionResult = {
        reward: Number(payload.reward ?? 0),
        tokenBalance: Number(payload.token_balance ?? 0),
        completedCount: Number(payload.completed_count ?? questionNumber),
      };

      setStatus((current) => ({
        ...current,
        tokenBalance: result.tokenBalance,
        totalSessions: current.totalSessions + 1,
        bestScore: Math.max(current.bestScore, Math.round(score)),
        games: {
          ...current.games,
          [gameId]: {
            completed: result.completedCount,
            clues: 0,
          },
        },
      }));

      setProfileAssets((current) => ({
        ...current,
        cash: result.tokenBalance,
      }));

      await refreshCashAndTransactions(userId);
      window.dispatchEvent(new Event("dream-tokens-updated"));

      setNotice(`Challenge complete. You earned ${result.reward} DT.`);
      return result;
    },
    [refreshCashAndTransactions, userId]
  );

  function beginNextQuestion() {
    setNotice("");
    setGameVersion((current) => current + 1);
  }

  return (
    <main className="lab-page">
      <div className="lab-background" aria-hidden="true">
        <div className="lab-glow lab-glow-one" />
        <div className="lab-glow lab-glow-two" />
        <div className="lab-grid" />
      </div>

      {profileAssetsOpen && (
        <button
          type="button"
          className="assets-backdrop"
          aria-label="Close profile assets"
          onClick={() => setProfileAssetsOpen(false)}
        />
      )}

      <header className="topbar">
        <div className="topbar-left">
          <Link href={NOVA_WORLD_HREF} className="round-button">
            <span aria-hidden="true">←</span>
            <span className="round-button-label">Nova’s World</span>
          </Link>

          {!isDesktop && (
            <button
              type="button"
              className="round-button mobile-menu-button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-expanded={menuOpen}
              aria-controls="thinking-game-menu"
            >
              <span aria-hidden="true">☰</span>
              <span className="round-button-label">Games</span>
            </button>
          )}
        </div>

        <div className="topbar-stats">
          <div className="profile-assets-wrap">
            <button
              type="button"
              className="stat-pill token-pill assets-button"
              onClick={() => setProfileAssetsOpen((current) => !current)}
              aria-expanded={profileAssetsOpen}
              aria-haspopup="menu"
            >
              <span className="stat-label">Profile Assets</span>
              <strong>
                {loading || profileAssetsLoading
                  ? "—"
                  : formatDreamTokenAmount(profileAssetsTotal)}
                <span
                  className={`assets-chevron ${
                    profileAssetsOpen ? "is-open" : ""
                  }`}
                  aria-hidden="true"
                >
                  ▾
                </span>
              </strong>
            </button>

            {profileAssetsOpen && (
              <div className="assets-dropdown" role="menu">
                <div className="assets-dropdown-heading">
                  <span>Total profile assets</span>
                  <strong>
                    {profileAssetsLoading
                      ? "Loading..."
                      : formatDreamTokenAmount(profileAssetsTotal)}
                  </strong>
                </div>

                <div className="assets-dropdown-scroll">
                  <div className="assets-list">
                    {[
                      ["Cash", displayedProfileAssets.cash, "✦"],
                      ["Property", displayedProfileAssets.property, "⌂"],
                      ["Stocks", displayedProfileAssets.stocks, "↗"],
                    ].map(([label, value, icon]) => (
                      <div
                        className="assets-row"
                        role="menuitem"
                        key={String(label)}
                      >
                        <span className="assets-row-icon" aria-hidden="true">
                          {icon}
                        </span>
                        <span>{label}</span>
                        <strong>
                          {profileAssetsLoading
                            ? "—"
                            : formatDreamTokenAmount(Number(value))}
                        </strong>
                      </div>
                    ))}
                  </div>

                  <p className="transactions-heading">
                    Latest cash transactions
                  </p>

                  {profileAssetsLoading ? (
                    <div className="transactions-empty">
                      Loading assets...
                    </div>
                  ) : tokenTransactions.length === 0 ? (
                    <div className="transactions-empty">
                      No token transactions yet.
                    </div>
                  ) : (
                    <div className="transactions-list">
                      {tokenTransactions.map((transaction) => {
                        const isPositive = transaction.amount >= 0;

                        return (
                          <div
                            className="transaction-row"
                            role="menuitem"
                            key={transaction.id}
                          >
                            <span
                              className={`transaction-sign ${
                                isPositive ? "is-positive" : "is-negative"
                              }`}
                              aria-hidden="true"
                            >
                              {isPositive ? "+" : "−"}
                            </span>

                            <span className="transaction-copy">
                              <strong>
                                {transaction.title ||
                                  (isPositive
                                    ? "Dreamscape Token reward"
                                    : "Dreamscape Token spend")}
                              </strong>
                              <small>
                                {formatDreamTokenTransactionDate(
                                  transaction.created_at
                                )}
                              </small>
                            </span>

                            <strong
                              className={`transaction-amount ${
                                isPositive ? "is-positive" : "is-negative"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {transaction.amount} DT
                            </strong>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="stat-pill">
            <span className="stat-label">Today</span>
            <strong>
              {loading
                ? "—"
                : `${Object.values(status.games).reduce(
                    (total, game) => total + game.completed,
                    0
                  )}/9`}
            </strong>
          </div>
        </div>
      </header>

      <section className="hero">
        <div>
          <p className="eyebrow">Nova’s World</p>
          <h1>Thinking Skills Lab</h1>
          <p className="hero-copy">
            Three quick thinking games, three fresh challenges per game,
            every day.
          </p>
        </div>

        <div className="reset-card">
          <span>New daily games in</span>
          <strong>{countdown}</strong>
          <small>Midnight · Singapore time</small>
        </div>
      </section>

      <div className="lab-layout">
        <aside
          id="thinking-game-menu"
          className={`game-sidebar ${menuOpen ? "is-open" : ""}`}
        >
          <div className="sidebar-heading">
            <div>
              <p className="sidebar-eyebrow">Choose a game</p>
              <h2>Daily Games</h2>
            </div>

            {!isDesktop && (
              <button
                type="button"
                className="icon-button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close game menu"
              >
                ×
              </button>
            )}
          </div>

          <div className="game-list">
            {GAME_DEFINITIONS.map((game) => {
              const selected = game.id === selectedGame;
              const gameStatus = status.games[game.id];

              return (
                <button
                  type="button"
                  key={game.id}
                  className={`game-menu-card ${
                    selected ? "is-selected" : ""
                  }`}
                  onClick={() => setSelectedGame(game.id)}
                  style={
                    {
                      "--game-accent": game.accent,
                    } as CSSProperties
                  }
                >
                  <span className="game-menu-icon" aria-hidden="true">
                    {game.icon}
                  </span>

                  <span className="game-menu-copy">
                    <strong>{game.shortTitle}</strong>
                    <small>{game.rewardText}</small>
                    <span className="mini-progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            (gameStatus.completed / DAILY_LIMIT) * 100
                          )}%`,
                        }}
                      />
                    </span>
                  </span>

                  <span className="game-menu-count">
                    {gameStatus.completed}/3
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sidebar-note">
            <span aria-hidden="true">✦</span>
            <p>
              Colour Code and SET clues cost 5 DT. Daily rewards can only
              be collected once.
            </p>
          </div>
        </aside>

        {menuOpen && !isDesktop && (
          <button
            type="button"
            className="menu-backdrop"
            aria-label="Close game menu"
            onClick={() => setMenuOpen(false)}
          />
        )}

        <section
          className="game-stage"
          style={
            {
              "--active-accent": activeGame.accent,
            } as CSSProperties
          }
        >
          <div className="game-stage-heading">
            <div className="game-title-row">
              <span className="active-game-icon" aria-hidden="true">
                {activeGame.icon}
              </span>

              <div>
                <p className="game-skill">{activeGame.skill}</p>
                <h2>{activeGame.title}</h2>
              </div>
            </div>

            <div className="stage-summary">
              <p>{activeGame.description}</p>
              <div className="stage-progress">
                <span>
                  Daily progress <strong>{activeStatus.completed}/3</strong>
                </span>
                <div>
                  <i
                    style={{
                      width: `${Math.min(
                        100,
                        (activeStatus.completed / DAILY_LIMIT) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="game-surface">
            {loading ? (
              <LoadingPanel />
            ) : !userId ? (
              <LoginPanel />
            ) : dailyComplete ? (
              <DailyCompletePanel
                game={activeGame}
                countdown={countdown}
              />
            ) : (
              <>
                {selectedGame === "colour-code" && (
                  <ColourCodeGame
                    key={`${status.activityDate}-${gameVersion}`}
                    userId={userId}
                    activityDate={status.activityDate}
                    questionNumber={currentQuestion}
                    cluesUsed={activeStatus.clues}
                    tokenBalance={profileAssets.cash}
                    onBuyClue={buyClue}
                    onComplete={completeQuestion}
                    onContinue={beginNextQuestion}
                  />
                )}

                {selectedGame === "set-finder" && (
                  <SetFinderGame
                    key={`${status.activityDate}-${gameVersion}`}
                    userId={userId}
                    activityDate={status.activityDate}
                    questionNumber={currentQuestion}
                    cluesUsed={activeStatus.clues}
                    tokenBalance={profileAssets.cash}
                    onBuyClue={buyClue}
                    onComplete={completeQuestion}
                    onContinue={beginNextQuestion}
                  />
                )}

                {selectedGame === "tower-memory" && (
                  <TowerMemoryGame
                    key={`${status.activityDate}-${gameVersion}`}
                    userId={userId}
                    activityDate={status.activityDate}
                    questionNumber={currentQuestion}
                    onComplete={completeQuestion}
                    onContinue={beginNextQuestion}
                  />
                )}
              </>
            )}
          </div>

          {notice && (
            <div className="save-message" role="status">
              <span aria-hidden="true">✓</span>
              {notice}
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        :global(*) {
          box-sizing: border-box;
        }

        :global(html) {
          background: #040915;
        }

        :global(body) {
          margin: 0;
          background: #040915;
        }

        :global(button),
        :global(a) {
          -webkit-tap-highlight-color: transparent;
        }

        .lab-page {
          position: relative;
          min-height: 100dvh;
          overflow-x: hidden;
          padding: 96px 28px 48px;
          color: #f7fbff;
          background:
            radial-gradient(
              circle at 50% -10%,
              rgba(57, 153, 255, 0.18),
              transparent 36%
            ),
            linear-gradient(180deg, #071225 0%, #050a15 52%, #03060d 100%);
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .lab-background {
          position: fixed;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .lab-glow {
          position: absolute;
          border-radius: 999px;
          filter: blur(90px);
          opacity: 0.26;
        }

        .lab-glow-one {
          width: 420px;
          height: 420px;
          top: 14%;
          right: -170px;
          background: #2a8fff;
        }

        .lab-glow-two {
          width: 360px;
          height: 360px;
          bottom: -130px;
          left: 10%;
          background: #8256ff;
        }

        .lab-grid {
          position: absolute;
          inset: 0;
          opacity: 0.12;
          background-image:
            linear-gradient(rgba(116, 202, 255, 0.22) 1px, transparent 1px),
            linear-gradient(
              90deg,
              rgba(116, 202, 255, 0.22) 1px,
              transparent 1px
            );
          background-size: 46px 46px;
          mask-image: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.7),
            transparent 80%
          );
        }

        .topbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 80;
          min-height: 72px;
          padding: 14px 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid rgba(134, 211, 255, 0.12);
          background: rgba(4, 10, 22, 0.78);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .topbar-left,
        .topbar-stats {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .assets-backdrop {
          position: fixed;
          inset: 0;
          z-index: 78;
          appearance: none;
          border: 0;
          background: transparent;
          cursor: default;
        }

        .profile-assets-wrap {
          position: relative;
          z-index: 82;
        }

        .round-button,
        .stat-pill {
          min-height: 42px;
          border-radius: 999px;
          border: 1px solid rgba(130, 210, 255, 0.26);
          background: rgba(12, 31, 57, 0.72);
          box-shadow: 0 12px 26px rgba(0, 0, 0, 0.22);
        }

        .round-button {
          padding: 0 16px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: white;
          text-decoration: none;
          font: inherit;
          font-size: 13px;
          font-weight: 750;
          cursor: pointer;
        }

        .mobile-menu-button {
          appearance: none;
        }

        .stat-pill {
          min-width: 104px;
          padding: 7px 14px;
          display: grid;
          grid-template-columns: 1fr auto;
          align-items: center;
          gap: 12px;
        }

        .token-pill {
          min-width: 210px;
        }

        .assets-button {
          width: 100%;
          appearance: none;
          color: white;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }

        .assets-button strong {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .assets-chevron {
          display: inline-block;
          color: #8ee8ff;
          font-size: 13px;
          transition: transform 180ms ease;
        }

        .assets-chevron.is-open {
          transform: rotate(180deg);
        }

        .assets-dropdown {
          position: absolute;
          top: calc(100% + 10px);
          right: 0;
          z-index: 90;
          width: 380px;
          max-height: min(560px, calc(100dvh - 92px));
          overflow: hidden;
          border-radius: 20px;
          border: 1px solid rgba(126, 232, 255, 0.3);
          background: linear-gradient(
            145deg,
            rgba(3, 20, 39, 0.98),
            rgba(3, 10, 25, 0.99)
          );
          box-shadow:
            0 28px 72px rgba(0, 0, 0, 0.56),
            0 0 28px rgba(83, 215, 255, 0.12);
          color: white;
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .assets-dropdown-heading {
          padding: 17px 18px;
          display: grid;
          gap: 6px;
          border-bottom: 1px solid rgba(126, 232, 255, 0.13);
        }

        .assets-dropdown-heading span {
          color: #8ee8ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .assets-dropdown-heading strong {
          color: white;
          font-size: 27px;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .assets-dropdown-scroll {
          max-height: min(476px, calc(100dvh - 176px));
          padding: 11px;
          overflow-y: auto;
          overflow-x: hidden;
        }

        .assets-list {
          display: grid;
          gap: 8px;
        }

        .assets-row {
          min-height: 54px;
          padding: 9px 11px;
          display: grid;
          grid-template-columns: 32px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          color: white;
          font-size: 13px;
          font-weight: 750;
        }

        .assets-row-icon {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          border: 1px solid rgba(83, 215, 255, 0.26);
          background: rgba(83, 215, 255, 0.09);
          color: #8ee8ff;
          font-weight: 900;
        }

        .assets-row strong {
          color: #9fffd2;
          font-size: 12px;
          white-space: nowrap;
        }

        .transactions-heading {
          margin: 16px 4px 10px;
          color: rgba(255, 255, 255, 0.48);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .transactions-list {
          display: grid;
          gap: 8px;
        }

        .transactions-empty {
          padding: 20px 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.035);
          color: rgba(255, 255, 255, 0.58);
          font-size: 13px;
          line-height: 1.5;
          text-align: center;
        }

        .transaction-row {
          min-height: 58px;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(126, 232, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
        }

        .transaction-sign {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          font-weight: 900;
        }

        .transaction-sign.is-positive {
          border: 1px solid rgba(93, 255, 181, 0.34);
          background: rgba(93, 255, 181, 0.1);
          color: #9fffd2;
        }

        .transaction-sign.is-negative {
          border: 1px solid rgba(255, 167, 120, 0.34);
          background: rgba(255, 138, 92, 0.1);
          color: #ffc0a0;
        }

        .transaction-copy {
          min-width: 0;
        }

        .transaction-copy strong {
          display: block;
          overflow: hidden;
          color: white;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .transaction-copy small {
          display: block;
          margin-top: 4px;
          color: rgba(255, 255, 255, 0.43);
          font-size: 10px;
        }

        .transaction-amount {
          font-size: 12px;
          white-space: nowrap;
        }

        .transaction-amount.is-positive {
          color: #9fffd2;
        }

        .transaction-amount.is-negative {
          color: #ffc0a0;
        }

        .stat-label {
          color: rgba(232, 245, 255, 0.62);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .stat-pill strong {
          color: #8ee8ff;
          font-size: 15px;
          white-space: nowrap;
        }

        .hero,
        .lab-layout {
          position: relative;
          z-index: 2;
          width: min(1380px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .hero {
          padding: 34px 0 30px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
        }

        .eyebrow,
        .sidebar-eyebrow,
        .game-skill {
          margin: 0;
          color: #73dcff;
          font-size: 11px;
          font-weight: 850;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .hero h1 {
          margin: 8px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(42px, 6vw, 74px);
          font-weight: 400;
          line-height: 0.98;
          letter-spacing: -0.045em;
        }

        .hero-copy {
          max-width: 730px;
          margin: 18px 0 0;
          color: rgba(235, 246, 255, 0.74);
          font-size: clamp(16px, 2vw, 20px);
          line-height: 1.55;
        }

        .reset-card {
          min-width: 220px;
          padding: 16px 18px;
          display: grid;
          gap: 4px;
          border-radius: 19px;
          border: 1px solid rgba(126, 219, 255, 0.18);
          background: rgba(8, 25, 47, 0.68);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.24);
        }

        .reset-card span,
        .reset-card small {
          color: rgba(235, 247, 255, 0.52);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .reset-card strong {
          color: #8ee8ff;
          font-size: 27px;
          letter-spacing: 0.06em;
        }

        .reset-card small {
          font-size: 9px;
          letter-spacing: 0.05em;
          text-transform: none;
        }

        .lab-layout {
          display: grid;
          grid-template-columns: 292px minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        .game-sidebar,
        .game-stage {
          border: 1px solid rgba(126, 208, 255, 0.17);
          background: rgba(6, 18, 36, 0.76);
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.3);
        }

        .game-sidebar {
          position: sticky;
          top: 94px;
          border-radius: 26px;
          padding: 20px;
        }

        .sidebar-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 2px 2px 16px;
        }

        .sidebar-heading h2 {
          margin: 5px 0 0;
          font-size: 23px;
          letter-spacing: -0.03em;
        }

        .icon-button {
          width: 38px;
          height: 38px;
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px solid rgba(137, 217, 255, 0.28);
          background: rgba(255, 255, 255, 0.05);
          color: white;
          font-size: 24px;
          cursor: pointer;
        }

        .game-list {
          display: grid;
          gap: 10px;
        }

        .game-menu-card {
          position: relative;
          width: 100%;
          min-height: 82px;
          padding: 12px;
          display: grid;
          grid-template-columns: 44px 1fr auto;
          align-items: center;
          gap: 11px;
          overflow: hidden;
          appearance: none;
          border-radius: 18px;
          border: 1px solid rgba(134, 211, 255, 0.13);
          background: rgba(255, 255, 255, 0.035);
          color: white;
          text-align: left;
          cursor: pointer;
          transition:
            transform 180ms ease,
            border-color 180ms ease,
            background 180ms ease;
        }

        .game-menu-card:hover {
          transform: translateY(-2px);
          border-color: color-mix(
            in srgb,
            var(--game-accent) 48%,
            transparent
          );
          background: rgba(255, 255, 255, 0.06);
        }

        .game-menu-card.is-selected {
          border-color: color-mix(
            in srgb,
            var(--game-accent) 65%,
            transparent
          );
          background: color-mix(
            in srgb,
            var(--game-accent) 13%,
            rgba(6, 18, 36, 0.9)
          );
          box-shadow: inset 3px 0 0 var(--game-accent);
        }

        .game-menu-icon,
        .active-game-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          border: 1px solid
            color-mix(in srgb, var(--game-accent) 45%, transparent);
          background: color-mix(
            in srgb,
            var(--game-accent) 15%,
            rgba(8, 20, 40, 0.92)
          );
          color: var(--game-accent);
          box-shadow: 0 0 20px
            color-mix(in srgb, var(--game-accent) 18%, transparent);
        }

        .game-menu-icon {
          width: 44px;
          height: 44px;
          font-size: 22px;
        }

        .game-menu-copy {
          min-width: 0;
          display: grid;
          gap: 4px;
        }

        .game-menu-copy strong {
          font-size: 14px;
        }

        .game-menu-copy small {
          color: rgba(235, 246, 255, 0.56);
          font-size: 10px;
        }

        .mini-progress {
          width: 100%;
          height: 4px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .mini-progress i {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: var(--game-accent);
        }

        .game-menu-count {
          min-width: 34px;
          height: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.055);
          color: rgba(240, 248, 255, 0.68);
          font-size: 10px;
          font-weight: 850;
        }

        .sidebar-note {
          margin-top: 18px;
          padding: 14px;
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 10px;
          border-radius: 16px;
          background: rgba(104, 209, 255, 0.07);
          color: rgba(231, 246, 255, 0.66);
          font-size: 12px;
          line-height: 1.5;
        }

        .sidebar-note span {
          color: #7ce1ff;
        }

        .sidebar-note p {
          margin: 0;
        }

        .game-stage {
          min-width: 0;
          border-radius: 30px;
          overflow: hidden;
        }

        .game-stage-heading {
          padding: 28px 30px 24px;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(280px, 0.8fr);
          align-items: end;
          gap: 26px;
          border-bottom: 1px solid rgba(126, 208, 255, 0.12);
          background:
            radial-gradient(
              circle at 0% 0%,
              color-mix(in srgb, var(--active-accent) 13%, transparent),
              transparent 46%
            ),
            rgba(255, 255, 255, 0.018);
        }

        .game-title-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .active-game-icon {
          --game-accent: var(--active-accent);
          width: 58px;
          height: 58px;
          flex: 0 0 auto;
          font-size: 28px;
        }

        .game-stage-heading h2 {
          margin: 5px 0 0;
          font-size: clamp(27px, 3vw, 39px);
          letter-spacing: -0.045em;
        }

        .stage-summary > p {
          margin: 0;
          color: rgba(235, 246, 255, 0.67);
          font-size: 14px;
          line-height: 1.55;
        }

        .stage-progress {
          margin-top: 13px;
          display: grid;
          gap: 6px;
        }

        .stage-progress span {
          display: flex;
          align-items: center;
          justify-content: space-between;
          color: rgba(235, 246, 255, 0.5);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .stage-progress span strong {
          color: white;
        }

        .stage-progress > div {
          height: 6px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
        }

        .stage-progress i {
          height: 100%;
          display: block;
          border-radius: inherit;
          background: var(--active-accent);
        }

        .game-surface {
          min-height: 610px;
          padding: 28px 30px 32px;
        }

        .save-message {
          margin: 0 30px 26px;
          padding: 12px 15px;
          display: flex;
          align-items: center;
          gap: 10px;
          border-radius: 14px;
          border: 1px solid rgba(111, 231, 177, 0.3);
          background: rgba(55, 183, 126, 0.11);
          color: #bdf8d9;
          font-size: 13px;
        }

        .menu-backdrop {
          display: none;
        }

        @media (max-width: 1120px) {
          .lab-page {
            padding-left: 20px;
            padding-right: 20px;
          }

          .lab-layout {
            grid-template-columns: 1fr;
          }

          .game-sidebar {
            position: fixed;
            top: 0;
            left: 0;
            bottom: 0;
            z-index: 120;
            width: min(340px, 88vw);
            border-radius: 0 26px 26px 0;
            padding: 88px 20px 24px;
            overflow-y: auto;
            transform: translateX(-105%);
            transition: transform 220ms ease;
          }

          .game-sidebar.is-open {
            transform: translateX(0);
          }

          .menu-backdrop {
            position: fixed;
            inset: 0;
            z-index: 110;
            display: block;
            appearance: none;
            border: 0;
            background: rgba(0, 4, 12, 0.68);
            backdrop-filter: blur(5px);
          }
        }

        @media (max-width: 760px) {
          .lab-page {
            padding: 122px 12px 28px;
          }

          .topbar {
            min-height: 108px;
            padding: 10px 12px;
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .topbar-left,
          .topbar-stats {
            width: 100%;
            justify-content: space-between;
          }

          .topbar-stats {
            gap: 8px;
          }

          .stat-pill {
            width: 50%;
            min-width: 0;
            min-height: 36px;
            padding: 5px 10px;
          }

          .profile-assets-wrap {
            width: 50%;
          }

          .token-pill {
            width: 100%;
            min-width: 0;
          }

          .assets-dropdown {
            position: fixed;
            top: 112px;
            right: 12px;
            left: 12px;
            width: auto;
            max-height: calc(100dvh - 124px);
          }

          .assets-dropdown-scroll {
            max-height: calc(100dvh - 208px);
          }

          .round-button {
            min-height: 40px;
            padding: 0 13px;
            font-size: 12px;
          }

          .hero {
            padding: 22px 6px;
            align-items: stretch;
            flex-direction: column;
          }

          .hero h1 {
            font-size: clamp(40px, 13vw, 58px);
          }

          .hero-copy {
            margin-top: 13px;
            font-size: 15px;
          }

          .reset-card {
            min-width: 0;
          }

          .game-stage {
            border-radius: 22px;
          }

          .game-stage-heading {
            padding: 20px 18px;
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .active-game-icon {
            width: 50px;
            height: 50px;
          }

          .game-stage-heading h2 {
            font-size: 29px;
          }

          .game-surface {
            min-height: 0;
            padding: 18px 12px 22px;
          }

          .save-message {
            margin: 0 14px 18px;
          }
        }

        @media (max-width: 430px) {
          .round-button-label {
            display: none;
          }

          .round-button {
            width: 42px;
            padding: 0;
          }

          .stat-label {
            font-size: 8px;
          }

          .stat-pill strong {
            font-size: 12px;
          }
        }
      `}</style>
    </main>
  );
}

function GamePanel({
  children,
  top,
}: {
  children: ReactNode;
  top?: ReactNode;
}) {
  return (
    <div className="game-panel">
      {top && <div className="game-panel-top">{top}</div>}
      <div className="game-panel-body">{children}</div>

      <style jsx>{`
        .game-panel {
          min-height: 550px;
          border-radius: 24px;
          border: 1px solid rgba(137, 215, 255, 0.13);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            ),
            rgba(3, 11, 24, 0.58);
          overflow: hidden;
        }

        .game-panel-top {
          padding: 15px 18px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
        }

        .game-panel-body {
          padding: 24px;
        }

        @media (max-width: 760px) {
          .game-panel {
            min-height: 0;
            border-radius: 19px;
          }

          .game-panel-top {
            padding: 12px 13px;
          }

          .game-panel-body {
            padding: 16px 11px;
          }
        }
      `}</style>
    </div>
  );
}

function InstructionBar({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="instruction-bar">
      {items.map((item) => (
        <div className="instruction-item" key={`${item.label}-${item.value}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}

      <style jsx>{`
        .instruction-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }

        .instruction-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 10px;
          font-weight: 750;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .instruction-item strong {
          color: white;
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button
      type="button"
      className={`primary-button ${secondary ? "is-secondary" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}

      <style jsx>{`
        .primary-button {
          min-height: 48px;
          padding: 0 20px;
          border-radius: 15px;
          border: 1px solid rgba(153, 230, 255, 0.46);
          background: linear-gradient(135deg, #2fbcf4, #596dff);
          color: white;
          font: inherit;
          font-size: 14px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(42, 135, 255, 0.25);
          transition:
            transform 170ms ease,
            opacity 170ms ease;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .primary-button:disabled {
          opacity: 0.38;
          cursor: not-allowed;
          box-shadow: none;
        }

        .primary-button.is-secondary {
          border-color: rgba(137, 215, 255, 0.2);
          background: rgba(255, 255, 255, 0.055);
          box-shadow: none;
          color: rgba(241, 249, 255, 0.82);
        }
      `}</style>
    </button>
  );
}

function RewardResult({
  title,
  text,
  reward,
  score,
  isLastQuestion,
  onContinue,
}: {
  title: string;
  text: string;
  reward: number;
  score: number;
  isLastQuestion: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="result-card">
      <span className="result-star" aria-hidden="true">
        ✦
      </span>
      <p>Challenge complete</p>
      <h3>{title}</h3>

      <div className="reward-row">
        <div>
          <strong>+{reward} DT</strong>
          <small>Dream Tokens</small>
        </div>
        <div>
          <strong>{score}</strong>
          <small>Score</small>
        </div>
      </div>

      <p className="result-copy">{text}</p>
      <PrimaryButton onClick={onContinue}>
        {isLastQuestion ? "View daily completion" : "Play next challenge"}
      </PrimaryButton>

      <style jsx>{`
        .result-card {
          min-height: 460px;
          padding: 38px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .result-star {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(126, 224, 255, 0.38);
          background: rgba(89, 182, 255, 0.12);
          color: #83e5ff;
          font-size: 27px;
          box-shadow: 0 0 34px rgba(85, 201, 255, 0.18);
        }

        .result-card > p:first-of-type {
          margin: 17px 0 0;
          color: #79defc;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .result-card h3 {
          margin: 8px 0 0;
          font-size: clamp(28px, 5vw, 44px);
          letter-spacing: -0.045em;
        }

        .reward-row {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(2, minmax(130px, 1fr));
          gap: 12px;
        }

        .reward-row > div {
          padding: 15px 20px;
          display: grid;
          gap: 3px;
          border-radius: 16px;
          border: 1px solid rgba(127, 221, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
        }

        .reward-row strong {
          color: #8ee8ff;
          font-size: 25px;
        }

        .reward-row small {
          color: rgba(235, 247, 255, 0.46);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .result-copy {
          max-width: 480px;
          margin: 20px 0 24px;
          color: rgba(235, 246, 255, 0.66);
          line-height: 1.55;
        }

        @media (max-width: 500px) {
          .result-card {
            padding-left: 10px;
            padding-right: 10px;
          }

          .reward-row {
            width: 100%;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function LoadingPanel() {
  return (
    <GamePanel>
      <div className="state-panel">
        <span className="spinner" />
        <h3>Loading today’s games</h3>
        <p>Nova is preparing your daily challenges.</p>
      </div>

      <style jsx>{`
        .state-panel {
          min-height: 450px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .spinner {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 3px solid rgba(126, 224, 255, 0.13);
          border-top-color: #7fe2ff;
          animation: spin 800ms linear infinite;
        }

        h3 {
          margin: 19px 0 0;
          font-size: 25px;
        }

        p {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.56);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </GamePanel>
  );
}

function LoginPanel() {
  return (
    <GamePanel>
      <div className="login-panel">
        <span aria-hidden="true">✦</span>
        <h3>Log in to play daily games</h3>
        <p>
          Daily limits, clues, rewards, and progress are connected to your
          Dreamscape profile.
        </p>
        <Link href="/login">Go to login</Link>
      </div>

      <style jsx>{`
        .login-panel {
          min-height: 450px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .login-panel > span {
          color: #80e4ff;
          font-size: 42px;
        }

        h3 {
          margin: 14px 0 0;
          font-size: 29px;
        }

        p {
          max-width: 480px;
          margin: 11px 0 22px;
          color: rgba(235, 247, 255, 0.58);
          line-height: 1.55;
        }

        a {
          min-height: 46px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #2fbcf4, #596dff);
          color: white;
          font-weight: 850;
          text-decoration: none;
        }
      `}</style>
    </GamePanel>
  );
}

function DailyCompletePanel({
  game,
  countdown,
}: {
  game: GameDefinition;
  countdown: string;
}) {
  return (
    <GamePanel
      top={
        <InstructionBar
          items={[
            { label: "Daily progress", value: "3/3" },
            { label: "Status", value: "Complete" },
          ]}
        />
      }
    >
      <div className="daily-complete">
        <span className="complete-icon" aria-hidden="true">
          ✓
        </span>
        <p>Today’s {game.shortTitle}</p>
        <h3>All three challenges complete</h3>
        <p className="complete-copy">
          Your next three challenges will become available automatically at
          midnight Singapore time.
        </p>
        <div className="countdown-box">
          <small>Next reset</small>
          <strong>{countdown}</strong>
        </div>
      </div>

      <style jsx>{`
        .daily-complete {
          min-height: 460px;
          padding: 32px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .complete-icon {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(111, 231, 177, 0.42);
          background: rgba(73, 198, 139, 0.12);
          color: #8ff1c0;
          font-size: 30px;
          box-shadow: 0 0 34px rgba(73, 198, 139, 0.18);
        }

        .daily-complete > p:first-of-type {
          margin: 18px 0 0;
          color: #82e5ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        h3 {
          margin: 8px 0 0;
          font-size: clamp(29px, 5vw, 44px);
          letter-spacing: -0.04em;
        }

        .complete-copy {
          max-width: 500px;
          margin: 16px 0 22px;
          color: rgba(235, 247, 255, 0.62);
          line-height: 1.55;
        }

        .countdown-box {
          min-width: 210px;
          padding: 14px 18px;
          display: grid;
          gap: 4px;
          border-radius: 16px;
          border: 1px solid rgba(126, 224, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
        }

        .countdown-box small {
          color: rgba(235, 247, 255, 0.43);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .countdown-box strong {
          color: #8ee8ff;
          font-size: 26px;
          letter-spacing: 0.06em;
        }
      `}</style>
    </GamePanel>
  );
}

/* -------------------------------------------------------------------------- */
/* Colour Code                                                                */
/* -------------------------------------------------------------------------- */

type ColourCodeAttempt = {
  guess: string[];
  exact: number;
  misplaced: number;
};

function createColourSecret(seedText: string) {
  const random = seededRandom(seedText);

  return Array.from({ length: 4 }, () => {
    const index = Math.floor(random() * COLOURS.length);
    return COLOURS[index].id;
  });
}

function scoreColourGuess(secret: string[], guess: string[]) {
  const exact = guess.reduce(
    (total, colourId, index) =>
      total + (secret[index] === colourId ? 1 : 0),
    0
  );

  const secretCounts = new Map<string, number>();
  const guessCounts = new Map<string, number>();

  secret.forEach((colourId, index) => {
    if (colourId !== guess[index]) {
      secretCounts.set(colourId, (secretCounts.get(colourId) ?? 0) + 1);
    }
  });

  guess.forEach((colourId, index) => {
    if (colourId !== secret[index]) {
      guessCounts.set(colourId, (guessCounts.get(colourId) ?? 0) + 1);
    }
  });

  let misplaced = 0;
  guessCounts.forEach((count, colourId) => {
    misplaced += Math.min(count, secretCounts.get(colourId) ?? 0);
  });

  return { exact, misplaced };
}

function ColourCodeGame({
  userId,
  activityDate,
  questionNumber,
  cluesUsed,
  tokenBalance,
  onBuyClue,
  onComplete,
  onContinue,
}: {
  userId: string;
  activityDate: string;
  questionNumber: number;
  cluesUsed: number;
  tokenBalance: number;
  onBuyClue: (
    gameId: GameId,
    questionNumber: number
  ) => Promise<ClueResult>;
  onComplete: (
    gameId: GameId,
    questionNumber: number,
    score: number
  ) => Promise<CompletionResult>;
  onContinue: () => void;
}) {
  const levelNumber = useRef(questionNumber).current;
  const seed = makeSeed(
    userId,
    activityDate,
    "colour-code",
    levelNumber
  );
  const secret = useMemo(() => createColourSecret(seed), [seed]);
  const clueOrder = useMemo(
    () => seededShuffle([0, 1, 2, 3], `${seed}:clue-order`),
    [seed]
  );

  const [guess, setGuess] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [attempts, setAttempts] = useState<ColourCodeAttempt[]>([]);
  const [localClues, setLocalClues] = useState(cluesUsed);
  const [phase, setPhase] = useState<
    "playing" | "failed" | "complete"
  >("playing");
  const [completion, setCompletion] =
    useState<CompletionResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Choose four colours. The same colour can appear more than once."
  );
  const [errorMessage, setErrorMessage] = useState("");

  const revealedPositions = useMemo(
    () => new Set(clueOrder.slice(0, localClues)),
    [clueOrder, localClues]
  );

  function chooseColour(colourId: string) {
    if (phase !== "playing" || busy) return;

    const nextGuess = [...guess];
    nextGuess[activeSlot] = colourId;
    setGuess(nextGuess);

    const nextEmpty = nextGuess.findIndex(
      (value, index) => value === null && index > activeSlot
    );

    if (nextEmpty !== -1) {
      setActiveSlot(nextEmpty);
      return;
    }

    const firstEmpty = nextGuess.findIndex((value) => value === null);
    if (firstEmpty !== -1) {
      setActiveSlot(firstEmpty);
    }
  }

  function editCurrentSlot(index: number) {
    if (phase !== "playing" || busy) return;

    const nextGuess = [...guess];
    nextGuess[index] = null;
    setGuess(nextGuess);
    setActiveSlot(index);
  }

  async function buyClue() {
    if (busy || localClues >= 4) return;

    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onBuyClue("colour-code", levelNumber);
      setLocalClues(result.cluesUsed);
      setMessage(`Position ${clueOrder[result.cluesUsed - 1] + 1} was revealed.`);
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitGuess() {
    if (
      phase !== "playing" ||
      busy ||
      guess.some((colourId) => colourId === null)
    ) {
      return;
    }

    const completedGuess = guess as string[];
    const result = scoreColourGuess(secret, completedGuess);
    const nextAttempts = [
      ...attempts,
      {
        guess: completedGuess,
        exact: result.exact,
        misplaced: result.misplaced,
      },
    ];

    setAttempts(nextAttempts);

    if (result.exact === 4) {
      const score = Math.max(
        250,
        1200 - nextAttempts.length * 45 - localClues * 70
      );

      setBusy(true);
      setErrorMessage("");

      try {
        const rewardResult = await onComplete(
          "colour-code",
          levelNumber,
          score
        );
        setFinalScore(score);
        setCompletion(rewardResult);
        setPhase("complete");
      } catch (error) {
        setErrorMessage(formatSupabaseError(error));
      } finally {
        setBusy(false);
      }

      return;
    }

    if (nextAttempts.length >= COLOUR_MAX_ATTEMPTS) {
      setPhase("failed");
      setMessage("All 15 attempts were used. Review the answer and try again.");
      return;
    }

    setGuess([null, null, null, null]);
    setActiveSlot(0);
    setMessage(
      `${result.exact} in the right place and ${result.misplaced} correct colour${
        result.misplaced === 1 ? "" : "s"
      } in the wrong place.`
    );
  }

  function retryQuestion() {
    setGuess([null, null, null, null]);
    setActiveSlot(0);
    setAttempts([]);
    setPhase("playing");
    setMessage("Try the same daily code again. Your paid clues remain revealed.");
    setErrorMessage("");
  }

  if (phase === "complete" && completion) {
    return (
      <GamePanel
        top={
          <InstructionBar
            items={[
              { label: "Daily question", value: `${levelNumber}/3` },
              { label: "Attempts", value: String(attempts.length) },
              { label: "Clues", value: String(localClues) },
            ]}
          />
        }
      >
        <RewardResult
          title="Code cracked!"
          text="You used exact-position and wrong-position clues to identify every light."
          reward={completion.reward}
          score={finalScore}
          isLastQuestion={completion.completedCount >= DAILY_LIMIT}
          onContinue={onContinue}
        />
      </GamePanel>
    );
  }

  return (
    <GamePanel
      top={
        <InstructionBar
          items={[
            { label: "Daily question", value: `${levelNumber}/3` },
            {
              label: "Attempts left",
              value: String(COLOUR_MAX_ATTEMPTS - attempts.length),
            },
            { label: "Reward", value: "20 DT" },
          ]}
        />
      }
    >
      <div className="colour-layout">
        <section className="colour-controls">
          <div className="hidden-code-card">
            <div>
              <p>Nova’s hidden code</p>
              <h3>Colours can repeat</h3>
            </div>

            <div className="hidden-code">
              {secret.map((colourId, index) => {
                const revealed = revealedPositions.has(index);

                return (
                  <span
                    key={`secret-${index}`}
                    className={revealed ? "is-revealed" : ""}
                    style={
                      revealed
                        ? { background: colourById(colourId).hex }
                        : undefined
                    }
                  >
                    {revealed ? "" : "?"}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="clue-row">
            <div>
              <strong>Reveal one position</strong>
              <span>{localClues}/4 clues used</span>
            </div>

            <button
              type="button"
              onClick={buyClue}
              disabled={
                busy || localClues >= 4 || tokenBalance < CLUE_COST
              }
            >
              {localClues >= 4 ? "All revealed" : `Clue · ${CLUE_COST} DT`}
            </button>
          </div>

          <div className="palette-heading">
            <div>
              <p>Current attempt</p>
              <h3>Choose each circle</h3>
            </div>
            <span>Selected position: {activeSlot + 1}</span>
          </div>

          <div className="colour-palette">
            {COLOURS.map((colour) => (
              <button
                type="button"
                key={colour.id}
                onClick={() => chooseColour(colour.id)}
                disabled={phase !== "playing" || busy}
              >
                <span style={{ background: colour.hex }} />
                {colour.name}
              </button>
            ))}
          </div>

          <div className="clue-key">
            <span>
              <i className="key-dot exact-dot" /> Right colour and place
            </span>
            <span>
              <i className="key-dot misplaced-dot" /> Right colour, wrong place
            </span>
          </div>

          <div className="message-box" role="status">
            <p>{message}</p>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          {phase === "failed" ? (
            <div className="failed-actions">
              <div className="answer-reveal">
                <span>Answer</span>
                <div>
                  {secret.map((colourId, index) => (
                    <i
                      key={`${colourId}-${index}`}
                      style={{ background: colourById(colourId).hex }}
                    />
                  ))}
                </div>
              </div>
              <PrimaryButton onClick={retryQuestion}>
                Retry this question
              </PrimaryButton>
            </div>
          ) : (
            <PrimaryButton
              onClick={submitGuess}
              disabled={
                busy || guess.some((colourId) => colourId === null)
              }
            >
              {busy ? "Checking…" : "Check attempt"}
            </PrimaryButton>
          )}
        </section>

        <aside className="attempt-board">
          <div className="attempt-heading">
            <div>
              <p>15 attempts</p>
              <h3>Clue history</h3>
            </div>
            <span>{attempts.length}/{COLOUR_MAX_ATTEMPTS}</span>
          </div>

          <div className="attempt-list">
            {Array.from({ length: COLOUR_MAX_ATTEMPTS }).map(
              (_, rowIndex) => {
                const completedAttempt = attempts[rowIndex];
                const isCurrent =
                  phase === "playing" && rowIndex === attempts.length;
                const rowColours = completedAttempt
                  ? completedAttempt.guess
                  : isCurrent
                  ? guess
                  : [null, null, null, null];

                return (
                  <div
                    className={`attempt-row ${
                      isCurrent ? "is-current" : ""
                    }`}
                    key={`attempt-row-${rowIndex}`}
                  >
                    <span className="attempt-number">{rowIndex + 1}</span>

                    <div className="attempt-circles">
                      {rowColours.map((colourId, circleIndex) => (
                        <button
                          type="button"
                          key={`attempt-${rowIndex}-${circleIndex}`}
                          className={colourId ? "is-filled" : ""}
                          style={
                            colourId
                              ? { background: colourById(colourId).hex }
                              : undefined
                          }
                          onClick={() => {
                            if (isCurrent && colourId) {
                              editCurrentSlot(circleIndex);
                            } else if (isCurrent) {
                              setActiveSlot(circleIndex);
                            }
                          }}
                          disabled={!isCurrent || busy}
                          aria-label={
                            colourId
                              ? `${colourById(colourId).name} in position ${
                                  circleIndex + 1
                                }`
                              : `Empty position ${circleIndex + 1}`
                          }
                        />
                      ))}
                    </div>

                    <div className="attempt-result">
                      {completedAttempt ? (
                        <>
                          <span>
                            <i className="key-dot exact-dot" />
                            {completedAttempt.exact}
                          </span>
                          <span>
                            <i className="key-dot misplaced-dot" />
                            {completedAttempt.misplaced}
                          </span>
                        </>
                      ) : (
                        <span className="empty-result">—</span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .colour-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
          gap: 22px;
          align-items: start;
        }

        .colour-controls,
        .attempt-board {
          border-radius: 20px;
          border: 1px solid rgba(133, 213, 255, 0.12);
          background: rgba(255, 255, 255, 0.025);
        }

        .colour-controls {
          padding: 20px;
        }

        .hidden-code-card {
          padding: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-radius: 17px;
          border: 1px solid rgba(102, 217, 255, 0.18);
          background: rgba(102, 217, 255, 0.06);
        }

        .hidden-code-card p,
        .palette-heading p,
        .attempt-heading p {
          margin: 0;
          color: #75ddff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .hidden-code-card h3,
        .palette-heading h3,
        .attempt-heading h3 {
          margin: 5px 0 0;
          font-size: 20px;
          letter-spacing: -0.03em;
        }

        .hidden-code {
          display: flex;
          gap: 8px;
        }

        .hidden-code span {
          width: 43px;
          height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 2px dashed rgba(131, 219, 255, 0.24);
          background: rgba(2, 10, 23, 0.72);
          color: rgba(231, 247, 255, 0.38);
          font-weight: 900;
        }

        .hidden-code span.is-revealed {
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow:
            0 10px 19px rgba(0, 0, 0, 0.22),
            inset 0 3px 6px rgba(255, 255, 255, 0.24);
        }

        .clue-row {
          margin-top: 11px;
          padding: 11px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.032);
        }

        .clue-row > div {
          display: grid;
          gap: 3px;
        }

        .clue-row strong {
          font-size: 12px;
        }

        .clue-row span {
          color: rgba(235, 247, 255, 0.48);
          font-size: 10px;
        }

        .clue-row button {
          min-height: 37px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(255, 211, 110, 0.28);
          background: rgba(255, 211, 110, 0.09);
          color: #ffdc82;
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }

        .clue-row button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .palette-heading {
          margin-top: 22px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }

        .palette-heading > span {
          color: rgba(235, 247, 255, 0.46);
          font-size: 10px;
        }

        .colour-palette {
          margin-top: 13px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .colour-palette button {
          min-height: 46px;
          padding: 7px 9px;
          display: flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          border: 1px solid rgba(137, 215, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(243, 250, 255, 0.74);
          font: inherit;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .colour-palette button:disabled {
          opacity: 0.4;
        }

        .colour-palette span {
          width: 22px;
          height: 22px;
          flex: 0 0 auto;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.18);
        }

        .clue-key {
          margin: 15px 0;
          display: flex;
          align-items: center;
          gap: 15px;
          flex-wrap: wrap;
          color: rgba(235, 247, 255, 0.56);
          font-size: 10px;
        }

        .clue-key span,
        .attempt-result span {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .key-dot {
          width: 8px;
          height: 8px;
          display: inline-block;
          border-radius: 999px;
        }

        .exact-dot {
          background: #63e7a3;
          box-shadow: 0 0 9px rgba(99, 231, 163, 0.4);
        }

        .misplaced-dot {
          background: #ffd465;
          box-shadow: 0 0 9px rgba(255, 212, 101, 0.36);
        }

        .message-box {
          min-height: 58px;
          margin-bottom: 15px;
          padding: 11px 13px;
          display: grid;
          gap: 5px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.026);
          color: rgba(235, 247, 255, 0.61);
          font-size: 12px;
          line-height: 1.45;
        }

        .message-box p {
          margin: 0;
        }

        .message-box strong {
          color: #ff9ca8;
          font-size: 11px;
        }

        .failed-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
        }

        .answer-reveal {
          display: grid;
          gap: 6px;
        }

        .answer-reveal > span {
          color: rgba(235, 247, 255, 0.45);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .answer-reveal > div {
          display: flex;
          gap: 5px;
        }

        .answer-reveal i {
          width: 22px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
        }

        .attempt-board {
          padding: 16px;
        }

        .attempt-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.1);
        }

        .attempt-heading > span {
          color: rgba(235, 247, 255, 0.45);
          font-size: 10px;
          font-weight: 850;
        }

        .attempt-list {
          max-height: 545px;
          padding: 11px 3px 2px 0;
          display: grid;
          gap: 7px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(116, 215, 255, 0.26) transparent;
        }

        .attempt-row {
          min-height: 45px;
          padding: 7px 8px;
          display: grid;
          grid-template-columns: 24px 1fr 58px;
          align-items: center;
          gap: 9px;
          border-radius: 12px;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.025);
        }

        .attempt-row.is-current {
          border-color: rgba(102, 217, 255, 0.3);
          background: rgba(102, 217, 255, 0.07);
        }

        .attempt-number {
          color: rgba(235, 247, 255, 0.36);
          font-size: 10px;
          font-weight: 850;
        }

        .attempt-circles {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .attempt-circles button {
          width: 27px;
          height: 27px;
          flex: 0 0 auto;
          border-radius: 999px;
          border: 1px dashed rgba(131, 219, 255, 0.22);
          background: rgba(2, 10, 22, 0.56);
          cursor: default;
        }

        .attempt-row.is-current .attempt-circles button {
          cursor: pointer;
        }

        .attempt-circles button.is-filled {
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.2);
          box-shadow: inset 0 2px 5px rgba(255, 255, 255, 0.18);
        }

        .attempt-result {
          display: grid;
          grid-template-columns: repeat(2, auto);
          justify-content: end;
          gap: 7px;
          color: rgba(243, 250, 255, 0.68);
          font-size: 10px;
          font-weight: 850;
        }

        .empty-result {
          color: rgba(235, 247, 255, 0.18);
        }

        @media (max-width: 950px) {
          .colour-layout {
            grid-template-columns: 1fr;
          }

          .attempt-list {
            max-height: 520px;
          }
        }

        @media (max-width: 560px) {
          .colour-controls {
            padding: 14px 11px;
          }

          .hidden-code-card,
          .palette-heading,
          .failed-actions {
            align-items: stretch;
            flex-direction: column;
          }

          .hidden-code-card {
            display: grid;
          }

          .hidden-code {
            justify-content: space-between;
          }

          .hidden-code span {
            width: 42px;
            height: 42px;
          }

          .colour-palette {
            grid-template-columns: repeat(2, 1fr);
          }

          .attempt-board {
            padding: 13px 8px;
          }

          .attempt-row {
            grid-template-columns: 20px 1fr 52px;
            padding-left: 5px;
            padding-right: 5px;
            gap: 5px;
          }

          .attempt-circles {
            gap: 5px;
          }

          .attempt-circles button {
            width: 25px;
            height: 25px;
          }
        }
      `}</style>
    </GamePanel>
  );
}

/* -------------------------------------------------------------------------- */
/* SET Finder                                                                 */
/* -------------------------------------------------------------------------- */

type SetCard = {
  id: string;
  colour: number;
  shape: number;
  count: number;
  pattern: number;
};

const SET_COLOURS = ["#5EC6FF", "#FF78B7", "#FFD15C"];
const SHAPE_LABELS = ["circles", "triangles", "diamonds"];
const PATTERN_LABELS = ["empty", "striped", "filled"];

function setCardKey(card: Omit<SetCard, "id">) {
  return `${card.colour}-${card.shape}-${card.count}-${card.pattern}`;
}

function isValidSet(cards: SetCard[]) {
  if (cards.length !== 3) return false;

  const attributes: Array<
    keyof Pick<SetCard, "colour" | "shape" | "count" | "pattern">
  > = ["colour", "shape", "count", "pattern"];

  return attributes.every((attribute) => {
    const values = new Set(cards.map((card) => card[attribute]));
    return values.size === 1 || values.size === 3;
  });
}

function findValidSet(cards: SetCard[]) {
  for (let first = 0; first < cards.length - 2; first += 1) {
    for (let second = first + 1; second < cards.length - 1; second += 1) {
      for (let third = second + 1; third < cards.length; third += 1) {
        const group = [cards[first], cards[second], cards[third]];
        if (isValidSet(group)) return group;
      }
    }
  }

  return null;
}

function createSetBoard(seedText: string): SetCard[] {
  const random = seededRandom(seedText);
  type SetMode = "same" | "different";
  const modes: SetMode[] = Array.from(
    { length: 4 },
    (): SetMode => (random() > 0.45 ? "different" : "same")
  );

  const hasDifferentMode = modes.some((mode) => mode === "different");

  if (!hasDifferentMode) {
    modes[Math.floor(random() * modes.length)] = "different";
  }

  const attributes = modes.map((mode, attributeIndex) => {
    if (mode === "same") {
      const value = Math.floor(random() * 3);
      return [value, value, value];
    }

    return seededShuffle([0, 1, 2], `${seedText}:attribute:${attributeIndex}`);
  });

  const guaranteedSet = [0, 1, 2].map((index) => ({
    colour: attributes[0][index],
    shape: attributes[1][index],
    count: attributes[2][index],
    pattern: attributes[3][index],
  }));

  const used = new Set(guaranteedSet.map(setCardKey));
  const cards = [...guaranteedSet];

  while (cards.length < 12) {
    const candidate = {
      colour: Math.floor(random() * 3),
      shape: Math.floor(random() * 3),
      count: Math.floor(random() * 3),
      pattern: Math.floor(random() * 3),
    };
    const key = setCardKey(candidate);

    if (!used.has(key)) {
      used.add(key);
      cards.push(candidate);
    }
  }

  return seededShuffle(
    cards.map((card, index) => ({
      ...card,
      id: `${setCardKey(card)}-${index}`,
    })),
    `${seedText}:board-order`
  );
}

function SetSymbol({
  card,
  symbolIndex,
}: {
  card: SetCard;
  symbolIndex: number;
}) {
  const colour = SET_COLOURS[card.colour];
  const patternId = `stripe-${card.id.replace(/[^a-zA-Z0-9]/g, "")}-${symbolIndex}`;
  const fill =
    card.pattern === 0
      ? "none"
      : card.pattern === 1
      ? `url(#${patternId})`
      : colour;

  return (
    <svg viewBox="0 0 64 64" role="img" aria-hidden="true">
      <defs>
        <pattern
          id={patternId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <rect width="3" height="8" fill={colour} />
        </pattern>
      </defs>

      {card.shape === 0 && (
        <circle
          cx="32"
          cy="32"
          r="21"
          fill={fill}
          stroke={colour}
          strokeWidth="4"
        />
      )}

      {card.shape === 1 && (
        <path
          d="M32 9 L56 53 H8 Z"
          fill={fill}
          stroke={colour}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}

      {card.shape === 2 && (
        <path
          d="M32 7 L57 32 L32 57 L7 32 Z"
          fill={fill}
          stroke={colour}
          strokeWidth="4"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function SetFinderGame({
  userId,
  activityDate,
  questionNumber,
  cluesUsed,
  tokenBalance,
  onBuyClue,
  onComplete,
  onContinue,
}: {
  userId: string;
  activityDate: string;
  questionNumber: number;
  cluesUsed: number;
  tokenBalance: number;
  onBuyClue: (
    gameId: GameId,
    questionNumber: number
  ) => Promise<ClueResult>;
  onComplete: (
    gameId: GameId,
    questionNumber: number,
    score: number
  ) => Promise<CompletionResult>;
  onContinue: () => void;
}) {
  const levelNumber = useRef(questionNumber).current;
  const baseSeed = makeSeed(
    userId,
    activityDate,
    "set-finder",
    levelNumber
  );

  const [setsFound, setSetsFound] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [localClues, setLocalClues] = useState(cluesUsed);
  const [currentBoardClues, setCurrentBoardClues] = useState(0);
  const [message, setMessage] = useState(
    "Select three cards. Every feature must be all the same or all different."
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CompletionResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const board = useMemo(
    () => createSetBoard(`${baseSeed}:set-round:${setsFound}`),
    [baseSeed, setsFound]
  );
  const validSet = useMemo(() => findValidSet(board), [board]);
  const hintedCardIds = useMemo(
    () => new Set((validSet ?? []).slice(0, currentBoardClues).map((card) => card.id)),
    [currentBoardClues, validSet]
  );
  const mayBuyCurrentClue =
    localClues < 3 && currentBoardClues < 3 && !completion;

  function toggleCard(cardId: string) {
    if (busy || completion) return;

    setSelectedIds((current) => {
      if (current.includes(cardId)) {
        return current.filter((id) => id !== cardId);
      }

      if (current.length >= 3) return current;
      return [...current, cardId];
    });
  }

  async function buyClue() {
    if (!mayBuyCurrentClue || busy) return;

    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onBuyClue("set-finder", levelNumber);
      setLocalClues(result.cluesUsed);
      setCurrentBoardClues((current) => Math.min(3, current + 1));
      setMessage("Each glowing card belongs to one correct SET.");
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function checkSelection() {
    if (busy || selectedIds.length !== 3 || completion) return;

    const selectedCards = selectedIds
      .map((id) => board.find((card) => card.id === id))
      .filter((card): card is SetCard => Boolean(card));

    if (!isValidSet(selectedCards)) {
      setMistakes((current) => current + 1);
      setSelectedIds([]);
      setMessage(
        "Not a SET. Check colour, shape, number, and pattern separately."
      );
      return;
    }

    const nextSetsFound = setsFound + 1;
    setSelectedIds([]);

    if (nextSetsFound < 3) {
      setSetsFound(nextSetsFound);
      setCurrentBoardClues(0);
      setMessage(`Correct! Find SET ${nextSetsFound + 1} of 3.`);
      return;
    }

    const score = Math.max(
      250,
      1200 - mistakes * 80 - localClues * 75
    );

    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onComplete(
        "set-finder",
        levelNumber,
        score
      );
      setSetsFound(3);
      setFinalScore(score);
      setCompletion(result);
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  if (completion) {
    return (
      <GamePanel
        top={
          <InstructionBar
            items={[
              { label: "Daily level", value: `${levelNumber}/3` },
              { label: "SETs found", value: "3/3" },
              { label: "Clues", value: String(localClues) },
            ]}
          />
        }
      >
        <RewardResult
          title="Three SETs found!"
          text="You compared four features at the same time: colour, shape, number, and pattern."
          reward={completion.reward}
          score={finalScore}
          isLastQuestion={completion.completedCount >= DAILY_LIMIT}
          onContinue={onContinue}
        />
      </GamePanel>
    );
  }

  return (
    <GamePanel
      top={
        <InstructionBar
          items={[
            { label: "Daily level", value: `${levelNumber}/3` },
            { label: "SETs found", value: `${setsFound}/3` },
            { label: "Reward", value: "20 DT" },
          ]}
        />
      }
    >
      <div className="set-layout">
        <div className="set-help">
          <div>
            <p>SET rule</p>
            <h3>All same or all different</h3>
            <span>Apply the rule to every feature separately.</span>
          </div>

          <div className="feature-chips">
            <i>Colour</i>
            <i>Shape</i>
            <i>Number</i>
            <i>Pattern</i>
          </div>

          <button
            type="button"
            onClick={buyClue}
            disabled={
              busy ||
              !mayBuyCurrentClue ||
              tokenBalance < CLUE_COST
            }
          >
            {localClues >= 3
              ? "All clues used"
              : `Reveal one card · ${CLUE_COST} DT`}
          </button>
        </div>

        <div className="set-board">
          {board.map((card) => {
            const selected = selectedIds.includes(card.id);
            const hinted = hintedCardIds.has(card.id);

            return (
              <button
                type="button"
                key={card.id}
                className={`set-card ${selected ? "is-selected" : ""} ${
                  hinted ? "is-hinted" : ""
                }`}
                onClick={() => toggleCard(card.id)}
                aria-pressed={selected}
                aria-label={`${card.count + 1} ${
                  PATTERN_LABELS[card.pattern]
                } ${SHAPE_LABELS[card.shape]}`}
              >
                <span className="set-symbols">
                  {Array.from({ length: card.count + 1 }).map(
                    (_, symbolIndex) => (
                      <SetSymbol
                        key={`${card.id}-${symbolIndex}`}
                        card={card}
                        symbolIndex={symbolIndex}
                      />
                    )
                  )}
                </span>

                {hinted && <span className="hint-label">Clue</span>}
              </button>
            );
          })}
        </div>

        <div className="set-footer">
          <div className="set-message" role="status">
            <p>{message}</p>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          <PrimaryButton
            onClick={checkSelection}
            disabled={busy || selectedIds.length !== 3}
          >
            {busy ? "Checking…" : "Check selected cards"}
          </PrimaryButton>
        </div>
      </div>

      <style jsx>{`
        .set-layout {
          display: grid;
          gap: 18px;
        }

        .set-help {
          padding: 14px 16px;
          display: grid;
          grid-template-columns: minmax(220px, 1fr) auto auto;
          align-items: center;
          gap: 18px;
          border-radius: 17px;
          border: 1px solid rgba(174, 139, 255, 0.18);
          background: rgba(157, 115, 255, 0.07);
        }

        .set-help p {
          margin: 0;
          color: #b9a2ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .set-help h3 {
          margin: 4px 0 0;
          font-size: 19px;
        }

        .set-help span {
          display: block;
          margin-top: 4px;
          color: rgba(237, 246, 255, 0.53);
          font-size: 11px;
        }

        .feature-chips {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .feature-chips i {
          padding: 6px 8px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.055);
          color: rgba(241, 248, 255, 0.69);
          font-size: 9px;
          font-style: normal;
          font-weight: 800;
        }

        .set-help > button {
          min-height: 39px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(255, 211, 110, 0.28);
          background: rgba(255, 211, 110, 0.09);
          color: #ffdc82;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
        }

        .set-help > button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .set-board {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .set-card {
          position: relative;
          min-height: 126px;
          padding: 15px 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 19px;
          border: 1px solid rgba(137, 215, 255, 0.15);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.07),
              rgba(255, 255, 255, 0.02)
            ),
            rgba(5, 14, 28, 0.8);
          cursor: pointer;
          transition:
            transform 170ms ease,
            border-color 170ms ease,
            background 170ms ease;
        }

        .set-card:hover {
          transform: translateY(-3px);
          border-color: rgba(169, 139, 255, 0.42);
        }

        .set-card.is-selected {
          transform: translateY(-3px);
          border-color: #b49bff;
          background: rgba(159, 119, 255, 0.14);
          box-shadow: 0 0 24px rgba(154, 115, 255, 0.2);
        }

        .set-card.is-hinted {
          border-color: #ffd36e;
          box-shadow:
            0 0 0 3px rgba(255, 211, 110, 0.1),
            0 0 24px rgba(255, 211, 110, 0.16);
        }

        .set-symbols {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }

        .set-symbols :global(svg) {
          width: clamp(34px, 4.5vw, 52px);
          height: clamp(34px, 4.5vw, 52px);
          flex: 0 1 auto;
          filter: drop-shadow(0 7px 10px rgba(0, 0, 0, 0.24));
        }

        .hint-label {
          position: absolute;
          top: 7px;
          right: 7px;
          padding: 4px 6px;
          border-radius: 999px;
          background: rgba(255, 211, 110, 0.16);
          color: #ffe19a;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .set-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .set-message {
          min-height: 48px;
          display: grid;
          align-content: center;
          gap: 4px;
          color: rgba(237, 247, 255, 0.61);
          font-size: 12px;
          line-height: 1.45;
        }

        .set-message p {
          margin: 0;
        }

        .set-message strong {
          color: #ff9ca8;
          font-size: 11px;
        }

        @media (max-width: 880px) {
          .set-help {
            grid-template-columns: 1fr;
          }

          .set-board {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 620px) {
          .set-board {
            gap: 6px;
          }

          .set-card {
            min-height: 92px;
            padding: 9px 4px;
            border-radius: 14px;
          }

          .set-symbols {
            gap: 0;
          }

          .set-symbols :global(svg) {
            width: clamp(25px, 8vw, 38px);
            height: clamp(25px, 8vw, 38px);
          }

          .set-footer {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>
    </GamePanel>
  );
}

/* -------------------------------------------------------------------------- */
/* Tower Memory                                                               */
/* -------------------------------------------------------------------------- */

function towerSizeForQuestion(questionNumber: number) {
  if (questionNumber === 1) return 4;
  if (questionNumber === 2) return 6;
  return 8;
}

function towerRewardForQuestion(questionNumber: number) {
  if (questionNumber === 1) return 5;
  if (questionNumber === 2) return 10;
  return 15;
}

function createTowerSequence(seedText: string, size: number) {
  const random = seededRandom(seedText);

  return Array.from({ length: size }, () => {
    const index = Math.floor(random() * COLOURS.length);
    return COLOURS[index].id;
  });
}

function TowerDisplay({
  sequence,
  size,
  hidden = false,
  emptySlots = 0,
}: {
  sequence: string[];
  size: number;
  hidden?: boolean;
  emptySlots?: number;
}) {
  const slots = [
    ...sequence,
    ...Array.from({ length: emptySlots }, () => ""),
  ].slice(0, size);

  return (
    <div
      className="tower"
      style={{ "--tower-size": size } as CSSProperties}
      aria-label="Colour tower"
    >
      {[...slots].reverse().map((colourId, visualIndex) => {
        const colour = colourId ? colourById(colourId) : null;

        return (
          <div
            className={`tower-block ${hidden ? "is-hidden" : ""} ${
              colour ? "" : "is-empty"
            }`}
            key={`${colourId || "empty"}-${visualIndex}`}
            style={{
              background:
                hidden || !colour
                  ? "rgba(255,255,255,0.035)"
                  : colour.hex,
            }}
          >
            {hidden && <span>?</span>}
          </div>
        );
      })}

      <div className="tower-base">BOTTOM</div>

      <style jsx>{`
        .tower {
          width: min(250px, 78vw);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }

        .tower-block {
          width: 100%;
          height: clamp(34px, calc(330px / var(--tower-size)), 58px);
          border-radius: 12px;
          border: 3px solid rgba(255, 255, 255, 0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 9px 15px rgba(0, 0, 0, 0.2),
            inset 0 4px 8px rgba(255, 255, 255, 0.2);
        }

        .tower-block.is-hidden,
        .tower-block.is-empty {
          border: 1px dashed rgba(136, 217, 255, 0.22);
          color: rgba(229, 246, 255, 0.27);
          box-shadow: none;
        }

        .tower-block.is-hidden span {
          color: rgba(232, 247, 255, 0.28);
          font-size: 18px;
          font-weight: 900;
        }

        .tower-base {
          width: calc(100% + 28px);
          height: 25px;
          margin-top: 2px;
          border-radius: 8px 8px 14px 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(126, 222, 255, 0.12);
          border: 1px solid rgba(126, 222, 255, 0.19);
          color: rgba(229, 246, 255, 0.42);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.2em;
        }
      `}</style>
    </div>
  );
}

function TowerMemoryGame({
  userId,
  activityDate,
  questionNumber,
  onComplete,
  onContinue,
}: {
  userId: string;
  activityDate: string;
  questionNumber: number;
  onComplete: (
    gameId: GameId,
    questionNumber: number,
    score: number
  ) => Promise<CompletionResult>;
  onContinue: () => void;
}) {
  const levelNumber = useRef(questionNumber).current;
  const size = towerSizeForQuestion(levelNumber);
  const expectedReward = towerRewardForQuestion(levelNumber);
  const seed = makeSeed(
    userId,
    activityDate,
    "tower-memory",
    levelNumber
  );
  const sequence = useMemo(
    () => createTowerSequence(seed, size),
    [seed, size]
  );

  const [answer, setAnswer] = useState<string[]>([]);
  const [phase, setPhase] = useState<"preview" | "build" | "complete">(
    "preview"
  );
  const [previewSeconds, setPreviewSeconds] = useState(
    Math.max(4, Math.round(size * 0.75))
  );
  const [mistakes, setMistakes] = useState(0);
  const [message, setMessage] = useState("Study the tower from bottom to top.");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completion, setCompletion] =
    useState<CompletionResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  useEffect(() => {
    if (phase !== "preview") return;

    if (previewSeconds <= 0) {
      setPhase("build");
      setMessage("Rebuild the tower from bottom to top.");
      return;
    }

    const timer = window.setTimeout(() => {
      setPreviewSeconds((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [phase, previewSeconds]);

  function chooseColour(colourId: string) {
    if (phase !== "build" || busy || answer.length >= size) return;
    setAnswer((current) => [...current, colourId]);
  }

  function removeTopBlock() {
    if (phase !== "build" || busy || answer.length === 0) return;
    setAnswer((current) => current.slice(0, -1));
  }

  function showTowerAgain() {
    if (busy) return;
    setAnswer([]);
    setPreviewSeconds(Math.max(3, Math.round(size * 0.6)));
    setPhase("preview");
    setMessage("Study the tower again.");
  }

  async function checkTower() {
    if (busy || phase !== "build" || answer.length !== size) return;

    const correct = answer.every(
      (colourId, index) => colourId === sequence[index]
    );

    if (!correct) {
      setMistakes((current) => current + 1);
      setErrorMessage("");
      setMessage("That order is different. The tower will appear again.");
      showTowerAgain();
      return;
    }

    const score = Math.max(250, 1200 - mistakes * 110 - size * 15);
    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onComplete(
        "tower-memory",
        levelNumber,
        score
      );
      setFinalScore(score);
      setCompletion(result);
      setPhase("complete");
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  if (phase === "complete" && completion) {
    return (
      <GamePanel
        top={
          <InstructionBar
            items={[
              { label: "Daily level", value: `${levelNumber}/3` },
              { label: "Tower", value: `${size} blocks` },
              { label: "Mistakes", value: String(mistakes) },
            ]}
          />
        }
      >
        <RewardResult
          title={`${size}-block tower rebuilt!`}
          text="You remembered the colour order and rebuilt the tower from its bottom block upward."
          reward={completion.reward}
          score={finalScore}
          isLastQuestion={completion.completedCount >= DAILY_LIMIT}
          onContinue={onContinue}
        />
      </GamePanel>
    );
  }

  return (
    <GamePanel
      top={
        <InstructionBar
          items={[
            { label: "Daily level", value: `${levelNumber}/3` },
            { label: "Tower size", value: `${size} blocks` },
            { label: "Reward", value: `${expectedReward} DT` },
          ]}
        />
      }
    >
      <div className="tower-layout">
        <section className="tower-card preview-card">
          <div className="tower-heading">
            <div>
              <p>Nova’s tower</p>
              <h3>
                {phase === "preview" ? "Study carefully" : "Tower hidden"}
              </h3>
            </div>

            <span className="preview-timer">
              {phase === "preview" ? `${previewSeconds}s` : "Hidden"}
            </span>
          </div>

          <TowerDisplay
            sequence={sequence}
            size={size}
            hidden={phase === "build"}
          />

          {phase === "preview" && (
            <button
              type="button"
              className="hide-now"
              onClick={() => {
                setPreviewSeconds(0);
                setPhase("build");
                setMessage("Rebuild the tower from bottom to top.");
              }}
            >
              I am ready
            </button>
          )}
        </section>

        <section className="tower-card builder-card">
          <div className="tower-heading">
            <div>
              <p>Your tower</p>
              <h3>Build bottom first</h3>
            </div>
            <span className="block-count">{answer.length}/{size}</span>
          </div>

          <TowerDisplay
            sequence={answer}
            size={size}
            emptySlots={Math.max(0, size - answer.length)}
          />

          <div className="tower-palette">
            {COLOURS.map((colour) => (
              <button
                type="button"
                key={colour.id}
                onClick={() => chooseColour(colour.id)}
                disabled={phase !== "build" || busy || answer.length >= size}
                aria-label={`Add ${colour.name} block`}
              >
                <span style={{ background: colour.hex }} />
                {colour.name}
              </button>
            ))}
          </div>

          <div className="tower-message" role="status">
            <p>{message}</p>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          <div className="tower-actions">
            <PrimaryButton
              onClick={showTowerAgain}
              disabled={busy || phase !== "build"}
              secondary
            >
              Show tower again
            </PrimaryButton>

            <PrimaryButton
              onClick={removeTopBlock}
              disabled={busy || phase !== "build" || answer.length === 0}
              secondary
            >
              Remove top block
            </PrimaryButton>

            <PrimaryButton
              onClick={checkTower}
              disabled={busy || phase !== "build" || answer.length !== size}
            >
              {busy ? "Saving…" : "Check tower"}
            </PrimaryButton>
          </div>
        </section>
      </div>

      <style jsx>{`
        .tower-layout {
          display: grid;
          grid-template-columns: minmax(250px, 0.8fr) minmax(0, 1.2fr);
          gap: 22px;
          align-items: stretch;
        }

        .tower-card {
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(131, 213, 255, 0.12);
          background: rgba(255, 255, 255, 0.025);
        }

        .preview-card {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .tower-heading {
          margin-bottom: 18px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 14px;
        }

        .tower-heading p {
          margin: 0;
          color: #77e7b7;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .tower-heading h3 {
          margin: 5px 0 0;
          font-size: 21px;
        }

        .preview-timer,
        .block-count {
          min-width: 60px;
          height: 31px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(111, 231, 177, 0.08);
          color: #8ff1c0;
          font-size: 10px;
          font-weight: 850;
        }

        .hide-now {
          min-height: 38px;
          margin-top: 16px;
          border-radius: 11px;
          border: 1px solid rgba(137, 215, 255, 0.16);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(241, 249, 255, 0.75);
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .tower-palette {
          margin-top: 18px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
        }

        .tower-palette button {
          min-height: 42px;
          padding: 6px 8px;
          display: flex;
          align-items: center;
          gap: 7px;
          border-radius: 11px;
          border: 1px solid rgba(137, 215, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          color: rgba(243, 250, 255, 0.72);
          font: inherit;
          font-size: 10px;
          font-weight: 750;
          cursor: pointer;
        }

        .tower-palette button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .tower-palette button span {
          width: 19px;
          height: 19px;
          flex: 0 0 auto;
          border-radius: 5px;
          border: 2px solid rgba(255, 255, 255, 0.18);
        }

        .tower-message {
          min-height: 48px;
          margin-top: 13px;
          padding: 10px 12px;
          display: grid;
          align-content: center;
          gap: 4px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          color: rgba(235, 247, 255, 0.59);
          font-size: 11px;
          line-height: 1.4;
        }

        .tower-message p {
          margin: 0;
        }

        .tower-message strong {
          color: #ff9ca8;
          font-size: 10px;
        }

        .tower-actions {
          margin-top: 13px;
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }

        @media (max-width: 900px) {
          .tower-layout {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 560px) {
          .tower-card {
            padding: 15px 10px;
          }

          .tower-palette {
            grid-template-columns: repeat(2, 1fr);
          }

          .tower-actions {
            display: grid;
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </GamePanel>
  );
}
