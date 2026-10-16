"use client";

import { useMemo, useRef, useState } from "react";
import {
  CLUE_COST,
  DAILY_LIMIT,
  GamePanel,
  formatSupabaseError,
  InstructionBar,
  RewardResult,
  seededRandom,
  seededShuffle,
  makeSeed,
} from "./shared";
import type { GameId, CompletionResult, ClueResult } from "./shared";

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

export function SetFinderGame({
  userId,
  isGuest,
  activityDate,
  questionNumber,
  cluesUsed,
  tokenBalance,
  onBuyClue,
  onComplete,
  onContinue,
  walkthroughHighlightClue = false,
}: {
  userId: string;
  isGuest: boolean;
  activityDate: string;
  questionNumber: number;
  cluesUsed: number;
  tokenBalance: number;
  walkthroughHighlightClue?: boolean;
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
    localClues < (isGuest ? 1 : 3) && currentBoardClues < 3 && !completion;

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
          isGuest={isGuest}
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
      <div className="pattern-cabinet">
        <header className="machine-masthead">
          <div className="machine-mark" aria-hidden="true">
            <span className="mark-circle" />
            <span className="mark-triangle" />
            <span className="mark-diamond" />
          </div>
          <div className="machine-identity">
            <span className="machine-code">NOVA THINK LAB / MACHINE 02</span>
            <strong>PATTERN SCANNER</strong>
          </div>
          <div className="machine-online" aria-label={busy ? "Scanner processing" : "Scanner online"}>
            <span className={`online-light ${busy ? "is-busy" : ""}`} aria-hidden="true" />
            {busy ? "SCANNING" : "ONLINE"}
          </div>
        </header>

        <div className="machine-chassis">
          <section className="scanner-deck" aria-label="Pattern scanner cards">
            <div className="deck-head">
              <div>
                <span className="panel-eyebrow">HOLOGRAPHIC CARD MATRIX</span>
                <h3>Identify a valid SET</h3>
              </div>
              <div className="scan-progress" aria-label={`${setsFound} of 3 SETs found`}>
                {[0, 1, 2].map((index) => (
                  <span
                    key={index}
                    className={`progress-cell ${index < setsFound ? "is-complete" : ""} ${
                      index === setsFound ? "is-current" : ""
                    }`}
                    aria-label={`SET ${index + 1}: ${index < setsFound ? "complete" : index === setsFound ? "in progress" : "upcoming"}`}
                  >
                    {index < setsFound ? "✓" : String(index + 1).padStart(2, "0")}
                  </span>
                ))}
              </div>
            </div>

            <div className="scanner-hint">
              <span className="scan-beacon" aria-hidden="true" />
              <span>Choose three cards. Each feature must be all the same or all different.</span>
            </div>

            <div className="hologram-board" aria-label="Twelve pattern cards">
              {board.map((card, index) => {
                const selectionPosition = selectedIds.indexOf(card.id);
                const selected = selectionPosition !== -1;
                const hinted = hintedCardIds.has(card.id);

                return (
                  <button
                    type="button"
                    key={card.id}
                    className={`holo-card ${selected ? "is-selected" : ""} ${
                      hinted ? "is-hinted" : ""
                    }`}
                    onClick={() => toggleCard(card.id)}
                    disabled={busy}
                    aria-pressed={selected}
                    aria-label={`Card ${index + 1}: ${card.count + 1} ${PATTERN_LABELS[card.pattern]} ${SHAPE_LABELS[card.shape]}${hinted ? ", hint highlighted" : ""}`}
                  >
                    <span className="card-identifier" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="card-projection" aria-hidden="true">
                      {Array.from({ length: card.count + 1 }).map((_, symbolIndex) => (
                        <SetSymbol
                          key={`${card.id}-${symbolIndex}`}
                          card={card}
                          symbolIndex={symbolIndex}
                        />
                      ))}
                    </span>
                    {hinted && <span className="hint-spark" aria-hidden="true">✦</span>}
                    {selected && (
                      <span className="selection-order" aria-hidden="true">
                        {selectionPosition + 1}
                      </span>
                    )}
                    <span className="card-lamp" aria-hidden="true" />
                  </button>
                );
              })}
            </div>

            <div className="scanner-command">
              <div className="selection-console">
                <span className="console-label">CARD INPUT</span>
                <div className="selection-slots" aria-label={`${selectedIds.length} of 3 cards selected`}>
                  {[0, 1, 2].map((index) => (
                    <span
                      key={index}
                      className={`selection-slot ${index < selectedIds.length ? "is-loaded" : ""}`}
                      aria-hidden="true"
                    >
                      {index < selectedIds.length ? String(index + 1) : "+"}
                    </span>
                  ))}
                </div>
                <small>{selectedIds.length}/3 selected</small>
              </div>
              <button
                type="button"
                className="scan-button"
                onClick={checkSelection}
                disabled={busy || selectedIds.length !== 3}
              >
                <span aria-hidden="true">⌁</span>
                {busy ? "ANALYSING…" : "SCAN SELECTED SET"}
              </button>
            </div>
          </section>

          <aside className="scanner-console" aria-label="Scanner diagnostics and clues">
            <section className="diagnostic-panel">
              <div className="side-heading">
                <span className="panel-eyebrow">LIVE SCAN READOUT</span>
                <span className="readout-led" aria-hidden="true" />
              </div>
              <div className="readout-text" role="status" aria-live="polite">
                <span className="readout-caret" aria-hidden="true">›</span>
                <p>{message}</p>
              </div>
              {errorMessage && <p className="error-message" role="alert">{errorMessage}</p>}
              <div className="diagnostic-stats">
                <div><small>SETS FOUND</small><strong>{setsFound}<span> / 3</span></strong></div>
                <div><small>INVALID SCANS</small><strong>{mistakes}</strong></div>
              </div>
            </section>

            <section className="instruction-module">
              <span className="panel-eyebrow">SCANNER CALIBRATION</span>
              <h3>Four properties to compare</h3>
              <div className="property-grid">
                <div><span className="property-icon colour-icon" aria-hidden="true">●</span><span>Colour</span></div>
                <div><span className="property-icon shape-icon" aria-hidden="true">◇</span><span>Shape</span></div>
                <div><span className="property-icon number-icon" aria-hidden="true">123</span><span>Number</span></div>
                <div><span className="property-icon pattern-icon" aria-hidden="true">▤</span><span>Pattern</span></div>
              </div>
              <p>For every property, the three cards must be <strong>all alike</strong> or <strong>all different</strong>.</p>
            </section>

            <section className="clue-module">
              <div className="clue-head">
                <span className="panel-eyebrow">ASSISTED SCAN</span>
                <strong>{isGuest ? "GUEST MODE" : `${localClues}/3 USED`}</strong>
              </div>
              <p>Highlight one card that belongs to a valid SET.</p>
              <button
                type="button"
                className={`clue-button ${walkthroughHighlightClue ? "is-walkthrough-highlighted" : ""}`}
                onClick={buyClue}
                disabled={
                  busy ||
                  !mayBuyCurrentClue ||
                  (!isGuest && tokenBalance < CLUE_COST)
                }
              >
                <span aria-hidden="true">✦</span>
                {isGuest
                  ? localClues >= 1
                    ? "GUEST HINT USED"
                    : "FREE GUEST HINT"
                  : localClues >= 3
                    ? "ALL CLUES USED"
                    : `REVEAL CLUE · ${CLUE_COST} DT`}
              </button>
              <small>{isGuest ? "One free hint per challenge." : "Clues spend your existing Dream Tokens."}</small>
            </section>
          </aside>
        </div>

        <div className="cabinet-base" aria-hidden="true">
          <span className="base-bolt" />
          <span>POLARIS PATTERN SYSTEMS</span>
          <i />
          <strong>NOVA / THINK LAB</strong>
          <span className="base-bolt" />
        </div>
      </div>

      <style jsx>{`
        .pattern-cabinet {
          --scanner-violet: #b79aff;
          --scanner-blue: #87cfff;
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          border-radius: 19px;
          border: 1px solid rgba(173, 150, 255, .36);
          color: #f3f7ff;
          background:
            radial-gradient(ellipse at 50% 3%, rgba(135, 92, 245, .18), transparent 52%),
            linear-gradient(150deg, rgba(12, 24, 54, .99), rgba(3, 10, 26, .98));
          box-shadow: inset 0 0 0 3px rgba(43, 51, 93, .45), 0 22px 42px rgba(0, 0, 0, .29);
          font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        }
        .machine-masthead {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 0 0 auto;
          min-height: 62px;
          padding: 10px 17px;
          border-bottom: 1px solid rgba(171, 149, 255, .29);
          background: linear-gradient(115deg, rgba(49, 38, 99, .74), rgba(10, 25, 55, .92));
        }
        .machine-mark {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
          width: 42px;
          height: 42px;
          flex: 0 0 auto;
          border: 1px solid rgba(171, 150, 255, .49);
          border-radius: 12px;
          background: rgba(30, 19, 73, .72);
          box-shadow: inset 0 0 15px rgba(138, 104, 254, .15), 0 0 17px rgba(138, 104, 254, .15);
        }
        .mark-circle {
          width: 9px;
          height: 9px;
          border: 2px solid #ff8bcb;
          border-radius: 50%;
        }
        .mark-triangle {
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-bottom: 11px solid #77dfff;
        }
        .mark-diamond {
          width: 9px;
          height: 9px;
          border: 2px solid #b6a0ff;
          transform: rotate(45deg);
        }
        .machine-identity { display: grid; gap: 2px; min-width: 0; }
        .machine-code {
          color: rgba(175, 222, 255, .68);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .17em;
        }
        .machine-identity strong {
          font-size: clamp(17px, 1.7vw, 23px);
          font-weight: 900;
          letter-spacing: .085em;
          white-space: nowrap;
        }
        .machine-online {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-left: auto;
          padding: 8px 11px;
          border-radius: 999px;
          border: 1px solid rgba(109, 239, 187, .29);
          background: rgba(23, 90, 74, .14);
          color: #a0ffdc;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .08em;
        }
        .online-light,
        .readout-led {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #5dffc5;
          box-shadow: 0 0 12px rgba(93, 255, 197, .65);
        }
        .online-light.is-busy { animation: led-pulse 800ms ease-in-out infinite alternate; }
        .machine-chassis {
          display: grid;
          grid-template-columns: minmax(0, 1.63fr) minmax(220px, .77fr);
          flex: 1 1 auto;
          min-height: 0;
          gap: 10px;
          padding: 11px;
          overflow: hidden;
        }
        .scanner-deck {
          display: grid;
          grid-template-rows: auto auto minmax(0, 1fr) auto;
          min-width: 0;
          min-height: 0;
          gap: 9px;
          padding: 11px;
          border: 1px solid rgba(152, 160, 255, .23);
          border-radius: 15px;
          background:
            radial-gradient(circle at 50% 45%, rgba(77, 66, 184, .15), transparent 70%),
            rgba(4, 13, 34, .77);
          box-shadow: inset 0 0 20px rgba(90, 83, 172, .08);
        }
        .deck-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .deck-head > div:first-child { min-width: 0; }
        .panel-eyebrow {
          display: block;
          color: #a4a5fc;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .14em;
        }
        .deck-head h3 {
          margin: 5px 0 0;
          font-size: clamp(13px, 1.25vw, 17px);
          letter-spacing: -.01em;
        }
        .scan-progress { display: flex; gap: 6px; flex: 0 0 auto; }
        .progress-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 31px;
          height: 30px;
          border-radius: 9px;
          border: 1px solid rgba(153, 173, 255, .17);
          background: rgba(36, 44, 89, .39);
          color: rgba(211, 225, 255, .44);
          font-size: 10px;
          font-weight: 900;
        }
        .progress-cell.is-current {
          border-color: rgba(168, 140, 255, .74);
          color: #e0d1ff;
          box-shadow: inset 0 0 13px rgba(163, 122, 255, .21), 0 0 11px rgba(163, 122, 255, .14);
        }
        .progress-cell.is-complete {
          color: #a2ffdc;
          border-color: rgba(81, 231, 177, .51);
          background: rgba(36, 115, 89, .27);
        }
        .scanner-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 10px;
          min-height: 29px;
          border: 1px solid rgba(113, 165, 250, .19);
          border-radius: 9px;
          background: rgba(33, 50, 97, .20);
          color: #abcde5;
          font-size: 10px;
          line-height: 1.35;
        }
        .scan-beacon {
          flex: 0 0 auto;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #65cfff;
          box-shadow: 0 0 8px rgba(101, 207, 255, .8);
        }
        .hologram-board {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(0, 1fr));
          gap: 7px;
          min-height: 0;
          padding: 7px;
          border: 1px solid rgba(135, 118, 245, .26);
          border-radius: 13px;
          background:
            linear-gradient(rgba(128, 112, 240, .06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(128, 112, 240, .06) 1px, transparent 1px),
            radial-gradient(ellipse at 50% 50%, rgba(91, 55, 199, .16), rgba(0, 10, 28, .9));
          background-size: 28px 28px, 28px 28px, auto;
        }
        .holo-card {
          position: relative;
          display: flex;
          justify-content: center;
          align-items: center;
          min-width: 0;
          min-height: 0;
          padding: 12px 4px;
          overflow: hidden;
          border: 1px solid rgba(114, 167, 246, .25);
          border-radius: 11px;
          background:
            linear-gradient(156deg, rgba(86, 82, 179, .17), rgba(7, 24, 58, .55) 53%),
            #08132b;
          color: #e5dfff;
          cursor: pointer;
          transition: border-color 130ms ease, transform 130ms ease, background 130ms ease, box-shadow 130ms ease;
        }
        .holo-card::after {
          content: "";
          position: absolute;
          inset: 2px;
          border: 1px solid rgba(137, 149, 255, .045);
          border-radius: 8px;
          pointer-events: none;
        }
        .holo-card:hover:not(:disabled) {
          transform: translateY(-2px);
          border-color: rgba(158, 153, 255, .75);
          background: rgba(89, 71, 173, .20);
        }
        .holo-card:focus-visible { outline: 2px solid #fff; outline-offset: -3px; }
        .holo-card:disabled { cursor: wait; }
        .holo-card.is-selected {
          border-color: #b79aff;
          background: radial-gradient(circle at 50% 50%, rgba(149, 119, 255, .19), rgba(27, 27, 75, .86));
          box-shadow: inset 0 0 0 1px rgba(198, 181, 255, .31), 0 0 17px rgba(145, 98, 244, .19);
        }
        .holo-card.is-hinted {
          border-color: #ffd46f;
          box-shadow: inset 0 0 0 2px rgba(255, 208, 112, .24), 0 0 15px rgba(255, 208, 112, .15);
        }
        .holo-card.is-selected.is-hinted {
          border-color: #ffde98;
          box-shadow: inset 0 0 0 2px rgba(255, 216, 145, .35), 0 0 19px rgba(255, 208, 112, .24);
        }
        .card-identifier {
          position: absolute;
          top: 5px;
          left: 7px;
          color: rgba(174, 192, 255, .43);
          font-size: 9px;
          font-weight: 900;
        }
        .card-projection {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          width: 100%;
          height: 100%;
          max-height: 80px;
          pointer-events: none;
        }
        .card-projection :global(svg) {
          width: min(31%, 54px);
          min-width: 0;
          height: auto;
          max-height: 78%;
          overflow: visible;
          filter: drop-shadow(0 4px 7px rgba(80, 100, 220, .31));
        }
        .hint-spark {
          position: absolute;
          right: 7px;
          top: 4px;
          color: #ffdb85;
          font-size: 14px;
          text-shadow: 0 0 11px rgba(255, 214, 124, .9);
        }
        .selection-order {
          position: absolute;
          right: 5px;
          top: 5px;
          display: grid;
          place-items: center;
          width: 19px;
          height: 19px;
          border-radius: 50%;
          background: #9a7cef;
          color: #fff;
          font-size: 10px;
          font-weight: 900;
          box-shadow: 0 0 10px rgba(176, 143, 255, .6);
        }
        .card-lamp {
          position: absolute;
          bottom: 5px;
          left: 50%;
          width: 24px;
          height: 2px;
          transform: translateX(-50%);
          background: rgba(124, 150, 236, .2);
        }
        .holo-card.is-selected .card-lamp { background: #b89cff; box-shadow: 0 0 10px #b89cff; }
        .holo-card.is-hinted .card-lamp { background: #ffd46f; box-shadow: 0 0 10px #ffd46f; }
        .scanner-command {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 11px;
          min-height: 53px;
          padding: 6px 9px;
          border: 1px solid rgba(149, 144, 254, .19);
          border-radius: 11px;
          background: rgba(36, 38, 85, .31);
        }
        .selection-console { display: flex; align-items: center; gap: 9px; min-width: 0; }
        .console-label {
          color: #afbedc;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
          white-space: nowrap;
        }
        .selection-slots { display: flex; align-items: center; gap: 5px; }
        .selection-slot {
          display: grid;
          place-items: center;
          width: 27px;
          height: 27px;
          border: 1px solid rgba(158, 151, 245, .23);
          border-radius: 7px;
          background: rgba(5, 11, 35, .67);
          color: rgba(155, 151, 234, .4);
          font-size: 12px;
          font-weight: 850;
        }
        .selection-slot.is-loaded {
          border-color: rgba(168, 140, 255, .8);
          background: rgba(153, 100, 255, .25);
          color: #eee3ff;
        }
        .selection-console small {
          color: rgba(206, 226, 255, .49);
          font-size: 9px;
          font-weight: 800;
          white-space: nowrap;
        }
        .scan-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-width: 150px;
          min-height: 39px;
          padding: 7px 12px;
          border: 1px solid rgba(201, 173, 255, .78);
          border-radius: 9px;
          color: #fff;
          background: linear-gradient(125deg, #7653d3, #3e58bb);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, .18), 0 4px 17px rgba(95, 69, 196, .24);
          font: inherit;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .04em;
          cursor: pointer;
          transition: filter 140ms ease, transform 140ms ease;
        }
        .scan-button span { font-size: 21px; line-height: 0; }
        .scan-button:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.18); }
        .scan-button:disabled { opacity: .42; box-shadow: none; cursor: not-allowed; }
        .scan-button:focus-visible, .clue-button:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }
        .scanner-console {
          display: flex;
          flex-direction: column;
          min-width: 0;
          min-height: 0;
          gap: 10px;
          overflow: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(157, 132, 255, .38) transparent;
        }
        .scanner-console > section {
          min-width: 0;
          border: 1px solid rgba(158, 147, 245, .22);
          border-radius: 13px;
          padding: 12px;
          background: linear-gradient(150deg, rgba(40, 40, 88, .45), rgba(3, 13, 36, .77));
        }
        .side-heading { display: flex; justify-content: space-between; align-items: center; }
        .readout-text {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 12px;
          min-height: 38px;
          color: #e1e1ff;
        }
        .readout-caret { color: #bca1ff; font-size: 22px; line-height: 1; font-weight: 900; }
        .readout-text p { margin: 0; font-size: clamp(11px, 1.05vw, 14px); font-weight: 750; line-height: 1.45; }
        .error-message {
          margin: 8px 0 0;
          padding: 9px;
          border-radius: 8px;
          background: rgba(135, 38, 61, .21);
          border: 1px solid rgba(255, 111, 138, .28);
          color: #ffb5c5;
          font-size: 11px;
          line-height: 1.4;
        }
        .diagnostic-stats {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
          margin-top: 10px;
        }
        .diagnostic-stats div {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
          padding: 8px;
          border: 1px solid rgba(147, 143, 246, .15);
          border-radius: 8px;
          background: rgba(10, 19, 43, .6);
        }
        .diagnostic-stats small {
          color: rgba(190, 204, 250, .60);
          font-size: 8px;
          font-weight: 850;
          letter-spacing: .08em;
        }
        .diagnostic-stats strong { color: #cbb5ff; font-size: 23px; line-height: 1; }
        .diagnostic-stats strong span { color: rgba(195, 202, 248, .51); font-size: 11px; }
        .instruction-module h3 {
          margin: 8px 0 11px;
          font-size: 13px;
          font-weight: 850;
        }
        .property-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        .property-grid div {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          border-radius: 8px;
          background: rgba(18, 31, 66, .75);
          border: 1px solid rgba(129, 156, 239, .14);
          color: #d4ddff;
          font-size: 11px;
          font-weight: 750;
        }
        .property-icon { width: 19px; text-align: center; flex: 0 0 auto; }
        .colour-icon { color: #ff8fbb; font-size: 17px; }
        .shape-icon { color: #95baff; font-size: 17px; }
        .number-icon { color: #c5adff; font-size: 10px; font-weight: 900; }
        .pattern-icon { color: #7be6e3; font-size: 17px; }
        .instruction-module p {
          margin: 12px 0 0;
          color: rgba(212, 225, 255, .71);
          font-size: 11px;
          line-height: 1.5;
        }
        .instruction-module p strong { color: #e8deff; }
        .clue-module { margin-top: auto; }
        .clue-head { display: flex; justify-content: space-between; align-items: center; gap: 5px; }
        .clue-head strong { color: #ffda90; font-size: 9px; white-space: nowrap; }
        .clue-module p {
          margin: 10px 0;
          color: #c3cbe7;
          font-size: 11px;
          line-height: 1.35;
        }
        .clue-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          width: 100%;
          min-height: 40px;
          padding: 8px 11px;
          border-radius: 10px;
          border: 1px solid rgba(255, 210, 114, .65);
          background: linear-gradient(120deg, rgba(133, 88, 24, .46), rgba(77, 52, 30, .71));
          color: #ffe2a5;
          font: inherit;
          font-size: 11px;
          font-weight: 900;
          cursor: pointer;
        }
        .clue-button span { font-size: 16px; }
        .clue-button:hover:not(:disabled) { filter: brightness(1.16); }
        .clue-button:disabled { opacity: .43; cursor: not-allowed; }
        .clue-button.is-walkthrough-highlighted {
          position: relative;
          z-index: 125;
          border-color: #ffe8a7;
          box-shadow: 0 0 0 3px rgba(255, 211, 110, .11), 0 0 25px rgba(255, 211, 110, .36);
          animation: clue-pulse 1.4s ease-in-out infinite alternate;
        }
        .clue-module > small {
          display: block;
          margin-top: 7px;
          color: rgba(204, 215, 249, .49);
          font-size: 9px;
          line-height: 1.35;
        }
        .cabinet-base {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 28px;
          padding: 0 14px;
          flex: 0 0 auto;
          border-top: 1px solid rgba(150, 147, 255, .27);
          background: linear-gradient(180deg, #222448, #0b1731);
          color: rgba(191, 191, 250, .69);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: .12em;
        }
        .cabinet-base i {
          flex: 1;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(177, 133, 255, .6), transparent);
        }
        .cabinet-base strong { color: #bda5ff; font-size: 9px; white-space: nowrap; }
        .base-bolt { width: 7px; height: 7px; border-radius: 50%; border: 1px solid rgba(165, 170, 242, .29); background: #10152e; }
        @keyframes led-pulse { from { opacity: .4; } to { opacity: 1; } }
        @keyframes clue-pulse {
          from { box-shadow: 0 0 0 2px rgba(255, 211, 110, .08), 0 0 12px rgba(255, 211, 110, .20); }
          to { box-shadow: 0 0 0 4px rgba(255, 211, 110, .16), 0 0 31px rgba(255, 211, 110, .43); }
        }
        @media (max-width: 1180px) {
          .machine-chassis { grid-template-columns: minmax(0, 1.45fr) minmax(194px, .78fr); padding: 7px; gap: 7px; }
          .scanner-deck { gap: 6px; padding: 8px; }
          .scanner-console { gap: 7px; }
          .scanner-console > section { padding: 8px; }
          .instruction-module p { margin-top: 8px; }
          .property-grid div { padding: 6px 5px; font-size: 10px; }
          .card-projection :global(svg) { width: min(31%, 44px); }
          .selection-console { gap: 5px; }
          .selection-slot { width: 23px; height: 25px; }
          .selection-console small { display: none; }
        }
        @media (max-width: 720px) {
          .pattern-cabinet {
            height: 100%;
            overflow-y: auto;
            overscroll-behavior: contain;
            scrollbar-width: thin;
            scrollbar-color: rgba(156, 126, 255, .42) rgba(0, 0, 0, .10);
            border-radius: 11px;
          }
          .machine-masthead { min-height: 47px; padding: 7px 9px; gap: 7px; }
          .machine-mark { width: 30px; height: 30px; gap: 2px; }
          .mark-circle { width: 7px; height: 7px; }
          .mark-triangle { border-left-width: 5px; border-right-width: 5px; border-bottom-width: 9px; }
          .mark-diamond { width: 7px; height: 7px; }
          .machine-code { font-size: 7px; letter-spacing: .09em; }
          .machine-identity strong { font-size: 12px; }
          .machine-online { font-size: 8px; padding: 5px 7px; gap: 4px; }
          .online-light { width: 5px; height: 5px; }
          .machine-chassis { display: flex; flex-direction: column; flex: 0 0 auto; gap: 6px; padding: 5px; overflow: visible; }
          .scanner-deck { flex: 0 0 auto; grid-template-rows: auto auto auto auto; padding: 7px; gap: 6px; }
          .deck-head h3 { font-size: 12px; margin-top: 2px; }
          .panel-eyebrow { font-size: 8px; letter-spacing: .09em; }
          .scan-progress { gap: 3px; }
          .progress-cell { width: 24px; height: 25px; border-radius: 6px; font-size: 9px; }
          .scanner-hint { padding: 5px 6px; font-size: 9px; }
          .hologram-board { grid-template-columns: repeat(3, minmax(0, 1fr)); grid-template-rows: repeat(4, minmax(58px, auto)); padding: 5px; gap: 5px; }
          .holo-card { min-height: 58px; padding: 12px 3px 10px; border-radius: 8px; }
          .card-projection { max-height: 55px; }
          .card-projection :global(svg) { width: min(32%, 40px); max-height: 73%; }
          .card-identifier { top: 3px; left: 4px; font-size: 7px; }
          .hint-spark { top: 3px; right: 4px; font-size: 11px; }
          .selection-order { right: 3px; top: 3px; width: 15px; height: 15px; font-size: 8px; }
          .card-lamp { bottom: 3px; width: 17px; }
          .scanner-command { padding: 5px; gap: 5px; }
          .console-label { display: none; }
          .selection-slots { gap: 3px; }
          .selection-slot { width: 22px; height: 24px; }
          .scan-button { min-width: 0; min-height: 36px; flex: 1; padding: 5px; gap: 3px; font-size: 9px; }
          .scan-button span { font-size: 16px; }
          .scanner-console { flex: 0 0 auto; overflow: visible; gap: 6px; }
          .scanner-console > section { padding: 9px; }
          .diagnostic-panel { order: 0; }
          .clue-module { order: 1; margin-top: 0; }
          .instruction-module { order: 2; }
          .readout-text { min-height: 0; margin-top: 6px; gap: 4px; }
          .readout-text p { font-size: 11px; }
          .diagnostic-stats { margin-top: 6px; }
          .diagnostic-stats strong { font-size: 17px; }
          .diagnostic-stats div { padding: 5px; }
          .clue-module p { margin: 6px 0; }
          .clue-button { min-height: 36px; }
          .cabinet-base { min-height: 25px; padding: 0 8px; font-size: 7px; letter-spacing: .04em; }
          .cabinet-base strong { font-size: 7px; }
        }
        @media (max-width: 390px) {
          .machine-identity strong { font-size: 11px; }
          .machine-online { font-size: 7px; }
          .scan-progress { gap: 2px; }
          .progress-cell { width: 21px; height: 23px; }
          .hologram-board { grid-template-rows: repeat(4, minmax(51px, auto)); }
          .holo-card { min-height: 51px; }
          .selection-slot { width: 19px; height: 23px; }
          .scan-button { font-size: 8px; }
        }
        @media (max-height: 690px) and (min-width: 721px) {
          .pattern-cabinet { overflow-y: auto; }
          .machine-chassis { flex: 0 0 auto; min-height: 480px; }
          .scanner-console { overflow-y: auto; }
          .deck-head h3 { font-size: 12px; }
          .scanner-deck { gap: 5px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .holo-card, .scan-button, .online-light, .clue-button { transition: none !important; animation: none !important; }
        }
      `}</style>
    </GamePanel>
  );
}
