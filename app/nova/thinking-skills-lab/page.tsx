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
const TOWER_MAX_ATTEMPTS = 5;
const WALKTHROUGH_STORAGE_KEY = "thinking-skills-lab-walkthrough-v2";

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


type TokenAmountRow = {
  amount: number | string | null;
};

type DreamTokenTransactionRow = {
  id: string | number;
  amount: number | string | null;
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


const GAME_INSTRUCTIONS: Record<
  GameId,
  { title: string; steps: string[]; note: string }
> = {
  "colour-code": {
    title: "How to play Colour Code",
    steps: [
      "Choose four colours. Colours may repeat.",
      "Green shows a colour in the correct position. Yellow shows a correct colour in the wrong position.",
      "Use the clue history to narrow the code within 15 attempts.",
    ],
    note: "A position clue costs 5 DT. Solving one code rewards 20 DT.",
  },
  "set-finder": {
    title: "How to play SET Finder",
    steps: [
      "Select three cards.",
      "For colour, shape, number, and pattern, each feature must be either all the same or all different.",
      "Find three correct SETs to complete the level.",
    ],
    note: "A one-card clue costs 5 DT. Completing one level rewards 20 DT.",
  },
  "tower-memory": {
    title: "How to play Tower Memory",
    steps: [
      "Study the tower before the timer reaches zero.",
      "Rebuild it from the bottom block upward.",
      "You have five checking attempts. A paid review shows the tower again without clearing your answer.",
    ],
    note: "Showing the tower again costs 5 DT. Rewards are 5 DT, 10 DT, and 15 DT.",
  },
};

const WALKTHROUGH_STEPS = [
  {
    eyebrow: "Welcome",
    title: "Welcome to the Thinking Skills Lab.",
    text: "I’m Nova. I’ll show you how to choose a game, find the rules, and earn Dream Tokens.",
  },
  {
    eyebrow: "Step 1 of 4",
    title: "Choose a game from the left.",
    text: "The game tabs stay on the left of the screen. Your daily progress is shown on each tab.",
  },
  {
    eyebrow: "Step 2 of 4",
    title: "Tap the question mark for the rules.",
    text: "Every game has a short instruction popup, so the play area stays clear and easy to use.",
  },
  {
    eyebrow: "Step 3 of 4",
    title: "Clues use Dream Tokens.",
    text: "Colour Code and SET clues cost 5 DT. Showing a Tower Memory sequence again also costs 5 DT.",
  },
  {
    eyebrow: "You’re ready",
    title: "Complete three challenges in each game.",
    text: "Your daily games reset at midnight Singapore time. Start with any game on the left.",
  },
] as const;

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

  const [selectedGame, setSelectedGame] =
    useState<GameId>("colour-code");
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
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

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
      : ((balanceResult.data ?? []) as TokenAmountRow[]).reduce(
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
        ((recentTransactionsResult.data ?? []) as DreamTokenTransactionRow[]).map((transaction) => ({
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
        const cashValue = ((balanceResult.data ?? []) as TokenAmountRow[]).reduce(
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
          ((recentTransactionsResult.data ?? []) as DreamTokenTransactionRow[]).map((transaction) => ({
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
    setNotice("");
    setGameVersion((current) => current + 1);
  }, [selectedGame]);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(WALKTHROUGH_STORAGE_KEY)) {
        setWalkthroughStep(0);
        setWalkthroughOpen(true);
      }
    } catch {
      setWalkthroughStep(0);
      setWalkthroughOpen(true);
    }
  }, []);

  function startWalkthrough() {
    setWalkthroughStep(0);
    setWalkthroughOpen(true);
  }

  function closeWalkthrough() {
    try {
      window.localStorage.setItem(WALKTHROUGH_STORAGE_KEY, "true");
    } catch {
      // The walkthrough can still close when storage is unavailable.
    }
    setWalkthroughOpen(false);
  }

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

      setNotice(
        gameId === "tower-memory"
          ? `Tower shown again for ${result.clueCost} DT.`
          : `Clue revealed for ${result.clueCost} DT.`
      );
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

          <button
            type="button"
            className="round-button guide-button"
            onClick={startWalkthrough}
          >
            <span aria-hidden="true">✦</span>
            <span className="round-button-label">Nova Guide</span>
          </button>
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

      <div className="lab-layout">
        <aside
          id="thinking-game-menu"
          className="game-sidebar"
        >
          <div className="sidebar-heading">
            <div>
              <p className="sidebar-eyebrow">Choose a game</p>
              <h2>Daily Games</h2>
              <span className="sidebar-reset">Reset {countdown}</span>
            </div>
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
                  title={`${game.shortTitle} · ${gameStatus.completed}/3 complete`}
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

            <div className="stage-tools">
              <div className="stage-progress">
                <span>
                  <strong>{activeStatus.completed}/3</strong> today
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

              <InstructionsButton gameId={selectedGame} />
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
                    cluesUsed={activeStatus.clues}
                    tokenBalance={profileAssets.cash}
                    onBuyClue={buyClue}
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

      <NovaWalkthrough
        open={walkthroughOpen}
        stepIndex={walkthroughStep}
        screenMode={screenMode}
        onStepChange={setWalkthroughStep}
        onClose={closeWalkthrough}
      />

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(html), :global(body) {
          width: 100%;
          height: 100%;
          margin: 0;
          overflow: hidden;
          background: #040915;
        }
        :global(button), :global(a) { -webkit-tap-highlight-color: transparent; }

        .lab-page {
          position: relative;
          width: 100%;
          height: 100dvh;
          overflow: hidden;
          padding-top: 66px;
          color: #f7fbff;
          background:
            radial-gradient(circle at 50% -10%, rgba(57,153,255,.18), transparent 36%),
            linear-gradient(180deg, #071225 0%, #050a15 52%, #03060d 100%);
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .lab-background { position: fixed; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
        .lab-glow { position: absolute; border-radius: 999px; filter: blur(90px); opacity: .26; }
        .lab-glow-one { width: 420px; height: 420px; top: 14%; right: -170px; background: #2a8fff; }
        .lab-glow-two { width: 360px; height: 360px; bottom: -130px; left: 10%; background: #8256ff; }
        .lab-grid {
          position: absolute; inset: 0; opacity: .1;
          background-image: linear-gradient(rgba(116,202,255,.22) 1px, transparent 1px), linear-gradient(90deg, rgba(116,202,255,.22) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: linear-gradient(to bottom, rgba(0,0,0,.7), transparent 80%);
        }

        .topbar {
          position: fixed; inset: 0 0 auto 0; z-index: 80; height: 66px; padding: 10px 16px;
          display: flex; align-items: center; justify-content: space-between; gap: 12px;
          border-bottom: 1px solid rgba(134,211,255,.12);
          background: rgba(4,10,22,.86); backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
        }
        .topbar-left, .topbar-stats { display: flex; align-items: center; gap: 8px; min-width: 0; }
        .assets-backdrop { position: fixed; inset: 0; z-index: 78; border: 0; background: transparent; }
        .profile-assets-wrap { position: relative; z-index: 82; }
        .round-button, .stat-pill {
          min-height: 42px; border-radius: 999px; border: 1px solid rgba(130,210,255,.26);
          background: rgba(12,31,57,.72); box-shadow: 0 12px 26px rgba(0,0,0,.22);
        }
        .round-button {
          padding: 0 15px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          color: white; text-decoration: none; font: inherit; font-size: 12px; font-weight: 800; cursor: pointer;
        }
        .guide-button { appearance: none; color: #d9f8ff; }
        .stat-pill { min-width: 100px; padding: 6px 13px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; }
        .token-pill { min-width: 205px; }
        .assets-button { width: 100%; appearance: none; color: white; font: inherit; text-align: left; cursor: pointer; }
        .assets-button strong { display: inline-flex; align-items: center; gap: 6px; }
        .assets-chevron { color: #8ee8ff; font-size: 12px; transition: transform 180ms ease; }
        .assets-chevron.is-open { transform: rotate(180deg); }
        .stat-label { color: rgba(232,245,255,.62); font-size: 9px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
        .stat-pill strong { color: #8ee8ff; font-size: 14px; white-space: nowrap; }

        .assets-dropdown {
          position: absolute; top: calc(100% + 8px); right: 0; z-index: 90; width: 380px;
          max-height: min(560px, calc(100dvh - 80px)); overflow: hidden; border-radius: 20px;
          border: 1px solid rgba(126,232,255,.3);
          background: linear-gradient(145deg, rgba(3,20,39,.98), rgba(3,10,25,.99));
          box-shadow: 0 28px 72px rgba(0,0,0,.56), 0 0 28px rgba(83,215,255,.12);
          color: white; backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
        }
        .assets-dropdown-heading { padding: 16px 18px; display: grid; gap: 5px; border-bottom: 1px solid rgba(126,232,255,.13); }
        .assets-dropdown-heading span { color: #8ee8ff; font-size: 10px; font-weight: 900; letter-spacing: .15em; text-transform: uppercase; }
        .assets-dropdown-heading strong { color: white; font-size: 27px; line-height: 1; letter-spacing: -.04em; }
        .assets-dropdown-scroll { max-height: min(476px, calc(100dvh - 160px)); padding: 11px; overflow-y: auto; overflow-x: hidden; }
        .assets-list, .transactions-list { display: grid; gap: 8px; }
        .assets-row, .transaction-row {
          min-height: 54px; padding: 9px 11px; display: grid; grid-template-columns: 32px minmax(0,1fr) auto;
          align-items: center; gap: 10px; border-radius: 14px; border: 1px solid rgba(126,232,255,.12); background: rgba(255,255,255,.035);
        }
        .assets-row { color: white; font-size: 13px; font-weight: 750; }
        .assets-row-icon, .transaction-sign {
          width: 32px; height: 32px; display: inline-flex; align-items: center; justify-content: center; border-radius: 11px; font-weight: 900;
        }
        .assets-row-icon { border: 1px solid rgba(83,215,255,.26); background: rgba(83,215,255,.09); color: #8ee8ff; }
        .assets-row > strong { color: #9fffd2; font-size: 12px; white-space: nowrap; }
        .transactions-heading { margin: 15px 4px 9px; color: rgba(255,255,255,.48); font-size: 10px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
        .transactions-empty { padding: 18px 12px; border-radius: 14px; background: rgba(255,255,255,.035); color: rgba(255,255,255,.58); font-size: 12px; text-align: center; }
        .transaction-row { min-height: 58px; }
        .transaction-sign.is-positive { border: 1px solid rgba(93,255,181,.34); background: rgba(93,255,181,.1); color: #9fffd2; }
        .transaction-sign.is-negative { border: 1px solid rgba(255,167,120,.34); background: rgba(255,138,92,.1); color: #ffc0a0; }
        .transaction-copy { min-width: 0; }
        .transaction-copy strong { display: block; overflow: hidden; color: white; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
        .transaction-copy small { display: block; margin-top: 3px; color: rgba(255,255,255,.43); font-size: 10px; }
        .transaction-amount { font-size: 12px; white-space: nowrap; }
        .transaction-amount.is-positive { color: #9fffd2; }
        .transaction-amount.is-negative { color: #ffc0a0; }

        .lab-layout {
          position: relative; z-index: 2; width: 100%; height: calc(100dvh - 66px); padding: 10px;
          display: grid; grid-template-columns: 250px minmax(0,1fr); gap: 10px; overflow: hidden;
        }
        .game-sidebar, .game-stage {
          min-height: 0; border: 1px solid rgba(126,208,255,.17); background: rgba(6,18,36,.78);
          backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px); box-shadow: 0 22px 60px rgba(0,0,0,.3);
        }
        .game-sidebar { height: 100%; padding: 14px; border-radius: 22px; overflow: hidden; display: flex; flex-direction: column; }
        .sidebar-heading { padding: 0 2px 12px; }
        .sidebar-eyebrow, .game-skill { margin: 0; color: #73dcff; font-size: 9px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
        .sidebar-heading h2 { margin: 4px 0 0; font-size: 20px; letter-spacing: -.03em; }
        .sidebar-reset { display: block; margin-top: 5px; color: rgba(235,247,255,.45); font-size: 9px; font-weight: 800; }
        .game-list { display: grid; gap: 8px; }
        .game-menu-card {
          position: relative; width: 100%; min-height: 74px; padding: 10px; display: grid; grid-template-columns: 40px 1fr auto;
          align-items: center; gap: 9px; appearance: none; border-radius: 16px; border: 1px solid rgba(134,211,255,.13);
          background: rgba(255,255,255,.035); color: white; text-align: left; cursor: pointer;
          transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
        }
        .game-menu-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--game-accent) 48%, transparent); }
        .game-menu-card.is-selected {
          border-color: color-mix(in srgb, var(--game-accent) 65%, transparent);
          background: color-mix(in srgb, var(--game-accent) 13%, rgba(6,18,36,.9)); box-shadow: inset 3px 0 0 var(--game-accent);
        }
        .game-menu-icon, .active-game-icon {
          display: inline-flex; align-items: center; justify-content: center; border-radius: 13px;
          border: 1px solid color-mix(in srgb, var(--game-accent) 45%, transparent);
          background: color-mix(in srgb, var(--game-accent) 15%, rgba(8,20,40,.92)); color: var(--game-accent);
        }
        .game-menu-icon { width: 40px; height: 40px; font-size: 20px; }
        .game-menu-copy { min-width: 0; display: grid; gap: 3px; }
        .game-menu-copy strong { font-size: 13px; }
        .game-menu-copy small { color: rgba(235,246,255,.52); font-size: 9px; }
        .mini-progress { width: 100%; height: 3px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.07); }
        .mini-progress i { display: block; height: 100%; border-radius: inherit; background: var(--game-accent); }
        .game-menu-count { min-width: 32px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255,255,255,.055); color: rgba(240,248,255,.68); font-size: 9px; font-weight: 850; }
        .sidebar-note { margin-top: auto; padding: 11px; display: grid; grid-template-columns: 18px 1fr; gap: 8px; border-radius: 14px; background: rgba(104,209,255,.07); color: rgba(231,246,255,.58); font-size: 10px; line-height: 1.45; }
        .sidebar-note span { color: #7ce1ff; } .sidebar-note p { margin: 0; }

        .game-stage { height: 100%; min-width: 0; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; position: relative; }
        .game-stage-heading {
          flex: 0 0 72px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
          border-bottom: 1px solid rgba(126,208,255,.12);
          background: radial-gradient(circle at 0 0, color-mix(in srgb, var(--active-accent) 13%, transparent), transparent 46%), rgba(255,255,255,.018);
        }
        .game-title-row { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .active-game-icon { --game-accent: var(--active-accent); width: 44px; height: 44px; flex: 0 0 auto; font-size: 22px; }
        .game-stage-heading h2 { margin: 3px 0 0; font-size: clamp(20px, 2.3vw, 30px); letter-spacing: -.04em; white-space: nowrap; }
        .stage-tools { display: flex; align-items: center; gap: 10px; }
        .stage-progress { width: 150px; display: grid; gap: 5px; }
        .stage-progress span { color: rgba(235,246,255,.5); font-size: 9px; font-weight: 800; text-transform: uppercase; text-align: right; }
        .stage-progress span strong { color: white; }
        .stage-progress > div { height: 5px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.07); }
        .stage-progress i { display: block; height: 100%; border-radius: inherit; background: var(--active-accent); }
        .game-surface { flex: 1 1 auto; min-height: 0; padding: 8px; overflow: hidden; }
        .save-message {
          position: absolute; right: 12px; bottom: 10px; z-index: 25; max-width: min(420px, calc(100% - 24px));
          padding: 9px 12px; display: flex; align-items: center; gap: 8px; border-radius: 12px;
          border: 1px solid rgba(111,231,177,.3); background: rgba(12,55,43,.94); color: #bdf8d9; font-size: 11px; box-shadow: 0 14px 36px rgba(0,0,0,.35);
        }

        @media (max-width: 1120px) {
          .lab-layout { grid-template-columns: 190px minmax(0,1fr); }
          .game-sidebar { padding: 10px; }
          .game-menu-card { min-height: 68px; grid-template-columns: 38px 1fr; }
          .game-menu-count { position: absolute; right: 7px; top: 6px; min-width: 26px; height: 22px; }
          .game-menu-icon { width: 38px; height: 38px; }
          .sidebar-note { font-size: 9px; }
        }

        @media (max-width: 720px) {
          .lab-page { padding-top: 58px; }
          .topbar { height: 58px; padding: 8px 7px; gap: 5px; }
          .topbar-left, .topbar-stats { gap: 5px; }
          .round-button { width: 40px; min-height: 40px; padding: 0; }
          .round-button-label { display: none; }
          .stat-pill { min-width: 56px; min-height: 40px; padding: 5px 8px; grid-template-columns: 1fr; gap: 0; text-align: center; }
          .token-pill { min-width: 126px; grid-template-columns: 1fr; }
          .token-pill .stat-label { display: none; }
          .stat-label { font-size: 7px; }
          .stat-pill strong { font-size: 11px; }
          .assets-dropdown { position: fixed; top: 60px; right: 7px; left: 7px; width: auto; max-height: calc(100dvh - 67px); }
          .assets-dropdown-scroll { max-height: calc(100dvh - 145px); }

          .lab-layout { height: calc(100dvh - 58px); padding: 5px; grid-template-columns: 58px minmax(0,1fr); gap: 5px; }
          .game-sidebar { padding: 5px; border-radius: 16px; }
          .sidebar-heading, .sidebar-note { display: none; }
          .game-list { gap: 6px; }
          .game-menu-card { min-height: 64px; padding: 6px; display: flex; align-items: center; justify-content: center; border-radius: 13px; }
          .game-menu-copy { display: none; }
          .game-menu-icon { width: 42px; height: 42px; border-radius: 12px; font-size: 20px; }
          .game-menu-count { right: 1px; top: 1px; min-width: 22px; height: 19px; padding: 0 4px; font-size: 7px; background: rgba(3,11,24,.95); }

          .game-stage { border-radius: 16px; }
          .game-stage-heading { flex-basis: 56px; padding: 7px 8px; gap: 6px; }
          .active-game-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 18px; }
          .game-skill { display: none; }
          .game-stage-heading h2 { margin: 0; font-size: clamp(14px, 4.4vw, 19px); }
          .stage-tools { gap: 6px; }
          .stage-progress { width: 62px; }
          .stage-progress span { font-size: 7px; }
          .game-surface { padding: 5px; }
          .save-message { right: 7px; bottom: 7px; font-size: 10px; }
        }

        @media (max-width: 390px) {
          .token-pill { min-width: 112px; }
          .stat-pill { min-width: 48px; padding-left: 5px; padding-right: 5px; }
          .lab-layout { grid-template-columns: 54px minmax(0,1fr); }
          .game-sidebar { padding: 4px; }
          .game-menu-icon { width: 39px; height: 39px; }
          .stage-progress { width: 54px; }
        }
      `}</style>
    </main>
  );
}


function InstructionsButton({ gameId }: { gameId: GameId }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const instructions = GAME_INSTRUCTIONS[gameId];

  useEffect(() => {
    if (!open) return;

    function closeOutside(event: MouseEvent | TouchEvent) {
      const target = event.target;
      if (target instanceof Node && !wrapRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("touchstart", closeOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("touchstart", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className="instructions-wrap"
      onPointerEnter={(event: { pointerType: string }) => {
        if (event.pointerType === "mouse") setOpen(true);
      }}
      onPointerLeave={(event: { pointerType: string }) => {
        if (event.pointerType === "mouse") setOpen(false);
      }}
    >
      <button
        type="button"
        className="instructions-button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-label={`Open ${instructions.title}`}
      >
        ?
      </button>

      {open && (
        <div className="instructions-popup" role="dialog" aria-label={instructions.title}>
          <p>Instructions</p>
          <h3>{instructions.title}</h3>
          <ol>
            {instructions.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div>{instructions.note}</div>
        </div>
      )}

      <style jsx>{`
        .instructions-wrap { position: relative; z-index: 50; }
        .instructions-button {
          width: 38px;
          height: 38px;
          border-radius: 999px;
          border: 1px solid rgba(137, 217, 255, 0.36);
          background: rgba(255, 255, 255, 0.055);
          color: #c9f5ff;
          font: inherit;
          font-size: 18px;
          font-weight: 900;
          cursor: pointer;
          box-shadow: 0 0 18px rgba(83, 215, 255, 0.12);
        }
        .instructions-popup {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: min(350px, calc(100vw - 90px));
          padding: 16px;
          border-radius: 17px;
          border: 1px solid rgba(126, 224, 255, 0.28);
          background: linear-gradient(145deg, rgba(3, 20, 39, 0.99), rgba(3, 10, 25, 0.99));
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.55);
          color: white;
        }
        .instructions-popup > p {
          margin: 0;
          color: #8ee8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }
        .instructions-popup h3 { margin: 5px 0 0; font-size: 19px; }
        .instructions-popup ol {
          margin: 12px 0 0;
          padding-left: 20px;
          display: grid;
          gap: 8px;
          color: rgba(241, 249, 255, 0.72);
          font-size: 10px;
          line-height: 1.45;
        }
        .instructions-popup > div {
          margin-top: 12px;
          padding: 10px 11px;
          border-radius: 12px;
          background: rgba(255, 211, 110, 0.08);
          color: #ffe39a;
          font-size: 11px;
          line-height: 1.4;
        }
        @media (max-width: 720px) {
          .instructions-button { width: 34px; height: 34px; font-size: 16px; }
          .instructions-popup {
            position: fixed;
            top: 64px;
            right: 7px;
            width: min(330px, calc(100vw - 76px));
            padding: 14px;
          }
        }
      `}</style>
    </div>
  );
}

function NovaWalkthrough({
  open,
  stepIndex,
  screenMode,
  onStepChange,
  onClose,
}: {
  open: boolean;
  stepIndex: number;
  screenMode: ScreenMode;
  onStepChange: (step: number) => void;
  onClose: () => void;
}) {
  const step = WALKTHROUGH_STEPS[stepIndex] ?? WALKTHROUGH_STEPS[0];
  const isMobile = screenMode === "mobile";
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === WALKTHROUGH_STEPS.length - 1;

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="walkthrough-backdrop" aria-hidden="true" />
      <section className="walkthrough" role="dialog" aria-modal="true" aria-label="Nova guided walkthrough">
        <button type="button" className="walkthrough-close" onClick={onClose} aria-label="Close walkthrough">
          ×
        </button>

        <img src="/nova/nova-character.png" alt="Nova" />

        <div className="walkthrough-copy">
          <p>{step.eyebrow}</p>
          <h2>{step.title}</h2>
          <span>{step.text}</span>

          <div className="walkthrough-footer">
            <div className="walkthrough-dots" aria-label={`Step ${stepIndex + 1} of ${WALKTHROUGH_STEPS.length}`}>
              {WALKTHROUGH_STEPS.map((_, index) => (
                <i key={index} className={index === stepIndex ? "is-active" : ""} />
              ))}
            </div>

            <div className="walkthrough-actions">
              {!isFirst && (
                <button type="button" onClick={() => onStepChange(stepIndex - 1)}>
                  Back
                </button>
              )}
              <button
                type="button"
                className="walkthrough-next"
                onClick={() => (isLast ? onClose() : onStepChange(stepIndex + 1))}
              >
                {isLast ? "Start Playing" : "Next"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <style jsx>{`
        .walkthrough-backdrop {
          position: fixed;
          inset: 0;
          z-index: 130;
          background: rgba(0, 4, 14, 0.74);
          backdrop-filter: blur(4px);
        }
        .walkthrough {
          position: fixed;
          left: ${isMobile ? "8px" : "28px"};
          right: ${isMobile ? "8px" : "auto"};
          bottom: ${isMobile ? "8px" : "24px"};
          z-index: 140;
          width: ${isMobile ? "auto" : "min(560px, calc(100vw - 56px))"};
          min-height: ${isMobile ? "230px" : "260px"};
          padding: ${isMobile ? "18px 16px 16px 118px" : "24px 26px 22px 195px"};
          border-radius: 24px;
          border: 1px solid rgba(142, 232, 255, 0.42);
          background: linear-gradient(145deg, rgba(4, 21, 47, 0.99), rgba(3, 9, 24, 0.99));
          box-shadow: 0 32px 90px rgba(0, 0, 0, 0.68), 0 0 40px rgba(83, 215, 255, 0.14);
          color: white;
        }
        .walkthrough > img {
          position: absolute;
          left: ${isMobile ? "-2px" : "5px"};
          bottom: -7px;
          height: ${isMobile ? "185px" : "255px"};
          width: auto;
          pointer-events: none;
          filter: drop-shadow(0 18px 36px rgba(0, 0, 0, 0.5));
        }
        .walkthrough-close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 34px;
          height: 34px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.07);
          color: white;
          font-size: 20px;
          cursor: pointer;
        }
        .walkthrough-copy > p {
          margin: 0;
          color: #8ee8ff;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .walkthrough-copy h2 {
          margin: 7px 34px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: ${isMobile ? "24px" : "33px"};
          line-height: 1.08;
          font-weight: 500;
        }
        .walkthrough-copy > span {
          display: block;
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.74);
          font-size: ${isMobile ? "12px" : "14px"};
          line-height: 1.5;
        }
        .walkthrough-footer {
          margin-top: 17px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .walkthrough-dots { display: flex; gap: 5px; }
        .walkthrough-dots i { width: 7px; height: 7px; border-radius: 999px; background: rgba(255, 255, 255, 0.18); }
        .walkthrough-dots i.is-active { width: 20px; background: #8ee8ff; }
        .walkthrough-actions { display: flex; gap: 7px; }
        .walkthrough-actions button {
          min-height: 38px;
          padding: 0 13px;
          border-radius: 11px;
          border: 1px solid rgba(255, 255, 255, 0.16);
          background: rgba(255, 255, 255, 0.055);
          color: white;
          font: inherit;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }
        .walkthrough-actions .walkthrough-next {
          border-color: rgba(83, 215, 255, 0.4);
          background: rgba(83, 215, 255, 0.15);
        }
        @media (max-width: 390px) {
          .walkthrough { padding-left: 104px; min-height: 220px; }
          .walkthrough > img { height: 168px; left: -8px; }
          .walkthrough-copy h2 { font-size: 21px; }
          .walkthrough-footer { align-items: flex-end; flex-direction: column; }
        }
      `}</style>
    </>
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
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
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
          flex: 0 0 auto;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
        }

        .game-panel-body {
          flex: 1 1 auto;
          min-height: 0;
          padding: 10px;
          overflow: hidden;
        }

        @media (max-width: 760px) {
          .game-panel {
            border-radius: 12px;
          }

          .game-panel-top {
            padding: 6px 8px;
          }

          .game-panel-body {
            padding: 6px;
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
          gap: 8px;
          flex-wrap: nowrap;
        }

        .instruction-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 8px;
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
          min-height: 40px;
          padding: 0 15px;
          border-radius: 15px;
          border: 1px solid rgba(153, 230, 255, 0.46);
          background: linear-gradient(135deg, #2fbcf4, #596dff);
          color: white;
          font: inherit;
          font-size: 11px;
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
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .result-star {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(126, 224, 255, 0.38);
          background: rgba(89, 182, 255, 0.12);
          color: #83e5ff;
          font-size: 22px;
          box-shadow: 0 0 34px rgba(85, 201, 255, 0.18);
        }

        .result-card > p:first-of-type {
          margin: 10px 0 0;
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
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(130px, 1fr));
          gap: 12px;
        }

        .reward-row > div {
          padding: 10px 15px;
          display: grid;
          gap: 3px;
          border-radius: 16px;
          border: 1px solid rgba(127, 221, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
        }

        .reward-row strong {
          color: #8ee8ff;
          font-size: 21px;
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
          margin: 13px 0 15px;
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
            grid-template-columns: repeat(2, 1fr);
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
          width: 100%;
          height: 100%;
          min-height: 0;
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
          width: 100%;
          height: 100%;
          min-height: 0;
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
          width: 100%;
          height: 100%;
          min-height: 0;
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
  const seed = makeSeed(userId, activityDate, "colour-code", levelNumber);
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
  const [phase, setPhase] = useState<"playing" | "failed" | "complete">(
    "playing"
  );
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Choose four colours.");
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
    if (firstEmpty !== -1) setActiveSlot(firstEmpty);
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
      setMessage(`Position ${clueOrder[result.cluesUsed - 1] + 1} revealed.`);
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
      { guess: completedGuess, exact: result.exact, misplaced: result.misplaced },
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
        const rewardResult = await onComplete("colour-code", levelNumber, score);
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
      setMessage("All 15 attempts were used.");
      return;
    }

    setGuess([null, null, null, null]);
    setActiveSlot(0);
    setMessage(`${result.exact} exact · ${result.misplaced} misplaced`);
  }

  function retryQuestion() {
    setGuess([null, null, null, null]);
    setActiveSlot(0);
    setAttempts([]);
    setPhase("playing");
    setMessage("Try the same code again. Paid clues remain visible.");
    setErrorMessage("");
  }

  if (phase === "complete" && completion) {
    return (
      <GamePanel
        top={
          <InstructionBar
            items={[
              { label: "Question", value: `${levelNumber}/3` },
              { label: "Attempts", value: String(attempts.length) },
              { label: "Clues", value: String(localClues) },
            ]}
          />
        }
      >
        <RewardResult
          title="Code cracked!"
          text="You used the clue history to identify all four positions."
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
            { label: "Question", value: `${levelNumber}/3` },
            {
              label: "Attempts",
              value: `${attempts.length}/${COLOUR_MAX_ATTEMPTS}`,
            },
            { label: "Reward", value: "20 DT" },
          ]}
        />
      }
    >
      <div className="colour-layout">
        <section className="colour-focus">
          <div className="secret-row" aria-label="Hidden code">
            {secret.map((colourId, index) => {
              const revealed = revealedPositions.has(index);
              return (
                <span
                  key={`secret-${index}`}
                  className={revealed ? "is-revealed" : ""}
                  style={revealed ? { background: colourById(colourId).hex } : undefined}
                >
                  {revealed ? "" : "?"}
                </span>
              );
            })}
          </div>

          <div className="current-guess" aria-label="Current guess">
            {guess.map((colourId, index) => (
              <button
                type="button"
                key={`guess-${index}`}
                className={`${colourId ? "is-filled" : ""} ${
                  activeSlot === index ? "is-active" : ""
                }`}
                style={
                  colourId ? { background: colourById(colourId).hex } : undefined
                }
                onClick={() =>
                  colourId ? editCurrentSlot(index) : setActiveSlot(index)
                }
                disabled={busy || phase !== "playing"}
                aria-label={`Guess position ${index + 1}`}
              />
            ))}
          </div>

          <div className="colour-palette" aria-label="Choose a colour">
            {COLOURS.map((colour) => (
              <button
                type="button"
                key={colour.id}
                onClick={() => chooseColour(colour.id)}
                disabled={phase !== "playing" || busy}
                aria-label={`Choose ${colour.name}`}
                title={colour.name}
              >
                <span style={{ background: colour.hex }} />
              </button>
            ))}
          </div>

          <div className="colour-actions">
            <button
              type="button"
              className="clue-button"
              onClick={buyClue}
              disabled={busy || localClues >= 4 || tokenBalance < CLUE_COST}
            >
              {localClues >= 4 ? "All revealed" : `Clue · ${CLUE_COST} DT`}
            </button>

            {phase === "failed" ? (
              <PrimaryButton onClick={retryQuestion}>Retry code</PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={submitGuess}
                disabled={busy || guess.some((colourId) => colourId === null)}
              >
                {busy ? "Checking…" : "Check"}
              </PrimaryButton>
            )}
          </div>

          <div className="colour-message" role="status">
            <span>{message}</span>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          {phase === "failed" && (
            <div className="answer-strip" aria-label="Correct answer">
              {secret.map((colourId, index) => (
                <i
                  key={`${colourId}-${index}`}
                  style={{ background: colourById(colourId).hex }}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="attempt-board">
          <div className="attempt-heading">
            <h3>Clue history</h3>
            <span>
              <i className="exact-dot" /> exact
              <i className="misplaced-dot" /> misplaced
            </span>
          </div>

          <div className="attempt-list">
            {Array.from({ length: COLOUR_MAX_ATTEMPTS }).map((_, rowIndex) => {
              const completedAttempt = attempts[rowIndex];
              const isCurrent = phase === "playing" && rowIndex === attempts.length;
              const rowColours = completedAttempt
                ? completedAttempt.guess
                : isCurrent
                ? guess
                : [null, null, null, null];

              return (
                <div
                  className={`attempt-row ${isCurrent ? "is-current" : ""}`}
                  key={`attempt-row-${rowIndex}`}
                >
                  <span className="attempt-number">{rowIndex + 1}</span>
                  <div className="attempt-circles">
                    {rowColours.map((colourId, circleIndex) => (
                      <span
                        key={`attempt-${rowIndex}-${circleIndex}`}
                        className={colourId ? "is-filled" : ""}
                        style={
                          colourId ? { background: colourById(colourId).hex } : undefined
                        }
                      />
                    ))}
                  </div>
                  <div className="attempt-result">
                    {completedAttempt ? (
                      <>
                        <span className="exact-result">{completedAttempt.exact}</span>
                        <span className="misplaced-result">{completedAttempt.misplaced}</span>
                      </>
                    ) : (
                      <span className="empty-result">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      <style jsx>{`
        .colour-layout {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 0.82fr);
          gap: 9px;
          overflow: hidden;
        }
        .colour-focus,
        .attempt-board {
          min-height: 0;
          border-radius: 17px;
          border: 1px solid rgba(133, 213, 255, 0.12);
          background: rgba(255, 255, 255, 0.025);
        }
        .colour-focus {
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .secret-row { display: flex; justify-content: center; gap: 8px; }
        .secret-row span {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 2px dashed rgba(131, 219, 255, 0.24);
          background: rgba(2, 10, 23, 0.72);
          color: rgba(231, 247, 255, 0.38);
          font-size: 13px;
          font-weight: 900;
        }
        .secret-row span.is-revealed {
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 3px 6px rgba(255, 255, 255, 0.22);
        }
        .current-guess {
          margin: clamp(10px, 2vh, 20px) 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(10px, 1.5vw, 18px);
        }
        .current-guess button {
          width: clamp(58px, 7vw, 86px);
          height: clamp(58px, 7vw, 86px);
          border-radius: 999px;
          border: 3px dashed rgba(126, 220, 255, 0.27);
          background: rgba(2, 10, 22, 0.62);
          cursor: pointer;
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.22);
        }
        .current-guess button.is-active {
          border-color: #76defd;
          box-shadow: 0 0 0 4px rgba(118, 222, 253, 0.1), 0 12px 24px rgba(0, 0, 0, 0.22);
        }
        .current-guess button.is-filled {
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 5px 10px rgba(255, 255, 255, 0.23), 0 12px 24px rgba(0, 0, 0, 0.24);
        }
        .colour-palette {
          width: min(430px, 100%);
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 7px;
        }
        .colour-palette button {
          aspect-ratio: 1;
          min-width: 0;
          padding: 4px;
          border-radius: 999px;
          border: 1px solid rgba(137, 215, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          cursor: pointer;
        }
        .colour-palette button span {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.18);
          box-shadow: inset 0 3px 7px rgba(255, 255, 255, 0.2);
        }
        .colour-palette button:disabled { opacity: 0.4; }
        .colour-actions {
          width: min(430px, 100%);
          margin-top: 9px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .clue-button {
          min-height: 42px;
          border-radius: 13px;
          border: 1px solid rgba(255, 211, 110, 0.28);
          background: rgba(255, 211, 110, 0.09);
          color: #ffdc82;
          font: inherit;
          font-size: 11px;
          font-weight: 850;
          cursor: pointer;
        }
        .clue-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .colour-message {
          width: min(430px, 100%);
          min-height: 30px;
          margin-top: 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          color: rgba(235, 247, 255, 0.64);
          font-size: 11px;
          text-align: center;
        }
        .colour-message strong { color: #ff9ca8; }
        .answer-strip { display: flex; gap: 5px; }
        .answer-strip i { width: 18px; height: 18px; border-radius: 999px; }

        .attempt-board {
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          overflow: hidden;
        }
        .attempt-heading {
          width: 100%;
          padding: 2px 4px 7px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.1);
          text-align: center;
        }
        .attempt-heading h3 { margin: 0; font-size: 14px; }
        .attempt-heading > span {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(235, 247, 255, 0.46);
          font-size: 8px;
        }
        .attempt-heading i { width: 7px; height: 7px; border-radius: 999px; }
        .exact-dot { background: #63e7a3; }
        .misplaced-dot { margin-left: 3px; background: #ffd465; }
        .attempt-list {
          width: min(330px, 100%);
          flex: 1 1 auto;
          min-height: 0;
          padding-top: 5px;
          display: grid;
          grid-template-rows: repeat(15, minmax(0, 1fr));
          gap: 2px;
          overflow: hidden;
        }
        .attempt-row {
          min-height: 0;
          padding: 1px 5px;
          display: grid;
          grid-template-columns: 18px 1fr 45px;
          align-items: center;
          gap: 5px;
          border-radius: 7px;
          border: 1px solid transparent;
          background: rgba(255, 255, 255, 0.022);
        }
        .attempt-row.is-current {
          border-color: rgba(102, 217, 255, 0.28);
          background: rgba(102, 217, 255, 0.065);
        }
        .attempt-number { color: rgba(235, 247, 255, 0.34); font-size: 8px; font-weight: 850; }
        .attempt-circles { display: flex; justify-content: center; gap: 5px; }
        .attempt-circles span {
          width: clamp(12px, 1.5vw, 18px);
          height: clamp(12px, 1.5vw, 18px);
          border-radius: 999px;
          border: 1px dashed rgba(131, 219, 255, 0.2);
          background: rgba(2, 10, 22, 0.56);
        }
        .attempt-circles span.is-filled { border-style: solid; border-color: rgba(255, 255, 255, 0.18); }
        .attempt-result { display: flex; justify-content: flex-end; gap: 5px; font-size: 8px; font-weight: 900; }
        .attempt-result span { min-width: 17px; height: 17px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; }
        .exact-result { background: rgba(99, 231, 163, 0.12); color: #82efb7; }
        .misplaced-result { background: rgba(255, 212, 101, 0.11); color: #ffdc82; }
        .empty-result { color: rgba(235, 247, 255, 0.18); }

        @media (max-width: 900px) {
          .colour-layout { grid-template-columns: minmax(0, 1fr) minmax(245px, 0.78fr); gap: 6px; }
          .current-guess button { width: clamp(50px, 6.5vw, 68px); height: clamp(50px, 6.5vw, 68px); }
        }
        @media (max-width: 720px) {
          .colour-layout { grid-template-columns: 1fr; grid-template-rows: minmax(210px, 0.82fr) minmax(0, 1.18fr); gap: 5px; }
          .colour-focus { padding: 6px; justify-content: flex-start; }
          .secret-row span { width: 24px; height: 24px; font-size: 10px; }
          .current-guess { margin: 7px 0; gap: 7px; }
          .current-guess button { width: clamp(43px, 13vw, 57px); height: clamp(43px, 13vw, 57px); border-width: 2px; }
          .colour-palette { gap: 4px; }
          .colour-palette button { padding: 3px; }
          .colour-actions { margin-top: 5px; gap: 5px; }
          .clue-button { min-height: 34px; font-size: 9px; }
          .colour-message { min-height: 20px; margin-top: 3px; font-size: 9px; }
          .attempt-board { padding: 4px; }
          .attempt-heading { padding-bottom: 3px; }
          .attempt-heading h3 { font-size: 11px; }
          .attempt-heading > span { font-size: 7px; }
          .attempt-list { padding-top: 2px; gap: 1px; }
          .attempt-row { grid-template-columns: 15px 1fr 38px; padding: 0 3px; }
          .attempt-circles { gap: 4px; }
          .attempt-circles span { width: 11px; height: 11px; }
          .attempt-result span { min-width: 14px; height: 14px; font-size: 7px; }
        }
        @media (max-height: 680px) and (max-width: 720px) {
          .colour-layout { grid-template-rows: 190px minmax(0, 1fr); }
          .current-guess button { width: 42px; height: 42px; }
          .secret-row span { width: 21px; height: 21px; }
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
  const baseSeed = makeSeed(userId, activityDate, "set-finder", levelNumber);

  const [setsFound, setSetsFound] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [localClues, setLocalClues] = useState(cluesUsed);
  const [currentBoardClues, setCurrentBoardClues] = useState(0);
  const [message, setMessage] = useState("Select three cards.");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
  const [finalScore, setFinalScore] = useState(0);

  const board = useMemo(
    () => createSetBoard(`${baseSeed}:set-round:${setsFound}`),
    [baseSeed, setsFound]
  );
  const validSet = useMemo(() => findValidSet(board), [board]);
  const hintedCardIds = useMemo(
    () =>
      new Set(
        (validSet ?? []).slice(0, currentBoardClues).map((card) => card.id)
      ),
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
      setMessage("A glowing card belongs to a correct SET.");
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
      setMessage("Not a SET. Try another group of three.");
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

    const score = Math.max(250, 1200 - mistakes * 80 - localClues * 75);
    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onComplete("set-finder", levelNumber, score);
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
              { label: "Level", value: `${levelNumber}/3` },
              { label: "SETs", value: "3/3" },
              { label: "Clues", value: String(localClues) },
            ]}
          />
        }
      >
        <RewardResult
          title="Three SETs found!"
          text="You compared colour, shape, number, and pattern at the same time."
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
            { label: "Level", value: `${levelNumber}/3` },
            { label: "SETs", value: `${setsFound}/3` },
            { label: "Reward", value: "20 DT" },
          ]}
        />
      }
    >
      <div className="set-layout">
        <div className="set-toolbar">
          <div className="set-progress" aria-label={`${setsFound} of 3 SETs found`}>
            {[0, 1, 2].map((index) => (
              <i key={index} className={index < setsFound ? "is-complete" : ""} />
            ))}
          </div>

          <div className="set-message" role="status">
            <span>{message}</span>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          <button
            type="button"
            className="set-clue"
            onClick={buyClue}
            disabled={
              busy || !mayBuyCurrentClue || tokenBalance < CLUE_COST
            }
          >
            {localClues >= 3 ? "Clues used" : `Clue · ${CLUE_COST} DT`}
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
                aria-label={`${card.count + 1} ${PATTERN_LABELS[card.pattern]} ${SHAPE_LABELS[card.shape]}`}
              >
                <span className="set-symbols">
                  {Array.from({ length: card.count + 1 }).map((_, symbolIndex) => (
                    <SetSymbol
                      key={`${card.id}-${symbolIndex}`}
                      card={card}
                      symbolIndex={symbolIndex}
                    />
                  ))}
                </span>
                {hinted && <span className="hint-mark">✦</span>}
              </button>
            );
          })}
        </div>

        <div className="set-footer">
          <span>{selectedIds.length}/3 selected</span>
          <PrimaryButton
            onClick={checkSelection}
            disabled={busy || selectedIds.length !== 3}
          >
            {busy ? "Checking…" : "Check SET"}
          </PrimaryButton>
        </div>
      </div>

      <style jsx>{`
        .set-layout {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: 43px minmax(0, 1fr) 45px;
          gap: 7px;
          overflow: hidden;
        }
        .set-toolbar {
          min-width: 0;
          padding: 5px 7px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          border-radius: 14px;
          border: 1px solid rgba(174, 139, 255, 0.16);
          background: rgba(157, 115, 255, 0.065);
        }
        .set-progress { display: flex; gap: 5px; }
        .set-progress i {
          width: 22px;
          height: 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }
        .set-progress i.is-complete {
          background: #8ee8ff;
          box-shadow: 0 0 10px rgba(142, 232, 255, 0.28);
        }
        .set-message {
          min-width: 0;
          color: rgba(240, 248, 255, 0.62);
          font-size: 10px;
          text-align: center;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .set-message strong { margin-left: 6px; color: #ff9ca8; }
        .set-clue {
          min-height: 31px;
          padding: 0 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 211, 110, 0.28);
          background: rgba(255, 211, 110, 0.09);
          color: #ffdc82;
          font: inherit;
          font-size: 9px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .set-clue:disabled { opacity: 0.4; cursor: not-allowed; }
        .set-board {
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(0, 1fr));
          gap: 7px;
          overflow: hidden;
        }
        .set-card {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          border: 1px solid rgba(137, 215, 255, 0.15);
          background: linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02)), rgba(5,14,28,.8);
          cursor: pointer;
          transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
          overflow: hidden;
        }
        .set-card:hover { transform: translateY(-2px); border-color: rgba(169, 139, 255, 0.42); }
        .set-card.is-selected {
          transform: translateY(-2px);
          border-color: #b49bff;
          background: rgba(159, 119, 255, 0.14);
          box-shadow: 0 0 20px rgba(154, 115, 255, 0.18);
        }
        .set-card.is-hinted {
          border-color: #ffd36e;
          box-shadow: inset 0 0 0 2px rgba(255, 211, 110, 0.12), 0 0 16px rgba(255, 211, 110, 0.12);
        }
        .set-symbols {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }
        .set-symbols :global(svg) {
          width: min(31%, 54px);
          max-height: 78%;
          filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.28));
        }
        .hint-mark {
          position: absolute;
          top: 4px;
          right: 5px;
          color: #ffd36e;
          font-size: 12px;
        }
        .set-footer {
          padding: 2px 3px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        .set-footer > span {
          color: rgba(239, 248, 255, 0.45);
          font-size: 9px;
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .set-layout { grid-template-rows: 38px minmax(0, 1fr) 38px; gap: 4px; }
          .set-toolbar { padding: 3px 4px; gap: 4px; }
          .set-progress { gap: 2px; }
          .set-progress i { width: 12px; height: 5px; }
          .set-message { font-size: 8px; }
          .set-clue { min-height: 28px; padding: 0 6px; font-size: 8px; }
          .set-board {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: repeat(4, minmax(0, 1fr));
            gap: 4px;
          }
          .set-card { padding: 3px; border-radius: 11px; }
          .set-symbols { gap: 1px; }
          .set-symbols :global(svg) { width: min(32%, 42px); max-height: 72%; }
          .set-footer { gap: 6px; }
          .set-footer > span { font-size: 8px; }
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
  const blocks = [
    ...sequence,
    ...Array.from({ length: emptySlots }, () => ""),
  ].slice(0, size);

  return (
    <div
      className="tower"
      style={{ "--tower-size": size } as CSSProperties}
      aria-label={`${size}-block colour tower`}
    >
      {[...blocks].reverse().map((colourId, visualIndex) => {
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
          width: min(210px, 92%);
          height: 100%;
          max-height: 330px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 3px;
        }
        .tower-block {
          width: 100%;
          height: clamp(20px, calc(250px / var(--tower-size)), 48px);
          min-height: 0;
          border-radius: 9px;
          border: 2px solid rgba(255, 255, 255, 0.13);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 6px 11px rgba(0, 0, 0, 0.2), inset 0 3px 6px rgba(255, 255, 255, 0.2);
        }
        .tower-block.is-hidden,
        .tower-block.is-empty {
          border: 1px dashed rgba(136, 217, 255, 0.22);
          color: rgba(229, 246, 255, 0.27);
          box-shadow: none;
        }
        .tower-block.is-hidden span {
          color: rgba(232, 247, 255, 0.28);
          font-size: 14px;
          font-weight: 900;
        }
        .tower-base {
          width: calc(100% + 18px);
          height: 20px;
          flex: 0 0 20px;
          margin-top: 1px;
          border-radius: 6px 6px 11px 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(126, 222, 255, 0.12);
          border: 1px solid rgba(126, 222, 255, 0.19);
          color: rgba(229, 246, 255, 0.42);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.16em;
        }
        @media (max-width: 720px) {
          .tower { width: 94%; max-height: 245px; gap: 2px; }
          .tower-block { height: clamp(16px, calc(180px / var(--tower-size)), 34px); border-radius: 7px; }
          .tower-base { height: 17px; flex-basis: 17px; font-size: 6px; }
        }
        @media (max-height: 680px) and (max-width: 720px) {
          .tower { max-height: 205px; }
          .tower-block { height: clamp(14px, calc(145px / var(--tower-size)), 28px); }
        }
      `}</style>
    </div>
  );
}

function TowerMemoryGame({
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
  const size = towerSizeForQuestion(levelNumber);
  const expectedReward = towerRewardForQuestion(levelNumber);
  const seed = makeSeed(userId, activityDate, "tower-memory", levelNumber);
  const sequence = useMemo(
    () => createTowerSequence(seed, size),
    [seed, size]
  );

  const initialPreviewSeconds = Math.max(5, size + 1);
  const [answer, setAnswer] = useState<string[]>([]);
  const [phase, setPhase] = useState<
    "preview" | "build" | "failed" | "complete"
  >("preview");
  const [previewSeconds, setPreviewSeconds] = useState(initialPreviewSeconds);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [localClues, setLocalClues] = useState(cluesUsed);
  const [message, setMessage] = useState("Study the tower.");
  const [errorMessage, setErrorMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [completion, setCompletion] = useState<CompletionResult | null>(null);
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

  async function showTowerAgain() {
    if (
      busy ||
      phase !== "build" ||
      tokenBalance < CLUE_COST ||
      localClues >= TOWER_MAX_ATTEMPTS
    ) {
      return;
    }

    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onBuyClue("tower-memory", levelNumber);
      setLocalClues(result.cluesUsed);
      setPreviewSeconds(Math.max(4, size - 1));
      setPhase("preview");
      setMessage("Study the tower again. Your answer is kept.");
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  async function checkTower() {
    if (busy || phase !== "build" || answer.length !== size) return;

    const wrongBlocks = answer.reduce(
      (total, colourId, index) => total + (colourId === sequence[index] ? 0 : 1),
      0
    );
    const nextAttempts = attemptsUsed + 1;
    setAttemptsUsed(nextAttempts);

    if (wrongBlocks > 0) {
      setErrorMessage("");

      if (nextAttempts >= TOWER_MAX_ATTEMPTS) {
        setPhase("failed");
        setMessage(
          `${wrongBlocks} of ${size} blocks were wrong. All ${TOWER_MAX_ATTEMPTS} attempts were used.`
        );
      } else {
        setMessage(
          `${wrongBlocks} of ${size} blocks are wrong. ${
            TOWER_MAX_ATTEMPTS - nextAttempts
          } attempts left.`
        );
      }
      return;
    }

    const score = Math.max(
      250,
      1200 - Math.max(0, nextAttempts - 1) * 110 - localClues * 75 - size * 15
    );
    setBusy(true);
    setErrorMessage("");

    try {
      const result = await onComplete("tower-memory", levelNumber, score);
      setFinalScore(score);
      setCompletion(result);
      setPhase("complete");
    } catch (error) {
      setErrorMessage(formatSupabaseError(error));
    } finally {
      setBusy(false);
    }
  }

  function retryLevel() {
    setAnswer([]);
    setAttemptsUsed(0);
    setPreviewSeconds(initialPreviewSeconds);
    setPhase("preview");
    setMessage("Study the tower again.");
    setErrorMessage("");
  }

  if (phase === "complete" && completion) {
    return (
      <GamePanel
        top={
          <InstructionBar
            items={[
              { label: "Level", value: `${levelNumber}/3` },
              { label: "Tower", value: `${size} blocks` },
              { label: "Attempts", value: String(attemptsUsed) },
            ]}
          />
        }
      >
        <RewardResult
          title={`${size}-block tower rebuilt!`}
          text="You remembered the exact colour order from the bottom block upward."
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
            { label: "Level", value: `${levelNumber}/3` },
            { label: "Attempts", value: `${attemptsUsed}/${TOWER_MAX_ATTEMPTS}` },
            { label: "Reward", value: `${expectedReward} DT` },
          ]}
        />
      }
    >
      <div className="tower-layout">
        <div className="towers-row">
          <section className="tower-card preview-card">
            <div className="tower-heading">
              <span>Nova’s tower</span>
              <strong>
                {phase === "preview" ? `${previewSeconds}s` : "Hidden"}
              </strong>
            </div>

            {phase === "preview" && (
              <div className="timer-bar" aria-label={`${previewSeconds} seconds remaining`}>
                <i
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (previewSeconds / initialPreviewSeconds) * 100)
                    )}%`,
                  }}
                />
              </div>
            )}

            <div className="preview-area">
              <TowerDisplay
                sequence={sequence}
                size={size}
                hidden={phase === "build"}
              />

            </div>
          </section>

          <section className="tower-card answer-card">
            <div className="tower-heading">
              <span>Your tower</span>
              <strong>{answer.length}/{size}</strong>
            </div>

            <TowerDisplay
              sequence={answer}
              size={size}
              emptySlots={Math.max(0, size - answer.length)}
            />
          </section>
        </div>

        <div className="tower-controls">
          <div className="tower-palette" aria-label="Choose a block colour">
            {COLOURS.map((colour) => (
              <button
                type="button"
                key={colour.id}
                onClick={() => chooseColour(colour.id)}
                disabled={phase !== "build" || busy || answer.length >= size}
                aria-label={`Add ${colour.name} block`}
                title={colour.name}
              >
                <span style={{ background: colour.hex }} />
              </button>
            ))}
          </div>

          <div className="tower-message" role="status">
            <span>{message}</span>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          <div className="tower-actions">
            {phase === "failed" ? (
              <PrimaryButton onClick={retryLevel}>Retry level</PrimaryButton>
            ) : (
              <>
                <PrimaryButton
                  onClick={showTowerAgain}
                  disabled={
                    busy ||
                    phase !== "build" ||
                    tokenBalance < CLUE_COST ||
                    localClues >= TOWER_MAX_ATTEMPTS
                  }
                  secondary
                >
                  Show again · 5 DT
                </PrimaryButton>

                <PrimaryButton
                  onClick={removeTopBlock}
                  disabled={busy || phase !== "build" || answer.length === 0}
                  secondary
                >
                  Remove top
                </PrimaryButton>

                <PrimaryButton
                  onClick={checkTower}
                  disabled={busy || phase !== "build" || answer.length !== size}
                >
                  {busy ? "Checking…" : "Check tower"}
                </PrimaryButton>
              </>
            )}
          </div>
        </div>

        {phase === "failed" && (
          <div className="failed-answer">
            <span>Correct tower</span>
            <div>
              {sequence.map((colourId, index) => (
                <i
                  key={`${colourId}-${index}`}
                  style={{ background: colourById(colourId).hex }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .tower-layout {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(0, 1fr) auto;
          gap: 7px;
          overflow: hidden;
        }
        .towers-row {
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          overflow: hidden;
        }
        .tower-card {
          min-width: 0;
          min-height: 0;
          padding: 8px;
          display: flex;
          flex-direction: column;
          border-radius: 17px;
          border: 1px solid rgba(131, 213, 255, 0.12);
          background: rgba(255, 255, 255, 0.025);
          overflow: hidden;
        }
        .tower-heading {
          flex: 0 0 auto;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .tower-heading span {
          color: #77e7b7;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .tower-heading strong {
          color: rgba(241, 249, 255, 0.68);
          font-size: 9px;
        }
        .preview-area {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          display: flex;
          overflow: hidden;
        }
        .answer-card > :global(div:last-child) { flex: 1 1 auto; min-height: 0; }
        .timer-bar {
          flex: 0 0 5px;
          height: 5px;
          margin: -1px 3px 5px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.08);
        }
        .timer-bar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #6fe7b1;
          transition: width 1s linear;
          box-shadow: 0 0 12px rgba(111, 231, 177, 0.32);
        }
        .tower-controls {
          padding: 7px;
          display: grid;
          grid-template-columns: minmax(210px, 0.7fr) minmax(160px, 1fr) auto;
          align-items: center;
          gap: 8px;
          border-radius: 15px;
          border: 1px solid rgba(131, 213, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
        }
        .tower-palette {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 5px;
        }
        .tower-palette button {
          aspect-ratio: 1;
          min-width: 0;
          padding: 3px;
          border-radius: 999px;
          border: 1px solid rgba(137, 215, 255, 0.12);
          background: rgba(255, 255, 255, 0.035);
          cursor: pointer;
        }
        .tower-palette button span {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 999px;
          border: 2px solid rgba(255, 255, 255, 0.18);
        }
        .tower-palette button:disabled { opacity: 0.35; cursor: not-allowed; }
        .tower-message {
          min-width: 0;
          color: rgba(235, 247, 255, 0.62);
          font-size: 10px;
          line-height: 1.35;
          text-align: center;
        }
        .tower-message strong { display: block; color: #ff9ca8; }
        .tower-actions { display: flex; justify-content: flex-end; gap: 6px; }
        .failed-answer {
          position: absolute;
          inset: auto 50% 66px auto;
          transform: translateX(50%);
          z-index: 5;
          padding: 8px 10px;
          border-radius: 12px;
          background: rgba(3, 17, 31, 0.94);
          border: 1px solid rgba(255, 156, 168, 0.22);
          text-align: center;
        }
        .failed-answer > span { color: rgba(241, 249, 255, 0.54); font-size: 8px; text-transform: uppercase; }
        .failed-answer > div { margin-top: 5px; display: flex; gap: 4px; }
        .failed-answer i { width: 18px; height: 18px; border-radius: 5px; }

        @media (max-width: 900px) {
          .tower-controls { grid-template-columns: minmax(170px, 0.7fr) 1fr; }
          .tower-actions { grid-column: 1 / -1; justify-content: center; }
        }
        @media (max-width: 720px) {
          .tower-layout { gap: 4px; }
          .towers-row { gap: 4px; }
          .tower-card { padding: 5px 3px; border-radius: 12px; }
          .tower-heading { margin-bottom: 2px; padding: 0 2px; }
          .tower-heading span, .tower-heading strong { font-size: 7px; }
          .tower-controls {
            padding: 4px;
            grid-template-columns: 1fr;
            gap: 4px;
          }
          .tower-palette { width: min(250px, 100%); margin: 0 auto; gap: 4px; }
          .tower-palette button { padding: 2px; }
          .tower-message { min-height: 18px; font-size: 8px; }
          .tower-actions { grid-column: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; }
          .failed-answer { bottom: 92px; }
        }
        @media (max-width: 410px) {
          .tower-actions { grid-template-columns: 1fr 1fr; }
          .tower-actions :global(button:last-child) { grid-column: 1 / -1; }
        }
      `}</style>
    </GamePanel>
  );
}
