"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CSSProperties } from "react";
import { onAuthUserChange } from "@/lib/auth/onAuthUserChange";
import { supabase } from "@/lib/supabase";
import ThinkLabHub from "@/components/nova/think-lab/ThinkLabHub";
import { ReactorTransferCelebration } from "@/components/nova/think-lab/ThinkLabReactor";
import type { ConfirmedReactorAward } from "@/components/nova/think-lab/ThinkLabReactor";
import { ColourCodeGame } from "@/components/nova/think-lab/ColourCodeGame";
import { SetFinderGame } from "@/components/nova/think-lab/SetFinderGame";
import { TowerMemoryGame } from "@/components/nova/think-lab/TowerMemoryGame";
import {
  NOVA_WORLD_HREF,
  DAILY_LIMIT,
  CLUE_COST,
  GAME_DEFINITIONS,
  rewardForDailyLevel,
  formatSupabaseError,
  LoadingPanel,
  DailyCompletePanel,
} from "@/components/nova/think-lab/shared";
import type {
  GameId,
  DailyLevelNumber,
  DailyGameStatus,
  DailyLevelStatus,
  ScreenMode,
  LabStatus,
  CompletionResult,
  ClueResult,
} from "@/components/nova/think-lab/shared";


const WALKTHROUGH_STORAGE_KEY = "thinking-skills-lab-walkthrough-v5";

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
      levels?: Record<
        string,
        {
          completed?: boolean;
          clues?: number;
          reward?: number;
        }
      >;
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

const GAME_INSTRUCTIONS: Record<
  GameId,
  { title: string; steps: string[]; note: string }
> = {
  "colour-code": {
    title: "How to play Colour Code",
    steps: [
      "Choose Easy, Medium, or Hard in any order. The code always has four positions.",
      "Easy uses 4 available colours, Medium uses 5, and Hard uses all 6. Colours may repeat.",
      "Green shows a colour in the correct position. Yellow shows a correct colour in the wrong position.",
      "Use the clue history to narrow the code within 15 attempts.",
    ],
    note: "Signed-in players can use a position clue for 5 DT. Guests get one free hint per challenge. Rewards are collected only when signed in.",
  },
  "set-finder": {
    title: "How to play SET Finder",
    steps: [
      "Select three cards.",
      "For colour, shape, number, and pattern, each feature must be either all the same or all different.",
      "Find three correct SETs to complete the level.",
    ],
    note: "Signed-in players can use a one-card clue for 5 DT. Guests get one free hint per challenge. The 20 DT reward is collected only when signed in.",
  },
  "tower-memory": {
    title: "How to play Tower Memory",
    steps: [
      "Choose the 4-block, 6-block, or 8-block level in any order.",
      "Study the tower before the timer reaches zero.",
      "Rebuild it from the bottom block upward.",
      "You have five checking attempts. A paid review shows the tower again without clearing your answer.",
    ],
    note: "Signed-in players can show the tower again for 5 DT. Guests get one free review per challenge. Rewards are collected only when signed in.",
  },
};

