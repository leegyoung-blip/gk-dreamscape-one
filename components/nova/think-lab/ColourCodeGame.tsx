"use client";

import { useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  CLUE_COST,
  COLOUR_MAX_ATTEMPTS,
  COLOURS,
  DAILY_LIMIT,
  GamePanel,
  formatSupabaseError,
  InstructionBar,
  PrimaryButton,
  RewardResult,
  DailyLevelTabs,
  CompletedSelectedLevel,
  seededRandom,
  seededShuffle,
  colourById,
  makeSeed,
  dailyLevelName,
  rewardForDailyLevel,
  colourCountForLevel,
} from "./shared";
import type { ColourOption, GameId, DailyLevelNumber, DailyLevelStatus, CompletionResult, ClueResult } from "./shared";

type ColourCodeAttempt = {
  guess: string[];
  exact: number;
  misplaced: number;
};

function createColourSecret(
  seedText: string,
  availableColours: ColourOption[]
) {
  const random = seededRandom(seedText);

  return Array.from({ length: 4 }, () => {
    const index = Math.floor(random() * availableColours.length);
    return availableColours[index].id;
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

export function ColourCodeGame({
  userId,
  isGuest,
  activityDate,
  questionNumber,
  cluesUsed,
  levelStatuses,
  tokenBalance,
  onSelectLevel,
  onBuyClue,
  onComplete,
  onContinue,
  walkthroughHighlightClue = false,
}: {
  userId: string;
  isGuest: boolean;
  activityDate: string;
  questionNumber: DailyLevelNumber;
  cluesUsed: number;
  levelStatuses: Record<DailyLevelNumber, DailyLevelStatus>;
  tokenBalance: number;
  walkthroughHighlightClue?: boolean;
  onSelectLevel: (level: DailyLevelNumber) => void;
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
  const availableColours = useMemo(
    () => COLOURS.slice(0, colourCountForLevel(levelNumber)),
    [levelNumber]
  );
  const expectedReward = rewardForDailyLevel(levelNumber);
  const selectedLevelStatus = levelStatuses[levelNumber];
  const seed = makeSeed(userId, activityDate, "colour-code", levelNumber);
  const secret = useMemo(
    () => createColourSecret(seed, availableColours),
    [availableColours, seed]
  );
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
    if (busy || localClues >= (isGuest ? 1 : 4)) return;
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
          <div style={{ display: "grid", gap: "7px" }}>
            <DailyLevelTabs
              selectedLevel={levelNumber}
              levelStatuses={levelStatuses}
              game="colour-code"
              onSelectLevel={onSelectLevel}
            />
            <InstructionBar
              items={[
                { label: "Level", value: dailyLevelName(levelNumber) },
                { label: "Attempts", value: String(attempts.length) },
                { label: "Clues", value: String(localClues) },
              ]}
            />
          </div>
        }
      >
        <RewardResult
          title="Code cracked!"
          text={`You solved the ${dailyLevelName(levelNumber).toLowerCase()} code using ${availableColours.length} available colours.`}
          reward={completion.reward}
          isGuest={isGuest}
          score={finalScore}
          isLastQuestion={completion.completedCount >= DAILY_LIMIT}
          onContinue={onContinue}
        />
      </GamePanel>
    );
  }

  if (selectedLevelStatus.completed) {
    return (
      <GamePanel
        top={
          <div style={{ display: "grid", gap: "7px" }}>
            <DailyLevelTabs
              selectedLevel={levelNumber}
              levelStatuses={levelStatuses}
              game="colour-code"
              onSelectLevel={onSelectLevel}
            />
            <InstructionBar
              items={[
                { label: "Level", value: dailyLevelName(levelNumber) },
                { label: "Palette", value: `${availableColours.length} colours` },
                { label: "Status", value: "Complete" },
              ]}
            />
          </div>
        }
      >
        <CompletedSelectedLevel
          gameTitle="Colour Code"
          level={levelNumber}
          detail={`${availableColours.length} available colours`}
          reward={selectedLevelStatus.reward || expectedReward}
          isGuest={isGuest}
        />
      </GamePanel>
    );
  }

  return (
    <GamePanel
      top={
        <div style={{ display: "grid", gap: "7px" }}>
          <DailyLevelTabs
            selectedLevel={levelNumber}
            levelStatuses={levelStatuses}
            game="colour-code"
            onSelectLevel={onSelectLevel}
          />
          <InstructionBar
            items={[
              { label: "Level", value: dailyLevelName(levelNumber) },
              {
                label: "Attempts",
                value: `${attempts.length}/${COLOUR_MAX_ATTEMPTS}`,
              },
              { label: "Reward", value: `${expectedReward} DT` },
            ]}
          />
        </div>
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

          <div
            className="colour-palette"
            aria-label="Choose a colour"
            style={{
              "--palette-count": availableColours.length,
            } as CSSProperties}
          >
            {availableColours.map((colour) => (
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
              className={`clue-button ${
                walkthroughHighlightClue ? "is-walkthrough-highlighted" : ""
              }`}
              onClick={buyClue}
              disabled={
                busy ||
                localClues >= (isGuest ? 1 : 4) ||
                (!isGuest && tokenBalance < CLUE_COST)
              }
            >
              {isGuest
                ? localClues >= 1
                  ? "Guest Hint used"
                  : "Guest Hint · Free"
                : localClues >= 4
                  ? "All revealed"
                  : `Clue · ${CLUE_COST} DT`}
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
          --colour-circle-size: clamp(58px, 6.2vw, 78px);
          --colour-circle-gap: clamp(10px, 1.3vw, 16px);
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
          gap: var(--colour-circle-gap);
        }
        .current-guess button {
          width: var(--colour-circle-size);
          height: var(--colour-circle-size);
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
          width: 100%;
          display: grid;
          grid-template-columns: repeat(var(--palette-count), var(--colour-circle-size));
          justify-content: center;
          gap: var(--colour-circle-gap);
        }
        .colour-palette button {
          width: var(--colour-circle-size);
          height: var(--colour-circle-size);
          min-width: 0;
          padding: 5px;
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
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
        }
        .clue-button:disabled { opacity: 0.4; cursor: not-allowed; }
        .clue-button.is-walkthrough-highlighted {
          position: relative;
          z-index: 125;
          border-color: rgba(255, 224, 126, 0.82);
          background: rgba(255, 211, 110, 0.17);
          box-shadow:
            0 0 0 3px rgba(255, 211, 110, 0.09),
            0 0 30px rgba(255, 211, 110, 0.34);
          filter: brightness(1.2);
          animation: clueButtonGlow 1.4s ease-in-out infinite alternate;
        }
        @keyframes clueButtonGlow {
          from {
            box-shadow:
              0 0 0 3px rgba(255,211,110,.08),
              0 0 18px rgba(255,211,110,.22);
          }
          to {
            box-shadow:
              0 0 0 5px rgba(255,211,110,.14),
              0 0 34px rgba(255,211,110,.42);
          }
        }
        .colour-message {
          width: min(620px, 100%);
          min-height: 42px;
          margin-top: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: rgba(235, 247, 255, 0.82);
          font-size: 16px;
          line-height: 1.4;
          font-weight: 700;
          text-align: center;
        }
        .colour-message strong { color: #ff9ca8; }
        .answer-strip { display: flex; gap: 5px; }
        .answer-strip i { width: 18px; height: 18px; border-radius: 999px; }

        .attempt-board {
          padding: 12px;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          overflow: hidden;
        }
        .attempt-heading {
          width: 100%;
          flex: 0 0 auto;
          padding: 4px 8px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.12);
          text-align: center;
        }
        .attempt-heading h3 { margin: 0; font-size: 20px; }
        .attempt-heading > span {
          display: flex;
          align-items: center;
          gap: 7px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 12px;
          font-weight: 750;
        }
        .attempt-heading i { width: 10px; height: 10px; border-radius: 999px; }
        .exact-dot { background: #63e7a3; }
        .misplaced-dot { margin-left: 5px; background: #ffd465; }
        .attempt-list {
          width: 100%;
          flex: 1 1 auto;
          min-height: 0;
          padding: 10px 5px 4px 0;
          display: flex;
          flex-direction: column;
          gap: 7px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(102, 217, 255, 0.46) rgba(255, 255, 255, 0.04);
        }
        .attempt-list::-webkit-scrollbar { width: 8px; }
        .attempt-list::-webkit-scrollbar-track {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.035);
        }
        .attempt-list::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: rgba(102, 217, 255, 0.42);
        }
        .attempt-row {
          width: 100%;
          flex: 0 0 48px;
          min-height: 48px;
          padding: 6px 14px;
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 82px;
          align-items: center;
          gap: 12px;
          border-radius: 11px;
          border: 1px solid rgba(137, 215, 255, 0.055);
          background: rgba(255, 255, 255, 0.028);
        }
        .attempt-row.is-current {
          border-color: rgba(102, 217, 255, 0.4);
          background: rgba(102, 217, 255, 0.085);
          box-shadow: inset 0 0 18px rgba(102, 217, 255, 0.035);
        }
        .attempt-number {
          color: rgba(235, 247, 255, 0.48);
          font-size: 12px;
          font-weight: 850;
        }
        .attempt-circles {
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: clamp(9px, 1.1vw, 16px);
        }
        .attempt-circles span {
          width: clamp(23px, 2vw, 31px);
          height: clamp(23px, 2vw, 31px);
          flex: 0 0 auto;
          border-radius: 999px;
          border: 2px dashed rgba(131, 219, 255, 0.24);
          background: rgba(2, 10, 22, 0.66);
        }
        .attempt-circles span.is-filled {
          border-style: solid;
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: inset 0 3px 7px rgba(255, 255, 255, 0.18);
        }
        .attempt-result {
          display: flex;
          justify-content: flex-end;
          gap: 7px;
          font-size: 11px;
          font-weight: 900;
        }
        .attempt-result span {
          min-width: 28px;
          height: 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
        }
        .exact-result { background: rgba(99, 231, 163, 0.14); color: #82efb7; }
        .misplaced-result { background: rgba(255, 212, 101, 0.13); color: #ffdc82; }
        .empty-result { color: rgba(235, 247, 255, 0.22); }

        @media (max-width: 900px) {
          .colour-layout { grid-template-columns: minmax(0, 1fr) minmax(245px, 0.78fr); gap: 6px; }
          .colour-focus {
            --colour-circle-size: clamp(50px, 6vw, 64px);
            --colour-circle-gap: 8px;
          }
        }
        @media (max-width: 720px) {
          .colour-layout { grid-template-columns: 1fr; grid-template-rows: minmax(210px, 0.82fr) minmax(0, 1.18fr); gap: 5px; }
          .colour-focus {
            --colour-circle-size: clamp(38px, 11vw, 50px);
            --colour-circle-gap: 5px;
            padding: 6px;
            justify-content: flex-start;
          }
          .secret-row span { width: 24px; height: 24px; font-size: 10px; }
          .current-guess { margin: 7px 0; }
          .current-guess button { border-width: 2px; }
          .colour-palette button { padding: 3px; }
          .colour-actions { margin-top: 5px; gap: 5px; }
          .clue-button { min-height: 34px; font-size: 9px; }
          .colour-message { min-height: 32px; margin-top: 4px; font-size: 13px; line-height: 1.32; }
          .attempt-board { padding: 6px; }
          .attempt-heading { padding: 2px 3px 6px; gap: 9px; }
          .attempt-heading h3 { font-size: 14px; }
          .attempt-heading > span { font-size: 9px; gap: 4px; }
          .attempt-heading i { width: 8px; height: 8px; }
          .attempt-list { padding: 5px 3px 2px 0; gap: 5px; }
          .attempt-row {
            flex-basis: 39px;
            min-height: 39px;
            grid-template-columns: 24px minmax(0, 1fr) 62px;
            padding: 4px 8px;
            gap: 6px;
          }
          .attempt-number { font-size: 10px; }
          .attempt-circles { gap: clamp(6px, 2vw, 10px); }
          .attempt-circles span { width: clamp(18px, 5vw, 24px); height: clamp(18px, 5vw, 24px); }
          .attempt-result { gap: 4px; font-size: 9px; }
          .attempt-result span { min-width: 23px; height: 23px; font-size: 9px; }
        }
        @media (max-width: 390px) {
          .colour-focus {
            --colour-circle-size: clamp(33px, 10vw, 40px);
            --colour-circle-gap: 3px;
          }
        }
        @media (max-height: 680px) and (max-width: 720px) {
          .colour-layout { grid-template-rows: 190px minmax(0, 1fr); }
          .colour-focus { --colour-circle-size: 40px; }
          .secret-row span { width: 21px; height: 21px; }
        }
      `}</style>
    </GamePanel>
  );
}
