"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { supabase } from "@/lib/supabase";
import DailyActivityReferralPrompt, {
  canOfferDailyReferralPrompt,
} from "@/components/DailyActivityReferralPrompt";
import MasteryCodeKeyboard from "./MasteryCodeKeyboard";
import MasteryCodeGrid from "./MasteryCodeGrid";
import {
  buildPuzzleFeedback,
  getSingaporeDateString,
  getSingaporeDayUtcBounds,
  getSurvivalMaxAttempts,
  getSurvivalRewardTarget,
  getSurvivalWordLength,
  type MasteryAttempt,
} from "./mastery-code-shared";

type RunEndState = {
  failedLevel: number;
  wordsCleared: number;
  answer: string;
  rewardTarget: number;
  rewardDelta: number;
  newBest: boolean;
};

function personalBestKey(userId: string) {
  return `milo-mastery-survival-best-${userId || "guest"}`;
}

function dailyBestKey(userId: string) {
  return `milo-mastery-survival-daily-${getSingaporeDateString()}-${userId || "guest"}`;
}

function pickTier(level: number, wordLength: number): "easy" | "medium" | "hard" {
  if (wordLength === 5) return level <= 2 ? "easy" : "medium";
  if (wordLength === 6) return level <= 5 ? "easy" : "medium";
  if (level <= 10) return "easy";
  if (level <= 15) return "medium";
  return "hard";
}