const WALKTHROUGH_STEPS = [
  {
    eyebrow: "Welcome to my workshop",
    title: "This is the Think Lab!",
    text: "I'm Nova! These thinking machines turn clever ideas into Dream Tokens. The tokens you earn help power your adventures across DREAMSCAPE.",
  },
  {
    eyebrow: "Step 1 of 4",
    title: "Choose a thinking machine.",
    text: "Tap Colour Code, SET Finder or Tower Memory to highlight a machine and read about its challenge. Then press Enter Machine to open its puzzle console.",
  },
  {
    eyebrow: "Step 2 of 4",
    title: "Step inside the machine.",
    text: "Press Enter Machine to begin. Inside, tap the question mark for the rules or use Return to Lab when you want to choose another machine.",
  },
  {
    eyebrow: "Step 3 of 4",
    title: "Need some help?",
    text: "Signed-in players can spend 5 DT on clues or tower reviews. Guests get one free hint per challenge, but can't collect Dream Tokens.",
  },
  {
    eyebrow: "Power up!",
    title: "Let's generate Dream Tokens!",
    text: "Finish daily challenges to earn DT when signed in. Watch the reactor tally your rewards, then take your tokens into the rest of DREAMSCAPE!",
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
    "colour-code": {
      completed: 0,
      clues: 0,
      levels: {
        1: { completed: false, clues: 0, reward: 0 },
        2: { completed: false, clues: 0, reward: 0 },
        3: { completed: false, clues: 0, reward: 0 },
      },
    },
    "set-finder": {
      completed: 0,
      clues: 0,
      levels: {
        1: { completed: false, clues: 0, reward: 0 },
        2: { completed: false, clues: 0, reward: 0 },
        3: { completed: false, clues: 0, reward: 0 },
      },
    },
    "tower-memory": {
      completed: 0,
      clues: 0,
      levels: {
        1: { completed: false, clues: 0, reward: 0 },
        2: { completed: false, clues: 0, reward: 0 },
        3: { completed: false, clues: 0, reward: 0 },
      },
    },
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

function getSingaporeDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function createGuestStatus(activityDate = getSingaporeDateKey()): LabStatus {
  return {
    ...EMPTY_STATUS,
    activityDate,
    games: {
      "colour-code": {
        ...EMPTY_STATUS.games["colour-code"],
        levels: {
          1: { ...EMPTY_STATUS.games["colour-code"].levels[1] },
          2: { ...EMPTY_STATUS.games["colour-code"].levels[2] },
          3: { ...EMPTY_STATUS.games["colour-code"].levels[3] },
        },
      },
      "set-finder": {
        ...EMPTY_STATUS.games["set-finder"],
        levels: {
          1: { ...EMPTY_STATUS.games["set-finder"].levels[1] },
          2: { ...EMPTY_STATUS.games["set-finder"].levels[2] },
          3: { ...EMPTY_STATUS.games["set-finder"].levels[3] },
        },
      },
      "tower-memory": {
        ...EMPTY_STATUS.games["tower-memory"],
        levels: {
          1: { ...EMPTY_STATUS.games["tower-memory"].levels[1] },
          2: { ...EMPTY_STATUS.games["tower-memory"].levels[2] },
          3: { ...EMPTY_STATUS.games["tower-memory"].levels[3] },
        },
      },
    },
  };
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

function normaliseDailyLevelStatus(
  game:
    | {
        levels?: Record<
          string,
          {
            completed?: boolean;
            clues?: number;
            reward?: number;
          }
        >;
      }
    | undefined,
  level: DailyLevelNumber
): DailyLevelStatus {
  const levelPayload = game?.levels?.[String(level)];

  return {
    completed: Boolean(levelPayload?.completed ?? false),
    clues: Number(levelPayload?.clues ?? 0),
    reward: Number(levelPayload?.reward ?? 0),
  };
}

function normaliseStatus(payload: RpcStatusPayload | null): LabStatus {
  const games = payload?.games;
  const colourGame = games?.["colour-code"];
  const setGame = games?.["set-finder"];
  const towerGame = games?.["tower-memory"];

  return {
    activityDate: String(payload?.activity_date ?? ""),
    tokenBalance: Number(payload?.token_balance ?? 0),
    totalSessions: Number(payload?.total_sessions ?? 0),
    bestScore: Number(payload?.best_score ?? 0),
    games: {
      "colour-code": {
        completed: Number(colourGame?.completed ?? 0),
        clues: Number(colourGame?.clues ?? 0),
        levels: {
          1: normaliseDailyLevelStatus(colourGame, 1),
          2: normaliseDailyLevelStatus(colourGame, 2),
          3: normaliseDailyLevelStatus(colourGame, 3),
        },
      },
      "set-finder": {
        completed: Number(setGame?.completed ?? 0),
        clues: Number(setGame?.clues ?? 0),
        levels: {
          1: normaliseDailyLevelStatus(setGame, 1),
          2: normaliseDailyLevelStatus(setGame, 2),
          3: normaliseDailyLevelStatus(setGame, 3),
        },
      },
      "tower-memory": {
        completed: Number(towerGame?.completed ?? 0),
        clues: Number(towerGame?.clues ?? 0),
        levels: {
          1: normaliseDailyLevelStatus(towerGame, 1),
          2: normaliseDailyLevelStatus(towerGame, 2),
          3: normaliseDailyLevelStatus(towerGame, 3),
        },
      },
    },
  };
}

function formatDreamTokenAmount(value: number) {
  return `${Math.max(0, Math.round(value)).toLocaleString("en-US")} DT`;
}

function formatDreamGemAmount(value: number) {
  return `${Math.max(0, Math.round(value)).toLocaleString("en-US")} DG`;
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

export default function ThinkingSkillsLabPage() {
  const screenMode = useResponsiveMode();

  const [showHub, setShowHub] = useState(true);
  const [selectedGame, setSelectedGame] =
    useState<GameId>("colour-code");
  const [userId, setUserId] = useState<string | null>(null);
  // Current account for event handlers, without re-running the load effect.
  const userIdRef = useRef<string | null>(null);
  // Only the newest status load may update state.
  const statusLoadIdRef = useRef(0);
  const [status, setStatus] = useState<LabStatus>(EMPTY_STATUS);
  const [profileAssets, setProfileAssets] =
    useState<ProfileAssetBreakdown>(EMPTY_PROFILE_ASSETS);
  const [tokenTransactions, setTokenTransactions] = useState<
    DreamTokenTransaction[]
  >([]);
  const [profileAssetsLoading, setProfileAssetsLoading] = useState(true);
  const [profileAssetsOpen, setProfileAssetsOpen] = useState(false);
  const [dreamGemBalance, setDreamGemBalance] = useState(0);
  const [dreamGemsLoading, setDreamGemsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [reactorAward, setReactorAward] = useState<ConfirmedReactorAward | null>(null);
  const [reactorPulse, setReactorPulse] = useState(0);
  const reactorAwardSequence = useRef(0);
  const [gameVersion, setGameVersion] = useState(0);
  const [selectedColourLevel, setSelectedColourLevel] =
    useState<DailyLevelNumber>(1);
  const [selectedTowerLevel, setSelectedTowerLevel] =
    useState<DailyLevelNumber>(1);
  const [completionInView, setCompletionInView] = useState<GameId | null>(null);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const countdown = useMidnightCountdown(status.activityDate);
  const activeGame =
    GAME_DEFINITIONS.find((game) => game.id === selectedGame) ??
    GAME_DEFINITIONS[0];
  const activeStatus = status.games[selectedGame];
  // Display only confirmed, already-earned rewards; clues are not deducted here.
  // Guest practice stores zero earned DT and must not imply tokens were credited.
  const todayCompleted = (Object.values(status.games) as DailyGameStatus[]).reduce(
    (total, game) => total + game.completed,
    0
  );
  const todayGeneratedDT = (Object.values(status.games) as DailyGameStatus[]).reduce(
    (total, game) =>
      total + ([1, 2, 3] as DailyLevelNumber[]).reduce(
        (earned, level) => earned + (game.levels[level].completed ? game.levels[level].reward : 0),
        0
      ),
    0
  );
  const selectedFreeLevel =
    selectedGame === "colour-code"
      ? selectedColourLevel
      : selectedGame === "tower-memory"
      ? selectedTowerLevel
      : null;
  const currentQuestion =
    selectedFreeLevel ??
    (Math.min(DAILY_LIMIT, activeStatus.completed + 1) as DailyLevelNumber);
  const activeClues =
    selectedGame === "set-finder"
      ? activeStatus.clues
      : activeStatus.levels[currentQuestion].clues;
  const dailyComplete =
    activeStatus.completed >= DAILY_LIMIT && completionInView !== selectedGame;
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
    const loadId = ++statusLoadIdRef.current;
    const isStale = () => loadId !== statusLoadIdRef.current;

    setLoading(true);
    setProfileAssetsLoading(true);
    setDreamGemsLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (isStale()) return;

    if (userError || !user) {
      const today = getSingaporeDateKey();
      userIdRef.current = null;
      setUserId(null);
      setStatus((current) =>
        current.activityDate === today ? current : createGuestStatus(today)
      );
      setProfileAssets(EMPTY_PROFILE_ASSETS);
      setTokenTransactions([]);
      setDreamGemBalance(0);
      setDreamGemsLoading(false);
      setProfileAssetsLoading(false);
      setLoading(false);
      return;
    }

    userIdRef.current = user.id;
    setUserId(user.id);

    const [
      statusResult,
      profileResult,
      balanceResult,
      recentTransactionsResult,
      stocksResult,
      stockHoldingsResult,
      propertiesResult,
      propertyHoldingsResult,
    ] = await Promise.all([
      supabase.rpc("thinking_lab_get_status"),
      supabase
        .from("profiles")
        .select("dream_gem_balance")
        .eq("id", user.id)
        .maybeSingle(),
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

    if (isStale()) return;

    if (statusResult.error) {
      console.error(
        "Could not load Think Lab status:",
        statusResult.error
      );
      setNotice(formatSupabaseError(statusResult.error));
      setDreamGemsLoading(false);
      setProfileAssetsLoading(false);
      setLoading(false);
      return;
    }

    const nextStatus = normaliseStatus(
      (statusResult.data ?? null) as RpcStatusPayload | null
    );

    if (profileResult.error) {
      console.warn(
        "Could not load Dream Gem balance:",
        profileResult.error.message
      );
      setDreamGemBalance(0);
    } else {
      setDreamGemBalance(
        Math.max(0, Number(profileResult.data?.dream_gem_balance ?? 0))
      );
    }

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
    setDreamGemsLoading(false);
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

      // Never show a previous account's wallet after switching accounts.
      if (userIdRef.current !== accountUserId) return;

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

  // Runs once: loadStatus and refreshCashAndTransactions are stable callbacks.
  // userId is read from a ref so that setting it does not re-run this effect
  // (which previously reloaded the status and re-subscribed to auth events).
  useEffect(() => {
    loadStatus();

    // Reload only when the signed-in user changes (login, logout, switch).
    const stopAuthListener = onAuthUserChange(supabase, () => {
      loadStatus();
    });

    function refreshAllAssets() {
      loadStatus();
    }

    function refreshTokenAssets() {
      const currentUserId = userIdRef.current;
      if (currentUserId) {
        refreshCashAndTransactions(currentUserId);
      }
    }

    window.addEventListener("focus", refreshAllAssets);
    window.addEventListener("dream-tokens-updated", refreshTokenAssets);

    return () => {
      stopAuthListener();
      window.removeEventListener("focus", refreshAllAssets);
      window.removeEventListener(
        "dream-tokens-updated",
        refreshTokenAssets
      );
    };
  }, [loadStatus, refreshCashAndTransactions]);

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
    setCompletionInView(null);
    setGameVersion((current) => current + 1);
  }, [selectedGame]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice("");
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (!reactorAward) return;

    const awardId = reactorAward.id;
    const timer = window.setTimeout(() => {
      setReactorAward((current) => current?.id === awardId ? null : current);
    }, 4400);

    return () => window.clearTimeout(timer);
  }, [reactorAward]);

  // A previous learner's celebratory event must never remain after account changes.
  useEffect(() => {
    setReactorAward(null);
  }, [userId, status.activityDate]);

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
      const level = questionNumber as DailyLevelNumber;

      if (!userId) {
        const currentGame = status.games[gameId];
        const guestCluesUsed =
          gameId === "set-finder"
            ? currentGame.clues
            : currentGame.levels[level].clues;

        if (guestCluesUsed >= 1) {
          throw new Error("Your free Guest Hint has already been used for this challenge.");
        }

        const result: ClueResult = {
          clueCost: 0,
          cluesUsed: 1,
          tokenBalance: 0,
        };

        setStatus((current) => {
          const game = current.games[gameId];

          return {
            ...current,
            games: {
              ...current.games,
              [gameId]: {
                ...game,
                clues: gameId === "set-finder" ? 1 : game.clues,
                levels: {
                  ...game.levels,
                  [level]: {
                    ...game.levels[level],
                    clues: 1,
                  },
                },
              },
            },
          };
        });

        setNotice(
          gameId === "tower-memory"
            ? "Guest Review used — free for this challenge."
            : "Guest Hint revealed — free for this challenge."
        );
        return result;
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

      setStatus((current) => {
        const currentGame = current.games[gameId];

        return {
          ...current,
          tokenBalance: result.tokenBalance,
          games: {
            ...current.games,
            [gameId]: {
              ...currentGame,
              clues:
                gameId === "set-finder"
                  ? result.cluesUsed
                  : currentGame.clues,
              levels: {
                ...currentGame.levels,
                [level]: {
                  ...currentGame.levels[level],
                  clues: result.cluesUsed,
                },
              },
            },
          },
        };
      });

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
    [refreshCashAndTransactions, status.games, userId]
  );

  const completeQuestion = useCallback(
    async (
      gameId: GameId,
      questionNumber: number,
      score: number
    ) => {
      const level = questionNumber as DailyLevelNumber;

      if (!userId) {
        const currentGame = status.games[gameId];
        const completedCount = Math.min(
          DAILY_LIMIT,
          currentGame.completed + (currentGame.levels[level].completed ? 0 : 1)
        );
        const previewReward =
          gameId === "set-finder" ? 20 : rewardForDailyLevel(level);

        const result: CompletionResult = {
          reward: previewReward,
          tokenBalance: 0,
          completedCount,
        };

        setStatus((current) => {
          const game = current.games[gameId];

          return {
            ...current,
            totalSessions: current.totalSessions + 1,
            bestScore: Math.max(current.bestScore, Math.round(score)),
            games: {
              ...current.games,
              [gameId]: {
                ...game,
                completed: completedCount,
                clues: gameId === "set-finder" ? 0 : game.clues,
                levels: {
                  ...game.levels,
                  [level]: {
                    ...game.levels[level],
                    completed: true,
                    reward: 0,
                  },
                },
              },
            },
          };
        });

        setCompletionInView(gameId);
        setNotice(
          `Challenge complete. Log in to collect ${previewReward} DT and save your progress.`
        );
        return result;
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

      setStatus((current) => {
        const currentGame = current.games[gameId];

        return {
          ...current,
          tokenBalance: result.tokenBalance,
          totalSessions: current.totalSessions + 1,
          bestScore: Math.max(current.bestScore, Math.round(score)),
          games: {
            ...current.games,
            [gameId]: {
              ...currentGame,
              completed: result.completedCount,
              clues: gameId === "set-finder" ? 0 : currentGame.clues,
              levels: {
                ...currentGame.levels,
                [level]: {
                  ...currentGame.levels[level],
                  completed: true,
                  reward: result.reward,
                },
              },
            },
          },
        };
      });

      setCompletionInView(gameId);

      setProfileAssets((current) => ({
        ...current,
        cash: result.tokenBalance,
      }));

      // Celebrate only a positive reward confirmed by thinking_lab_complete_question.
      // Guest completions and zero/duplicate rewards never trigger a token animation.
      if (Number.isFinite(result.reward) && result.reward > 0) {
        reactorAwardSequence.current += 1;
        const machine = GAME_DEFINITIONS.find((item) => item.id === gameId);
        setReactorAward({
          id: reactorAwardSequence.current,
          machine: machine?.machineName ?? "Thinking machine",
          amount: result.reward,
          tokenBalance: result.tokenBalance,
        });
        setReactorPulse((current) => current + 1);
        setNotice("");
      } else {
        setNotice("Challenge complete. No additional Dream Tokens were awarded.");
      }

      await refreshCashAndTransactions(userId);
      window.dispatchEvent(new Event("dream-tokens-updated"));
      return result;
    },
    [refreshCashAndTransactions, status.games, userId]
  );

  function beginNextQuestion() {
    setNotice("");
    setCompletionInView(null);
    setGameVersion((current) => current + 1);
  }

  function continueAfterFreeLevel(
    gameId: "colour-code" | "tower-memory",
    completedLevel: DailyLevelNumber
  ) {
    const nextLevel = ([1, 2, 3] as DailyLevelNumber[]).find(
      (level) =>
        level !== completedLevel &&
        !status.games[gameId].levels[level].completed
    );

    if (gameId === "colour-code" && nextLevel) {
      setSelectedColourLevel(nextLevel);
    }

    if (gameId === "tower-memory" && nextLevel) {
      setSelectedTowerLevel(nextLevel);
    }

    beginNextQuestion();
  }

  return (
    <main className={`lab-page ${showHub ? "is-hub" : "is-playing"}`}>
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
          <Link href={NOVA_WORLD_HREF} className="round-button nav-back-button" aria-label="Back to Nova’s World">
            <span aria-hidden="true">←</span>
            <span className="round-button-label">Back</span>
          </Link>

          <button
            type="button"
            className="round-button guide-button"
            onClick={startWalkthrough}
            aria-label="Nova Guide: How Think Lab works"
          >
            <span className="guide-mark" aria-hidden="true">✦</span>
            <span className="guide-copy">
              <strong>Nova Guide</strong>
              <small>How Think Lab works</small>
            </span>
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
                <span className="assets-value-full">
                  {loading || profileAssetsLoading
                    ? "—"
                    : formatDreamTokenAmount(profileAssetsTotal)}
                </span>
                <span className="assets-value-compact">
                  {loading || profileAssetsLoading
                    ? "—"
                    : `${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(profileAssetsTotal)} DT`}
                </span>
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

          <div className="stat-pill dream-gem-pill" aria-label="Dream Gems balance">
            <span className="stat-label">Dream Gems</span>
            <strong>
              <span className="dream-gem-icon" aria-hidden="true">◆</span>
              {dreamGemsLoading ? "—" : formatDreamGemAmount(dreamGemBalance)}
            </strong>
          </div>

          <div
            className={`stat-pill today-pill ${
              walkthroughOpen && walkthroughStep === 4
                ? "walkthrough-highlight"
                : ""
            }`}
          >
            <span className="stat-label">Today</span>
            <strong>
              {loading
                ? "—"
                : `${(
                    Object.values(status.games) as DailyGameStatus[]
                  ).reduce(
                    (total, game) => total + game.completed,
                    0
                  )}/9`}
            </strong>
          </div>
        </div>
      </header>

      {showHub ? (
        <ThinkLabHub
          games={GAME_DEFINITIONS}
          progress={status.games}
          todayCompleted={todayCompleted}
          todayGeneratedDT={todayGeneratedDT}
          countdown={countdown}
          isGuest={!userId}
          loading={loading}
          guideHighlight={walkthroughOpen && walkthroughStep === 1}
          reactorPulseKey={reactorPulse}
          onActivate={(gameId) => {
            setSelectedGame(gameId);
            setShowHub(false);
          }}
        />
      ) : (
      <div className="lab-layout">
        <aside
          id="thinking-game-menu"
          className={`game-sidebar ${
            walkthroughOpen && walkthroughStep === 1
              ? "walkthrough-highlight"
              : ""
          }`}
        >
          <div className="sidebar-heading">
            <div>
              <p className="sidebar-eyebrow">Think Lab · Choose a machine</p>
              <h2>Thinking Machines</h2>
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
                    <span className="machine-subtitle">{game.machineName}</span>
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

            {[1, 2].map((slot) => (
              <div
                key={`coming-soon-${slot}`}
                className="game-menu-card coming-soon-card"
                aria-label="New thinking machine coming soon"
              >
                <span
                  className="game-menu-icon coming-soon-icon"
                  aria-hidden="true"
                >
                  ＋
                </span>

                <span className="game-menu-copy">
                  <strong>NEW MACHINE</strong>
                  <small>COMING SOON</small>
                  <span className="mini-progress coming-soon-progress" />
                </span>

                <span className="coming-soon-badge">SOON</span>
              </div>
            ))}
          </div>

          <div className="sidebar-note">
            <span aria-hidden="true">✦</span>
            <p>
              Every completed puzzle brings Nova closer to her next adventure.
              Sign in to earn DT. Clues cost 5 DT; guests receive a free hint.
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
                <button
                  type="button"
                  className="return-lab-button"
                  onClick={() => setShowHub(true)}
                  aria-label="Return to Think Lab"
                  title="Return to Think Lab"
                >
                  <span aria-hidden="true">←</span>
                  <span className="return-lab-label">Lab</span>
                </button>
              <span className="active-game-icon" aria-hidden="true">
                {activeGame.icon}
              </span>

              <div>
                <p className="game-skill">{activeGame.machineName} · {activeGame.skill}</p>
                <h2>{activeGame.title}</h2>
              </div>
            </div>

            <div className="stage-tools">
              <div
                className={`stage-progress ${
                  walkthroughOpen && walkthroughStep === 4
                    ? "walkthrough-highlight compact-highlight"
                    : ""
                }`}
              >
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

              <InstructionsButton
                gameId={selectedGame}
                highlighted={walkthroughOpen && walkthroughStep === 2}
              />
            </div>
          </div>

          {!loading && !userId && (
            <div
              style={{
                margin: "0 12px 8px",
                minHeight: "38px",
                padding: "8px 12px",
                borderRadius: "12px",
                border: "1px solid rgba(126,224,255,0.22)",
                background: "rgba(83,215,255,0.07)",
                color: "rgba(235,248,255,0.78)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontSize: "11px",
                fontWeight: 750,
                letterSpacing: "0.03em",
              }}
            >
              Guest Play · All games are open. Sign in to collect DT and save progress.
            </div>
          )}

          <div className="game-surface">
            {loading ? (
              <LoadingPanel />
            ) : dailyComplete ? (
              <DailyCompletePanel
                game={activeGame}
                countdown={countdown}
              />
            ) : (
              <>
                {selectedGame === "colour-code" && (
                  <ColourCodeGame
                    key={`${status.activityDate}-${gameVersion}-${selectedColourLevel}`}
                    userId={userId ?? "guest"}
                    isGuest={!userId}
                    activityDate={status.activityDate}
                    questionNumber={selectedColourLevel}
                    cluesUsed={activeClues}
                    levelStatuses={activeStatus.levels}
                    tokenBalance={profileAssets.cash}
                    onSelectLevel={setSelectedColourLevel}
                    onBuyClue={buyClue}
                    onComplete={completeQuestion}
                    onContinue={() =>
                      continueAfterFreeLevel(
                        "colour-code",
                        selectedColourLevel
                      )
                    }
                    walkthroughHighlightClue={
                      walkthroughOpen && walkthroughStep === 3
                    }
                  />
                )}

                {selectedGame === "set-finder" && (
                  <SetFinderGame
                    key={`${status.activityDate}-${gameVersion}`}
                    userId={userId ?? "guest"}
                    isGuest={!userId}
                    activityDate={status.activityDate}
                    questionNumber={currentQuestion}
                    cluesUsed={activeStatus.clues}
                    tokenBalance={profileAssets.cash}
                    onBuyClue={buyClue}
                    onComplete={completeQuestion}
                    onContinue={beginNextQuestion}
                    walkthroughHighlightClue={
                      walkthroughOpen && walkthroughStep === 3
                    }
                  />
                )}

                {selectedGame === "tower-memory" && (
                  <TowerMemoryGame
                    key={`${status.activityDate}-${gameVersion}-${selectedTowerLevel}`}
                    userId={userId ?? "guest"}
                    isGuest={!userId}
                    activityDate={status.activityDate}
                    questionNumber={selectedTowerLevel}
                    cluesUsed={activeClues}
                    levelStatuses={activeStatus.levels}
                    tokenBalance={profileAssets.cash}
                    onSelectLevel={setSelectedTowerLevel}
                    onBuyClue={buyClue}
                    onComplete={completeQuestion}
                    onContinue={() =>
                      continueAfterFreeLevel(
                        "tower-memory",
                        selectedTowerLevel
                      )
                    }
                    walkthroughHighlightClue={
                      walkthroughOpen && walkthroughStep === 3
                    }
                  />
                )}
              </>
            )}
          </div>

        </section>
      </div>
      )}

      {reactorAward && (
        <ReactorTransferCelebration key={reactorAward.id} award={reactorAward} />
      )}

      {notice && (
        <div className="save-message" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {notice}
        </div>
      )}

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
          color: white; text-decoration: none; font: inherit; font-size: 14px; font-weight: 800; cursor: pointer;
        }
        .guide-button { appearance: none; color: #d9f8ff; }
        .stat-pill { min-width: 100px; padding: 6px 13px; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10px; }
        .token-pill { min-width: 205px; }
        .dream-gem-pill {
          min-width: 145px;
          border-color: rgba(216,180,254,.42);
          background: linear-gradient(145deg, rgba(50,22,88,.76), rgba(13,8,35,.82));
        }
        .dream-gem-pill strong {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          color: #ead8ff;
        }
        .dream-gem-icon {
          color: #e9d5ff;
          filter: drop-shadow(0 0 7px rgba(192,132,252,.72));
        }
        .assets-button { width: 100%; appearance: none; color: white; font: inherit; text-align: left; cursor: pointer; }
        .assets-button strong { display: inline-flex; align-items: center; gap: 6px; }
        .assets-chevron { color: #8ee8ff; font-size: 12px; transition: transform 180ms ease; }
        .assets-chevron.is-open { transform: rotate(180deg); }
        .stat-label { color: rgba(232,245,255,.62); font-size: 10px; font-weight: 850; letter-spacing: .11em; text-transform: uppercase; }
        .stat-pill strong { color: #8ee8ff; font-size: 15px; white-space: nowrap; }

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
        .sidebar-eyebrow, .game-skill { margin: 0; color: #73dcff; font-size: 10px; font-weight: 850; letter-spacing: .16em; text-transform: uppercase; }
        .sidebar-heading h2 { margin: 4px 0 0; font-size: 22px; letter-spacing: -.03em; }
        .sidebar-reset { display: block; margin-top: 5px; color: rgba(235,247,255,.45); font-size: 10px; font-weight: 800; }
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
        .game-menu-copy strong { font-size: 14px; }
        .game-menu-copy small { color: rgba(235,246,255,.52); font-size: 10px; }
        .mini-progress { width: 100%; height: 3px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.07); }
        .mini-progress i { display: block; height: 100%; border-radius: inherit; background: var(--game-accent); }
        .game-menu-count { min-width: 32px; height: 26px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: rgba(255,255,255,.055); color: rgba(240,248,255,.68); font-size: 10px; font-weight: 850; }

        .coming-soon-card {
          cursor: default;
          opacity: .64;
          border-style: dashed;
          border-color: rgba(180,206,228,.16);
          background: rgba(255,255,255,.018);
        }
        .coming-soon-card:hover { transform: none; border-color: rgba(180,206,228,.24); }
        .coming-soon-icon {
          --game-accent: #89a2ba;
          color: rgba(220,235,248,.72);
          border-style: dashed;
        }
        .coming-soon-card .game-menu-copy strong {
          color: rgba(242,248,255,.72);
          letter-spacing: .05em;
        }
        .coming-soon-card .game-menu-copy small {
          color: rgba(207,225,240,.44);
          font-weight: 850;
          letter-spacing: .08em;
        }
        .coming-soon-progress { background: rgba(255,255,255,.04); }
        .coming-soon-badge {
          min-width: 38px;
          height: 24px;
          padding: 0 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(190,215,235,.12);
          background: rgba(255,255,255,.035);
          color: rgba(224,237,248,.48);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .sidebar-note { margin-top: auto; padding: 11px; display: grid; grid-template-columns: 18px 1fr; gap: 8px; border-radius: 14px; background: rgba(104,209,255,.07); color: rgba(231,246,255,.58); font-size: 11px; line-height: 1.5; }
        .sidebar-note span { color: #7ce1ff; } .sidebar-note p { margin: 0; }

        .game-stage { height: 100%; min-width: 0; border-radius: 24px; overflow: hidden; display: flex; flex-direction: column; position: relative; }
        .game-stage-heading {
          flex: 0 0 72px; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
          border-bottom: 1px solid rgba(126,208,255,.12);
          background: radial-gradient(circle at 0 0, color-mix(in srgb, var(--active-accent) 13%, transparent), transparent 46%), rgba(255,255,255,.018);
        }
        .game-title-row { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .active-game-icon { --game-accent: var(--active-accent); width: 44px; height: 44px; flex: 0 0 auto; font-size: 22px; }
        .game-stage-heading h2 { margin: 3px 0 0; font-size: clamp(22px, 2.4vw, 32px); letter-spacing: -.04em; white-space: nowrap; }
        .stage-tools { display: flex; align-items: center; gap: 10px; }
        .stage-progress { width: 150px; display: grid; gap: 5px; }
        .stage-progress span { color: rgba(235,246,255,.5); font-size: 10px; font-weight: 800; text-transform: uppercase; text-align: right; }
        .stage-progress span strong { color: white; }
        .stage-progress > div { height: 5px; overflow: hidden; border-radius: 999px; background: rgba(255,255,255,.07); }
        .stage-progress i { display: block; height: 100%; border-radius: inherit; background: var(--active-accent); }
        .game-surface { flex: 1 1 auto; min-height: 0; padding: 8px; overflow: hidden; }
        .walkthrough-highlight {
          position: relative;
          z-index: 120;
          border-color: rgba(120,226,255,.78) !important;
          box-shadow:
            0 0 0 2px rgba(120,226,255,.2),
            0 0 34px rgba(83,215,255,.38),
            inset 0 0 26px rgba(83,215,255,.08) !important;
          filter: brightness(1.18);
          animation: guideGlow 1.5s ease-in-out infinite alternate;
        }
        .compact-highlight {
          padding: 8px 10px;
          border: 1px solid rgba(120,226,255,.55);
          border-radius: 12px;
          background: rgba(83,215,255,.08);
        }
        @keyframes guideGlow {
          from {
            box-shadow:
              0 0 0 2px rgba(120,226,255,.16),
              0 0 24px rgba(83,215,255,.25),
              inset 0 0 18px rgba(83,215,255,.05);
          }
          to {
            box-shadow:
              0 0 0 2px rgba(120,226,255,.26),
              0 0 42px rgba(83,215,255,.48),
              inset 0 0 30px rgba(83,215,255,.1);
          }
        }

        .save-message {
          position: fixed;
          top: 78px;
          left: 50%;
          z-index: 160;
          width: max-content;
          max-width: min(520px, calc(100vw - 28px));
          transform: translateX(-50%);
          padding: 12px 17px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 14px;
          border: 1px solid rgba(111,231,177,.38);
          background: rgba(10,58,44,.97);
          color: #c8ffe2;
          font-size: 13px;
          font-weight: 800;
          text-align: center;
          box-shadow: 0 18px 44px rgba(0,0,0,.42), 0 0 24px rgba(111,231,177,.12);
          animation: noticeIn 180ms ease-out;
        }
        @keyframes noticeIn {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }


        /* Phase 2A: easy return from any active machine to the laboratory hub. */
        .return-lab-button {
          display: inline-flex;
          flex: 0 0 auto;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 38px;
          padding: 0 11px;
          border: 1px solid rgba(128,220,255,.43);
          border-radius: 12px;
          background: rgba(24,77,113,.34);
          color: #dff8ff;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
        }
        .return-lab-button:hover,
        .return-lab-button:focus-visible {
          border-color: rgba(128,220,255,.86);
          background: rgba(47,124,166,.43);
        }
        .return-lab-button:focus-visible { outline: 2px solid #8ee8ff; outline-offset: 2px; }
        @media (max-width: 720px) {
          .return-lab-button {
            width: 30px;
            height: 33px;
            padding: 0;
            border-radius: 9px;
            font-size: 18px;
          }
          .return-lab-label { display: none; }
        }

        @media (max-width: 1120px) {
          .lab-layout { grid-template-columns: 190px minmax(0,1fr); }
          .game-sidebar { padding: 10px; }
          .game-menu-card { min-height: 68px; grid-template-columns: 38px 1fr; }
          .game-menu-count { position: absolute; right: 7px; top: 6px; min-width: 26px; height: 22px; }
          .coming-soon-badge { position: absolute; right: 7px; top: 6px; min-width: 34px; height: 22px; }
          .game-menu-icon { width: 38px; height: 38px; }
          .sidebar-note { font-size: 9px; }
        }

        @media (max-width: 720px) {
          .lab-page { padding-top: 58px; }
          .topbar { height: 58px; padding: 8px 7px; gap: 5px; }
          .topbar-left, .topbar-stats { gap: 5px; }
          .round-button { width: 40px; min-height: 40px; padding: 0; }
          .round-button-label { display: none; }
          .stat-pill { min-width: 48px; min-height: 40px; padding: 5px 6px; grid-template-columns: 1fr; gap: 0; text-align: center; }
          .token-pill { min-width: 104px; grid-template-columns: 1fr; }
          .token-pill .stat-label { display: none; }
          .dream-gem-pill { min-width: 68px; padding-left: 6px; padding-right: 6px; }
          .dream-gem-pill .stat-label { display: none; }
          .dream-gem-pill strong { justify-content: center; gap: 3px; font-size: 10px; }
          .dream-gem-icon { font-size: 9px; }
          .today-pill { min-width: 42px; }
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
          .game-menu-count { right: 1px; top: 1px; min-width: 22px; height: 19px; padding: 0 4px; font-size: 8px; background: rgba(3,11,24,.95); }
          .coming-soon-badge { display: none; }

          .game-stage { border-radius: 16px; }
          .game-stage-heading { flex-basis: 56px; padding: 7px 8px; gap: 6px; }
          .active-game-icon { width: 36px; height: 36px; border-radius: 10px; font-size: 18px; }
          .game-skill { display: none; }
          .game-stage-heading h2 { margin: 0; font-size: clamp(14px, 4.4vw, 19px); }
          .stage-tools { gap: 6px; }
          .stage-progress { width: 62px; }
          .stage-progress span { font-size: 7px; }
          .game-surface { padding: 5px; }
          .save-message { top: 66px; font-size: 12px; padding: 10px 13px; }
        }

        @media (max-width: 390px) {
          .topbar { padding-left: 5px; padding-right: 5px; }
          .topbar-left, .topbar-stats { gap: 3px; }
          .token-pill { min-width: 90px; }
          .dream-gem-pill { min-width: 60px; }
          .today-pill { min-width: 38px; }
          .stat-pill { min-width: 42px; padding-left: 4px; padding-right: 4px; }
          .lab-layout { grid-template-columns: 54px minmax(0,1fr); }
          .game-sidebar { padding: 4px; }
          .game-menu-icon { width: 39px; height: 39px; }
          .stage-progress { width: 54px; }
        }
        /* NOVA Think Lab: immersive reactor scene + machine consoles.
           These are presentation styles only: game/reward RPC logic is untouched. */
        .lab-background {
          background-image:
            linear-gradient(180deg, rgba(1,5,20,.14), rgba(2,7,21,.36) 42%, rgba(2,7,21,.55)),
            url("/nova/thinking-skills/think-lab-landscape.webp");
          background-position: center center;
          background-size: cover;
          background-repeat: no-repeat;
        }
        .lab-glow { opacity: .12; }
        .lab-grid { opacity: .025; }

        .game-sidebar, .game-stage {
          border-color: rgba(131,222,255,.30);
          background: linear-gradient(145deg, rgba(4,15,35,.9), rgba(3,9,26,.87));
          box-shadow: 0 22px 65px rgba(0,0,0,.40), inset 0 1px 0 rgba(196,238,255,.07);
        }
        .game-menu-card {
          border-color: color-mix(in srgb, var(--game-accent) 28%, rgba(122,185,241,.16));
          background: linear-gradient(145deg, rgba(21,39,70,.72), rgba(7,16,35,.75));
          box-shadow: inset 0 1px 0 rgba(255,255,255,.07);
        }
        .game-menu-card:hover {
          box-shadow: inset 0 1px 0 rgba(255,255,255,.13), 0 0 22px color-mix(in srgb, var(--game-accent) 20%, transparent);
        }
        .game-menu-card.is-selected {
          box-shadow: inset 3px 0 0 var(--game-accent), 0 0 23px color-mix(in srgb, var(--game-accent) 21%, transparent);
        }
        .game-menu-icon {
          box-shadow: 0 0 14px color-mix(in srgb, var(--game-accent) 23%, transparent);
        }
        .machine-subtitle {
          color: var(--game-accent); font-size: 9px; font-weight: 850;
          text-transform: uppercase; letter-spacing: .04em;
        }
        .game-stage-heading {
          background: linear-gradient(100deg, color-mix(in srgb, var(--active-accent) 14%, rgba(13,35,65,.8)), rgba(3,11,29,.85));
        }
        .coming-soon-card { opacity: .60; box-shadow: none; }
        .sidebar-note {
          border: 1px solid rgba(114,213,255,.15);
          background: rgba(21,67,107,.25);
        }

        @media (orientation: portrait) {
          .lab-background {
            background-image:
              linear-gradient(180deg, rgba(1,5,20,.16), rgba(2,7,21,.42) 43%, rgba(2,7,21,.60)),
              url("/nova/thinking-skills/think-lab-portrait.webp");
            background-position: center top;
          }
        }
        @media (max-width: 720px) {
          .machine-subtitle { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .game-menu-card { transition: none; }
        }
        /* Phase 4A: Knowledge Arena-style navigation with full-screen hub sizing. */
        .lab-page.is-hub { --lab-header-height: 66px; padding-top: var(--lab-header-height); }
        .topbar { gap: 8px; }
        .topbar-left { gap: 8px; flex: 0 0 auto; }
        .nav-back-button { min-height: 41px; padding: 0 13px; gap: 7px; background: rgba(6,15,34,.88); }
        .guide-button {
          min-height: 44px; padding: 4px 12px 4px 6px; border-color:rgba(122,144,235,.33);
          border-radius: 999px; background:linear-gradient(120deg,rgba(22,42,81,.94),rgba(19,26,65,.92));
          display: inline-flex; align-items:center; gap:7px;
        }
        .guide-mark {
          display:inline-grid;place-items:center; flex:0 0 auto;
          width:32px;height:32px;border-radius:50%;
          border:1px solid rgba(114,210,255,.46);
          background:rgba(42,137,195,.29);color:#99eeff;font-size:16px;
          box-shadow:inset 0 0 10px rgba(89,204,255,.17);
        }
        .guide-copy { display:grid;gap:1px;text-align:left;white-space:nowrap; }
        .guide-copy strong { font-size:12px;line-height:1.2;color:#f1faff; }
        .guide-copy small { font-size:9px;line-height:1.1;color:#afc5e2; }
        .assets-value-compact { display:none; }
        @media (max-width:1120px) {
          .topbar { padding-inline:10px; }
          .topbar-stats { gap:5px; }
          .token-pill { min-width:0; }
          .dream-gem-pill { min-width:0; }
          .stat-pill { padding-inline:9px;gap:5px; }
          .stat-label { font-size:8px; }
          .stat-pill strong { font-size:12px; }
        }
        @media (max-width:720px) {
          .lab-page.is-hub { --lab-header-height: 58px; }
          .topbar { padding:5px 7px; }
          .nav-back-button { width:auto;min-height:37px;padding:0 10px;font-size:12px; }
          .nav-back-button .round-button-label { display:inline; }
          .guide-button { width:auto;min-height:39px;padding:3px 7px 3px 4px;gap:5px; }
          .guide-mark { width:28px;height:28px;font-size:13px; }
          .guide-copy strong { font-size:10px; }
          .guide-copy small { font-size:8px; }
          .stat-pill { min-width:0;min-height:36px;padding:4px 7px; }
          .stat-pill strong { font-size:10px; }
          .token-pill { min-width:0; }
          .dream-gem-pill { min-width:0; }
          .today-pill { min-width:0; }
          .assets-value-full { display:none; }
          .assets-value-compact { display:inline; }
          .assets-chevron { font-size:8px; }
        }
        @media (max-width:580px) and (orientation:portrait) {
          .lab-page.is-hub { --lab-header-height: 88px; }
          .lab-page.is-hub .topbar {
            height:88px;
            display:grid;
            grid-template-columns:1fr;
            grid-template-rows:38px 31px;
            align-content:center;
            gap:3px;
            padding:5px 8px;
          }
          .lab-page.is-hub .topbar-left { justify-content:flex-start; }
          .lab-page.is-hub .topbar-stats { justify-content:flex-end;gap:5px; }
          .lab-page.is-hub .stat-pill { min-height:27px;padding:3px 9px;grid-template-columns:auto auto; }
          .lab-page.is-hub .stat-pill strong { font-size:11px; }
          .lab-page.is-hub .today-pill .stat-label { display:none; }
          .lab-page.is-hub .assets-dropdown { top:32px;max-height:calc(100dvh - 96px); }
          .lab-page.is-hub .assets-dropdown-scroll { max-height:calc(100dvh - 173px); }
        }
        @media (max-width:390px) {
          .nav-back-button { padding:0 8px; }
          .guide-button { padding-right:5px; }
          .guide-copy small { font-size:7px; }
          .topbar-stats { gap:3px; }
        }
      `}</style>
    </main>
  );
}


function InstructionsButton({
  gameId,
  highlighted = false,
}: {
  gameId: GameId;
  highlighted?: boolean;
}) {
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
      className={`instructions-wrap ${highlighted ? "is-highlighted" : ""}`}
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
        .instructions-wrap.is-highlighted {
          z-index: 125;
          filter: brightness(1.2);
        }
        .instructions-wrap.is-highlighted .instructions-button {
          border-color: rgba(126, 224, 255, 0.92);
          background: rgba(83, 215, 255, 0.16);
          box-shadow:
            0 0 0 4px rgba(83, 215, 255, 0.12),
            0 0 30px rgba(83, 215, 255, 0.48);
          animation: instructionGlow 1.4s ease-in-out infinite alternate;
        }
        @keyframes instructionGlow {
          from {
            box-shadow:
              0 0 0 3px rgba(83, 215, 255, 0.1),
              0 0 20px rgba(83, 215, 255, 0.3);
          }
          to {
            box-shadow:
              0 0 0 5px rgba(83, 215, 255, 0.17),
              0 0 36px rgba(83, 215, 255, 0.58);
          }
        }
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
          top: calc(100% + 10px);
          right: 0;
          width: min(470px, calc(100vw - 90px));
          padding: 22px 24px;
          border-radius: 21px;
          border: 1px solid rgba(126, 224, 255, 0.34);
          background: linear-gradient(145deg, rgba(3, 20, 39, 0.995), rgba(3, 10, 25, 0.995));
          box-shadow: 0 28px 72px rgba(0, 0, 0, 0.62), 0 0 30px rgba(83, 215, 255, 0.1);
          color: white;
        }
        .instructions-popup > p {
          margin: 0;
          color: #8ee8ff;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .instructions-popup h3 {
          margin: 8px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: 31px;
          line-height: 1.12;
          font-weight: 500;
        }
        .instructions-popup ol {
          margin: 17px 0 0;
          padding-left: 24px;
          display: grid;
          gap: 12px;
          color: rgba(241, 249, 255, 0.82);
          font-size: 17px;
          line-height: 1.58;
        }
        .instructions-popup > div {
          margin-top: 17px;
          padding: 13px 15px;
          border-radius: 14px;
          background: rgba(255, 211, 110, 0.09);
          color: #ffe39a;
          font-size: 15px;
          line-height: 1.5;
        }
        @media (max-width: 720px) {
          .instructions-button { width: 34px; height: 34px; font-size: 16px; }
          .instructions-popup {
            position: fixed;
            top: 64px;
            right: 7px;
            width: min(390px, calc(100vw - 76px));
            max-height: calc(100dvh - 78px);
            overflow-y: auto;
            padding: 18px;
          }
          .instructions-popup h3 { font-size: 25px; }
          .instructions-popup ol { font-size: 14px; line-height: 1.52; gap: 10px; }
          .instructions-popup > div { font-size: 13px; }
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
      <section
        className="walkthrough"
        role="dialog"
        aria-modal="false"
        aria-label="Nova guided walkthrough"
      >
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
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }
        .walkthrough-copy h2 {
          margin: 7px 34px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: ${isMobile ? "26px" : "35px"};
          line-height: 1.08;
          font-weight: 500;
        }
        .walkthrough-copy > span {
          display: block;
          margin-top: 12px;
          color: rgba(255, 255, 255, 0.74);
          font-size: ${isMobile ? "14px" : "16px"};
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
          font-size: 12px;
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







