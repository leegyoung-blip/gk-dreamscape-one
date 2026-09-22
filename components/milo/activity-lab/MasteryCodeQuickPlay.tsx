"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import DailyActivityReferralPrompt, {
  canOfferDailyReferralPrompt,
} from "@/components/DailyActivityReferralPrompt";
import MasteryCodeKeyboard from "./MasteryCodeKeyboard";
import MasteryCodeGrid from "./MasteryCodeGrid";
import {
  buildPuzzleFeedback,
  getSingaporeDateString,
  type MasteryAttempt,
} from "./mastery-code-shared";

type DailyPuzzle = {
  id: string;
  date_sg: string;
  answer: string;
  base_clue: string;
  clue_text: string;
};

const DAILY_CODE_MAX_ATTEMPTS = 6;
const DAILY_CODE_REWARDS = [60, 50, 40, 30, 20, 10] as const;
const DAILY_CODE_CLUE_COST = 5;
const WORD_LIST_URL = "/milo-world/activities/five-letter-words.json";

function getDailyCodeReward(attemptNumber: number) {
  return DAILY_CODE_REWARDS[attemptNumber - 1] ?? 10;
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

export default function MasteryCodeQuickPlay({
  userId,
  dreamTokens,
  mobile,
  wide,
  compact,
  dense,
  width,
  onTokenTransaction,
}: {
  userId: string;
  dreamTokens: number;
  mobile: boolean;
  wide: boolean;
  compact: boolean;
  dense: boolean;
  width: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
}) {
  const [completed, setCompleted] = useState(0);
  const [puzzle, setPuzzle] = useState<DailyPuzzle | null>(null);
  const [attempts, setAttempts] = useState<MasteryAttempt[]>([]);
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

  const mobileCellTarget = dense ? 57 : 72;
  const mobileGridGap = 4;
  const mobileGridHorizontalAllowance = 44;
  const mobileCellWidthCap = Math.floor(
    (Math.max(width, 320) -
      mobileGridHorizontalAllowance -
      mobileGridGap * 4) /
      5,
  );

  const cellSize = mobile
    ? Math.max(44, Math.min(mobileCellTarget, mobileCellWidthCap))
    : dense
      ? 48
      : wide
        ? 66
        : compact
          ? 52
          : 58;

  useEffect(() => {
    let cancelled = false;

    async function loadWordList() {
      try {
        setWordListLoading(true);
        const response = await fetch(WORD_LIST_URL, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Word list request failed: ${response.status}`);

        const words = (await response.json()) as unknown;
        if (!Array.isArray(words)) throw new Error("Word list is not an array.");

        const cleanWords = words
          .filter((word): word is string => typeof word === "string")
          .map((word) => word.trim().toLowerCase())
          .filter((word) => /^[a-z]{5}$/.test(word));

        if (!cancelled) setValidWords(new Set(cleanWords));
      } catch (error) {
        console.warn("Could not load Mastery Code word list:", error);
        if (!cancelled) {
          setValidWords(null);
          setPuzzleMessage(
            "The valid-word list could not be loaded. Check five-letter-words.json.",
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

  useEffect(() => {
    let mounted = true;

    async function loadQuickPlay() {
      setLoading(true);
      setPuzzleMessage("");
      setAttempts([]);
      setSolvedToday(false);
      setClueBought(false);
      setGuestHintUsed(false);
      setLetterBought(false);
      setRevealedLetter("");
      setPuzzleAnswer("");
      setCompleted(0);

      const today = getSingaporeDateString();
      const { data: puzzleData, error: puzzleError } = await supabase
        .from("milo_daily_puzzles")
        .select("id,date_sg,answer,base_clue,clue_text")
        .eq("date_sg", today)
        .eq("is_active", true)
        .single();

      if (!mounted) return;

      if (puzzleError || !puzzleData) {
        setPuzzle(null);
        setPuzzleMessage("Today’s Mastery Code could not be loaded.");
        setLoading(false);
        return;
      }

      const typedPuzzle = puzzleData as DailyPuzzle;
      setPuzzle(typedPuzzle);

      if (!userId) {
        setPuzzleMessage(
          "Guest mode: play the full Quick Play puzzle for free. Log in before a future run to save progress and collect DT.",
        );
        setLoading(false);
        return;
      }

      const { data: progressData, error: progressError } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("attempts,solved,clue_bought,letter_bought,revealed_letter")
        .eq("user_id", userId)
        .eq("puzzle_id", typedPuzzle.id)
        .maybeSingle();

      if (!mounted) return;
      if (progressError) {
        console.warn("Could not load Quick Play progress:", progressError.message);
      }

      if (progressData) {
        setAttempts((progressData.attempts || []) as MasteryAttempt[]);
        setSolvedToday(Boolean(progressData.solved));
        setClueBought(Boolean(progressData.clue_bought));
        setLetterBought(Boolean(progressData.letter_bought));
        setRevealedLetter(String(progressData.revealed_letter || ""));
      }

      const { count } = await supabase
        .from("milo_daily_puzzle_progress")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("solved", true);

      if (!mounted) return;
      setCompleted(count || 0);
      setLoading(false);
    }

    loadQuickPlay();
    return () => {
      mounted = false;
    };
  }, [userId]);

  async function savePuzzleProgress({
    nextAttempts,
    solved,
    nextClueBought = clueBought,
    nextLetterBought = letterBought,
    nextRevealedLetter = revealedLetter,
  }: {
    nextAttempts: MasteryAttempt[];
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
      setPuzzleMessage(`You need at least ${DAILY_CODE_CLUE_COST} DT to unlock today’s clue.`);
      return;
    }

    setBuyingClue(true);
    try {
      const spent = await onTokenTransaction(
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

      await onTokenTransaction(
        DAILY_CODE_CLUE_COST,
        `Refunded failed clue purchase for Mastery Code ${puzzle.date_sg}`,
      );
      setPuzzleMessage(`The clue could not be unlocked. Your ${DAILY_CODE_CLUE_COST} DT were returned.`);
    } finally {
      setBuyingClue(false);
    }
  }

  async function buyLetter() {
    if (!puzzle || letterBought || solvedToday) return;

    if (!userId) {
      setPuzzleMessage("Log in to use the 1 DT letter reveal.");
      return;
    }

    if (dreamTokens < 1) {
      setPuzzleMessage("You need at least 1 DT to reveal a letter.");
      return;
    }

    const letterHint = `${puzzle.answer[0].toUpperCase()} is in position 1`;
    const spent = await onTokenTransaction(
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
    if (!puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS) return;

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
      setPuzzleMessage(`“${guess}” is not recognised as an English word. This attempt was not used.`);
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
          ? "No attempts remain today. Survival Mode is always available if you want another Mastery Code run."
          : "Valid word accepted. Study the colours and try again.",
      );
      return;
    }

    setSolvedToday(true);
    setCompleted((current) => current + 1);
    const reward = getDailyCodeReward(nextAttempts.length);

    if (!userId) {
      setPuzzleMessage(`Code solved! This run was worth ${reward} DT. Log in before your next run to collect rewards.`);
      return;
    }

    const awarded = await onTokenTransaction(
      reward,
      `Solved Mastery Code ${puzzle.date_sg} in ${nextAttempts.length} guess${nextAttempts.length === 1 ? "" : "es"}`,
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
    if (!puzzle || solvedToday || attempts.length >= DAILY_CODE_MAX_ATTEMPTS) return;
    setPuzzleAnswer((current) => `${current}${letter}`.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
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
    cursor: disabled ? "not-allowed" : "pointer",
  });

  const currentLetters = useMemo(
    () => Array.from({ length: 5 }, (_, index) => puzzleAnswer[index] || ""),
    [puzzleAnswer],
  );

  return (
    <>
      <div
        style={{
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : wide
              ? "minmax(0, 1fr) 275px"
              : "minmax(0, 1fr) 235px",
          gridTemplateRows: mobile ? "auto auto" : "1fr",
          gap: mobile ? "7px" : dense ? "14px" : "20px",
        }}
      >
        <section
          style={{
            minWidth: 0,
            borderRadius: mobile ? "13px" : "19px",
            border: "1px solid rgba(126,232,255,0.1)",
            background: "rgba(255,255,255,0.025)",
            padding: mobile ? "6px" : dense ? "12px" : "16px",
            display: "grid",
            gridTemplateRows: "auto auto auto",
            gap: mobile ? "6px" : dense ? "9px" : "13px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
            <div>
              <p style={{ margin: 0, color: "#8ee8ff", fontSize: mobile ? "8px" : "10px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>
                Mastery Code · Quick Play
              </p>
              <h2 style={{ margin: mobile ? "3px 0 0" : "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? (dense ? "22px" : "27px") : dense ? "31px" : wide ? "43px" : "37px", lineHeight: 0.95, fontWeight: 400 }}>
                Today’s Code
              </h2>
              {!mobile && <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.48)", fontSize: dense ? "9px" : "11px" }}>Green = right place. Gold = right letter, wrong place.</p>}
            </div>
            <div style={{ flexShrink: 0, borderRadius: "999px", border: "1px solid rgba(126,232,255,0.2)", background: "rgba(83,215,255,0.07)", padding: mobile ? "5px 7px" : "7px 10px", textAlign: "right" }}>
              <span style={{ display: "block", color: "rgba(255,255,255,0.45)", fontSize: mobile ? "7px" : "8px", fontWeight: 850, textTransform: "uppercase" }}>Next reward</span>
              <strong style={{ color: "#9bf5ff", fontSize: mobile ? "10px" : "12px" }}>{solvedToday ? "Claimed" : `${nextReward} DT`}</strong>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", padding: "2px 0" }}>
            <MasteryCodeGrid
              attempts={attempts}
              currentLetters={currentLetters}
              wordLength={5}
              maxAttempts={DAILY_CODE_MAX_ATTEMPTS}
              cellSize={cellSize}
              mobile={mobile}
              wide={wide}
              dense={dense}
            />
          </div>

          <MasteryCodeKeyboard
            attempts={attempts}
            onLetter={addLetter}
            onDelete={deleteLetter}
            mobile={mobile}
            dense={dense}
            wide={wide}
            disabled={gameDisabled}
          />
        </section>

        <form onSubmit={submitPuzzle} style={{ minWidth: 0, borderRadius: mobile ? "13px" : "19px", border: "1px solid rgba(126,232,255,0.1)", background: "rgba(255,255,255,0.02)", padding: mobile ? "7px" : dense ? "11px" : "14px", display: "grid", gridTemplateColumns: mobile ? "repeat(2, minmax(0, 1fr))" : "1fr", alignContent: "center", gap: mobile ? "5px" : dense ? "8px" : "11px" }}>
          <div style={{ gridColumn: mobile ? "1 / -1" : "auto", borderRadius: "14px", border: "1px solid rgba(126,232,255,0.12)", background: "rgba(83,215,255,0.045)", padding: mobile ? "7px 9px" : "11px 12px" }}>
            <span style={{ color: "#8ee8ff", fontSize: mobile ? "7px" : "9px", fontWeight: 900, textTransform: "uppercase" }}>{clueBought ? "Today’s clue" : "Clue locked"}</span>
            <p style={{ margin: "5px 0 0", color: "rgba(255,255,255,0.7)", fontSize: mobile ? "9px" : "12px", lineHeight: 1.4 }}>
              {clueBought
                ? puzzle?.base_clue || "No clue is available."
                : loading
                  ? "Loading today’s code..."
                  : userId
                    ? `Buy today’s clue for ${DAILY_CODE_CLUE_COST} DT.`
                    : "Guests get one free clue."}
            </p>
            {clueBought && puzzle?.clue_text && <p style={{ margin: "5px 0 0", color: "#9bf5ff", fontSize: mobile ? "8px" : "10px" }}>{puzzle.clue_text}</p>}
            {letterBought && revealedLetter && <p style={{ margin: "5px 0 0", color: "#9bf5ff", fontSize: mobile ? "8px" : "10px" }}>Letter: {revealedLetter}</p>}
          </div>

          <button type="button" onClick={buyClue} disabled={!puzzle || clueBought || buyingClue || solvedToday} style={utilityButtonStyle(!puzzle || clueBought || buyingClue || solvedToday)}>
            {clueBought ? (userId ? "Clue Unlocked" : "Guest Hint Used") : buyingClue ? "Unlocking Clue..." : userId ? `Buy Clue · ${DAILY_CODE_CLUE_COST} DT` : "Guest Hint · Free"}
          </button>

          <button type="button" onClick={buyLetter} disabled={!puzzle || letterBought || solvedToday || !userId} style={utilityButtonStyle(!puzzle || letterBought || solvedToday || !userId)}>
            {letterBought ? "Letter Revealed" : userId ? "Buy Letter · 1 DT" : "Log In for Letter Hint"}
          </button>

          <button type="submit" disabled={gameDisabled} style={{ ...utilityButtonStyle(gameDisabled, true), gridColumn: mobile ? "1 / -1" : "auto" }}>
            {loading ? "Loading Code" : wordListLoading ? "Loading Word List" : solvedToday ? "Code Completed" : "Submit Guess"}
          </button>

          {!mobile && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "6px" }}>
              <StatBox label="Attempts" value={`${remainingAttempts}/${DAILY_CODE_MAX_ATTEMPTS}`} />
              <StatBox label={userId ? "Completed" : "Guest Run"} value={userId ? String(completed) : solvedToday ? "1" : "0"} />
              <StatBox label="Status" value={solvedToday ? "Solved" : "Active"} />
            </div>
          )}

          <div role="status" style={{ gridColumn: mobile ? "1 / -1" : "auto", minHeight: mobile ? "28px" : dense ? "42px" : "54px", borderRadius: "11px", border: "1px solid rgba(126,232,255,0.09)", background: "rgba(255,255,255,0.025)", padding: mobile ? "5px 7px" : "9px 10px", display: "flex", alignItems: "center", justifyContent: "center", color: solvedToday ? "#9fffd2" : "#8ee8ff", fontSize: mobile ? "8px" : dense ? "10px" : "11px", fontWeight: 750, lineHeight: 1.35, textAlign: "center" }}>
            {puzzleMessage || "Only recognised five-letter English words are accepted."}
          </div>
        </form>
      </div>

      <DailyActivityReferralPrompt open={showDailyReferralPrompt} onClose={() => setShowDailyReferralPrompt(false)} />
    </>
  );
}
