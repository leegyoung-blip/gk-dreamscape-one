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
      className="holo-tower"
      style={{ "--tower-size": size } as CSSProperties}
      role="group"
      aria-label={hidden ? "Reference tower concealed" : `${size}-block colour tower`}
    >
      <div className="holo-tower-blocks">
        {[...blocks].reverse().map((colourId, visualIndex) => {
          const colour = colourId ? colourById(colourId) : null;
          const concealed = hidden && Boolean(colour);
          return (
            <div
              key={`${visualIndex}-${colourId || "empty"}`}
              className={`holo-block ${concealed ? "is-hidden" : ""} ${
                !colour ? "is-empty" : ""
              }`}
              style={
                {
                  "--block-colour": colour?.hex ?? "#162e42",
                  "--block-order": visualIndex,
                } as CSSProperties
              }
              role="img"
              aria-label={concealed ? "Concealed block" : colour ? `${colour.name} block` : "Empty slot"}
            >
              {concealed ? <span className="block-question">?</span> : null}
              {!concealed && !colour ? <span className="block-empty-mark">+</span> : null}
            </div>
          );
        })}
      </div>
      <div className="holo-base"><span className="base-line" />BOTTOM <span className="base-line" /></div>

      <style jsx>{`
        .holo-tower {
          width: min(198px, 92%);
          height: 100%;
          max-height: 340px;
          min-height: 0;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          align-items: center;
          filter: drop-shadow(0 12px 18px rgba(0,0,0,.38));
        }
        .holo-tower-blocks {
          width: 100%;
          min-height: 0;
          display: flex;
          flex: 0 1 auto;
          flex-direction: column;
          justify-content: flex-end;
          gap: clamp(3px, .55vh, 6px);
        }
        .holo-block {
          position: relative;
          width: 100%;
          height: clamp(19px, calc(254px / var(--tower-size)), 49px);
          min-height: 0;
          flex: 0 1 auto;
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,.55);
          background:
            linear-gradient(178deg, rgba(255,255,255,.39), transparent 37%, rgba(0,0,0,.33) 98%),
            var(--block-colour);
          box-shadow:
            0 5px 0 rgba(3,10,25,.58),
            0 8px 13px rgba(0,0,0,.27),
            inset 1px 2px 0 rgba(255,255,255,.30),
            inset -4px 0 6px rgba(0,0,0,.18);
          animation: towerAssemble 280ms ease-out both;
          overflow: hidden;
        }
        .holo-block::after {
          content: "";
          position: absolute;
          left: 7px;
          top: 4px;
          bottom: 5px;
          width: 3px;
          border-radius: 4px;
          background: rgba(255,255,255,.34);
          transform: skew(-8deg);
          pointer-events: none;
        }
        .holo-block.is-hidden, .holo-block.is-empty {
          background: linear-gradient(155deg, rgba(43,99,125,.17), rgba(4,19,39,.67));
          border: 1px dashed rgba(114,232,255,.28);
          box-shadow: inset 0 0 14px rgba(67,177,197,.04);
        }
        .holo-block.is-hidden::after, .holo-block.is-empty::after { display: none; }
        .block-question { color: rgba(125,226,239,.36); font-size: 18px; font-weight: 900; }
        .block-empty-mark { color: rgba(112,230,241,.26); font-size: 14px; font-weight: 500; }
        .holo-base {
          flex: 0 0 25px;
          width: calc(100% + 20px);
          margin-top: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 11px;
          border-radius: 5px 5px 11px 11px;
          border: 1px solid rgba(124,234,219,.45);
          border-bottom: 3px solid rgba(68,205,187,.6);
          background: linear-gradient(180deg, #1b5570, #09233d);
          color: #a3ffdb;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .18em;
          box-shadow: 0 6px 14px rgba(5, 24, 44, .5);
        }
        .base-line { width: 18%; height: 2px; background: linear-gradient(90deg, transparent, #78ecce); }
        .base-line:last-child { transform: rotate(180deg); }
        @keyframes towerAssemble {
          from { opacity: 0; transform: translateY(-8px) scale(.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (max-width: 720px) {
          .holo-tower { width: min(126px, 94%); max-height: 238px; }
          .holo-tower-blocks { gap: 2px; }
          .holo-block { height: clamp(14px, calc(163px / var(--tower-size)), 32px); border-radius: 4px; }
          .holo-base { flex-basis: 19px; margin-top: 3px; font-size: 7px; gap: 6px; width: calc(100% + 10px); }
          .base-line { width: 13%; }
        }
        @media (max-height: 700px) and (min-width: 721px) {
          .holo-tower { max-height: 235px; }
          .holo-block { height: clamp(16px, calc(178px / var(--tower-size)), 32px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .holo-block { animation: none; }
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
      <div className="memory-machine">
        <div className="machine-masthead">
          <div className="identity">
            <span className="forge-emblem" aria-hidden="true">
              <i /><i /><i />
            </span>
            <div className="identity-copy">
              <strong>MEMORY FORGE</strong>
              <small>HOLOGRAPHIC CONSTRUCTION SYSTEM</small>
            </div>
          </div>
          <div className={`operation-indicator ${phase === "preview" ? "is-preview" : ""} ${phase === "failed" ? "is-failed" : ""}`}>
            <span className="indicator-led" aria-hidden="true" />
            <span>{phase === "preview" ? "MEMORISE" : phase === "failed" ? "RETRY REQUIRED" : "BUILD MODE"}</span>
          </div>
        </div>

        <div className="machine-status-line">
          <div className="status-copy">
            <span className="status-pictogram" aria-hidden="true">◇</span>
            <span>
              {phase === "preview"
                ? "Study the colour sequence. The reference will disappear when the countdown ends."
                : phase === "failed"
                ? "The sequence has been revealed. Restart to attempt this level again."
                : "Rebuild the sequence from the bottom up using the colour cartridges."}
            </span>
          </div>
          <div className="attempt-lights" aria-label={`${TOWER_MAX_ATTEMPTS - attemptsUsed} of ${TOWER_MAX_ATTEMPTS} attempts remaining`}>
            {Array.from({ length: TOWER_MAX_ATTEMPTS }).map((_, index) => (
              <span
                key={index}
                className={index < attemptsUsed ? "is-spent" : "is-ready"}
                title={`Attempt ${index + 1}: ${index < attemptsUsed ? "used" : "available"}`}
              />
            ))}
          </div>
        </div>

        <div className="chambers-grid">
          <section className="tower-chamber reference-chamber" aria-label="NOVA reference tower">
            <div className="chamber-title">
              <div>
                <span className="chamber-overline">01 / MEMORY INPUT</span>
                <h3>NOVA's tower</h3>
              </div>
              <span className={`chamber-chip ${phase === "preview" ? "is-live" : ""}`}>
                {phase === "preview" ? `${previewSeconds}s LEFT` : phase === "failed" ? "REVEALED" : "CONCEALED"}
              </span>
            </div>
            <div className="timer-track" aria-label={phase === "preview" ? `${previewSeconds} seconds to memorise` : "Reference viewing complete"}>
              <span
                style={{
                  width: `${phase === "preview" ? Math.max(0, Math.min(100, previewSeconds / initialPreviewSeconds * 100)) : 0}%`,
                }}
              />
            </div>
            <div className={`hologram-stage ${phase === "preview" ? "is-active" : ""}`}>
              <div className="stage-rays" aria-hidden="true" />
              <TowerDisplay
                sequence={sequence}
                size={size}
                hidden={phase === "build"}
              />
              <div className="floor-ring" aria-hidden="true" />
            </div>
            <div className="chamber-footnote">
              <span className="dot" />
              {phase === "preview" ? "LIVE REFERENCE PROJECTION" : phase === "failed" ? "REFERENCE UNLOCKED" : "REFERENCE LOCKED"}
            </div>
          </section>

          <section className="tower-chamber construct-chamber" aria-label="Your construction tower">
            <div className="chamber-title">
              <div>
                <span className="chamber-overline">02 / RECONSTRUCTION</span>
                <h3>Your tower</h3>
              </div>
              <span className="chamber-chip construct-chip">{answer.length} / {size} BLOCKS</span>
            </div>
            <div className="construction-track" aria-label={`${answer.length} of ${size} blocks placed`}>
              {Array.from({ length: size }).map((_, index) => (
                <span key={index} className={index < answer.length ? "is-filled" : ""} />
              ))}
            </div>
            <div className={`hologram-stage ${phase === "build" ? "is-active" : ""}`}>
              <div className="stage-rays" aria-hidden="true" />
              <TowerDisplay
                sequence={answer}
                size={size}
                emptySlots={Math.max(0, size - answer.length)}
              />
              <div className="floor-ring" aria-hidden="true" />
            </div>
            <div className="chamber-footnote">
              <span className="dot" />
              {phase === "preview" ? "ASSEMBLY STANDBY" : phase === "failed" ? "ASSEMBLY STOPPED" : "CONSTRUCTION ACTIVE"}
            </div>
          </section>
        </div>

        <div className="machine-control-deck">
          <div className="cartridge-panel">
            <div className="control-heading">
              <strong>BLOCK CARTRIDGES</strong>
              <span>Tap to stack</span>
            </div>
            <div className="cartridge-grid" aria-label="Choose a block colour">
              {COLOURS.map((colour) => (
                <button
                  type="button"
                  className="cartridge"
                  key={colour.id}
                  onClick={() => chooseColour(colour.id)}
                  disabled={phase !== "build" || busy || answer.length >= size}
                  aria-label={`Add ${colour.name} block`}
                  title={`Add ${colour.name} block`}
                >
                  <span className="cartridge-shell">
                    <span className="cartridge-crystal" style={{ background: colour.hex }} />
                  </span>
                  <span className="cartridge-name">{colour.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="operator-panel">
            <div className="control-heading">
              <strong>OPERATOR CONTROLS</strong>
              <span>{TOWER_MAX_ATTEMPTS - attemptsUsed} attempts left</span>
            </div>
            <div className={`operator-message ${errorMessage ? "has-error" : ""}`} role="status" aria-live="polite">
              <span className="message-led" aria-hidden="true" />
              <div>
                <span>{message}</span>
                {errorMessage && <strong>{errorMessage}</strong>}
              </div>
            </div>
            <div className="operator-actions">
              {phase === "failed" ? (
                <PrimaryButton onClick={retryLevel}>↻ Retry level</PrimaryButton>
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
                        ? "Review used"
                        : "Free review"
                      : `Review · ${CLUE_COST} DT`}
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
        </div>

        {phase === "failed" && (
          <div className="failure-strip" role="status">
            <span>REFERENCE SEQUENCE · BOTTOM → TOP</span>
            <div className="failure-blocks">
              {sequence.map((colourId, index) => (
                <i key={`${colourId}-${index}`} style={{ background: colourById(colourId).hex }} />
              ))}
            </div>
          </div>
        )}
        <div className="machine-plinth" aria-hidden="true">
          <span>MEMORY FORGE / NOVA THINK LAB</span>
          <i />
          <span>CORE ONLINE</span>
        </div>
      </div>

      <style jsx>{`
        .memory-machine {
          --forge-aqua: #76e8d3;
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(118, 232, 211, .35);
          border-radius: 20px;
          color: #edfaff;
          background:
            radial-gradient(ellipse at 48% -35%, rgba(46, 204, 183, .15), transparent 66%),
            linear-gradient(135deg, #0c223c, #061326 55%, #071d31);
          box-shadow: inset 0 0 38px rgba(24, 142, 162, .07);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .machine-masthead {
          position: relative;
          flex: 0 0 auto;
          min-height: 59px;
          padding: 9px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-bottom: 1px solid rgba(126, 241, 215, .25);
          background: linear-gradient(180deg, rgba(42, 109, 132, .25), rgba(9, 28, 50, .62));
        }
        .machine-masthead::after {
          content: "";
          position: absolute;
          height: 2px;
          inset: auto 0 0;
          background: linear-gradient(90deg, transparent, #66e8da, transparent);
          opacity: .5;
        }
        .identity { display: flex; align-items: center; gap: 11px; min-width: 0; }
        .forge-emblem {
          position: relative;
          width: 39px;
          height: 39px;
          flex: 0 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border-radius: 12px;
          border: 1px solid rgba(109, 243, 217, .4);
          background: radial-gradient(circle at center, rgba(43, 166, 141, .24), rgba(15, 44, 59, .9));
        }
        .forge-emblem i { width: 21px; height: 6px; border: 1px solid #a5ffe8; border-radius: 2px; background: #57cbb4; box-shadow: 0 0 7px rgba(64, 242, 197, .36); }
        .forge-emblem i:nth-child(2) { background: #55a9db; }
        .forge-emblem i:nth-child(3) { background: #c695f4; }
        .identity-copy { display: grid; gap: 3px; min-width: 0; }
        .identity-copy strong { font-size: clamp(15px, 1.6vw, 21px); font-weight: 950; letter-spacing: .085em; }
        .identity-copy small { color: rgba(143, 240, 224, .61); font-size: 9px; font-weight: 850; letter-spacing: .105em; }
        .operation-indicator {
          flex: 0 0 auto;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border-radius: 999px;
          border: 1px solid rgba(111, 240, 198, .25);
          background: rgba(25, 154, 112, .10);
          color: #abffe0;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .08em;
        }
        .indicator-led { width: 7px; height: 7px; border-radius: 50%; background: #61f4ba; box-shadow: 0 0 11px #38edbd; }
        .operation-indicator.is-preview { color: #ffe29b; border-color: rgba(255, 214, 136, .34); background: rgba(177, 117, 26, .1); }
        .is-preview .indicator-led { background: #ffdb82; box-shadow: 0 0 10px #ffca72; animation: forgePulse 1s ease-in-out infinite alternate; }
        .operation-indicator.is-failed { color: #ffc4c4; border-color: rgba(248,130,153,.38); background: rgba(173,43,66,.1); }
        .is-failed .indicator-led { background: #ff7e98; box-shadow: 0 0 10px rgba(255,92,116,.5); }
        .machine-status-line {
          flex: 0 0 auto;
          min-height: 38px;
          padding: 6px 13px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          background: rgba(3, 14, 28, .5);
          border-bottom: 1px solid rgba(100, 190, 202, .11);
        }
        .status-copy { display: flex; align-items: center; gap: 8px; color: #abd5dd; font-size: 10px; line-height: 1.3; font-weight: 700; }
        .status-pictogram { color: #80ffdf; font-size: 16px; }
        .attempt-lights { flex: 0 0 auto; display: flex; gap: 5px; }
        .attempt-lights span { width: 13px; height: 7px; border-radius: 3px; }
        .attempt-lights .is-ready { background: #6bd8bc; box-shadow: 0 0 7px rgba(67, 207, 175, .25); }
        .attempt-lights .is-spent { background: #9d6378; }
        .chambers-grid {
          flex: 1 1 auto;
          min-height: 0;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          overflow: hidden;
        }
        .tower-chamber {
          position: relative;
          min-width: 0;
          min-height: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          border-radius: 17px;
          border: 1px solid rgba(105, 215, 214, .23);
          background: linear-gradient(160deg, rgba(41, 99, 117, .24), rgba(2, 15, 31, .77));
          box-shadow: inset 0 0 24px rgba(4, 8, 22, .2);
        }
        .construct-chamber { border-color: rgba(110, 236, 202, .27); }
        .chamber-title {
          z-index: 1;
          flex: 0 0 auto;
          padding: 11px 12px 8px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }
        .chamber-overline { color: #8bdcd4; font-size: 8px; font-weight: 900; letter-spacing: .16em; }
        .chamber-title h3 { margin: 3px 0 0; font-size: clamp(14px, 1.7vw, 21px); letter-spacing: -.02em; }
        .chamber-chip { padding: 6px 8px; border-radius: 7px; background: rgba(35, 67, 84, .5); border: 1px solid rgba(132, 228, 220, .19); color: #b4d5dd; font-size: 9px; font-weight: 900; white-space: nowrap; }
        .chamber-chip.is-live { background: rgba(230, 176, 57, .13); border-color: rgba(255,216,127,.36); color: #ffdc8c; }
        .construct-chip { border-color: rgba(115, 242, 211, .31); color: #99ffdb; }
        .timer-track, .construction-track { height: 4px; margin: 0 12px 4px; flex: 0 0 4px; display: flex; gap: 3px; border-radius: 10px; background: rgba(255,255,255,.07); overflow: hidden; }
        .timer-track span { height: 100%; background: linear-gradient(90deg, #eec16f, #ffefad); box-shadow: 0 0 12px rgba(255, 219, 144, .4); transition: width 1s linear; }
        .construction-track span { flex: 1; background: rgba(165,231,227,.11); }
        .construction-track span.is-filled { background: #68eed5; box-shadow: 0 0 9px rgba(104,238,213,.42); }
        .hologram-stage {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 4px 12px 12px;
          background:
            linear-gradient(rgba(121, 225, 236, .025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(121, 225, 236, .025) 1px, transparent 1px),
            radial-gradient(ellipse at 50% 70%, rgba(30, 161, 150, .16), transparent 69%);
          background-size: 30px 30px, 30px 30px, auto;
        }
        .stage-rays { position: absolute; z-index: 0; inset: 10% 20% 5%; pointer-events: none; background: linear-gradient(180deg, transparent, rgba(57,241,217,.07)); clip-path: polygon(40% 0, 60% 0, 98% 100%, 2% 100%); }
        .hologram-stage :global(.holo-tower) { position: relative; z-index: 1; }
        .floor-ring { position: absolute; z-index: 0; bottom: 5px; width: 69%; height: 15px; border: 2px solid rgba(105,241,204,.28); border-radius: 50%; box-shadow: 0 0 19px rgba(39,193,160,.13); }
        .chamber-footnote {
          flex: 0 0 auto;
          min-height: 25px;
          padding: 6px 12px;
          display: flex;
          align-items: center;
          gap: 6px;
          border-top: 1px solid rgba(106, 221, 211, .13);
          background: rgba(1, 12, 25, .43);
          color: rgba(153, 223, 211, .67);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: .12em;
        }
        .dot { width: 5px; height: 5px; border-radius: 50%; background: #71ead2; box-shadow: 0 0 8px rgba(97,227,196,.5); }
        .machine-control-deck {
          flex: 0 0 auto;
          padding: 10px 12px;
          display: grid;
          grid-template-columns: minmax(0, 1.08fr) minmax(0, 1fr);
          gap: 12px;
          border-top: 1px solid rgba(111,230,216,.24);
          background: linear-gradient(180deg, rgba(21,58,80,.50), rgba(4,21,36,.93));
        }
        .cartridge-panel, .operator-panel { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
        .control-heading { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
        .control-heading strong { color: #8af2df; font-size: 9px; font-weight: 950; letter-spacing: .125em; white-space: nowrap; }
        .control-heading > span { color: rgba(183,225,230,.55); font-size: 9px; font-weight: 700; }
        .cartridge-grid { display: grid; grid-template-columns: repeat(6, minmax(0,1fr)); gap: 5px; }
        .cartridge {
          min-width: 0;
          min-height: 60px;
          padding: 6px 2px 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          border: 1px solid rgba(118, 214, 233, .23);
          border-radius: 11px;
          background: linear-gradient(150deg, rgba(56, 98, 119, .49), rgba(5, 22, 42, .8));
          color: #b6e5e9;
          cursor: pointer;
          transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
        }
        .cartridge:hover:not(:disabled) { transform: translateY(-3px); border-color: rgba(119, 255, 215, .6); background: rgba(34, 112, 118, .33); }
        .cartridge:focus-visible { outline: 2px solid #9fffe8; outline-offset: 2px; }
        .cartridge:disabled { opacity: .4; cursor: not-allowed; }
        .cartridge-shell { width: clamp(25px, 2.65vw, 34px); height: clamp(25px, 2.65vw, 34px); flex: 0 0 auto; display: grid; place-items: center; border: 2px solid #345c75; border-radius: 8px; background: rgba(1,11,24,.9); box-shadow: inset 0 2px 5px rgba(0,0,0,.5); }
        .cartridge-crystal { width: 82%; height: 82%; display: block; border-radius: 4px; border: 1px solid rgba(255,255,255,.3); box-shadow: inset 0 3px 3px rgba(255,255,255,.27), 0 0 10px rgba(184,252,234,.08); }
        .cartridge-name { max-width: 100%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-size: 8px; font-weight: 800; }
        .operator-message {
          flex: 1 1 auto;
          min-height: 28px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #bfe8ee;
          font-size: 10px;
          font-weight: 750;
          line-height: 1.3;
        }
        .operator-message strong { display: block; color: #ffb8be; }
        .operator-message .message-led { width: 7px; height: 7px; flex: 0 0 auto; border-radius: 50%; background: #76e6d3; }
        .operator-message.has-error .message-led { background: #ff94a2; }
        .operator-actions { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); align-items: center; gap: 6px; }
        .operator-actions :global(button) { width: 100%; min-height: 38px; padding: 6px 7px; border-radius: 10px; font-size: 10px; line-height: 1.2; white-space: normal; }
        .operator-actions :global(button:only-child) { grid-column: 1 / -1; }
        .failure-strip {
          flex: 0 0 auto;
          margin: 0 12px 8px;
          padding: 7px 11px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 7px;
          border-radius: 9px;
          background: rgba(98, 40, 63, .15);
          border: 1px solid rgba(255, 155, 170, .32);
        }
        .failure-strip > span { color: #ffc1ce; font-size: 9px; font-weight: 850; letter-spacing: .04em; }
        .failure-blocks { display: flex; gap: 5px; }
        .failure-blocks i { width: 19px; height: 19px; border: 1px solid rgba(255,255,255,.35); border-radius: 4px; }
        .machine-plinth {
          flex: 0 0 auto;
          min-height: 24px;
          padding: 5px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-top: 1px solid rgba(126, 232, 211, .2);
          color: rgba(139, 208, 219, .6);
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .1em;
        }
        .machine-plinth i { height: 1px; flex: 1; background: linear-gradient(90deg, transparent, rgba(109, 231, 215, .6), transparent); }

        @keyframes forgePulse { from { opacity: .5; } to { opacity: 1; } }
        @media (max-width: 1040px) {
          .chambers-grid { padding: 8px; gap: 7px; }
          .machine-control-deck { padding: 8px; gap: 9px; }
          .cartridge { min-height: 52px; }
          .operator-actions :global(button) { font-size: 9px; padding: 5px 4px; }
          .chamber-title { padding: 8px; }
          .chamber-chip { padding: 5px; font-size: 8px; }
          .control-heading strong { font-size: 8px; }
        }
        @media (max-width: 720px) {
          .memory-machine { border-radius: 12px; overflow-y: auto; overscroll-behavior: contain; }
          .machine-masthead { min-height: 45px; padding: 6px 9px; }
          .forge-emblem { width: 31px; height: 31px; border-radius: 8px; }
          .forge-emblem i { width: 17px; height: 5px; }
          .identity { gap: 7px; }
          .identity-copy strong { font-size: 13px; letter-spacing: .065em; }
          .identity-copy small { font-size: 7px; letter-spacing: .03em; }
          .operation-indicator { padding: 6px; font-size: 7px; gap: 4px; }
          .machine-status-line { padding: 7px; min-height: 39px; }
          .status-copy { font-size: 9px; gap: 5px; }
          .attempt-lights { gap: 3px; }
          .attempt-lights span { width: 8px; height: 6px; }
          .chambers-grid { flex: 0 0 auto; min-height: 240px; height: clamp(240px, 42dvh, 325px); padding: 6px; gap: 5px; overflow: visible; }
          .tower-chamber { border-radius: 10px; }
          .chamber-title { padding: 6px 5px 5px; flex-wrap: wrap; gap: 3px; }
          .chamber-overline { font-size: 6px; letter-spacing: .06em; }
          .chamber-title h3 { font-size: 12px; }
          .chamber-chip { padding: 4px; font-size: 7px; }
          .timer-track, .construction-track { margin: 0 5px 3px; }
          .hologram-stage { padding: 4px 4px 8px; }
          .chamber-footnote { min-height: 21px; padding: 5px; font-size: 6px; letter-spacing: .035em; }
          .machine-control-deck { flex: 0 0 auto; grid-template-columns: minmax(0,1fr); gap: 10px; padding: 8px; }
          .cartridge-grid { gap: 4px; }
          .cartridge { min-height: 46px; padding: 4px 2px; gap: 3px; }
          .cartridge-shell { width: 26px; height: 26px; border-radius: 6px; }
          .cartridge-name { font-size: 7px; }
          .operator-panel { gap: 6px; }
          .operator-message { min-height: 23px; font-size: 10px; }
          .operator-actions { gap: 4px; }
          .operator-actions :global(button) { min-height: 36px; font-size: 9px; padding: 5px 3px; }
          .machine-plinth { padding: 5px 8px; font-size: 7px; min-height: 21px; }
        }
        @media (max-width: 385px) {
          .operation-indicator { max-width: 88px; }
          .machine-status-line { align-items: flex-start; }
          .chambers-grid { min-height: 235px; height: 255px; }
          .chamber-title h3 { font-size: 11px; }
          .operator-actions { grid-template-columns: 1fr 1fr; }
          .operator-actions :global(button:last-child) { grid-column: 1 / -1; }
          .operator-actions :global(button:only-child) { grid-column: 1 / -1; }
        }
        @media (max-height: 720px) and (min-width: 721px) {
          .machine-masthead { min-height: 45px; padding: 5px 11px; }
          .machine-status-line { min-height: 30px; padding: 3px 9px; }
          .chambers-grid { padding: 6px; }
          .chamber-title { padding: 6px 8px; }
          .machine-control-deck { padding: 6px 8px; }
          .cartridge { min-height: 43px; padding: 3px; gap: 2px; }
          .cartridge-shell { width: 24px; height: 24px; }
          .operator-actions :global(button) { min-height: 32px; }
          .control-heading strong { font-size: 8px; }
          .chamber-footnote { min-height: 20px; padding: 4px 8px; }
          .machine-plinth { min-height: 19px; padding: 3px 8px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .indicator-led, .timer-track span, .cartridge { animation: none; transition: none; }
        }
      `}</style>
    </GamePanel>
  );
}
