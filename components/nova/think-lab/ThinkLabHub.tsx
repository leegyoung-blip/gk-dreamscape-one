"use client";

import Image from "next/image";
import { useState } from "react";
import type { CSSProperties } from "react";
import type { DailyGameStatus, GameDefinition, GameId } from "./shared";
import { DreamTokenReactor } from "./ThinkLabReactor";

type ThinkLabHubProps = {
  games: readonly GameDefinition[];
  progress: Record<GameId, DailyGameStatus>;
  todayCompleted: number;
  todayGeneratedDT: number;
  countdown: string;
  isGuest: boolean;
  loading: boolean;
  guideHighlight?: boolean;
  reactorPulseKey?: number;
  onActivate: (game: GameId) => void;
};

const MACHINES: Record<
  GameId,
  { number: string; image: string; purpose: string; story: string }
> = {
  "colour-code": {
    number: "01",
    image: "/nova/thinking-skills/machines/colour-code-machine.png",
    purpose: "Code Decoder · Deduction",
    story: "Decode a hidden sequence of colours. Each guess gives you clues to crack the code and power NOVA's journey.",
  },
  "set-finder": {
    number: "02",
    image: "/nova/thinking-skills/machines/set-finder-machine.png",
    purpose: "Pattern Scanner · Flexible thinking",
    story: "Scan shapes, colours, numbers and patterns. Find groups of three cards that form a perfect SET.",
  },
  "tower-memory": {
    number: "03",
    image: "/nova/thinking-skills/machines/tower-memory-machine.png",
    purpose: "Memory Forge · Working memory",
    story: "Study a holographic tower before it disappears, then rebuild the blocks from memory.",
  },
};

/**
 * Selecting a machine is intentionally different from launching it.
 * No existing puzzle state, reward, or RPC logic is changed here.
 */
