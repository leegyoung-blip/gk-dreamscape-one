"use client";

import { useMemo, useRef, useState } from "react";
import {
  CLUE_COST,
  DAILY_LIMIT,
  GamePanel,
  formatSupabaseError,
  InstructionBar,
  PrimaryButton,
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
      <div className="set-layout">
        <div className="set-toolbar">
          <div className="set-progress" aria-label={`${setsFound} of 3 SETs found`}>
            {[0, 1, 2].map((index) => (
              <i key={index} className={index < setsFound ? "is-complete" : ""} />
            ))}
          </div>

          <div className="set-message" role="status">
            <span>{message}</span>
            {errorMessage && <strong>{errorMessage}</strong>}
          </div>

          <button
            type="button"
            className={`set-clue ${
              walkthroughHighlightClue ? "is-walkthrough-highlighted" : ""
            }`}
            onClick={buyClue}
            disabled={
              busy ||
              !mayBuyCurrentClue ||
              (!isGuest && tokenBalance < CLUE_COST)
            }
          >
            {isGuest
              ? localClues >= 1
                ? "Guest Hint used"
                : "Guest Hint · Free"
              : localClues >= 3
                ? "Clues used"
                : `Clue · ${CLUE_COST} DT`}
          </button>
        </div>

        <div className="set-board">
          {board.map((card) => {
            const selected = selectedIds.includes(card.id);
            const hinted = hintedCardIds.has(card.id);

            return (
              <button
                type="button"
                key={card.id}
                className={`set-card ${selected ? "is-selected" : ""} ${
                  hinted ? "is-hinted" : ""
                }`}
                onClick={() => toggleCard(card.id)}
                aria-pressed={selected}
                aria-label={`${card.count + 1} ${PATTERN_LABELS[card.pattern]} ${SHAPE_LABELS[card.shape]}`}
              >
                <span className="set-symbols">
                  {Array.from({ length: card.count + 1 }).map((_, symbolIndex) => (
                    <SetSymbol
                      key={`${card.id}-${symbolIndex}`}
                      card={card}
                      symbolIndex={symbolIndex}
                    />
                  ))}
                </span>
                {hinted && <span className="hint-mark">✦</span>}
              </button>
            );
          })}
        </div>

        <div className="set-footer">
          <span>{selectedIds.length}/3 selected</span>
          <PrimaryButton
            onClick={checkSelection}
            disabled={busy || selectedIds.length !== 3}
          >
            {busy ? "Checking…" : "Check SET"}
          </PrimaryButton>
        </div>
      </div>

      <style jsx>{`
        .set-layout {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: grid;
          grid-template-rows: 43px minmax(0, 1fr) 45px;
          gap: 7px;
          overflow: hidden;
        }
        .set-toolbar {
          min-width: 0;
          padding: 5px 7px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          border-radius: 14px;
          border: 1px solid rgba(174, 139, 255, 0.16);
          background: rgba(157, 115, 255, 0.065);
        }
        .set-progress { display: flex; gap: 5px; }
        .set-progress i {
          width: 22px;
          height: 7px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
        }
        .set-progress i.is-complete {
          background: #8ee8ff;
          box-shadow: 0 0 10px rgba(142, 232, 255, 0.28);
        }
        .set-message {
          min-width: 0;
          color: rgba(240, 248, 255, 0.82);
          font-size: 16px;
          line-height: 1.35;
          font-weight: 700;
          text-align: center;
          white-space: normal;
        }
        .set-message strong { margin-left: 6px; color: #ff9ca8; }
        .set-clue {
          min-height: 31px;
          padding: 0 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 211, 110, 0.28);
          background: rgba(255, 211, 110, 0.09);
          color: #ffdc82;
          font: inherit;
          font-size: 10px;
          font-weight: 850;
          cursor: pointer;
          white-space: nowrap;
        }
        .set-clue:disabled { opacity: 0.4; cursor: not-allowed; }
        .set-clue.is-walkthrough-highlighted {
          position: relative;
          z-index: 125;
          border-color: rgba(255, 224, 126, 0.82);
          background: rgba(255, 211, 110, 0.17);
          box-shadow:
            0 0 0 3px rgba(255, 211, 110, 0.09),
            0 0 30px rgba(255, 211, 110, 0.34);
          filter: brightness(1.2);
          animation: setClueGlow 1.4s ease-in-out infinite alternate;
        }
        @keyframes setClueGlow {
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
        .set-board {
          min-height: 0;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-template-rows: repeat(3, minmax(0, 1fr));
          gap: 7px;
          overflow: hidden;
        }
        .set-card {
          position: relative;
          min-width: 0;
          min-height: 0;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 15px;
          border: 1px solid rgba(137, 215, 255, 0.15);
          background: linear-gradient(145deg, rgba(255,255,255,.07), rgba(255,255,255,.02)), rgba(5,14,28,.8);
          cursor: pointer;
          transition: transform 150ms ease, border-color 150ms ease, background 150ms ease;
          overflow: hidden;
        }
        .set-card:hover { transform: translateY(-2px); border-color: rgba(169, 139, 255, 0.42); }
        .set-card.is-selected {
          transform: translateY(-2px);
          border-color: #b49bff;
          background: rgba(159, 119, 255, 0.14);
          box-shadow: 0 0 20px rgba(154, 115, 255, 0.18);
        }
        .set-card.is-hinted {
          border-color: #ffd36e;
          box-shadow: inset 0 0 0 2px rgba(255, 211, 110, 0.12), 0 0 16px rgba(255, 211, 110, 0.12);
        }
        .set-symbols {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 3px;
        }
        .set-symbols :global(svg) {
          width: min(31%, 54px);
          max-height: 78%;
          filter: drop-shadow(0 5px 8px rgba(0, 0, 0, 0.28));
        }
        .hint-mark {
          position: absolute;
          top: 4px;
          right: 5px;
          color: #ffd36e;
          font-size: 12px;
        }
        .set-footer {
          padding: 2px 3px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }
        .set-footer > span {
          color: rgba(239, 248, 255, 0.45);
          font-size: 9px;
          font-weight: 800;
        }

        @media (max-width: 720px) {
          .set-layout { grid-template-rows: 38px minmax(0, 1fr) 38px; gap: 4px; }
          .set-toolbar { padding: 3px 4px; gap: 4px; }
          .set-progress { gap: 2px; }
          .set-progress i { width: 12px; height: 5px; }
          .set-message { font-size: 12px; line-height: 1.25; }
          .set-clue { min-height: 28px; padding: 0 6px; font-size: 8px; }
          .set-board {
            grid-template-columns: repeat(3, minmax(0, 1fr));
            grid-template-rows: repeat(4, minmax(0, 1fr));
            gap: 4px;
          }
          .set-card { padding: 3px; border-radius: 11px; }
          .set-symbols { gap: 1px; }
          .set-symbols :global(svg) { width: min(32%, 42px); max-height: 72%; }
          .set-footer { gap: 6px; }
          .set-footer > span { font-size: 8px; }
        }
      `}</style>
    </GamePanel>
  );
}
