"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "@/lib/supabase";

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
const KEYBOARD_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const activities: ActivityCardData[] = [
  {
    title: "Mastery Code",
    eyebrow: "Daily Challenge",
    description: "Solve today’s five-letter code and earn up to 60 DT.",
    image: "/milo-world/activities/daily-puzzle.png",
    active: true,
    icon: "◇",
  },
  {
    title: "Categories",
    eyebrow: "Quiz Battle",
    description: "Choose a topic and race through a timed quiz.",
    image: "/milo-world/activities/categories-quiz.png",
    href: "/milo-world/categories",
    icon: "▦",
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
  const [viewport, setViewport] = useState({
    width: 1440,
    height: 900,
  });

  useEffect(() => {
    function updateViewport() {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
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

function ActivityCard({
  activity,
  mobile,
  dense,
}: {
  activity: ActivityCardData;
  mobile: boolean;
  dense: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  const cardStyle: CSSProperties = {
    position: "relative",
    minWidth: 0,
    minHeight: mobile ? (dense ? "62px" : "72px") : "0",
    height: mobile ? "100%" : "auto",
    overflow: "hidden",
    borderRadius: mobile ? "14px" : "20px",
    border: activity.active
      ? "1px solid rgba(126,232,255,0.66)"
      : hovered
        ? "1px solid rgba(126,232,255,0.54)"
        : "1px solid rgba(126,232,255,0.18)",
    background: activity.active
      ? "linear-gradient(145deg, rgba(18,70,99,0.82), rgba(4,15,32,0.9))"
      : "linear-gradient(145deg, rgba(8,26,48,0.76), rgba(3,10,24,0.88))",
    color: "white",
    textDecoration: "none",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: activity.active ? "default" : "pointer",
    boxShadow: activity.active
      ? "0 0 28px rgba(83,215,255,0.13)"
      : hovered
        ? "0 18px 38px rgba(0,0,0,0.32)"
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
          opacity: mobile ? 0.2 : hovered || activity.active ? 0.32 : 0.2,
          transform: hovered ? "scale(1.04)" : "scale(1)",
          transition: "opacity 180ms ease, transform 240ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: mobile
            ? "linear-gradient(90deg, rgba(2,10,24,0.9), rgba(2,10,24,0.55))"
            : "linear-gradient(180deg, rgba(2,10,24,0.14), rgba(2,10,24,0.94) 72%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          minHeight: 0,
          padding: mobile ? "10px" : dense ? "14px" : "17px",
          display: "flex",
          flexDirection: mobile ? "row" : "column",
          alignItems: mobile ? "center" : "stretch",
          justifyContent: mobile ? "flex-start" : "flex-end",
          gap: mobile ? "8px" : 0,
        }}
      >
        <span
          style={{
            width: mobile ? "30px" : "38px",
            height: mobile ? "30px" : "38px",
            borderRadius: mobile ? "9px" : "12px",
            border: "1px solid rgba(126,232,255,0.32)",
            background: "rgba(83,215,255,0.1)",
            color: "#9bf5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: mobile ? "14px" : "17px",
            marginBottom: mobile ? 0 : "auto",
          }}
        >
          {activity.icon}
        </span>

        <span style={{ minWidth: 0 }}>
          {!mobile && (
            <span
              style={{
                display: "block",
                color: "#8ee8ff",
                fontSize: "9px",
                fontWeight: 900,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {activity.eyebrow}
            </span>
          )}

          <strong
            style={{
              display: "block",
              marginTop: mobile ? 0 : "7px",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: mobile ? "nowrap" : "normal",
              fontSize: mobile ? (dense ? "10px" : "11px") : dense ? "18px" : "21px",
              lineHeight: 1.05,
            }}
          >
            {activity.title}
          </strong>

          {!mobile && !dense && (
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
              marginLeft: mobile ? "auto" : 0,
              marginTop: mobile ? 0 : "12px",
              color: "#8ee8ff",
              fontSize: mobile ? "14px" : "13px",
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

function Keyboard({
  attempts,
  onLetter,
  onDelete,
  mobile,
  dense,
}: {
  attempts: DailyPuzzleAttempt[];
  onLetter: (letter: string) => void;
  onDelete: () => void;
  mobile: boolean;
  dense: boolean;
}) {
  const letterStates = useMemo(
    () => getKeyboardLetterStates(attempts),
    [attempts],
  );

  const keyHeight = mobile
    ? dense
      ? 31
      : 36
    : dense
      ? 38
      : 44;

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
        display: "grid",
        gap: mobile ? "5px" : "7px",
        width: "100%",
      }}
    >
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={row}
          style={{
            width:
              rowIndex === 0 ? "100%" : rowIndex === 1 ? "92%" : "96%",
            margin: "0 auto",
            display: "flex",
            justifyContent: "center",
            gap: mobile ? "3px" : "5px",
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
                borderRadius: mobile ? "7px" : "9px",
                fontFamily: "inherit",
                fontSize: mobile ? "10px" : dense ? "12px" : "14px",
                fontWeight: 900,
                cursor: "pointer",
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
                flex: "1.5 1 0",
                borderRadius: mobile ? "7px" : "9px",
                border: "1px solid rgba(126,232,255,0.14)",
                background: "rgba(255,255,255,0.09)",
                color: "white",
                fontFamily: "inherit",
                fontSize: mobile ? "8px" : "10px",
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

export default function ActivityLabPage() {
  const { width, height } = useViewport();
  const mobile = width <= 720;
  const compact = width <= 1180;
  const dense = height < 790;

  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [dreamTokens, setDreamTokens] = useState(0);
  const [completed, setCompleted] = useState(0);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [attempts, setAttempts] = useState<DailyPuzzleAttempt[]>([]);
  const [solvedToday, setSolvedToday] = useState(false);
  const [clueBought, setClueBought] = useState(false);
  const [letterBought, setLetterBought] = useState(false);
  const [revealedLetter, setRevealedLetter] = useState("");
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const [puzzleMessage, setPuzzleMessage] = useState("");
  const [loading, setLoading] = useState(true);

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
      ? 32
      : 37
    : dense
      ? 39
      : compact
        ? 44
        : 48;

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

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserId("");
        setUserEmail("");
        setPuzzleMessage(
          "Log in to play today’s Mastery Code and earn Dreamscape Tokens.",
        );
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email ?? "");

      await refreshTokenBalance(user.id);

      const today = getSingaporeDateString();

      const { data: puzzleData, error: puzzleError } = await supabase
        .from("milo_daily_puzzles")
        .select("id,date_sg,answer,base_clue,clue_text")
        .eq("date_sg", today)
        .eq("is_active", true)
        .single();

      if (!mounted) return;

      if (puzzleError || !puzzleData) {
        setPuzzleMessage("No Mastery Code has been published for today yet.");
        setLoading(false);
        return;
      }

      const typedPuzzle = puzzleData as DailyPuzzle;
      setPuzzle(typedPuzzle);

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

  async function addTokenTransaction(
    amount: number,
    description: string,
  ) {
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
    if (!puzzle || clueBought || solvedToday || !userId) return;

    if (dreamTokens < 1) {
      setPuzzleMessage("You need at least 1 DT to unlock the extra clue.");
      return;
    }

    const spent = await addTokenTransaction(
      -1,
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
      setPuzzleMessage("Extra clue unlocked.");
    }
  }

  async function buyLetter() {
    if (!puzzle || letterBought || solvedToday || !userId) return;

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

    if (!userId) {
      setPuzzleMessage("Log in before playing Mastery Code.");
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

    const feedback = buildPuzzleFeedback(guess, puzzle.answer);
    const nextAttempts = [...attempts, { guess, feedback }];
    const solved = guess === puzzle.answer.toUpperCase();

    const saved = await savePuzzleProgress({
      nextAttempts,
      solved,
    });

    if (!saved) return;

    setAttempts(nextAttempts);
    setPuzzleAnswer("");

    if (!solved) {
      setPuzzleMessage(
        nextAttempts.length >= DAILY_CODE_MAX_ATTEMPTS
          ? "No attempts remain today. A new code arrives tomorrow."
          : "Attempt saved. Study the colours and try again.",
      );
      return;
    }

    setSolvedToday(true);
    setCompleted((current) => current + 1);

    const reward = getDailyCodeReward(nextAttempts.length);
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
      if (event.metaKey || event.ctrlKey || event.altKey) return;

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

  const navButtonStyle: CSSProperties = {
    minHeight: mobile ? "36px" : "40px",
    padding: mobile ? "0 12px" : "0 17px",
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
    !puzzle ||
    !userId ||
    solvedToday ||
    attempts.length >= DAILY_CODE_MAX_ATTEMPTS;

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
        * {
          box-sizing: border-box;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

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
          zIndex: 10,
          minWidth: 0,
          borderBottom: "1px solid rgba(126,232,255,0.11)",
          background: "rgba(2,8,21,0.62)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: mobile ? "8px 9px" : "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: mobile ? "7px" : "12px",
        }}
      >
        <Link href="/milo-world" style={navButtonStyle}>
          <span>←</span>
          {mobile ? "Milo" : "Milo’s World"}
        </Link>

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

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: mobile ? "6px" : "8px",
          }}
        >
          <Link
            href="/profile"
            style={{
              ...navButtonStyle,
              border: "1px solid rgba(126,232,255,0.3)",
            }}
          >
            <span style={{ color: "#8ee8ff" }}>✦</span>
            {dreamTokens} DT
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
          padding: mobile
            ? dense
              ? "6px"
              : "8px"
            : dense
              ? "10px"
              : "14px",
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : compact
              ? "210px minmax(0, 1fr)"
              : "260px minmax(0, 1fr)",
          gridTemplateRows: mobile
            ? `${dense ? "62px" : "72px"} minmax(0, 1fr)`
            : "minmax(0, 1fr)",
          gap: mobile ? "7px" : dense ? "10px" : "14px",
          overflow: "hidden",
        }}
      >
        <aside
          style={{
            minWidth: 0,
            minHeight: 0,
            display: "grid",
            gridTemplateColumns: mobile
              ? "repeat(3, minmax(0, 1fr))"
              : "1fr",
            gridTemplateRows: mobile
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: mobile ? "6px" : dense ? "8px" : "11px",
          }}
        >
          {activities.map((activity) => (
            <ActivityCard
              key={activity.title}
              activity={activity}
              mobile={mobile}
              dense={dense}
            />
          ))}
        </aside>

        <article
          style={{
            minWidth: 0,
            minHeight: 0,
            height: "100%",
            overflow: "hidden",
            borderRadius: mobile ? "17px" : "24px",
            border: "1px solid rgba(126,232,255,0.17)",
            background:
              "linear-gradient(145deg, rgba(5,22,43,0.88), rgba(3,9,24,0.94))",
            boxShadow:
              "0 30px 90px rgba(0,0,0,0.35), inset 0 0 50px rgba(83,215,255,0.025)",
            padding: mobile
              ? dense
                ? "8px"
                : "10px"
              : dense
                ? "14px"
                : "18px",
            display: "grid",
            gridTemplateColumns: mobile
              ? "1fr"
              : compact
                ? "minmax(290px, 0.92fr) minmax(330px, 1.08fr)"
                : "minmax(340px, 0.9fr) minmax(430px, 1.1fr)",
            gridTemplateRows: mobile ? "minmax(0, 1fr)" : "1fr",
            gap: mobile ? "7px" : dense ? "14px" : "20px",
          }}
        >
          <section
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: mobile ? "flex-start" : "center",
              borderRadius: mobile ? "13px" : "19px",
              border: "1px solid rgba(126,232,255,0.1)",
              background: "rgba(255,255,255,0.025)",
              padding: mobile ? (dense ? "7px" : "9px") : dense ? "12px" : "16px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: mobile ? (dense ? "5px" : "8px") : dense ? "8px" : "12px",
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
                        : "38px",
                    lineHeight: 0.95,
                    fontWeight: 400,
                  }}
                >
                  Mastery Code
                </h2>
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

            {!mobile && !dense && (
              <p
                style={{
                  width: "100%",
                  margin: "0 0 13px",
                  color: "rgba(255,255,255,0.52)",
                  fontSize: "11px",
                  lineHeight: 1.45,
                }}
              >
                Correct position is green. Correct letter in the wrong position
                is gold. Grey letters are not in the code.
              </p>
            )}

            <div
              aria-label="Mastery Code guess grid"
              style={{
                display: "grid",
                gridTemplateRows: `repeat(${DAILY_CODE_MAX_ATTEMPTS}, ${cellSize}px)`,
                gap: mobile ? "4px" : "6px",
                justifyContent: "center",
                margin: "auto 0",
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
                        gap: mobile ? "4px" : "6px",
                      }}
                    >
                      {Array.from({ length: 5 }).map((_, letterIndex) => {
                        const attemptedLetter =
                          attempt?.guess[letterIndex] || "";
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
                              borderRadius: mobile ? "8px" : "10px",
                              border,
                              background,
                              color: "white",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: mobile ? "15px" : dense ? "17px" : "20px",
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

            <div
              style={{
                width: "100%",
                marginTop: mobile ? "5px" : "10px",
                display: "grid",
                gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                gap: mobile ? "4px" : "7px",
              }}
            >
              <div
                style={{
                  borderRadius: mobile ? "9px" : "12px",
                  border: "1px solid rgba(126,232,255,0.1)",
                  background: "rgba(255,255,255,0.025)",
                  padding: mobile ? "5px" : "8px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: mobile ? "7px" : "8px",
                    textTransform: "uppercase",
                  }}
                >
                  Attempts
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "2px",
                    fontSize: mobile ? "9px" : "11px",
                  }}
                >
                  {remainingAttempts}/{DAILY_CODE_MAX_ATTEMPTS}
                </strong>
              </div>

              <div
                style={{
                  borderRadius: mobile ? "9px" : "12px",
                  border: "1px solid rgba(126,232,255,0.1)",
                  background: "rgba(255,255,255,0.025)",
                  padding: mobile ? "5px" : "8px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: mobile ? "7px" : "8px",
                    textTransform: "uppercase",
                  }}
                >
                  Completed
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "2px",
                    fontSize: mobile ? "9px" : "11px",
                  }}
                >
                  {completed}
                </strong>
              </div>

              <div
                style={{
                  borderRadius: mobile ? "9px" : "12px",
                  border: "1px solid rgba(126,232,255,0.1)",
                  background: "rgba(255,255,255,0.025)",
                  padding: mobile ? "5px" : "8px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    display: "block",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: mobile ? "7px" : "8px",
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </span>
                <strong
                  style={{
                    display: "block",
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: solvedToday ? "#9fffd2" : "#8ee8ff",
                    fontSize: mobile ? "9px" : "11px",
                  }}
                >
                  {solvedToday ? "Solved" : "Active"}
                </strong>
              </div>
            </div>
          </section>

          <form
            onSubmit={submitPuzzle}
            style={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: mobile ? (dense ? "5px" : "7px") : dense ? "8px" : "11px",
              padding: mobile ? "0" : dense ? "4px 0" : "8px 2px",
            }}
          >
            <div
              style={{
                borderRadius: mobile ? "10px" : "14px",
                border: "1px solid rgba(126,232,255,0.12)",
                background: "rgba(83,215,255,0.045)",
                padding: mobile ? "7px 9px" : "10px 12px",
                minHeight: mobile ? "0" : "48px",
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
                Today’s clue
              </span>
              <p
                style={{
                  margin: mobile ? "2px 0 0" : "4px 0 0",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: mobile ? "nowrap" : "normal",
                  color: "rgba(255,255,255,0.72)",
                  fontSize: mobile ? "9px" : dense ? "11px" : "12px",
                  lineHeight: 1.35,
                }}
              >
                {puzzle?.base_clue || (loading ? "Loading today’s code..." : "No clue available.")}
              </p>

              {(clueBought || letterBought) && (
                <p
                  style={{
                    margin: "4px 0 0",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: mobile ? "nowrap" : "normal",
                    color: "#9bf5ff",
                    fontSize: mobile ? "8px" : "10px",
                    lineHeight: 1.35,
                  }}
                >
                  {clueBought && puzzle?.clue_text
                    ? `Extra clue: ${puzzle.clue_text}`
                    : ""}
                  {clueBought && letterBought ? " · " : ""}
                  {letterBought && revealedLetter
                    ? `Letter: ${revealedLetter}`
                    : ""}
                </p>
              )}
            </div>

            <Keyboard
              attempts={attempts}
              onLetter={addLetter}
              onDelete={deleteLetter}
              mobile={mobile}
              dense={dense}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: mobile ? "5px" : "8px",
              }}
            >
              <button
                type="button"
                onClick={buyClue}
                disabled={!puzzle || clueBought || solvedToday || !userId}
                style={{
                  height: mobile ? (dense ? "30px" : "35px") : dense ? "38px" : "43px",
                  borderRadius: mobile ? "8px" : "11px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background:
                    !puzzle || clueBought || solvedToday || !userId
                      ? "rgba(255,255,255,0.035)"
                      : "rgba(83,215,255,0.08)",
                  color:
                    !puzzle || clueBought || solvedToday || !userId
                      ? "rgba(255,255,255,0.28)"
                      : "white",
                  fontFamily: "inherit",
                  fontSize: mobile ? "8px" : "10px",
                  fontWeight: 850,
                  cursor:
                    !puzzle || clueBought || solvedToday || !userId
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {clueBought ? "Clue Unlocked" : "Buy Clue · 1 DT"}
              </button>

              <button
                type="button"
                onClick={buyLetter}
                disabled={!puzzle || letterBought || solvedToday || !userId}
                style={{
                  height: mobile ? (dense ? "30px" : "35px") : dense ? "38px" : "43px",
                  borderRadius: mobile ? "8px" : "11px",
                  border: "1px solid rgba(126,232,255,0.2)",
                  background:
                    !puzzle || letterBought || solvedToday || !userId
                      ? "rgba(255,255,255,0.035)"
                      : "rgba(83,215,255,0.08)",
                  color:
                    !puzzle || letterBought || solvedToday || !userId
                      ? "rgba(255,255,255,0.28)"
                      : "white",
                  fontFamily: "inherit",
                  fontSize: mobile ? "8px" : "10px",
                  fontWeight: 850,
                  cursor:
                    !puzzle || letterBought || solvedToday || !userId
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {letterBought ? "Letter Revealed" : "Buy Letter · 1 DT"}
              </button>
            </div>

            <button
              type="submit"
              disabled={gameDisabled}
              style={{
                height: mobile ? (dense ? "34px" : "40px") : dense ? "43px" : "49px",
                borderRadius: mobile ? "9px" : "12px",
                border: gameDisabled
                  ? "1px solid rgba(255,255,255,0.08)"
                  : "1px solid rgba(126,232,255,0.44)",
                background: gameDisabled
                  ? "rgba(255,255,255,0.045)"
                  : "linear-gradient(90deg, rgba(32,126,166,0.92), rgba(57,82,177,0.92))",
                color: gameDisabled
                  ? "rgba(255,255,255,0.32)"
                  : "white",
                fontFamily: "inherit",
                fontSize: mobile ? "9px" : "11px",
                fontWeight: 900,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: gameDisabled ? "not-allowed" : "pointer",
                boxShadow: gameDisabled
                  ? "none"
                  : "0 0 24px rgba(83,215,255,0.13)",
              }}
            >
              {loading
                ? "Loading Code"
                : solvedToday
                  ? "Code Completed"
                  : !userId
                    ? "Log In to Play"
                    : "Submit Guess"}
            </button>

            <div
              role="status"
              style={{
                minHeight: mobile ? (dense ? "24px" : "30px") : dense ? "34px" : "42px",
                borderRadius: mobile ? "8px" : "11px",
                border: "1px solid rgba(126,232,255,0.09)",
                background: "rgba(255,255,255,0.025)",
                padding: mobile ? "5px 7px" : "8px 10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                color: solvedToday ? "#9fffd2" : "#8ee8ff",
                fontSize: mobile ? "8px" : dense ? "10px" : "11px",
                fontWeight: 750,
                lineHeight: 1.3,
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
                  "Use the on-screen keyboard or your physical keyboard."}
              </span>
            </div>
          </form>
        </article>
      </section>
    </main>
  );
}