export default function ThinkLabHub({
  games,
  progress,
  todayCompleted,
  todayGeneratedDT,
  countdown,
  isGuest,
  loading,
  guideHighlight = false,
  reactorPulseKey = 0,
  onActivate,
}: ThinkLabHubProps) {
  const [selectedMachine, setSelectedMachine] = useState<GameId>("colour-code");
  const selected = games.find((game) => game.id === selectedMachine) ?? games[0];
  const selectedInfo = MACHINES[selected.id];
  const selectedProgress = progress[selected.id].completed;
  const completed = selectedProgress >= 3;


  const currentIndex = Math.max(0, games.findIndex((game) => game.id === selected.id));
  const chooseAdjacentMachine = (direction: -1 | 1) => {
    if (games.length < 2) return;
    const nextIndex = (currentIndex + direction + games.length) % games.length;
    setSelectedMachine(games[nextIndex].id);
  };

  const machineOutputs = games.map((game) => ({
    id: game.id,
    title: game.title,
    completed: progress[game.id].completed,
    accent: game.accent,
    earned: ([1, 2, 3] as const).reduce(
      (total, level) =>
        total +
        (progress[game.id].levels[level].completed
          ? progress[game.id].levels[level].reward
          : 0),
      0
    ),
  }));

  return (
    <section className="think-hub" aria-label="NOVA Think Lab machine selection">
      <div className="hub-selection">
        <div className="hub-heading">
          <div>
            <span className="hub-eyebrow">NOVA&apos;S THINK LAB · MACHINE BAY</span>
            <h1>Choose your machine</h1>
          </div>
          <div className="hub-heading-side">
            <span className="hub-reset">Daily reset in {countdown}</span>
            <span className="machine-index" aria-label={`Machine ${currentIndex + 1} of ${games.length}`}>
              {String(currentIndex + 1).padStart(2, "0")} / {String(games.length).padStart(2, "0")}
            </span>
          </div>
        </div>

        <div className={`hub-machines${guideHighlight ? " guide-focus" : ""}`} role="group" aria-label="Thinking machines">
          <button
            type="button"
            className="carousel-arrow carousel-previous"
            onClick={() => chooseAdjacentMachine(-1)}
            aria-label="Previous thinking machine"
            disabled={games.length < 2}
          >
            <span aria-hidden="true">‹</span>
          </button>

          {games.map((game) => {
            const details = MACHINES[game.id];
            const isSelected = game.id === selected.id;
            const progressCount = progress[game.id].completed;
            return (
              <button
                key={game.id}
                type="button"
                className={`machine-option${isSelected ? " is-selected" : ""}${progressCount >= 3 ? " is-complete" : ""}`}
                style={{ "--machine-accent": game.accent } as CSSProperties}
                onClick={() => setSelectedMachine(game.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${game.title}; ${progressCount} of 3 daily challenges completed`}
                aria-controls="think-lab-selected-machine"
              >
                <span className="machine-image-stage">
                  <Image
                    src={details.image}
                    alt=""
                    aria-hidden="true"
                    width={420}
                    height={525}
                    sizes="(max-width: 760px) 64vw, (max-width: 1200px) 18vw, 22vw"
                    className="machine-image"
                  />
                  <span className="machine-spotlight" aria-hidden="true" />
                </span>
                <span className="machine-label">
                  <strong>{game.title}</strong>
                  <span>{loading ? "Loading…" : `${progressCount}/3 today`}</span>
                </span>
                <span className="machine-selected-indicator">
                  {isSelected ? "SELECTED" : `MACHINE ${details.number}`}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            className="carousel-arrow carousel-next"
            onClick={() => chooseAdjacentMachine(1)}
            aria-label="Next thinking machine"
            disabled={games.length < 2}
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div
          id="think-lab-selected-machine"
          className="selected-machine-panel"
          style={{ "--machine-accent": selected.accent } as CSSProperties}
          aria-live="polite"
        >
          <div className="selected-machine-copy">
            <span className="selected-kicker">MACHINE {selectedInfo.number} · {selectedInfo.purpose}</span>
            <h2>{selected.title}</h2>
            <p>{selectedInfo.story}</p>
          </div>
          <div className="selected-machine-meta">
            <span className="reward-label">{selected.rewardText}</span>
            <span className="daily-label">
              {loading ? "Loading progress…" : `${selectedProgress}/3 completed today`}
            </span>
          </div>
          <button
            type="button"
            className="enter-machine"
            onClick={() => onActivate(selected.id)}
            disabled={loading}
            aria-label={`Enter ${selected.title}`}
          >
            <span>{completed ? "Enter Again" : "Enter Machine"}</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <aside className="hub-reactor" aria-label="Think Lab energy reactor">
        <DreamTokenReactor
          machines={machineOutputs}
          todayCompleted={todayCompleted}
          todayGeneratedDT={todayGeneratedDT}
          isGuest={isGuest}
          loading={loading}
          pulseKey={reactorPulseKey}
        />
      </aside>

      <style jsx>{`
        .think-hub {
          position: relative;
          z-index: 2;
          width: 100%;
          height: calc(100dvh - var(--lab-header-height, 66px));
          min-height: 0;
          display: grid;
          grid-template-columns: minmax(0, 2fr) minmax(270px, 1fr);
          gap: clamp(7px, 1.05vw, 17px);
          padding: clamp(7px, 1.1vh, 14px) clamp(7px, 1vw, 16px);
          overflow: hidden;
          color: #f6fbff;
        }
        .hub-selection, .hub-reactor {
          min-width: 0;
          min-height: 0;
          height: 100%;
        }
        .hub-selection {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto;
          gap: clamp(6px, .9vh, 12px);
          padding: clamp(9px, 1.05vw, 18px);
          border: 1px solid rgba(131, 211, 255, .28);
          border-radius: 21px;
          background: linear-gradient(180deg, rgba(4,12,30,.73), rgba(4,10,28,.94));
          backdrop-filter: blur(9px);
          -webkit-backdrop-filter: blur(9px);
          box-shadow: 0 14px 36px rgba(0,0,0,.38);
          overflow: hidden;
        }
        .hub-reactor { display: flex; align-items: stretch; }
        .hub-reactor :global(.reactor-console) { height: 100%; min-height: 0; }

        .hub-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 8px;
          padding: 0 2px;
        }
        .hub-eyebrow {
          color: #89dfff;
          font-size: clamp(8px, .66vw, 10px);
          font-weight: 900;
          letter-spacing: .13em;
        }
        .hub-heading h1 {
          font-size: clamp(18px, 1.75vw, 28px);
          letter-spacing: -.035em;
          line-height: 1.12;
          margin: 4px 0 0;
        }
        .hub-heading-side { display: flex; align-items: center; gap: 8px; }
        .hub-reset { color: rgba(220,239,255,.75); font-size: 10px; white-space: nowrap; }
        .machine-index { display: none; }

        .hub-machines {
          position: relative;
          min-width: 0;
          min-height: 0;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: clamp(3px, 1.05vw, 17px);
          overflow: hidden;
        }
        .machine-option {
          position: relative;
          min-width: 0;
          min-height: 0;
          width: 100%;
          height: 100%;
          padding: 3px 3px 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          gap: 4px;
          border: 1px solid transparent;
          border-radius: 15px;
          appearance: none;
          background: transparent;
          color: #effaff;
          text-align: center;
          cursor: pointer;
          transition: filter .18s ease, background .18s ease;
        }
        .machine-image-stage {
          position: relative;
          flex: 1 1 auto;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          width: 100%;
          height: 0;
          min-height: 0;
          overflow: hidden;
        }
        .machine-image-stage :global(.machine-image) {
          position: relative;
          z-index: 1;
          display: block;
          width: auto;
          height: 100%;
          max-width: 100%;
          object-fit: contain;
          object-position: center bottom;
          filter: drop-shadow(0 8px 12px rgba(0,0,0,.47));
          /* Do not enlarge the selected asset: this previously clipped its top. */
          transition: filter .2s ease;
        }
        .machine-spotlight {
          position: absolute;
          left: 13%; right: 13%; bottom: 0;
          height: 15px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--machine-accent) 32%, transparent);
          filter: blur(11px);
          opacity: .20;
          transition: opacity .2s ease;
        }
        .machine-option:hover .machine-image-stage :global(.machine-image),
        .machine-option:focus-visible .machine-image-stage :global(.machine-image) {
          filter: brightness(1.12) drop-shadow(0 8px 14px rgba(0,0,0,.50));
        }
        .machine-option.is-selected {
          background: radial-gradient(ellipse at 50% 90%, color-mix(in srgb,var(--machine-accent) 10%,transparent), transparent 66%);
        }
        .machine-option.is-selected::after {
          content: "";
          position: absolute;
          left: 25%; right: 25%; bottom: 0;
          height: 2px;
          border-radius: 99px;
          background: var(--machine-accent);
          box-shadow: 0 0 13px var(--machine-accent);
        }
        .machine-option.is-selected .machine-image-stage :global(.machine-image) {
          filter: brightness(1.18) drop-shadow(0 0 12px color-mix(in srgb,var(--machine-accent) 35%,transparent));
        }
        .machine-option.is-selected .machine-spotlight { opacity: .90; }
        .machine-option:focus-visible { outline: 2px solid #dcfbff; outline-offset: -2px; }
        .machine-label { flex: 0 0 auto; display: grid; gap: 3px; }
        .machine-label strong { font-size: clamp(12px, 1.05vw, 17px); font-weight: 850; line-height: 1.15; }
        .machine-label > span { color: rgba(226,240,255,.72); font-size: clamp(9px,.68vw,11px); line-height: 1.1; }
        .machine-selected-indicator {
          flex: 0 0 auto;
          color: var(--machine-accent);
          font-size: clamp(8px,.63vw,10px);
          font-weight: 900;
          letter-spacing: .09em;
          line-height: 1.1;
        }

        .selected-machine-panel {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto auto;
          align-items: center;
          gap: clamp(6px,1vw,16px);
          min-width: 0;
          padding: clamp(8px,.9vw,13px) clamp(9px,1vw,16px);
          border: 1px solid color-mix(in srgb,var(--machine-accent) 38%,transparent);
          border-radius: 14px;
          background: linear-gradient(90deg,color-mix(in srgb,var(--machine-accent) 10%,rgba(7,19,42,.94)),rgba(4,14,35,.97));
        }
        .selected-machine-copy { min-width: 0; }
        .selected-kicker {
          color: var(--machine-accent);
          font-size: clamp(8px,.64vw,10px);
          font-weight: 900;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .selected-machine-copy h2 {
          margin: 3px 0;
          font-size: clamp(15px,1.18vw,20px);
          letter-spacing: -.02em;
          line-height: 1.12;
        }
        .selected-machine-copy p {
          margin: 0;
          color: rgba(230,244,255,.82);
          font-size: clamp(10px,.74vw,12px);
          line-height: 1.35;
        }
        .selected-machine-meta { display: grid; gap: 5px; text-align: right; white-space: nowrap; }
        .reward-label { color: #ffe49b; font-weight: 900; font-size: clamp(10px,.85vw,12px); }
        .daily-label { color: rgba(220,240,255,.75); font-size: clamp(9px,.70vw,11px); }
        .enter-machine {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 43px;
          padding: 8px 14px;
          border: 1px solid color-mix(in srgb,var(--machine-accent) 65%,white);
          border-radius: 11px;
          background: linear-gradient(130deg,color-mix(in srgb,var(--machine-accent) 38%,#0c2549),#143154);
          color: white;
          font: inherit;
          font-size: 12px;
          font-weight: 900;
          white-space: nowrap;
          cursor: pointer;
        }
        .enter-machine:hover:not(:disabled),
        .enter-machine:focus-visible { filter: brightness(1.18); }
        .enter-machine:disabled { opacity: .55; cursor: wait; }
        .enter-machine:focus-visible { outline: 2px solid white; outline-offset: 2px; }
        .enter-machine > span:last-child { font-size: 18px; }
        .carousel-arrow { display: none; }
        .guide-focus { border-radius: 12px; outline: 2px solid #84e8ff; outline-offset: -2px; }

        @media (max-width: 1100px) {
          .think-hub { grid-template-columns: minmax(0,1.8fr) minmax(245px,1fr); }
          .selected-machine-copy p { font-size: 10px; }
        }
        /* Mobile: show one machine at a time with real previous/next controls. */
        @media (max-width: 820px), (max-width: 950px) and (max-height: 500px) {
          .think-hub {
            grid-template-columns: minmax(0, 1fr);
            grid-template-rows: minmax(0, 1.55fr) minmax(0, .80fr);
            gap: 6px;
            padding: 5px;
          }
          .hub-selection { border-radius: 14px; padding: 8px 7px; gap: 6px; }
          .hub-heading h1 { font-size: clamp(16px,3.8vw,22px); }
          .hub-eyebrow { font-size: 8px; letter-spacing: .07em; }
          .hub-reset { display: none; }
          .machine-index {
            display: inline;
            font-size: 11px;
            font-weight: 900;
            color: #a8def8;
            white-space: nowrap;
          }
          .hub-machines {
            display: flex;
            align-items: stretch;
            justify-content: center;
            gap: 0;
          }
          .machine-option { display: none; }
          .machine-option.is-selected {
            display: flex;
            flex: 0 0 auto;
            width: min(100%, 290px);
            max-width: calc(100% - 76px);
            padding: 1px 5px 4px;
          }
          .machine-label strong { font-size: 13px; }
          .machine-label > span { font-size: 9px; }
          .machine-selected-indicator { font-size: 8px; }
          .carousel-arrow {
            display: grid;
            place-items: center;
            position: absolute;
            top: 44%;
            transform: translateY(-50%);
            z-index: 4;
            width: 38px;
            height: 48px;
            border-radius: 13px;
            border: 1px solid rgba(122,210,255,.38);
            color: #e7fbff;
            background: rgba(13,37,70,.92);
            box-shadow: 0 6px 20px rgba(0,0,0,.26);
            cursor: pointer;
            touch-action: manipulation;
          }
          .carousel-arrow span { font-size: 31px; line-height: 1; margin-top: -3px; }
          .carousel-previous { left: 1px; }
          .carousel-next { right: 1px; }
          .carousel-arrow:focus-visible { outline: 2px solid white; outline-offset: 2px; }
          .carousel-arrow:disabled { opacity: .38; }
          .selected-machine-panel {
            grid-template-columns: minmax(0,1fr) auto;
            gap: 5px 8px;
            padding: 7px 9px;
            border-radius: 12px;
          }
          .selected-machine-copy { grid-column: 1 / -1; }
          .selected-machine-copy h2 { font-size: 15px; margin: 2px 0; }
          .selected-machine-copy p { font-size: 10px; line-height: 1.25; }
          .selected-machine-meta { text-align: left; white-space: normal; }
          .enter-machine { min-height: 36px; padding: 6px 10px; font-size: 10px; }
        }
        @media (max-width:820px) and (orientation:landscape), (max-width:950px) and (max-height:500px) and (orientation:landscape) {
          .think-hub {
            grid-template-columns: minmax(0, 1.5fr) minmax(180px, 1fr);
            grid-template-rows: minmax(0, 1fr);
            gap: 5px;
            padding: 4px;
          }
          .hub-selection { padding: 5px 6px; gap: 3px; border-radius: 11px; }
          .hub-heading h1 { font-size: 14px; margin-top: 2px; }
          .hub-heading .hub-eyebrow { display: none; }
          .machine-option.is-selected { max-width: calc(100% - 74px); }
          .machine-label strong { font-size: 11px; }
          .machine-label > span, .machine-selected-indicator { display: none; }
          .carousel-arrow { width: 31px; height: 39px; border-radius: 9px; }
          .carousel-arrow span { font-size: 25px; }
          .selected-machine-panel { grid-template-columns: minmax(0,1fr) auto; padding: 5px 7px; gap: 3px 5px; }
          .selected-machine-copy { grid-column: auto; }
          .selected-machine-copy h2, .selected-machine-copy p { display: none; }
          .selected-kicker { font-size: 8px; }
          .selected-machine-meta { display: none; }
          .enter-machine { min-height: 31px; padding: 4px 8px; font-size: 9px; }
        }
        @media (max-width: 400px) and (orientation:portrait) and (max-height: 660px) {
          .hub-selection { gap: 3px; padding: 6px; }
          .hub-heading h1 { font-size: 15px; }
          .selected-machine-panel { grid-template-columns:minmax(0,1fr) auto; padding:6px 8px; }
          .selected-machine-copy { grid-column:auto; }
          .selected-kicker, .selected-machine-copy p, .selected-machine-meta { display:none; }
          .selected-machine-copy h2 { margin:0; }
          .machine-label > span { display:none; }
          .machine-option.is-selected { gap:2px; }
        }
        @media (max-height: 620px) and (min-width:761px) {
          .hub-selection { padding: 8px; gap: 6px; }
          .hub-heading h1 { font-size: 18px; }
          .selected-machine-copy p { display: none; }
        }
        @media (max-height: 560px) {
          .selected-machine-copy p { display: none; }
          .selected-machine-panel { padding: 5px 7px; }
          .enter-machine { min-height: 32px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .machine-option, .machine-image-stage :global(.machine-image), .machine-spotlight { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