export default function MasteryCodeSurvival({
  userId,
  mobile,
  wide,
  dense,
  width,
  height,
  onTokenTransaction,
}: {
  userId: string;
  mobile: boolean;
  wide: boolean;
  dense: boolean;
  width: number;
  height: number;
  onTokenTransaction: (amount: number, description: string) => Promise<boolean>;
}) {
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [validatingGuess, setValidatingGuess] = useState(false);
  const [runActive, setRunActive] = useState(false);
  const [level, setLevel] = useState(1);
  const [answer, setAnswer] = useState("");
  const [attempts, setAttempts] = useState<MasteryAttempt[]>([]);
  const [currentLetters, setCurrentLetters] = useState<string[]>([]);
  const [revealedPositions, setRevealedPositions] = useState<number[]>([]);
  const [hintsRemaining, setHintsRemaining] = useState(3);
  const [wordsCleared, setWordsCleared] = useState(0);
  const [message, setMessage] = useState(
    "Start a run. One failed word ends it. Your three hints must last for the entire run.",
  );
  const [transitionText, setTransitionText] = useState("");
  const [runEnd, setRunEnd] = useState<RunEndState | null>(null);
  const [personalBest, setPersonalBest] = useState(0);
  const [dailyBest, setDailyBest] = useState(0);
  const [rewarding, setRewarding] = useState(false);
  const [showDailyReferralPrompt, setShowDailyReferralPrompt] = useState(false);
  const usedAnswersRef = useRef<Set<string>>(new Set());
  const dictionaryCacheRef = useRef<Map<string, boolean>>(new Map());

  const wordLength = getSurvivalWordLength(level);
  const maxAttempts = getSurvivalMaxAttempts(wordLength);
  const mobileTarget = dense ? 57 : 72;
  const mobileGap = 4;
  const mobileAllowance = 44;
  const mobileCap = Math.floor(
    (Math.max(width, 320) - mobileAllowance - mobileGap * (wordLength - 1)) /
      wordLength,
  );

  // Desktop/tablet sizing must respond to HEIGHT as well as width.
  // Survival can display up to 8 grid rows plus a 3-row keyboard, so using
  // width-only sizing causes the bottom keyboard rows to be clipped when the
  // browser window is resized or on landscape tablets/laptops.
  const shortViewport = !mobile && height < 960;
  const veryShortViewport = !mobile && height < 820;

  const desktopCellSize = (() => {
    if (veryShortViewport) {
      return wordLength === 7 ? 36 : wordLength === 6 ? 40 : 44;
    }

    if (shortViewport) {
      return wordLength === 7 ? 42 : wordLength === 6 ? 47 : 52;
    }

    if (dense) {
      return wordLength === 7 ? 43 : 48;
    }

    if (wide) {
      return wordLength === 7 ? 58 : 66;
    }

    return wordLength === 7 ? 50 : 56;
  })();

  const cellSize = mobile
    ? Math.max(36, Math.min(mobileTarget, mobileCap))
    : desktopCellSize;

  const survivalGap = mobile
    ? "6px"
    : veryShortViewport
      ? "6px"
      : shortViewport
        ? "8px"
        : dense
          ? "9px"
          : "13px";

  useEffect(() => {
    try {
      setPersonalBest(Number(window.localStorage.getItem(personalBestKey(userId))) || 0);
      setDailyBest(Number(window.localStorage.getItem(dailyBestKey(userId))) || 0);
    } catch {
      setPersonalBest(0);
      setDailyBest(0);
    }
  }, [userId]);

  async function chooseAnswer(nextLevel: number) {
    const length = getSurvivalWordLength(nextLevel);
    const difficulty = pickTier(nextLevel, length);
    const excludeWords = Array.from(usedAnswersRef.current).slice(-250);

    const { data, error } = await supabase.rpc(
      "milo_mastery_survival_get_answer",
      {
        p_word_length: length,
        p_difficulty: difficulty,
        p_exclude_words: excludeWords,
      },
    );

    if (error) {
      console.warn("Could not load a Survival answer:", error.message);
      return "";
    }

    const selected = String(data || "").trim().toUpperCase();

    if (
      selected.length !== length ||
      !new RegExp(`^[A-Z]{${length}}$`).test(selected)
    ) {
      console.warn("Survival answer RPC returned an invalid answer:", selected);
      return "";
    }

    usedAnswersRef.current.add(selected.toLowerCase());
    return selected;
  }

  async function isRecognisedEnglishWord(word: string) {
    const key = word.trim().toLowerCase();
    const cached = dictionaryCacheRef.current.get(key);

    if (cached !== undefined) return cached;

    const { data, error } = await supabase.rpc(
      "milo_mastery_survival_is_valid_guess",
      { p_word: key },
    );

    if (error) {
      console.warn("Could not validate Survival dictionary word:", error.message);
      throw error;
    }

    const recognised = Boolean(data);
    dictionaryCacheRef.current.set(key, recognised);
    return recognised;
  }

  function resetInputForAnswer(nextAnswer: string, hints: number[] = []) {
    setCurrentLetters(
      Array.from({ length: nextAnswer.length }, (_, index) =>
        hints.includes(index) ? nextAnswer[index] : "",
      ),
    );
  }

  async function openLevel(nextLevel: number, existingHints: number[] = []) {
    setLoadingAnswer(true);

    try {
      const nextAnswer = await chooseAnswer(nextLevel);

      if (!nextAnswer) {
        setMessage("A Survival word could not be loaded. Please try again.");
        setRunActive(false);
        return false;
      }

      setLevel(nextLevel);
      setAnswer(nextAnswer);
      setAttempts([]);
      setRevealedPositions(existingHints);
      resetInputForAnswer(nextAnswer, existingHints);
      return true;
    } finally {
      setLoadingAnswer(false);
    }
  }

  async function startRun() {
    if (loadingAnswer) return;

    usedAnswersRef.current = new Set();
    setRunEnd(null);
    setWordsCleared(0);
    setHintsRemaining(3);
    setTransitionText("");
    setMessage("Survive as long as you can. One failed word ends the run.");
    setRunActive(true);

    await openLevel(1, []);
  }

  function addLetter(letter: string) {
    if (!runActive || transitionText || runEnd) return;

    setCurrentLetters((current) => {
      const next = [...current];
      const index = next.findIndex(
        (value, position) => !value && !revealedPositions.includes(position),
      );
      if (index >= 0) next[index] = letter.toUpperCase();
      return next;
    });
  }

  function deleteLetter() {
    if (!runActive || transitionText || runEnd) return;

    setCurrentLetters((current) => {
      const next = [...current];
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index] && !revealedPositions.includes(index)) {
          next[index] = "";
          break;
        }
      }
      return next;
    });
  }

  function useHint() {
    if (!runActive || hintsRemaining <= 0 || transitionText || runEnd) return;

    const available = Array.from({ length: wordLength }, (_, index) => index).filter(
      (index) => !revealedPositions.includes(index),
    );
    if (!available.length) {
      setMessage("Every position in this word has already been revealed.");
      return;
    }

    const position = available[Math.floor(Math.random() * available.length)];
    const nextRevealed = [...revealedPositions, position].sort((a, b) => a - b);
    setRevealedPositions(nextRevealed);
    setHintsRemaining((current) => Math.max(0, current - 1));
    setCurrentLetters((current) => {
      const next = [...current];
      next[position] = answer[position];
      return next;
    });
    setMessage(
      `Hint used: position ${position + 1} is ${answer[position]}. ${hintsRemaining - 1} hint${hintsRemaining - 1 === 1 ? "" : "s"} remain for this run.`,
    );
  }

  async function loadAlreadyAwardedToday() {
    if (!userId) return 0;
    const { start, end } = getSingaporeDayUtcBounds();
    const { data, error } = await supabase
      .from("dream_token_transactions")
      .select("amount,title,created_at")
      .eq("user_id", userId)
      .eq("token_kind", "virtual")
      .gte("created_at", start)
      .lt("created_at", end)
      .ilike("title", "Mastery Code Survival%")
      .gt("amount", 0);

    if (error) {
      console.warn("Could not load Survival DT already awarded today:", error.message);
      return 0;
    }

    return (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  }

  async function endRun(failedLevel: number) {
    if (rewarding) return;
    setRunActive(false);
    setRewarding(true);

    const cleared = Math.max(0, failedLevel - 1);
    const target = getSurvivalRewardTarget(failedLevel);
    const newBest = failedLevel > personalBest;
    let rewardDelta = 0;

    if (newBest) {
      setPersonalBest(failedLevel);
      try {
        window.localStorage.setItem(personalBestKey(userId), String(failedLevel));
      } catch {
        // Local persistence is optional; the run can still end normally.
      }
    }

    if (failedLevel > dailyBest) {
      setDailyBest(failedLevel);
      try {
        window.localStorage.setItem(dailyBestKey(userId), String(failedLevel));
      } catch {
        // Local persistence is optional.
      }
    }

    if (userId && target > 0) {
      const alreadyAwarded = await loadAlreadyAwardedToday();
      rewardDelta = Math.max(0, target - alreadyAwarded);

      if (rewardDelta > 0) {
        const awarded = await onTokenTransaction(
          rewardDelta,
          `Mastery Code Survival daily best · failed level ${failedLevel}`,
        );
        if (!awarded) rewardDelta = 0;
        if (awarded && canOfferDailyReferralPrompt()) {
          setShowDailyReferralPrompt(true);
        }
      }
    }

    setRunEnd({
      failedLevel,
      wordsCleared: cleared,
      answer,
      rewardTarget: target,
      rewardDelta,
      newBest,
    });
    setMessage(
      userId
        ? rewardDelta > 0
          ? `Run ended. Your improved daily best earned +${rewardDelta} DT.`
          : "Run ended. Beat today’s best level to increase your Survival DT reward."
        : "Run ended. Guests can play unlimited runs; log in to save DT rewards.",
    );
    setRewarding(false);
  }

  async function submitGuess(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!runActive || transitionText || runEnd || !answer) return;

    const guess = currentLetters.join("").toUpperCase();
    if (guess.length !== wordLength || currentLetters.some((letter) => !letter)) {
      setMessage(`Enter a complete ${wordLength}-letter word.`);
      return;
    }

    const isAnswer = guess === answer;

    if (!isAnswer) {
      setValidatingGuess(true);

      try {
        const recognised = await isRecognisedEnglishWord(guess);

        if (!recognised) {
          setMessage(
            `“${guess}” is not recognised in the Survival English dictionary.`,
          );
          return;
        }
      } catch {
        setMessage(
          "Dictionary validation is temporarily unavailable. Please try that guess again.",
        );
        return;
      } finally {
        setValidatingGuess(false);
      }
    }

    const feedback = buildPuzzleFeedback(guess, answer);
    const nextAttempts = [...attempts, { guess, feedback }];
    setAttempts(nextAttempts);

    if (isAnswer) {
      const nextLevel = level + 1;
      setWordsCleared((current) => current + 1);

      const nextLength = getSurvivalWordLength(nextLevel);
      const lengthChanged = nextLength !== wordLength;
      setTransitionText(
        lengthChanged
          ? `LEVEL ${nextLevel} · ${nextLength}-LETTER WORDS BEGIN`
          : `LEVEL ${level} CLEARED`,
      );
      setMessage("Word cleared. Get ready for the next code.");

      window.setTimeout(() => {
        setTransitionText("");
        void openLevel(nextLevel, []);
      }, lengthChanged ? 1250 : 700);
      return;
    }

    if (nextAttempts.length >= maxAttempts) {
      await endRun(level);
      return;
    }

    resetInputForAnswer(answer, revealedPositions);
    setMessage(`${maxAttempts - nextAttempts.length} guess${maxAttempts - nextAttempts.length === 1 ? "" : "es"} remain on Level ${level}.`);
  }

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if (!runActive || event.metaKey || event.ctrlKey || event.altKey) return;
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
        void submitGuess();
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  });

  return (
    <>
      <div
        style={{
          minWidth: 0,
          display: "grid",
          gridTemplateColumns: mobile
            ? "1fr"
            : wide
              ? "minmax(0, 1fr) 290px"
              : "minmax(0, 1fr) 250px",
          gridTemplateRows: mobile ? "auto auto" : "1fr",
          gap: mobile ? "7px" : dense ? "14px" : "20px",
        }}
      >
        <section
          style={{
            position: "relative",
            minWidth: 0,
            borderRadius: mobile ? "13px" : "19px",
            border: "1px solid rgba(213,181,255,0.18)",
            background:
              "radial-gradient(circle at 50% 0%, rgba(197,140,255,0.08), transparent 38%), rgba(255,255,255,0.025)",
            padding: mobile ? "6px" : dense ? "12px" : "16px",
            display: "grid",
            gridTemplateRows: "auto auto auto",
            gap: survivalGap,
            overflow: "visible",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "flex-start" }}>
            <div>
              <p style={{ margin: 0, color: "#d5b5ff", fontSize: mobile ? "8px" : "10px", fontWeight: 900, letterSpacing: "0.17em", textTransform: "uppercase" }}>
                Mastery Code · Survival Mode
              </p>
              <h2 style={{ margin: mobile ? "3px 0 0" : "6px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile
                  ? dense
                    ? "22px"
                    : "27px"
                  : veryShortViewport
                    ? "28px"
                    : shortViewport
                      ? "33px"
                      : dense
                        ? "31px"
                        : wide
                          ? "43px"
                          : "37px", lineHeight: 0.95, fontWeight: 400 }}>
                {runActive || runEnd ? `Level ${level}` : "Survive the Code"}
              </h2>
            </div>

            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {[
                ["Hints", `${"◆".repeat(hintsRemaining)}${"◇".repeat(3 - hintsRemaining)}`],
                ["Run", String(wordsCleared)],
                ["Best", personalBest ? `L${personalBest}` : "—"],
              ].map(([label, value]) => (
                <div key={label} style={{ minWidth: mobile ? "58px" : "68px", padding: mobile ? "5px 7px" : "7px 9px", borderRadius: "12px", border: "1px solid rgba(213,181,255,0.15)", background: "rgba(197,140,255,0.055)", textAlign: "center" }}>
                  <span style={{ display: "block", color: "rgba(255,255,255,0.42)", fontSize: "7px", textTransform: "uppercase", fontWeight: 850 }}>{label}</span>
                  <strong style={{ display: "block", marginTop: "2px", color: label === "Hints" ? "#d5b5ff" : "white", fontSize: mobile ? "10px" : "12px" }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          {!runActive && !runEnd ? (
            <div style={{ minHeight: mobile ? "300px" : "360px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
              <div style={{ width: "74px", height: "74px", borderRadius: "999px", border: "1px solid rgba(213,181,255,0.4)", background: "rgba(197,140,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "#d5b5ff", fontSize: "30px", boxShadow: "0 0 34px rgba(197,140,255,0.12)" }}>◆</div>
              <h3 style={{ margin: "18px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? "28px" : "38px", fontWeight: 400 }}>One run. Three hints. Keep going.</h3>
              <p style={{ margin: "13px 0 0", maxWidth: "650px", color: "rgba(255,255,255,0.62)", fontSize: mobile ? "12px" : "14px", lineHeight: 1.6 }}>
                Levels 1–3 use five-letter words. Levels 4–7 use six-letter words. Level 8 onward uses seven-letter words. One failed word ends the run.
              </p>
              <button type="button" disabled={loadingAnswer} onClick={() => void startRun()} style={{ marginTop: "22px", minHeight: "50px", padding: "0 26px", borderRadius: "999px", border: "1px solid rgba(213,181,255,0.55)", background: "linear-gradient(90deg, rgba(106,62,181,0.95), rgba(32,126,166,0.9))", color: "white", fontFamily: "inherit", fontSize: "12px", fontWeight: 900, cursor: loadingAnswer ? "not-allowed" : "pointer" }}>
                {loadingAnswer ? "Loading Word..." : "Start Survival Run"}
              </button>
            </div>
          ) : runEnd ? (
            <div style={{ minHeight: mobile ? "300px" : "360px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "24px" }}>
              <p style={{ margin: 0, color: "#d5b5ff", fontSize: "10px", fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase" }}>Run Ended</p>
              <h3 style={{ margin: "10px 0 0", fontFamily: 'Georgia, "Times New Roman", serif', fontSize: mobile ? "38px" : "56px", fontWeight: 400 }}>Level {runEnd.failedLevel}</h3>
              <p style={{ margin: "10px 0 0", color: "rgba(255,255,255,0.66)", fontSize: "14px" }}>{runEnd.wordsCleared} words cleared · Answer: <strong style={{ color: "white" }}>{runEnd.answer}</strong></p>
              {runEnd.newBest && <div style={{ marginTop: "12px", padding: "7px 12px", borderRadius: "999px", background: "rgba(106,255,155,0.09)", border: "1px solid rgba(106,255,155,0.24)", color: "#9fffd2", fontSize: "10px", fontWeight: 900 }}>★ NEW PERSONAL BEST</div>}
              <p style={{ margin: "16px 0 0", color: runEnd.rewardDelta > 0 ? "#9fffd2" : "rgba(255,255,255,0.52)", fontSize: "12px", lineHeight: 1.5 }}>
                {userId
                  ? runEnd.rewardDelta > 0
                    ? `+${runEnd.rewardDelta} DT · daily Survival reward improved`
                    : `Daily reward target at this level: ${runEnd.rewardTarget} DT · no additional DT because today’s best payout is already at least this high.`
                  : "Guest run · log in to earn DT from your daily best Survival result."}
              </p>
              <button type="button" onClick={() => void startRun()} style={{ marginTop: "20px", minHeight: "48px", padding: "0 24px", borderRadius: "999px", border: "1px solid rgba(213,181,255,0.52)", background: "rgba(197,140,255,0.12)", color: "white", fontFamily: "inherit", fontSize: "11px", fontWeight: 900, cursor: "pointer" }}>Play Again</button>
            </div>
          ) : (
            <>
              <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "visible", padding: "2px 0" }}>
                <MasteryCodeGrid
                  attempts={attempts}
                  currentLetters={currentLetters}
                  wordLength={wordLength}
                  maxAttempts={maxAttempts}
                  cellSize={cellSize}
                  mobile={mobile}
                  wide={wide}
                  dense={dense}
                  hintedPositions={revealedPositions}
                />

                {transitionText && (
                  <div style={{ position: "absolute", inset: 0, zIndex: 5, borderRadius: "18px", background: "rgba(2,8,21,0.88)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "20px", color: "#d5b5ff", fontSize: mobile ? "18px" : "25px", fontWeight: 900, letterSpacing: "0.08em" }}>
                    {transitionText}
                  </div>
                )}
              </div>

              <MasteryCodeKeyboard
                attempts={attempts}
                onLetter={addLetter}
                onDelete={deleteLetter}
                mobile={mobile}
                dense={dense}
                wide={wide}
                viewportHeight={height}
                disabled={!runActive || Boolean(transitionText) || rewarding || validatingGuess || loadingAnswer}
              />
            </>
          )}
        </section>

        <form onSubmit={submitGuess} style={{ minWidth: 0, borderRadius: mobile ? "13px" : "19px", border: "1px solid rgba(213,181,255,0.13)", background: "rgba(255,255,255,0.02)", padding: mobile ? "8px" : dense ? "12px" : "15px", display: "grid", gridTemplateColumns: mobile ? "repeat(2, minmax(0,1fr))" : "1fr", alignContent: "center", gap: mobile ? "6px" : "10px" }}>
          <div style={{ gridColumn: mobile ? "1 / -1" : "auto", padding: "12px", borderRadius: "14px", border: "1px solid rgba(213,181,255,0.13)", background: "rgba(197,140,255,0.045)" }}>
            <p style={{ margin: 0, color: "#d5b5ff", fontSize: "9px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase" }}>Survival rules</p>
            <p style={{ margin: "7px 0 0", color: "rgba(255,255,255,0.63)", fontSize: mobile ? "9px" : "11px", lineHeight: 1.5 }}>One failed word ends the run. Hints reveal a correct-position letter and do not reset between levels.</p>
          </div>

          <button type="button" disabled={!runActive || hintsRemaining <= 0 || Boolean(transitionText)} onClick={useHint} style={{ minHeight: mobile ? "46px" : "52px", borderRadius: "13px", border: "1px solid rgba(213,181,255,0.32)", background: "rgba(197,140,255,0.09)", color: hintsRemaining > 0 ? "white" : "rgba(255,255,255,0.32)", fontFamily: "inherit", fontSize: "11px", fontWeight: 900, cursor: runActive && hintsRemaining > 0 ? "pointer" : "not-allowed" }}>
            Use Hint · {hintsRemaining} Left
          </button>

          <button type="submit" disabled={!runActive || Boolean(transitionText) || rewarding} style={{ minHeight: mobile ? "46px" : "52px", borderRadius: "13px", border: "1px solid rgba(126,232,255,0.42)", background: "linear-gradient(90deg, rgba(32,126,166,0.92), rgba(106,62,181,0.92))", color: runActive ? "white" : "rgba(255,255,255,0.32)", fontFamily: "inherit", fontSize: "11px", fontWeight: 900, cursor: runActive ? "pointer" : "not-allowed", gridColumn: mobile ? "1 / -1" : "auto" }}>
            {validatingGuess ? "Checking Word..." : "Submit Guess"}
          </button>

          <div style={{ gridColumn: mobile ? "1 / -1" : "auto", display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: "6px" }}>
            <div style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}><span style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "8px" }}>DAILY BEST</span><strong style={{ display: "block", marginTop: "3px", fontSize: "12px" }}>{dailyBest ? `L${dailyBest}` : "—"}</strong></div>
            <div style={{ padding: "9px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.08)", textAlign: "center" }}><span style={{ display: "block", color: "rgba(255,255,255,0.4)", fontSize: "8px" }}>DT TARGET</span><strong style={{ display: "block", marginTop: "3px", color: "#9fffd2", fontSize: "12px" }}>{getSurvivalRewardTarget(level)} DT</strong></div>
          </div>

          <div role="status" style={{ gridColumn: mobile ? "1 / -1" : "auto", minHeight: mobile ? "34px" : "58px", padding: "8px 10px", borderRadius: "12px", border: "1px solid rgba(213,181,255,0.1)", background: "rgba(255,255,255,0.025)", color: "#d5b5ff", fontSize: mobile ? "9px" : "11px", lineHeight: 1.45, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
            {message}
          </div>
        </form>
      </div>

      <DailyActivityReferralPrompt open={showDailyReferralPrompt} onClose={() => setShowDailyReferralPrompt(false)} />
    </>
  );
}
