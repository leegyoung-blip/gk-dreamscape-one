"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  CLUE_COST,
  TOWER_MAX_ATTEMPTS,
  DAILY_LIMIT,
  COLOURS,
  GamePanel,
  formatSupabaseError,
  InstructionBar,
  PrimaryButton,
  RewardResult,
  DailyLevelTabs,
  CompletedSelectedLevel,
  seededRandom,
  colourById,
  makeSeed,
  dailyLevelName,
  towerSizeForQuestion,
} from "./shared";
import type { GameId, DailyLevelNumber, DailyLevelStatus, CompletionResult, ClueResult } from "./shared";

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

export function TowerMemoryGame({
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
  const size = towerSizeForQuestion(levelNumber);
  const expectedReward = towerRewardForQuestion(levelNumber);
  const selectedLevelStatus = levelStatuses[levelNumber];
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
      (!isGuest && tokenBalance < CLUE_COST) ||
      localClues >= (isGuest ? 1 : TOWER_MAX_ATTEMPTS)
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
          <div style={{ display: "grid", gap: "7px" }}>
            <DailyLevelTabs
              selectedLevel={levelNumber}
              levelStatuses={levelStatuses}
              game="tower-memory"
              onSelectLevel={onSelectLevel}
            />
            <InstructionBar
              items={[
                { label: "Level", value: dailyLevelName(levelNumber) },
                { label: "Tower", value: `${size} blocks` },
                { label: "Attempts", value: String(attemptsUsed) },
              ]}
            />
          </div>
        }
      >
        <RewardResult
          title={`${size}-block tower rebuilt!`}
          text="You remembered the exact colour order from the bottom block upward."
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
              game="tower-memory"
              onSelectLevel={onSelectLevel}
            />
            <InstructionBar
              items={[
                { label: "Level", value: dailyLevelName(levelNumber) },
                { label: "Tower", value: `${size} blocks` },
                { label: "Status", value: "Complete" },
              ]}
            />
          </div>
        }
      >
        <CompletedSelectedLevel
          gameTitle="Tower Memory"
          level={levelNumber}
          detail={`${size}-block tower`}
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
            game="tower-memory"
            onSelectLevel={onSelectLevel}
          />
          <InstructionBar
            items={[
              { label: "Level", value: dailyLevelName(levelNumber) },
              { label: "Attempts", value: `${attemptsUsed}/${TOWER_MAX_ATTEMPTS}` },
              { label: "Reward", value: `${expectedReward} DT` },
            ]}
          />
        </div>
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
                  highlighted={walkthroughHighlightClue}
                  disabled={
                    busy ||
                    phase !== "build" ||
                    (!isGuest && tokenBalance < CLUE_COST) ||
                    localClues >= (isGuest ? 1 : TOWER_MAX_ATTEMPTS)
                  }
                  secondary
                >
                  {isGuest
                    ? localClues >= 1
                      ? "Guest Review used"
                      : "Guest Review · Free"
                    : "Show again · 5 DT"}
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
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }
        .tower-heading strong {
          color: rgba(241, 249, 255, 0.68);
          font-size: 10px;
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
          color: rgba(235, 247, 255, 0.84);
          font-size: 16px;
          line-height: 1.4;
          font-weight: 700;
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
          .tower-message { min-height: 30px; font-size: 12px; line-height: 1.28; }
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
