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
      <div className="code-cabinet" data-machine-state={phase}>
        <div className="cabinet-masthead">
          <div className="cabinet-identity">
            <span className="identity-symbol" aria-hidden="true">
              <i /><i /><i /><i />
            </span>
            <span className="identity-copy">
              <strong>CODE DECODER</strong>
              <small>NOVA THINK LAB / MACHINE 01</small>
            </span>
          </div>
          <div className="cabinet-operating">
            <span className={`machine-light ${busy ? "is-scanning" : ""}`} aria-hidden="true" />
            <span>{busy ? "SCANNING" : phase === "failed" ? "TRY AGAIN" : "ONLINE"}</span>
          </div>
        </div>

        <div className="cabinet-grid">
          <section className="machine-deck" aria-label="Colour Code decoder controls">
            <div className="deck-display">
              <div className="display-heading">
                <span>ENCRYPTED SEQUENCE</span>
                <span className="display-code">04 / COLOUR SIGNALS</span>
              </div>

              <div className="secret-frame">
                <div className="secret-row" aria-label="Four hidden code positions">
                  {secret.map((colourId, index) => {
                    const revealed = revealedPositions.has(index);
                    return (
                      <span
                        className={`secret-socket ${revealed ? "is-revealed" : ""}`}
                        key={`secret-${index}`}
                        aria-label={
                          revealed
                            ? `Position ${index + 1} revealed: ${colourById(colourId).name}`
                            : `Position ${index + 1} concealed`
                        }
                      >
                        <span
                          className="secret-lamp"
                          style={
                            revealed
                              ? { background: colourById(colourId).hex }
                              : undefined
                          }
                        >
                          {revealed ? "" : "?"}
                        </span>
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="scanner-message" aria-live="polite">
                <span className="scanner-pulse" aria-hidden="true" />
                <span>{message}</span>
              </div>
            </div>

            <div className="input-deck">
              <div className="deck-section-label">
                <strong>YOUR COLOUR CODE</strong>
                <span>Tap a socket to edit</span>
              </div>
              <div className="current-guess" aria-label="Your four selected colours">
                {guess.map((colourId, index) => (
                  <button
                    type="button"
                    key={`guess-${index}`}
                    className={`guess-socket ${colourId ? "is-filled" : ""} ${
                      activeSlot === index ? "is-active" : ""
                    }`}
                    onClick={() =>
                      colourId ? editCurrentSlot(index) : setActiveSlot(index)
                    }
                    disabled={busy || phase !== "playing"}
                    aria-label={`Socket ${index + 1}: ${
                      colourId ? `${colourById(colourId).name}. Tap to clear` : "empty. Tap to select"
                    }`}
                    aria-pressed={activeSlot === index}
                  >
                    <span className="socket-glass">
                      <span
                        className="socket-lamp"
                        style={
                          colourId
                            ? { background: colourById(colourId).hex }
                            : undefined
                        }
                      >
                        {colourId ? "" : "+"}
                      </span>
                    </span>
                    <span className="socket-number">{String(index + 1).padStart(2, "0")}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="palette-deck">
              <div className="deck-section-label">
                <strong>COLOUR CARTRIDGES</strong>
                <span>Select to fill a socket</span>
              </div>
              <div
                className="colour-palette"
                aria-label="Available colours"
                style={
                  { "--palette-count": availableColours.length } as CSSProperties
                }
              >
                {availableColours.map((colour) => (
                  <button
                    type="button"
                    className="palette-key"
                    key={colour.id}
                    onClick={() => chooseColour(colour.id)}
                    disabled={phase !== "playing" || busy}
                    aria-label={`Insert ${colour.name} into socket ${activeSlot + 1}`}
                    title={`Select ${colour.name}`}
                  >
                    <span className="palette-rim">
                      <span className="palette-bulb" style={{ background: colour.hex }} />
                    </span>
                    <span className="palette-name">{colour.name}</span>
                  </button>
                ))}
              </div>
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
                  phase !== "playing" ||
                  localClues >= (isGuest ? 1 : 4) ||
                  (!isGuest && tokenBalance < CLUE_COST)
                }
              >
                <span className="command-icon" aria-hidden="true">✦</span>
                {isGuest
                  ? localClues >= 1
                    ? "Guest hint used"
                    : "Free guest hint"
                  : localClues >= 4
                    ? "All revealed"
                    : `Reveal clue · ${CLUE_COST} DT`}
              </button>

              <button
                type="button"
                className="scan-button"
                onClick={phase === "failed" ? retryQuestion : submitGuess}
                disabled={
                  busy ||
                  (phase === "playing" &&
                    guess.some((colourId) => colourId === null))
                }
              >
                <span className="command-icon" aria-hidden="true">
                  {phase === "failed" ? "↻" : "▶"}
                </span>
                {phase === "failed"
                  ? "Retry code"
                  : busy
                    ? "Scanning…"
                    : "Check code"}
              </button>
            </div>

            <div
              className={`machine-status ${errorMessage ? "has-error" : ""}`}
              role="status"
              aria-live="polite"
            >
              <span className="status-led" aria-hidden="true" />
              <span>
                {errorMessage ||
                  (phase === "failed"
                    ? "Decoder locked. The answer is below; retry to practise."
                    : "Match all four colours in their correct positions to unlock the code.")}
              </span>
            </div>

            {phase === "failed" && (
              <div className="answer-module" aria-label="Correct answer">
                <strong>DECRYPTED ANSWER</strong>
                <div className="answer-strip">
                  {secret.map((colourId, index) => (
                    <span
                      key={`answer-${index}`}
                      style={{ background: colourById(colourId).hex }}
                      aria-label={`Position ${index + 1}: ${colourById(colourId).name}`}
                    />
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="trace-console" aria-label="Clue history">
            <div className="trace-masthead">
              <div>
                <span className="trace-eyebrow">DECODER LOG</span>
                <h3>Scan history</h3>
              </div>
              <div className="scan-counter">
                <strong>{String(attempts.length).padStart(2, "0")}</strong>
                <span>/ {COLOUR_MAX_ATTEMPTS} SCANS</span>
              </div>
            </div>

            <div className="trace-legend">
              <span><i className="exact-dot" /> Exact position</span>
              <span><i className="misplaced-dot" /> Right colour, different position</span>
            </div>

            <div className="attempt-list" role="list" aria-label="Your code guesses">
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
                    className={`attempt-row ${isCurrent ? "is-current" : ""} ${
                      completedAttempt?.exact === 4 ? "is-unlocked" : ""
                    }`}
                    key={`attempt-row-${rowIndex}`}
                    role="listitem"
                    aria-label={
                      completedAttempt
                        ? `Scan ${rowIndex + 1}: ${completedAttempt.exact} exact, ${completedAttempt.misplaced} misplaced`
                        : isCurrent
                          ? `Scan ${rowIndex + 1}: current guess`
                          : `Scan ${rowIndex + 1}: unused`
                    }
                  >
                    <span className="attempt-number">{String(rowIndex + 1).padStart(2, "0")}</span>
                    <div className="attempt-circles" aria-hidden="true">
                      {rowColours.map((colourId, circleIndex) => (
                        <span
                          key={`attempt-${rowIndex}-${circleIndex}`}
                          className={colourId ? "is-filled" : ""}
                          style={
                            colourId
                              ? { background: colourById(colourId).hex }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                    <div className="attempt-result">
                      {completedAttempt ? (
                        <>
                          <span className="exact-result" title="Exact position">
                            {completedAttempt.exact}
                          </span>
                          <span className="misplaced-result" title="Right colour, different position">
                            {completedAttempt.misplaced}
                          </span>
                        </>
                      ) : (
                        <span className="empty-result">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="trace-footer">
              <span className="trace-footer-light" aria-hidden="true" />
              Each scan reveals how close your code is.
            </div>
          </aside>
        </div>

        <div className="cabinet-base" aria-hidden="true">
          <span className="base-bolt" />
          <span>CHROMA SYSTEMS</span>
          <i />
          <strong>NOVA / THINK LAB</strong>
          <span className="base-bolt" />
        </div>
      </div>

      <style jsx>{`
        .code-cabinet {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(107, 214, 255, 0.37);
          border-radius: 22px;
          color: #f4faff;
          background:
            radial-gradient(ellipse at 50% -30%, rgba(74, 190, 255, 0.20), transparent 60%),
            linear-gradient(135deg, rgba(30, 54, 88, 0.96), rgba(8, 19, 42, 0.97) 45%, rgba(16, 31, 57, 0.96));
          box-shadow:
            inset 0 2px 0 rgba(194, 245, 255, 0.10),
            inset 0 -6px 0 rgba(0, 6, 21, 0.48),
            0 22px 44px rgba(0, 0, 0, 0.27),
            0 0 28px rgba(60, 178, 255, 0.07);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }

        .cabinet-masthead {
          flex: 0 0 auto;
          min-height: 62px;
          padding: 8px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(144, 221, 255, 0.25);
          background:
            linear-gradient(90deg, rgba(62, 190, 255, 0.13), transparent 65%),
            rgba(2, 12, 29, 0.72);
          box-shadow: inset 0 -3px 0 rgba(0, 4, 14, 0.36);
        }
        .cabinet-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .identity-symbol {
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: repeat(2, 9px);
          grid-template-rows: repeat(2, 9px);
          align-content: center;
          justify-content: center;
          gap: 4px;
          border: 1px solid rgba(122, 226, 255, 0.4);
          border-radius: 11px;
          background: rgba(36, 145, 229, 0.1);
          box-shadow: inset 0 0 15px rgba(62, 175, 255, 0.09);
        }
        .identity-symbol i { border-radius: 50%; box-shadow: 0 0 8px currentColor; }
        .identity-symbol i:nth-child(1) { background: #45a7ff; color: #45a7ff; }
        .identity-symbol i:nth-child(2) { background: #ffd84a; color: #ffd84a; }
        .identity-symbol i:nth-child(3) { background: #ff6fb5; color: #ff6fb5; }
        .identity-symbol i:nth-child(4) { background: #57d58a; color: #57d58a; }
        .identity-copy { min-width: 0; display: grid; gap: 3px; }
        .identity-copy strong {
          font-size: clamp(15px, 1.65vw, 22px);
          letter-spacing: 0.09em;
          line-height: 1.2;
        }
        .identity-copy small {
          color: #7fd0eb;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.15em;
        }
        .cabinet-operating {
          flex: 0 0 auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border: 1px solid rgba(111, 242, 188, 0.21);
          border-radius: 8px;
          background: rgba(52, 166, 122, 0.08);
          color: #9fffd6;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }
        .machine-light {
          width: 8px;
          height: 8px;
          display: inline-block;
          border-radius: 50%;
          background: #66eeb4;
          box-shadow: 0 0 12px #42edbd;
        }
        .machine-light.is-scanning { animation: blink 900ms ease-in-out infinite alternate; }
        .cabinet-grid {
          flex: 1 1 auto;
          min-height: 0;
          padding: 12px;
          display: grid;
          grid-template-columns: minmax(0, 1.12fr) minmax(285px, .82fr);
          gap: 12px;
          overflow: hidden;
        }
        .machine-deck,
        .trace-console {
          min-width: 0;
          min-height: 0;
          border: 1px solid rgba(143, 225, 255, 0.21);
          border-radius: 17px;
          background:
            linear-gradient(155deg, rgba(25, 50, 79, 0.48), rgba(3, 12, 30, 0.76)),
            rgba(2, 10, 26, 0.76);
          box-shadow: inset 0 2px 0 rgba(180, 230, 255, 0.06);
        }
        .machine-deck {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 11px;
          overflow-y: auto;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(89, 207, 255, 0.35) transparent;
        }

        .deck-display {
          flex: 0 0 auto;
          padding: 10px 12px;
          border: 1px solid rgba(84, 198, 255, 0.32);
          border-radius: 13px;
          background:
            repeating-linear-gradient(0deg, rgba(124, 231, 255, 0.018) 0px, rgba(124, 231, 255, 0.018) 1px, transparent 1px, transparent 5px),
            radial-gradient(ellipse at 50% 0%, rgba(35, 156, 230, 0.16), transparent 85%),
            #030e21;
          box-shadow: inset 0 0 24px rgba(2, 7, 18, 0.65), 0 0 16px rgba(56, 175, 255, 0.06);
        }
        .display-heading,
        .deck-section-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 9px;
          color: #9addf6;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }
        .display-code {
          color: rgba(150, 222, 249, 0.56);
          font-size: 9px;
          white-space: nowrap;
        }
        .secret-frame {
          margin: 9px 0;
          min-height: 63px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid rgba(103, 209, 255, 0.12);
          background: rgba(0, 9, 24, 0.55);
        }
        .secret-row {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: clamp(8px, 1vw, 18px);
        }
        .secret-socket {
          width: clamp(35px, 3.2vw, 46px);
          height: clamp(35px, 3.2vw, 46px);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          border: 2px solid rgba(107, 203, 244, 0.38);
          background: #081931;
          box-shadow: inset 0 0 14px rgba(0, 5, 15, 0.7), 0 0 0 3px rgba(24, 64, 98, 0.22);
        }
        .secret-lamp {
          width: 74%;
          height: 74%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          color: #74abc6;
          background: rgba(54, 99, 134, 0.14);
          font-size: 15px;
          font-weight: 900;
          box-shadow: inset 0 3px 8px rgba(0, 0, 0, 0.3);
        }
        .secret-socket.is-revealed .secret-lamp {
          box-shadow: inset 0 2px 6px rgba(255, 255, 255, 0.23), 0 0 18px rgba(115, 216, 255, 0.25);
          animation: flash-in 380ms ease-out;
        }
        .scanner-message {
          min-height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #a4edff;
          text-align: center;
          font-size: 11px;
          font-weight: 700;
        }
        .scanner-pulse {
          width: 6px;
          height: 6px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #62dbff;
          box-shadow: 0 0 10px #62dbff;
        }
        .input-deck,
        .palette-deck { flex: 0 0 auto; }
        .deck-section-label { margin-bottom: 8px; }
        .deck-section-label span {
          color: rgba(191, 224, 243, 0.57);
          font-weight: 650;
          letter-spacing: 0;
          font-size: 10px;
          text-align: right;
        }
        .current-guess {
          display: flex;
          align-items: stretch;
          justify-content: center;
          gap: clamp(9px, 1.5vw, 19px);
          padding: 10px;
          border: 1px solid rgba(117, 195, 255, 0.13);
          border-radius: 12px;
          background: rgba(3, 13, 30, 0.58);
        }
        .guess-socket {
          width: clamp(52px, 6.2vw, 76px);
          min-width: 0;
          padding: 3px 4px 5px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          border: 1px solid transparent;
          border-radius: 13px;
          background: transparent;
          color: #9dbbd1;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease;
        }
        .guess-socket:hover:not(:disabled) { transform: translateY(-2px); }
        .guess-socket.is-active {
          border-color: rgba(107, 229, 255, 0.54);
          background: rgba(63, 182, 255, 0.09);
          box-shadow: 0 0 20px rgba(66, 188, 255, 0.14);
        }
        .guess-socket:disabled { cursor: default; }
        .socket-glass {
          width: clamp(43px, 5.5vw, 62px);
          height: clamp(43px, 5.5vw, 62px);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #355472;
          border-radius: 50%;
          background: linear-gradient(145deg, #152b45, #040c1b);
          box-shadow: inset 0 3px 6px rgba(0, 0, 0, 0.72), 0 3px 0 #030817;
        }
        .guess-socket.is-active .socket-glass { border-color: #74e7ff; }
        .socket-lamp {
          width: 83%;
          height: 83%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: rgba(48, 88, 125, 0.35);
          color: #658db1;
          font-size: 20px;
          box-shadow: inset 0 4px 8px rgba(0, 0, 0, 0.55);
        }
        .guess-socket.is-filled .socket-lamp {
          box-shadow: inset 0 3px 9px rgba(255, 255, 255, 0.22), 0 0 15px rgba(115, 216, 255, 0.19);
          animation: flash-in 250ms ease-out;
        }
        .socket-number { font-size: 10px; font-weight: 900; letter-spacing: .14em; }

        .colour-palette {
          width: 100%;
          padding: 8px;
          display: grid;
          grid-template-columns: repeat(var(--palette-count), minmax(0, 1fr));
          gap: 5px;
          border: 1px solid rgba(122, 206, 255, 0.16);
          border-radius: 12px;
          background: rgba(1, 10, 24, 0.46);
        }
        .palette-key {
          min-width: 0;
          min-height: 68px;
          padding: 6px 2px 4px;
          border: 1px solid rgba(160, 217, 255, 0.12);
          border-radius: 10px;
          background: linear-gradient(160deg, rgba(42, 69, 100, 0.58), rgba(6, 17, 34, 0.86));
          color: #d1e9ff;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          transition: transform 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        .palette-key:hover:not(:disabled),
        .palette-key:focus-visible {
          transform: translateY(-2px);
          border-color: rgba(104, 230, 255, 0.64);
          box-shadow: 0 0 15px rgba(56, 177, 255, 0.14);
        }
        .palette-key:active:not(:disabled) { transform: translateY(1px); }
        .palette-key:disabled { cursor: default; opacity: .55; }
        .palette-rim {
          width: clamp(32px, 3.3vw, 43px);
          height: clamp(32px, 3.3vw, 43px);
          padding: 4px;
          border: 2px solid rgba(127, 199, 244, 0.34);
          border-radius: 50%;
          background: #061324;
          box-shadow: 0 3px 0 rgba(0, 0, 0, 0.50);
        }
        .palette-bulb {
          width: 100%;
          height: 100%;
          display: block;
          border-radius: 50%;
          box-shadow: inset 0 4px 8px rgba(255, 255, 255, 0.27), inset 0 -4px 7px rgba(0, 0, 0, .20);
        }
        .palette-name { font-size: 9px; font-weight: 800; white-space: nowrap; }
        .colour-actions {
          flex: 0 0 auto;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }
        .clue-button,
        .scan-button {
          min-width: 0;
          min-height: 46px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border-radius: 12px;
          font: inherit;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          transition: filter 160ms ease, transform 160ms ease;
        }
        .clue-button {
          border: 1px solid rgba(255, 209, 100, 0.50);
          background: linear-gradient(155deg, rgba(117, 77, 14, 0.65), rgba(48, 34, 17, 0.75));
          color: #ffdf8a;
        }
        .scan-button {
          border: 1px solid rgba(157, 239, 255, 0.72);
          background: linear-gradient(135deg, #148bc9, #365cce);
          color: white;
          box-shadow: 0 5px 0 #0a2555, 0 0 18px rgba(64, 152, 253, 0.21);
        }
        .clue-button:hover:not(:disabled),
        .scan-button:hover:not(:disabled) { filter: brightness(1.14); }
        .clue-button:active:not(:disabled),
        .scan-button:active:not(:disabled) { transform: translateY(2px); }
        .clue-button:disabled,
        .scan-button:disabled { opacity: .46; cursor: not-allowed; box-shadow: none; }
        .command-icon { flex: 0 0 auto; font-size: 17px; line-height: 1; }
        .clue-button.is-walkthrough-highlighted {
          position: relative;
          z-index: 125;
          border-color: #ffe08c;
          animation: hint-glow 1.35s ease-in-out infinite alternate;
        }
        .machine-status {
          flex: 0 0 auto;
          min-height: 25px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          color: rgba(202, 232, 248, .7);
          font-size: 10px;
          line-height: 1.45;
        }
        .machine-status.has-error { color: #ffb7bd; }
        .status-led {
          width: 6px;
          height: 6px;
          margin-top: 4px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #84deff;
          box-shadow: 0 0 9px rgba(119, 218, 255, 0.7);
        }
        .machine-status.has-error .status-led { background: #ff909d; }
        .answer-module {
          flex: 0 0 auto;
          padding: 10px;
          border: 1px solid rgba(255, 190, 110, .35);
          border-radius: 10px;
          background: rgba(113, 57, 20, .13);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: #ffdda0;
          font-size: 10px;
          letter-spacing: .06em;
        }
        .answer-strip { display: flex; align-items: center; gap: 7px; }
        .answer-strip span {
          width: 19px;
          height: 19px;
          border: 2px solid rgba(255, 255, 255, .3);
          border-radius: 50%;
        }

        .trace-console {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .trace-masthead {
          flex: 0 0 auto;
          padding: 14px 13px 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          border-bottom: 1px solid rgba(135, 218, 255, 0.13);
        }
        .trace-eyebrow {
          color: #80d9fc;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .16em;
        }
        .trace-masthead h3 {
          margin: 3px 0 0;
          font-size: clamp(16px, 1.6vw, 22px);
          line-height: 1.2;
        }
        .scan-counter { display: flex; align-items: baseline; gap: 4px; white-space: nowrap; }
        .scan-counter strong { font-size: 20px; color: #91ecff; }
        .scan-counter span { font-size: 9px; color: rgba(202, 232, 248, .57); }
        .trace-legend {
          flex: 0 0 auto;
          padding: 9px 12px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 7px;
          background: rgba(26, 58, 91, .28);
          color: rgba(219, 236, 251, .80);
          font-size: 9px;
          line-height: 1.3;
        }
        .trace-legend span { display: inline-flex; align-items: center; gap: 5px; }
        .trace-legend i { width: 8px; height: 8px; flex: 0 0 auto; border-radius: 50%; }
        .exact-dot { background: #67f0ad; box-shadow: 0 0 9px rgba(103, 240, 173, .27); }
        .misplaced-dot { background: #ffcb66; box-shadow: 0 0 9px rgba(255, 203, 102, .22); }
        .attempt-list {
          min-height: 0;
          flex: 1 1 auto;
          padding: 10px 8px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
          scrollbar-width: thin;
          scrollbar-color: rgba(105, 210, 255, .45) rgba(255, 255, 255, .035);
        }
        .attempt-row {
          flex: 0 0 40px;
          min-height: 40px;
          padding: 5px 9px;
          display: grid;
          grid-template-columns: 25px minmax(0, 1fr) 60px;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(127, 216, 255, .07);
          border-radius: 9px;
          background: rgba(21, 46, 73, .28);
        }
        .attempt-row.is-current {
          border-color: rgba(86, 222, 255, .63);
          background: rgba(40, 144, 208, .14);
          box-shadow: inset 2px 0 0 #60d9ff, 0 0 12px rgba(44, 148, 218, .09);
        }
        .attempt-row.is-unlocked {
          border-color: rgba(105, 239, 172, .47);
          background: rgba(37, 146, 98, .12);
        }
        .attempt-number { color: rgba(198, 231, 251, .6); font-size: 10px; font-weight: 900; }
        .attempt-circles { display: flex; align-items: center; justify-content: center; gap: clamp(4px, .6vw, 10px); }
        .attempt-circles span {
          width: clamp(20px, 1.9vw, 28px);
          height: clamp(20px, 1.9vw, 28px);
          flex: 0 0 auto;
          border: 2px solid #274663;
          border-radius: 50%;
          background: rgba(4, 12, 30, .85);
          box-shadow: inset 0 2px 5px rgba(0, 0, 0, .58);
        }
        .attempt-circles span.is-filled {
          border-color: rgba(255, 255, 255, .31);
          box-shadow: inset 0 3px 7px rgba(255, 255, 255, .16), 0 0 7px rgba(110, 196, 255, .14);
        }
        .attempt-result { display: flex; justify-content: flex-end; gap: 5px; }
        .attempt-result span {
          min-width: 25px;
          min-height: 25px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          font-size: 10px;
          font-weight: 900;
        }
        .exact-result { color: #99ffce; background: rgba(81, 212, 146, .17); }
        .misplaced-result { color: #ffe09a; background: rgba(244, 184, 75, .16); }
        .empty-result { color: rgba(206, 235, 252, .25); }
        .trace-footer {
          flex: 0 0 auto;
          min-height: 32px;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 7px;
          border-top: 1px solid rgba(126, 220, 255, .1);
          background: rgba(1, 10, 23, .47);
          color: rgba(194, 225, 242, .53);
          font-size: 9px;
        }
        .trace-footer-light {
          width: 5px;
          height: 5px;
          flex: 0 0 auto;
          border-radius: 50%;
          background: #53d6ff;
          box-shadow: 0 0 9px #53d6ff;
        }
        .cabinet-base {
          flex: 0 0 27px;
          padding: 0 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          border-top: 1px solid rgba(141, 225, 255, .17);
          background: linear-gradient(180deg, #1c3a5b, #09172d);
          color: rgba(147, 197, 223, .66);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .2em;
        }
        .cabinet-base i { flex: 1; height: 2px; background: linear-gradient(90deg, transparent, rgba(86, 216, 255, .54), transparent); }
        .cabinet-base strong { white-space: nowrap; color: #84dafa; font-size: 9px; }
        .base-bolt { width: 7px; height: 7px; flex: 0 0 auto; border: 1px solid rgba(150, 219, 255, .29); border-radius: 50%; background: #0c172c; }
        .guess-socket:focus-visible,
        .palette-key:focus-visible,
        .clue-button:focus-visible,
        .scan-button:focus-visible { outline: 3px solid #a8f1ff; outline-offset: 2px; }

        @keyframes blink {
          from { opacity: .35; box-shadow: 0 0 4px #42edbd; }
          to { opacity: 1; box-shadow: 0 0 15px #42edbd; }
        }
        @keyframes flash-in {
          from { transform: scale(.79); filter: brightness(1.75); }
          to { transform: scale(1); filter: brightness(1); }
        }
        @keyframes hint-glow {
          from { box-shadow: 0 0 6px rgba(255, 204, 112, .16); }
          to { box-shadow: 0 0 25px rgba(255, 204, 112, .48); }
        }
        @media (max-width: 1120px) {
          .cabinet-grid { grid-template-columns: minmax(0, 1fr) minmax(235px, .8fr); padding: 8px; gap: 8px; }
          .machine-deck { padding: 9px; gap: 8px; }
          .attempt-row { grid-template-columns: 21px minmax(0, 1fr) 53px; gap: 5px; padding: 4px 6px; }
          .attempt-result span { min-width: 22px; min-height: 23px; }
          .attempt-circles span { width: clamp(17px, 2vw, 23px); height: clamp(17px, 2vw, 23px); }
        }
        @media (max-width: 720px) {
          .code-cabinet { border-radius: 13px; overflow-y: auto; overscroll-behavior: contain; }
          .cabinet-masthead { min-height: 49px; padding: 7px 10px; gap: 6px; }
          .identity-symbol { width: 31px; height: 31px; grid-template-columns: repeat(2, 7px); grid-template-rows: repeat(2, 7px); gap: 3px; }
          .identity-copy strong { font-size: 13px; letter-spacing: .055em; }
          .identity-copy small { font-size: 7px; letter-spacing: .08em; }
          .cabinet-operating { padding: 5px 7px; font-size: 8px; }
          .cabinet-grid { flex: 0 0 auto; display: flex; flex-direction: column; padding: 6px; gap: 8px; overflow: visible; }
          .machine-deck { min-height: auto; overflow: visible; gap: 8px; }
          .deck-display { padding: 8px; }
          .display-heading, .deck-section-label { font-size: 9px; }
          .display-code { font-size: 8px; }
          .secret-frame { min-height: 45px; margin: 6px 0; }
          .secret-socket { width: 29px; height: 29px; }
          .secret-lamp { font-size: 11px; }
          .scanner-message { font-size: 10px; min-height: 15px; }
          .current-guess { padding: 6px; gap: clamp(4px, 1.3vw, 12px); }
          .guess-socket { width: clamp(39px, 12vw, 58px); padding: 2px 1px; gap: 3px; }
          .socket-glass { width: clamp(34px, 10vw, 50px); height: clamp(34px, 10vw, 50px); border-width: 2px; }
          .socket-number { font-size: 8px; }
          .colour-palette { padding: 5px; gap: 3px; }
          .palette-key { min-height: 44px; padding: 4px 1px; }
          .palette-rim { width: clamp(25px, 8vw, 38px); height: clamp(25px, 8vw, 38px); padding: 3px; }
          .palette-name { display: none; }
          .colour-actions { gap: 6px; }
          .clue-button, .scan-button { min-height: 38px; font-size: 10px; gap: 4px; padding: 6px 4px; }
          .command-icon { font-size: 14px; }
          .machine-status { font-size: 9px; }
          .trace-console { flex: 0 0 auto; height: 268px; min-height: 0; }
          .trace-masthead { padding: 9px; }
          .trace-masthead h3 { font-size: 15px; }
          .trace-legend { padding: 7px 8px; gap: 8px; font-size: 8px; }
          .attempt-list { padding: 6px 5px; gap: 4px; }
          .attempt-row { flex-basis: 34px; min-height: 34px; grid-template-columns: 22px minmax(0, 1fr) 58px; padding: 3px 8px; }
          .attempt-circles { gap: 7px; }
          .attempt-circles span { width: 20px; height: 20px; }
          .cabinet-base { flex: 0 0 25px; }
        }
        @media (max-width: 390px) {
          .identity-copy small { display: none; }
          .cabinet-operating { font-size: 7px; }
          .guess-socket { width: 39px; }
          .socket-glass { width: 33px; height: 33px; }
          .palette-rim { width: 24px; height: 24px; }
          .trace-legend { flex-wrap: wrap; }
          .attempt-circles { gap: 5px; }
          .cabinet-base { font-size: 7px; }
          .cabinet-base strong { font-size: 7px; }
        }
        @media (max-height: 720px) and (min-width: 721px) {
          .cabinet-masthead { min-height: 46px; }
          .cabinet-grid { padding: 6px; gap: 6px; }
          .machine-deck { padding: 6px; gap: 6px; }
          .secret-frame { min-height: 42px; margin: 4px 0; }
          .secret-socket { width: 29px; height: 29px; }
          .current-guess { padding: 6px; }
          .socket-glass { width: 40px; height: 40px; }
          .guess-socket { width: 48px; }
          .palette-key { min-height: 48px; padding: 3px 2px; }
          .palette-rim { width: 27px; height: 27px; }
          .palette-name { font-size: 8px; }
          .clue-button, .scan-button { min-height: 36px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .machine-light, .secret-lamp, .socket-lamp, .clue-button { animation: none !important; }
          .guess-socket, .palette-key, .clue-button, .scan-button { transition: none !important; }
        }
      `}</style>
    </GamePanel>
  );
}
