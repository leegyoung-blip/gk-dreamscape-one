"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import DailyActivityReferralPrompt, {
  canOfferDailyReferralPrompt,
} from "@/components/DailyActivityReferralPrompt";

type DailyPuzzle = {
  id: string;
  date_sg: string;
  answer: string;
  base_clue: string;
  clue_text: string;
};

type DailyPuzzleAttempt = {
  guess: string;
  feedback: ("correct" | "present" | "absent")[];
};

type KeyboardLetterState = "correct" | "present" | "absent";

type ActivityCardData = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  href?: string;
  active?: boolean;
  icon: string;
};

const DAILY_CODE_MAX_ATTEMPTS = 6;
const DAILY_CODE_REWARDS = [60, 50, 40, 30, 20, 10] as const;
const DAILY_CODE_CLUE_COST = 5;
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];
const WORD_LIST_URL = "/milo-world/activities/five-letter-words.json";

const activities: ActivityCardData[] = [
  {
    title: "Mastery Code",
    eyebrow: "Daily Challenge",
    description: "Solve today’s five-letter code. Logged-in players can earn up to 60 DT.",
    image: "/milo-world/activities/daily-puzzle.png",
    active: true,
    icon: "◇",
  },
  {
    title: "Who’s Bluffing",
    eyebrow: "Party Game",
    description: "Invent fake answers and identify the truth.",
    image: "/milo-world/activities/whos-bluffing.png",
    href: "/milo-world/whos-bluffing",
    icon: "✦",
  },
];

function useViewport() {
  const [viewport, setViewport] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    function updateViewport() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }

    updateViewport();
    window.addEventListener("resize", updateViewport);

    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  return viewport;
}

function getSingaporeDateString() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value || "";
  const month = parts.find((part) => part.type === "month")?.value || "";
  const day = parts.find((part) => part.type === "day")?.value || "";

  return `${year}-${month}-${day}`;
}

function getDailyCodeReward(attemptNumber: number) {
  return DAILY_CODE_REWARDS[attemptNumber - 1] ?? 10;
}

function buildPuzzleFeedback(
  guess: string,
  answer: string,
): DailyPuzzleAttempt["feedback"] {
  const guessLetters = guess.toUpperCase().split("");
  const answerLetters = answer.toUpperCase().split("");
  const feedback: DailyPuzzleAttempt["feedback"] = [
    "absent",
    "absent",
    "absent",
    "absent",
    "absent",
  ];
  const used = [false, false, false, false, false];

  guessLetters.forEach((letter, index) => {
    if (letter === answerLetters[index]) {
      feedback[index] = "correct";
      used[index] = true;
    }
  });

  guessLetters.forEach((letter, index) => {
    if (feedback[index] === "correct") return;

    const foundIndex = answerLetters.findIndex(
      (answerLetter, answerIndex) =>
        answerLetter === letter && !used[answerIndex],
    );

    if (foundIndex >= 0) {
      feedback[index] = "present";
      used[foundIndex] = true;
    }
  });

  return feedback;
}

function getKeyboardLetterStates(attempts: DailyPuzzleAttempt[]) {
  const states: Record<string, KeyboardLetterState> = {};
  const priority: Record<KeyboardLetterState, number> = {
    absent: 1,
    present: 2,
    correct: 3,
  };

  attempts.forEach((attempt) => {
    attempt.guess.split("").forEach((letter, index) => {
      const state = attempt.feedback[index];
      const currentState = states[letter];

      if (!currentState || priority[state] > priority[currentState]) {
        states[letter] = state;
      }
    });
  });

  return states;
}

function ActivityMenuCard({
  activity,
  drawer,
  dense,
  onNavigate,
}: {
  activity: ActivityCardData;
  drawer: boolean;
  dense: boolean;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: CSSProperties = {
    position: "relative",
    minWidth: 0,
    minHeight: drawer ? "92px" : dense ? "0" : "0",
    height: drawer ? "92px" : "100%",
    overflow: "hidden",
    borderRadius: drawer ? "16px" : "20px",
    border: activity.active
      ? "1px solid rgba(126,232,255,0.7)"
      : hovered
        ? "1px solid rgba(126,232,255,0.5)"
        : "1px solid rgba(126,232,255,0.18)",
    background: activity.active
      ? "linear-gradient(145deg, rgba(17,65,93,0.88), rgba(3,13,29,0.94))"
      : "linear-gradient(145deg, rgba(8,26,48,0.78), rgba(3,10,24,0.9))",
    color: "white",
    textDecoration: "none",
    fontFamily: "inherit",
    cursor: activity.active ? "default" : "pointer",
    boxShadow: activity.active
      ? "0 0 28px rgba(83,215,255,0.13)"
      : hovered
        ? "0 18px 38px rgba(0,0,0,0.34)"
        : "0 12px 28px rgba(0,0,0,0.2)",
    transform: !activity.active && hovered ? "translateY(-3px)" : "none",
    transition:
      "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
  };

  const content = (
    <>
      <img
        src={activity.image}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: hovered || activity.active ? 0.34 : 0.22,
          transform: hovered ? "scale(1.04)" : "scale(1)",
          transition: "opacity 180ms ease, transform 240ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: drawer
            ? "linear-gradient(90deg, rgba(2,10,24,0.94), rgba(2,10,24,0.6))"
            : "linear-gradient(180deg, rgba(2,10,24,0.1), rgba(2,10,24,0.96) 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          minHeight: 0,
          padding: drawer ? "14px" : dense ? "14px" : "17px",
          display: "flex",
          flexDirection: drawer ? "row" : "column",
          alignItems: drawer ? "center" : "stretch",
          justifyContent: drawer ? "flex-start" : "flex-end",
          gap: drawer ? "12px" : 0,
        }}
      >
        <span
          style={{
            width: drawer ? "42px" : "38px",
            height: drawer ? "42px" : "38px",
            borderRadius: "12px",
            border: "1px solid rgba(126,232,255,0.32)",
            background: "rgba(83,215,255,0.1)",
            color: "#9bf5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "17px",
            marginBottom: drawer ? 0 : "auto",
          }}
        >
          {activity.icon}
        </span>

        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              color: "#8ee8ff",
              fontSize: drawer ? "8px" : "9px",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {activity.eyebrow}
          </span>

          <strong
            style={{
              display: "block",
              marginTop: drawer ? "4px" : "7px",
              fontSize: drawer ? "16px" : dense ? "18px" : "21px",
              lineHeight: 1.05,
            }}
          >
            {activity.title}
          </strong>

          {!drawer && !dense && (
            <span
              style={{
                display: "block",
                marginTop: "7px",
                color: "rgba(255,255,255,0.57)",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              {activity.description}
            </span>
          )}
        </span>

        {!activity.active && (
          <span
            style={{
              marginLeft: drawer ? "auto" : 0,
              marginTop: drawer ? 0 : "12px",
              color: "#8ee8ff",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            →
          </span>
        )}
      </div>
    </>
  );

  if (activity.href) {
    return (
      <Link
        href={activity.href}
        onClick={onNavigate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={cardStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <div style={cardStyle} aria-current="page">
      {content}
    </div>
  );
}

function ActivityMenu({
  drawer,
  dense,
  onNavigate,
}: {
  drawer: boolean;
  dense: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        display: "grid",
        gridTemplateRows: drawer
          ? "repeat(2, 92px)"
          : "repeat(2, minmax(0, 1fr))",
        gap: drawer ? "12px" : dense ? "8px" : "11px",
      }}
    >
      {activities.map((activity) => (
        <ActivityMenuCard
          key={activity.title}
          activity={activity}
          drawer={drawer}
          dense={dense}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function Keyboard({
  attempts,
  onLetter,
  onDelete,
  mobile,
  dense,
  wide,
}: {
  attempts: DailyPuzzleAttempt[];
  onLetter: (letter: string) => void;
  onDelete: () => void;
  mobile: boolean;
  dense: boolean;
  wide: boolean;
}) {
  const letterStates = useMemo(
    () => getKeyboardLetterStates(attempts),
    [attempts],
  );

  const keyHeight = mobile
    ? dense
      ? 36
      : 44
    : dense
      ? 38
      : wide
        ? 52
        : 46;

  function getKeyColours(letter: string): CSSProperties {
    const state = letterStates[letter];

    if (state === "correct") {
      return {
        background: "#3f9860",
        border: "1px solid rgba(106,255,155,0.54)",
        color: "white",
      };
    }

    if (state === "present") {
      return {
        background: "#b68c2d",
        border: "1px solid rgba(255,214,95,0.5)",
        color: "white",
      };
    }

    if (state === "absent") {
      return {
        background: "#394353",
        border: "1px solid rgba(255,255,255,0.08)",
        color: "rgba(255,255,255,0.55)",
      };
    }

    return {
      background: "rgba(255,255,255,0.07)",
      border: "1px solid rgba(126,232,255,0.14)",
      color: "rgba(255,255,255,0.9)",
    };
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: wide ? "820px" : "690px",
        margin: "0 auto",
        display: "grid",
        gap: mobile ? "5px" : "8px",
      }}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={row}
          style={{
            width: "100%",
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: mobile ? "4px" : wide ? "7px" : "5px",
          }}
        >
          {row.split("").map((letter) => (
            <button
              key={letter}
              type="button"
              onClick={() => onLetter(letter)}
              style={{
                minWidth: 0,
                height: `${keyHeight}px`,
                flex: "1 1 0",
                borderRadius: mobile ? "9px" : "10px",
                fontFamily: "inherit",
                fontSize: mobile ? "12px" : wide ? "16px" : "14px",
                fontWeight: 900,
                cursor: "pointer",
                boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)",
                ...getKeyColours(letter),
              }}
            >
              {letter}
            </button>
          ))}

          {rowIndex === 2 && (
            <button
              type="button"
              onClick={onDelete}
              style={{
                minWidth: 0,
                height: `${keyHeight}px`,
                flex: "1.55 1 0",
                borderRadius: mobile ? "9px" : "10px",
                border: "1px solid rgba(126,232,255,0.14)",
                background: "rgba(255,255,255,0.09)",
                color: "white",
                fontFamily: "inherit",
                fontSize: mobile ? "10px" : wide ? "12px" : "10px",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              DEL
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: "12px",
        border: "1px solid rgba(126,232,255,0.1)",
        background: "rgba(255,255,255,0.025)",
        padding: "8px",
        textAlign: "center",
      }}
    >
      <span
        style={{
          display: "block",
          color: "rgba(255,255,255,0.4)",
          fontSize: "8px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <strong
        style={{
          display: "block",
          marginTop: "3px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: value === "Solved" ? "#9fffd2" : "white",
          fontSize: "11px",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

export default function ActivityLabPage() {
  const { width, height } = useViewport();
  const mobile = width <= 760;
  const wide = width >= 1320;
  const compact = width < 1180;
  const dense = height < 790;

  const [menuOpen, setMenuOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [dreamTokens, setDreamTokens] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [attempts, setAttempts] = useState<DailyPuzzleAttempt[]>([]);
  const [solvedToday, setSolvedToday] = useState(false);
  const [clueBought, setClueBought] = useState(false);
  const [guestHintUsed, setGuestHintUsed] = useState(false);
  const [buyingClue, setBuyingClue] = useState(false);
  const [letterBought, setLetterBought] = useState(false);
  const [revealedLetter, setRevealedLetter] = useState("");
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const [puzzleMessage, setPuzzleMessage] = useState("");
  const [showDailyReferralPrompt, setShowDailyReferralPrompt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [validWords, setValidWords] = useState<Set<string> | null>(null);
  const [wordListLoading, setWordListLoading] = useState(true);

  const remainingAttempts = Math.max(
    0,
    DAILY_CODE_MAX_ATTEMPTS - attempts.length,
  );

  const nextReward =
    attempts.length < DAILY_CODE_MAX_ATTEMPTS
      ? getDailyCodeReward(attempts.length + 1)
      : 0;

  const cellSize = mobile
    ? dense
      ? 38
      : 48
    : dense
      ? 48
      : wide
        ? 66
        : compact
          ? 52
          : 58;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWordList() {
      try {
        setWordListLoading(true);
        const response = await fetch(WORD_LIST_URL, { cache: "force-cache" });

        if (!response.ok) {
          throw new Error(`Word list request failed: ${response.status}`);
        }

        const words = (await response.json()) as unknown;

        if (!Array.isArray(words)) {
          throw new Error("Word list is not an array.");
        }

        const cleanWords = words
          .filter((word): word is string => typeof word === "string")
          .map((word) => word.trim().toLowerCase())
          .filter((word) => /^[a-z]{5}$/.test(word));

        if (!cancelled) {
          setValidWords(new Set(cleanWords));
        }
      } catch (error) {
        console.warn("Could not load Mastery Code word list:", error);

        if (!cancelled) {
          setValidWords(null);
          setPuzzleMessage(
            "The valid-word list could not be loaded. Check the five-letter-words.json file.",
          );
        }
      } finally {
        if (!cancelled) setWordListLoading(false);
      }
    }

    loadWordList();

    return () => {
      cancelled = true;
    };
  }, []);

  async function refreshTokenBalance(activeUserId: string) {
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount")
      .eq("user_id", activeUserId)
      .eq("token_kind", "virtual");

    if (error) {
      console.warn("Could not load Dreamscape Tokens:", error.message);
      return;
    }

    const total =
      data?.reduce((sum, row) => sum + Number(row.amount || 0), 0) || 0;

    setDreamTokens(total);
  }

  useEffect(() => {
    let mounted = true;

    async function loadActivityLab() {
      setLoading(true);
      setPuzzleMessage("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUserId(user?.id ?? "");
      setUserEmail(user?.email ?? "");
      setDreamTokens(0);
      setCompleted(0);
      setAttempts([]);
      setSolvedToday(false);
      setClueBought(false);
      setGuestHintUsed(false);
      setLetterBought(false);
      setRevealedLetter("");
      setPuzzleAnswer("");

      if (user) {
        await refreshTokenBalance(user.id);
      }

      const today = getSingaporeDateString();

      const { data: puzzleData, error: puzzleError } = await supabase
        .from("milo_daily_puzzles")
        .select("id,date_sg,answer,base_clue,clue_text")
        .eq("date_sg", today)
        .eq("is_active", true)
        .single();

      if (!mounted) return;

      if (puzzleError || !puzzleData) {
        console.warn("Could not load today's Mastery Code:", puzzleError?.message);
        setPuzzle(null);
        setPuzzleMessage(
          puzzleError?.message
            ? "Today’s Mastery Code could not be loaded."
            : "No Mastery Code has been published for today yet.",
        );
        setLoading(false);
        return;
      }

      const typedPuzzle = puzzleData as DailyPuzzle;
      setPuzzle(typedPuzzle);

      if (!user) {
        setPuzzleMessage(
          "Guest mode: play the full puzzle for free. Log in before a future run to save progress and collect DT.",
        );
        setLoading(false);
        return;
      }

      const { data: progressData, error: progressError } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("attempts,solved,clue_bought,letter_bought,revealed_letter")
        .eq("user_id", user.id)
        .eq("puzzle_id", typedPuzzle.id)
        .maybeSingle();

      if (!mounted) return;

      if (progressError) {
        console.warn(
          "Could not load Mastery Code progress:",
          progressError.message,
        );
      }

      if (progressData) {
        setAttempts((progressData.attempts || []) as DailyPuzzleAttempt[]);
        setSolvedToday(Boolean(progressData.solved));
        setClueBought(Boolean(progressData.clue_bought));
        setLetterBought(Boolean(progressData.letter_bought));
        setRevealedLetter(String(progressData.revealed_letter || ""));
      }

      const { count } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("solved", true);

      if (!mounted) return;

      setCompleted(count || 0);
      setLoading(false);
    }

    loadActivityLab();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadActivityLab();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function addTokenTransaction(amount: number, description: string) {
    if (!userId) return false;

    const { error } = await supabase.from("dream_token_transactions").insert({
      user_id: userId,
      amount,
      token_kind: "virtual",
      type: amount < 0 ? "spend" : "earn",
      title: description,
    });

    if (error) {
      console.warn("Token transaction failed:", error.message);
      setPuzzleMessage("The token transaction could not be completed.");
      return false;
    }

    await refreshTokenBalance(userId);
    window.dispatchEvent(new Event("dream-tokens-updated"));
    return true;
  }

  async function savePuzzleProgress({
    nextAttempts,
    solved,
    nextClueBought = clueBought,
    nextLetterBought = letterBought,
    nextRevealedLetter = revealedLetter,
  }: {
    nextAttempts: DailyPuzzleAttempt[];
    solved: boolean;
    nextClueBought?: boolean;
    nextLetterBought?: boolean;
    nextRevealedLetter?: string;
  }) {
    if (!puzzle || !userId) return false;

    const payload = {
      user_id: userId,
      puzzle_id: puzzle.id,
      puzzle_date_sg: puzzle.date_sg,
      attempts: nextAttempts,
      solved,
      clue_bought: nextClueBought,
      letter_bought: nextLetterBought,
      revealed_letter: nextRevealedLetter,
      updated_at: new Date().toISOString(),
    };

    const { data: existingProgress, error: existingError } = await supabase
      .from("milo_daily_puzzle_progress")
      .select("id")
      .eq("user_id", userId)
      .eq("puzzle_id", puzzle.id)
      .maybeSingle();

    if (existingError) {
      console.warn(
        "Could not check Mastery Code progress:",
        existingError.message,
      );
      setPuzzleMessage("Your progress could not be saved.");
      return false;
    }

    const result = existingProgress?.id
      ? await supabase
          .from("milo_daily_puzzle_progress")
          .update(payload)
          .eq("id", existingProgress.id)
      : await supabase.from("milo_daily_puzzle_progress").insert(payload);

    if (result.error) {
      console.warn("Could not save Mastery Code progress:", result.error.message);
      setPuzzleMessage("Your progress could not be saved.");
      return false;
    }

    return true;
  }

  async function buyClue() {
    if (!puzzle || clueBought || buyingClue || solvedToday) return;

    if (!userId) {
      if (guestHintUsed) {
        setPuzzleMessage("Your free Guest Hint has already been used.");
        return;
      }

      setGuestHintUsed(true);
      setClueBought(true);
      setPuzzleMessage("Guest Hint unlocked for free.");
      return;
    }

    if (dreamTokens < DAILY_CODE_CLUE_COST) {
      setPuzzleMessage(
        `You need at least ${DAILY_CODE_CLUE_COST} DT to unlock today’s clue.`,
      );
      return;
    }

    setBuyingClue(true);

    try {
      const spent = await addTokenTransaction(
        -DAILY_CODE_CLUE_COST,
        `Bought clue for Mastery Code ${puzzle.date_sg}`,
      );

      if (!spent) return;

      const saved = await savePuzzleProgress({
        nextAttempts: attempts,
        solved: solvedToday,
        nextClueBought: true,
      });

      if (saved) {
        setClueBought(true);
        setPuzzleMessage("Today’s clue has been unlocked.");
        return;
      }

      const refunded = await addTokenTransaction(
        DAILY_CODE_CLUE_COST,
        `Refunded failed clue purchase for Mastery Code ${puzzle.date_sg}`,
      );

      setPuzzleMessage(
        refunded
          ? `The clue could not be unlocked. Your ${DAILY_CODE_CLUE_COST} DT were returned.`
          : "The clue could not be unlocked and the automatic refund failed. Please contact support.",
      );
    } finally {
      setBuyingClue(false);
    }
  }

  async function buyLetter() {
    if (!puzzle || letterBought || solvedToday) return;

    if (!userId) {
      setPuzzleMessage("Log in to use the 1 DT letter reveal. Guests still get one free clue.");
      return;
    }

    if (dreamTokens < 1) {
      setPuzzleMessage("You need at least 1 DT to reveal a letter.");
      return;
    }

    const letterHint = `${puzzle.answer[0].toUpperCase()} is in position 1`;

    const spent = await addTokenTransaction(
      -1,
      `Bought letter for Mastery Code ${puzzle.date_sg}`,
    );

    if (!spent) return;

    const saved = await savePuzzleProgress({
      nextAttempts: attempts,
      solved: solvedToday,
      nextLetterBought: true,
      nextRevealedLetter: letterHint,
    });

    if (saved) {
      setLetterBought(true);
      setRevealedLetter(letterHint);
      setPuzzleMessage("Letter revealed.");
    }
  }

  async function submitPuzzle(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();

    if (!puzzle) {
      setPuzzleMessage("No Mastery Code is available.");
      return;
    }

    if (solvedToday) {
      setPuzzleMessage("You already solved today’s Mastery Code.");
      return;
    }

    if (attempts.length >= DAILY_CODE_MAX_ATTEMPTS) {
      setPuzzleMessage("You have used all six attempts for today.");
      return;
    }

    const guess = puzzleAnswer.trim().toUpperCase();

    if (!/^[A-Z]{5}$/.test(guess)) {
      setPuzzleMessage("Enter a complete five-letter word.");
      return;
    }

    if (wordListLoading) {
      setPuzzleMessage("The valid-word list is still loading.");
      return;
    }

    const isPuzzleAnswer = guess === puzzle.answer.toUpperCase();
    const isRecognisedWord = validWords?.has(guess.toLowerCase()) ?? false;

    if (!isPuzzleAnswer && !isRecognisedWord) {
      setPuzzleMessage(
        `“${guess}” is not recognised as an English word. This attempt was not used.`,
      );
      return;
    }

    const feedback = buildPuzzleFeedback(guess, puzzle.answer);
    const nextAttempts = [...attempts, { guess, feedback }];
    const solved = isPuzzleAnswer;

    const saved = userId
      ? await savePuzzleProgress({ nextAttempts, solved })
      : true;

    if (!saved) return;

    setAttempts(nextAttempts);
    setPuzzleAnswer("");

    if (!solved) {
      setPuzzleMessage(
        nextAttempts.length >= DAILY_CODE_MAX_ATTEMPTS
          ? "No attempts remain today. A new code arrives tomorrow."
          : "Valid word accepted. Study the colours and try again.",
      );
      return;
    }

    setSolvedToday(true);
    setCompleted((current) => current + 1);

    const reward = getDailyCodeReward(nextAttempts.length);

    if (!userId) {
      setPuzzleMessage(
        `Code solved! This run was worth ${reward} DT. Log in before your next run to save progress and collect rewards.`,
      );
      return;
    }

    const awarded = await addTokenTransaction(
      reward,
      `Solved Mastery Code ${puzzle.date_sg} in ${nextAttempts.length} guess${
        nextAttempts.length === 1 ? "" : "es"
      }`,
    );

    setPuzzleMessage(
      awarded
        ? `Code solved. You earned ${reward} Dreamscape Tokens.`
        : "Code solved, but the reward could not be saved.",
    );

    if (awarded && canOfferDailyReferralPrompt()) {
      setShowDailyReferralPrompt(true);
    }
  }

  function addLetter(letter: string) {
    if (!puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS) {
      return;
    }

    setPuzzleAnswer((current) =>
      `${current}${letter}`
        .toUpperCase()
        .replace(/[^A-Z]/g, "")
        .slice(0, 5),
    );
  }

  function deleteLetter() {
    setPuzzleAnswer((current) => current.slice(0, -1));
  }

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || menuOpen) return;

      if (/^[a-zA-Z]$/.test(event.key)) {
        addLetter(event.key.toUpperCase());
        return;
      }

      if (event.key === "Backspace") {
        event.preventDefault();
        deleteLetter();
        return;
      }

      if (event.key === "Enter") {
        event.preventDefault();
        void submitPuzzle();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const navButtonStyle: CSSProperties = {
    minHeight: mobile ? "36px" : "40px",
    padding: mobile ? "0 11px" : "0 17px",
    borderRadius: "999px",
    border: "1px solid rgba(126,232,255,0.2)",
    background: "rgba(4,14,31,0.72)",
    color: "white",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    fontSize: mobile ? "10px" : "12px",
    fontWeight: 850,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    whiteSpace: "nowrap",
  };

  const gameDisabled =
    loading ||
    wordListLoading ||
    !puzzle ||
    solvedToday ||
    attempts.length >= DAILY_CODE_MAX_ATTEMPTS;

  const utilityButtonStyle = (
    disabled: boolean,
    highlighted = false,
  ): CSSProperties => ({
    width: "100%",
    minHeight: mobile ? "35px" : dense ? "42px" : "48px",
    borderRadius: "12px",
    border: highlighted
      ? "1px solid rgba(126,232,255,0.42)"
      : "1px solid rgba(126,232,255,0.2)",
    background: disabled
      ? "rgba(255,255,255,0.035)"
      : highlighted
        ? "linear-gradient(90deg, rgba(32,126,166,0.92), rgba(57,82,177,0.92))"
        : "rgba(83,215,255,0.08)",
    color: disabled ? "rgba(255,255,255,0.3)" : "white",
    fontFamily: "inherit",
    fontSize: mobile ? "9px" : "11px",
    fontWeight: 900,
    letterSpacing: highlighted ? "0.08em" : "normal",
    textTransform: highlighted ? "uppercase" : "none",
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: highlighted && !disabled
      ? "0 0 24px rgba(83,215,255,0.13)"
      : "none",
  });

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 52% 18%, rgba(30,116,156,0.17), transparent 32%), radial-gradient(circle at 86% 72%, rgba(106,62,181,0.14), transparent 30%), linear-gradient(145deg, #020713, #030b1c 50%, #020611)",
        color: "white",
        fontFamily:
          'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        display: "grid",
        gridTemplateRows: mobile
          ? dense
            ? "52px minmax(0, 1fr)"
            : "58px minmax(0, 1fr)"
          : dense
            ? "58px minmax(0, 1fr)"
            : "68px minmax(0, 1fr)",
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button, a { -webkit-tap-highlight-color: transparent; }
        @keyframes labGlow {
          0%, 100% { opacity: 0.34; transform: translate3d(0, 0, 0); }
          50% { opacity: 0.52; transform: translate3d(0, -8px, 0); }
        }
      `}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.22,
          backgroundImage:
            "linear-gradient(rgba(126,232,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(126,232,255,0.06) 1px, transparent 1px)",
          backgroundSize: mobile ? "32px 32px" : "46px 46px",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 90%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          width: mobile ? "260px" : "420px",
          height: mobile ? "260px" : "420px",
          left: mobile ? "-120px" : "18%",
          top: mobile ? "22%" : "12%",
          borderRadius: "999px",
          background: "rgba(83,215,255,0.08)",
          filter: "blur(80px)",
          pointerEvents: "none",
          animation: "labGlow 6s ease-in-out infinite",
        }}
      />

      <header
        style={{
          position: "relative",
          zIndex: 30,
          minWidth: 0,
          borderBottom: "1px solid rgba(126,232,255,0.11)",
          background: "rgba(2,8,21,0.68)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: mobile ? "8px 9px" : "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: mobile ? "7px" : "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
          {mobile && (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open Activity Lab game menu"
              style={{
                ...navButtonStyle,
                width: "38px",
                padding: 0,
                fontSize: "17px",
                cursor: "pointer",
              }}
            >
              ☰
            </button>
          )}

          <Link href="/milo-world" style={navButtonStyle}>
            <span>←</span>
            {mobile ? "Milo" : "Milo’s World"}
          </Link>
        </div>

        {!mobile && (
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                color: "#8ee8ff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
              }}
            >
              Milo’s Token-Earning Games
            </p>
            <h1
              style={{
                margin: "3px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: dense ? "23px" : "27px",
                lineHeight: 1,
                fontWeight: 400,
              }}
            >
              Activity Lab
            </h1>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <Link
            href={userId ? "/profile" : "/login"}
            style={{
              ...navButtonStyle,
              border: "1px solid rgba(126,232,255,0.3)",
            }}
          >
            <span style={{ color: "#8ee8ff" }}>✦</span>
            {userId ? `${dreamTokens} DT` : "Guest · 0 DT"}
          </Link>

          <Link href={userEmail ? "/profile" : "/login"} style={navButtonStyle}>
            {mobile ? (userEmail ? "Account" : "Login") : userEmail ? "My Account" : "Log In"}
          </Link>
        </div>
      </header>

      <section
        style={{
          position: "relative",
          zIndex: 4,
          minWidth: 0,
          minHeight: 0,
          padding: mobile ? (dense ? "6px" : "8px") : dense ? "10px" : "14px",
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : wide
              ? "260px minmax(0, 1fr)"
              : "220px minmax(0, 1fr)",
          gap: dense ? "10px" : "14px",
          overflow: "hidden",
        }}
      >
        {!mobile && (
          <aside style={{ minWidth: 0, minHeight: 0 }}>
            <ActivityMenu drawer={false} dense={dense} />
          </aside>
        )}

        <article
          style={{
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            borderRadius: mobile ? "17px" : "24px",
            border: "1px solid rgba(126,232,255,0.17)",
            background:
              "linear-gradient(145deg, rgba(5,22,43,0.88), rgba(3,9,24,0.95))",
            boxShadow:
              "0 30px 90px rgba(0,0,0,0.35), inset 0 0 50px rgba(83,215,255,0.025)",
            padding: mobile ? "6px" : dense ? "14px" : "18px",
            display: "grid",
            gridTemplateColumns: mobile
              ? "1fr"
              : wide
                ? "minmax(0, 1fr) 275px"
                : "minmax(0, 1fr) 235px",
            gridTemplateRows: mobile ? "minmax(0, 1fr) auto" : "1fr",
            gap: mobile ? "7px" : dense ? "14px" : "20px",
          }}
        >
          <section
            style={{
              minWidth: 0,
              minHeight: 0,
              borderRadius: mobile ? "13px" : "19px",
              border: "1px solid rgba(126,232,255,0.1)",
              background: "rgba(255,255,255,0.025)",
              padding: mobile ? "6px" : dense ? "12px" : "16px",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: mobile ? "6px" : dense ? "9px" : "13px",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: mobile ? "8px" : "10px",
                    fontWeight: 900,
                    letterSpacing: "0.17em",
                    textTransform: "uppercase",
                  }}
                >
                  Daily Five-Letter Puzzle
                </p>

                <h2
                  style={{
                    margin: mobile ? "3px 0 0" : "6px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: mobile
                      ? dense
                        ? "22px"
                        : "27px"
                      : dense
                        ? "31px"
                        : wide
                          ? "43px"
                          : "37px",
                    lineHeight: 0.95,
                    fontWeight: 400,
                  }}
                >
                  Mastery Code
                </h2>

                {!mobile && (
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: "rgba(255,255,255,0.48)",
                      fontSize: dense ? "9px" : "11px",
                      lineHeight: 1.4,
                    }}
                  >
                    Green means correct position. Gold means the letter belongs elsewhere.
                  </p>
                )}
              </div>

              <div
                style={{
                  flexShrink: 0,
                  borderRadius: "999px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background: "rgba(83,215,255,0.07)",
                  padding: mobile ? "5px 7px" : "7px 10px",
                  textAlign: "right",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.45)",
                    fontSize: mobile ? "7px" : "8px",
                    fontWeight: 850,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Next reward
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "2px",
                    color: "#9bf5ff",
                    fontSize: mobile ? "10px" : "12px",
                  }}
                >
                  {solvedToday ? "Claimed" : `${nextReward} DT`}
                </strong>
              </div>
            </div>

            <div
              style={{
                minHeight: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              <div
                aria-label="Mastery Code guess grid"
                style={{
                  display: "grid",
                  gridTemplateRows: `repeat(${DAILY_CODE_MAX_ATTEMPTS}, ${cellSize}px)`,
                  gap: mobile ? "4px" : wide ? "9px" : "7px",
                  justifyContent: "center",
                }}
              >
                {Array.from({ length: DAILY_CODE_MAX_ATTEMPTS }).map(
                  (_, rowIndex) => {
                    const attempt = attempts[rowIndex];
                    const isCurrentRow =
                      rowIndex === attempts.length &&
                      !solvedToday &&
                      attempts.length < DAILY_CODE_MAX_ATTEMPTS;

                    return (
                      <div
                        key={rowIndex}
                        style={{
                          display: "grid",
                          gridTemplateColumns: `repeat(5, ${cellSize}px)`,
                          gap: mobile ? "4px" : wide ? "9px" : "7px",
                        }}
                      >
                        {Array.from({ length: 5 }).map((_, letterIndex) => {
                          const attemptedLetter = attempt?.guess[letterIndex] || "";
                          const currentLetter = isCurrentRow
                            ? puzzleAnswer[letterIndex] || ""
                            : "";
                          const letter = attemptedLetter || currentLetter;
                          const feedback = attempt?.feedback[letterIndex];

                          const background =
                            feedback === "correct"
                              ? "#3f9860"
                              : feedback === "present"
                                ? "#b68c2d"
                                : feedback === "absent"
                                  ? "#394353"
                                  : letter
                                    ? "rgba(126,232,255,0.11)"
                                    : "rgba(255,255,255,0.035)";

                          const border =
                            feedback === "correct"
                              ? "1px solid rgba(106,255,155,0.54)"
                              : feedback === "present"
                                ? "1px solid rgba(255,214,95,0.5)"
                                : feedback === "absent"
                                  ? "1px solid rgba(255,255,255,0.08)"
                                  : letter
                                    ? "1px solid rgba(126,232,255,0.58)"
                                    : "1px solid rgba(126,232,255,0.13)";

                          return (
                            <span
                              key={letterIndex}
                              style={{
                                width: `${cellSize}px`,
                                height: `${cellSize}px`,
                                borderRadius: mobile ? "8px" : wide ? "14px" : "11px",
                                border,
                                background,
                                color: "white",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: mobile
                                  ? dense
                                    ? "18px"
                                    : "21px"
                                  : dense
                                    ? "19px"
                                    : wide
                                      ? "28px"
                                      : "23px",
                                fontWeight: 900,
                                boxShadow: feedback
                                  ? "inset 0 -3px 0 rgba(0,0,0,0.14)"
                                  : "none",
                              }}
                            >
                              {letter}
                            </span>
                          );
                        })}
                      </div>
                    );
                  },
                )}
              </div>
            </div>

            <Keyboard
              attempts={attempts}
              onLetter={addLetter}
              onDelete={deleteLetter}
              mobile={mobile}
              dense={dense}
              wide={wide}
            />
          </section>

          <form
            onSubmit={submitPuzzle}
            style={{
              minWidth: 0,
              minHeight: 0,
              borderRadius: mobile ? "13px" : "19px",
              border: "1px solid rgba(126,232,255,0.1)",
              background: "rgba(255,255,255,0.02)",
              padding: mobile ? "7px" : dense ? "11px" : "14px",
              display: "grid",
              gridTemplateColumns: mobile ? "repeat(2, minmax(0, 1fr))" : "1fr",
              alignContent: mobile ? "start" : "center",
              gap: mobile ? "5px" : dense ? "8px" : "11px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                gridColumn: mobile ? "1 / -1" : "auto",
                borderRadius: "14px",
                border: "1px solid rgba(126,232,255,0.12)",
                background: "rgba(83,215,255,0.045)",
                padding: mobile ? "7px 9px" : "11px 12px",
              }}
            >
              <span
                style={{
                  color: "#8ee8ff",
                  fontSize: mobile ? "7px" : "9px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {clueBought ? "Today’s clue" : "Clue locked"}
              </span>

              {clueBought ? (
                <>
                  <p
                    style={{
                      margin: mobile ? "2px 0 0" : "5px 0 0",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: mobile ? "nowrap" : "normal",
                      color: "rgba(255,255,255,0.72)",
                      fontSize: mobile ? "9px" : dense ? "11px" : "12px",
                      lineHeight: 1.4,
                    }}
                  >
                    {puzzle?.base_clue || "No clue is available."}
                  </p>

                  {puzzle?.clue_text && (
                    <p
                      style={{
                        margin: "5px 0 0",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: mobile ? "nowrap" : "normal",
                        color: "#9bf5ff",
                        fontSize: mobile ? "8px" : "10px",
                        lineHeight: 1.35,
                      }}
                    >
                      {puzzle.clue_text}
                    </p>
                  )}
                </>
              ) : (
                <p
                  style={{
                    margin: mobile ? "2px 0 0" : "5px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: mobile ? "nowrap" : "normal",
                    color: "rgba(255,255,255,0.58)",
                    fontSize: mobile ? "9px" : dense ? "11px" : "12px",
                    lineHeight: 1.4,
                  }}
                >
                  {loading
                    ? "Loading today’s code..."
                    : userId
                      ? `Buy today’s clue for ${DAILY_CODE_CLUE_COST} DT to reveal it.`
                      : "Guests get one free clue for today’s puzzle."}
                </p>
              )}

              {letterBought && revealedLetter && (
                <p
                  style={{
                    margin: "5px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: mobile ? "nowrap" : "normal",
                    color: "#9bf5ff",
                    fontSize: mobile ? "8px" : "10px",
                    lineHeight: 1.35,
                  }}
                >
                  Letter: {revealedLetter}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={buyClue}
              disabled={!puzzle || clueBought || buyingClue || solvedToday}
              style={utilityButtonStyle(
                !puzzle || clueBought || buyingClue || solvedToday,
              )}
            >
              {clueBought
                ? userId
                  ? "Clue Unlocked"
                  : "Guest Hint Used"
                : buyingClue
                  ? "Unlocking Clue..."
                  : userId
                    ? `Buy Clue · ${DAILY_CODE_CLUE_COST} DT`
                    : "Guest Hint · Free"}
            </button>

            <button
              type="button"
              onClick={buyLetter}
              disabled={!puzzle || letterBought || solvedToday || !userId}
              style={utilityButtonStyle(
                !puzzle || letterBought || solvedToday || !userId,
              )}
            >
              {letterBought
                ? "Letter Revealed"
                : userId
                  ? "Buy Letter · 1 DT"
                  : "Log In for Letter Hint"}
            </button>

            <button
              type="submit"
              disabled={gameDisabled}
              style={{
                ...utilityButtonStyle(gameDisabled, true),
                gridColumn: mobile ? "1 / -1" : "auto",
              }}
            >
              {loading
                ? "Loading Code"
                : wordListLoading
                  ? "Loading Word List"
                  : solvedToday
                    ? "Code Completed"
                    : "Submit Guess"}
            </button>

            {!mobile && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "6px",
                }}
              >
                <StatBox
                  label="Attempts"
                  value={`${remainingAttempts}/${DAILY_CODE_MAX_ATTEMPTS}`}
                />
                <StatBox
                  label={userId ? "Completed" : "Guest Run"}
                  value={userId ? String(completed) : solvedToday ? "1" : "0"}
                />
                <StatBox label="Status" value={solvedToday ? "Solved" : "Active"} />
              </div>
            )}

            <div
              role="status"
              style={{
                gridColumn: mobile ? "1 / -1" : "auto",
                minHeight: mobile ? "28px" : dense ? "42px" : "54px",
                borderRadius: "11px",
                border: "1px solid rgba(126,232,255,0.09)",
                background: "rgba(255,255,255,0.025)",
                padding: mobile ? "5px 7px" : "9px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                color: solvedToday ? "#9fffd2" : "#8ee8ff",
                fontSize: mobile ? "8px" : dense ? "10px" : "11px",
                fontWeight: 750,
                lineHeight: 1.35,
                textAlign: "center",
              }}
            >
              <span
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: mobile ? "nowrap" : "normal",
                }}
              >
                {puzzleMessage ||
                  "Only recognised five-letter English words are accepted."}
              </span>
            </div>
          </form>
        </article>
      </section>

      <DailyActivityReferralPrompt
        open={showDailyReferralPrompt}
        onClose={() => setShowDailyReferralPrompt(false)}
      />

      {mobile && menuOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.58)",
            backdropFilter: "blur(5px)",
            WebkitBackdropFilter: "blur(5px)",
          }}
          onClick={() => setMenuOpen(false)}
        >
          <aside
            style={{
              width: "min(340px, calc(100vw - 38px))",
              height: "100dvh",
              borderRight: "1px solid rgba(126,232,255,0.22)",
              background:
                "linear-gradient(160deg, rgba(4,18,38,0.99), rgba(2,8,21,0.99))",
              boxShadow: "28px 0 80px rgba(0,0,0,0.54)",
              padding: "16px",
              display: "grid",
              gridTemplateRows: "auto minmax(0, 1fr) auto",
              gap: "18px",
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#8ee8ff",
                    fontSize: "9px",
                    fontWeight: 900,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  Choose a game
                </p>
                <h2
                  style={{
                    margin: "5px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "30px",
                    fontWeight: 400,
                  }}
                >
                  Activity Lab
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close Activity Lab menu"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "999px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background: "rgba(255,255,255,0.06)",
                  color: "white",
                  fontSize: "23px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div style={{ minHeight: 0 }}>
              <ActivityMenu
                drawer
                dense={false}
                onNavigate={() => setMenuOpen(false)}
              />
            </div>

            <Link
              href="/milo-world"
              onClick={() => setMenuOpen(false)}
              style={{
                minHeight: "48px",
                borderRadius: "14px",
                border: "1px solid rgba(126,232,255,0.18)",
                background: "rgba(83,215,255,0.06)",
                color: "white",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: 850,
              }}
            >
              ← Return to Milo’s World
            </Link>
          </aside>
        </div>
      )}
    </main>
  );
}
