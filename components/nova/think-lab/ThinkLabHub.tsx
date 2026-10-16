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

  return (
    <section className="think-hub" aria-label="NOVA Think Lab machine selection">
      <div className="hub-top">
        <div className="hub-intro">
          <span className="hub-eyebrow">NOVA&apos;S THINK LAB</span>
          <h1>Power the journey.</h1>
          <p>Choose a thinking machine, solve its puzzles and generate Dream Tokens for NOVA&apos;s journey through DREAMSCAPE.</p>
        </div>
        <div className="hub-reactor">
          <DreamTokenReactor
            machines={games.map((game) => ({
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
            }))}
            todayCompleted={todayCompleted}
            todayGeneratedDT={todayGeneratedDT}
            isGuest={isGuest}
            loading={loading}
            pulseKey={reactorPulseKey}
          />
        </div>
      </div>

      <div className="hub-selection">
        <div className="hub-selection-heading">
          <div>
            <span className="hub-eyebrow">THINKING MACHINE BAY</span>
            <h2>Choose your machine</h2>
          </div>
          <span className="hub-reset">Daily reset in {countdown}</span>
        </div>

        <div className={`hub-machines${guideHighlight ? " guide-focus" : ""}`} role="group" aria-label="Thinking machines">
          {games.map((game) => {
            const details = MACHINES[game.id];
            const isSelected = game.id === selectedMachine;
            const progressCount = progress[game.id].completed;
            return (
              <button
                key={game.id}
                type="button"
                className={`machine-option${isSelected ? " is-selected" : ""}${progressCount >= 3 ? " is-complete" : ""}`}
                style={{ "--machine-accent": game.accent } as CSSProperties}
                onClick={() => setSelectedMachine(game.id)}
                aria-pressed={isSelected}
                aria-label={`Select ${game.title}, ${progressCount} of 3 daily challenges completed`}
                aria-controls="think-lab-selected-machine"
              >
                <span className="machine-image-stage">
                  <Image
                    src={details.image}
                    alt=""
                    aria-hidden="true"
                    width={420}
                    height={525}
                    sizes="(max-width: 720px) 40vw, (max-width: 1100px) 27vw, 25vw"
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
        </div>

        <div
          id="think-lab-selected-machine"
          className="selected-machine-panel"
          style={{ "--machine-accent": selected.accent } as CSSProperties}
          aria-live="polite"
        >
          <div className="selected-machine-copy">
            <span className="selected-kicker">MACHINE {selectedInfo.number} · {selectedInfo.purpose}</span>
            <h3>{selected.title}</h3>
            <p>{selectedInfo.story}</p>
          </div>
          <div className="selected-machine-meta">
            <span className="reward-label">{selected.rewardText}</span>
            <span className="daily-label">{loading ? "Loading progress…" : `${selectedProgress}/3 completed today`}</span>
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
        <p className="hub-guidance">
          {isGuest
            ? "Guest mode: practise any machine. Sign in to collect Dream Tokens and save progress."
            : "Complete challenges to earn Dream Tokens. Your rewards stay in your existing balance."}
        </p>
      </div>

      <style jsx>{`
        .think-hub {
          position: relative; z-index: 2; width: 100%; height: calc(100dvh - 66px);
          padding: clamp(10px, 1.5vw, 22px);
          display: flex; flex-direction: column; justify-content: space-between; gap: 16px;
          overflow-y: auto; overflow-x: hidden; color: #f6fbff;
          scrollbar-color: rgba(116,220,255,.34) transparent; scrollbar-width: thin;
        }
        .hub-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 18px; min-height: 200px; flex: 0 0 auto; }
        .hub-eyebrow { color: #86e5ff; font-size: 10px; font-weight: 900; letter-spacing: .18em; }
        .hub-intro {
          width: min(355px, 32vw); padding: 18px 20px; border: 1px solid rgba(124,215,255,.32);
          border-radius: 20px; background: linear-gradient(140deg,rgba(3,13,32,.9),rgba(7,19,46,.72));
          box-shadow: 0 12px 34px rgba(0,0,0,.3); backdrop-filter: blur(12px);
        }
        .hub-intro h1 { margin: 8px 0 7px; font-size: clamp(23px,2.45vw,36px); letter-spacing: -.045em; line-height: 1.13; }
        .hub-intro p { margin: 0; color: rgba(232,244,255,.78); font-size: 12px; line-height: 1.6; }
        .hub-reactor { width: min(304px,30vw); flex: 0 0 auto; }
        .hub-selection {
          width: 100%; margin-top: auto; padding: 13px 17px 10px; border: 1px solid rgba(131,211,255,.22);
          border-radius: 24px; background: linear-gradient(180deg,rgba(4,12,30,.58),rgba(4,10,28,.93));
          backdrop-filter: blur(11px); box-shadow: 0 16px 42px rgba(0,0,0,.42);
        }
        .hub-selection-heading { display: flex; justify-content: space-between; align-items: end; gap: 12px; padding: 0 3px 4px; }
        .hub-selection-heading h2 { margin: 3px 0 0; font-size: clamp(17px,1.45vw,21px); }
        .hub-reset { color: rgba(220,239,255,.66); font-size: 10px; white-space: nowrap; }
        .hub-machines { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: clamp(6px,1.3vw,20px); align-items: end; }
        .machine-option {
          position: relative; display: flex; flex-direction: column; align-items: center;
          justify-content: end; min-width: 0; padding: 0 5px 7px; color: #effaff;
          appearance: none; text-align: center; cursor: pointer; border: 1px solid transparent;
          border-radius: 18px; background: transparent;
          transition: border-color .18s ease, background .18s ease, box-shadow .18s ease;
        }
        .machine-image-stage {
          display: flex; align-items: end; justify-content: center; position: relative;
          width: 100%; height: clamp(158px,29vh,310px); padding: 0;
        }
        .machine-image-stage :global(.machine-image) {
          display: block; position: relative; z-index: 1; width: auto; height: 100%;
          max-width: 100%; object-fit: contain; object-position: center bottom;
          filter: drop-shadow(0 10px 15px rgba(0,0,0,.55));
          transform-origin: center bottom;
          transition: filter .2s ease, transform .2s ease;
        }
        .machine-spotlight {
          position: absolute; bottom: 3px; left: 12%; right: 12%; height: 18px; border-radius: 50%;
          background: color-mix(in srgb,var(--machine-accent) 32%,transparent);
          filter: blur(15px); opacity: .28; transition: opacity .2s ease;
        }
        .machine-option:hover .machine-image-stage :global(.machine-image),
        .machine-option:focus-visible .machine-image-stage :global(.machine-image) {
          transform: translateY(-5px) scale(1.025);
        }
        .machine-option.is-selected {
          border-color: color-mix(in srgb,var(--machine-accent) 66%,transparent);
          background: linear-gradient(180deg,transparent 25%,color-mix(in srgb,var(--machine-accent) 12%,rgba(6,16,36,.16)));
          box-shadow: inset 0 -3px 0 var(--machine-accent), 0 0 26px color-mix(in srgb,var(--machine-accent) 17%,transparent);
        }
        .machine-option.is-selected .machine-image-stage :global(.machine-image) {
          filter: brightness(1.14) drop-shadow(0 0 16px color-mix(in srgb,var(--machine-accent) 60%,transparent));
          transform: translateY(-3px) scale(1.03);
        }
        .machine-option.is-selected .machine-spotlight { opacity: 1; }
        .machine-option:focus-visible { outline: 2px solid #dcfbff; outline-offset: 3px; }
        .machine-label { display: grid; gap: 2px; }
        .machine-label strong { font-size: clamp(13px,1.3vw,18px); font-weight: 850; letter-spacing: -.03em; }
        .machine-label > span { font-size: 10px; color: rgba(226,240,255,.68); }
        .machine-selected-indicator { padding-top: 4px; font-size: 9px; font-weight: 900; letter-spacing: .10em; color: var(--machine-accent); }
        .selected-machine-panel {
          display: grid; grid-template-columns: minmax(0,1fr) auto auto; align-items: center;
          gap: 12px; margin-top: 9px; padding: 12px 15px; min-width: 0;
          border: 1px solid color-mix(in srgb,var(--machine-accent) 42%,transparent);
          border-radius: 15px; background: linear-gradient(90deg,color-mix(in srgb,var(--machine-accent) 11%,rgba(7,19,42,.92)),rgba(4,14,35,.96));
        }
        .selected-machine-copy { min-width: 0; }
        .selected-kicker { color: var(--machine-accent); font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        .selected-machine-copy h3 { margin: 4px 0 3px; font-size: 19px; letter-spacing: -.035em; }
        .selected-machine-copy p { margin: 0; color: rgba(230,244,255,.8); font-size: 11px; line-height: 1.4; }
        .selected-machine-meta { display: grid; gap: 4px; text-align: right; white-space: nowrap; }
        .reward-label { color: #ffe49b; font-weight: 900; font-size: 12px; }
        .daily-label { color: rgba(220,240,255,.7); font-size: 10px; }
        .enter-machine {
          min-height: 46px; display: flex; align-items: center; justify-content: center; gap: 12px;
          padding: 10px 22px; border-radius: 12px; border: 1px solid color-mix(in srgb,var(--machine-accent) 70%,white);
          color: #fff; font: inherit; font-size: 13px; font-weight: 900; white-space: nowrap;
          background: linear-gradient(130deg,color-mix(in srgb,var(--machine-accent) 41%,#0c2549),#143154);
          box-shadow: 0 0 20px color-mix(in srgb,var(--machine-accent) 20%,transparent); cursor: pointer;
        }
        .enter-machine:hover:not(:disabled), .enter-machine:focus-visible { filter: brightness(1.18); }
        .enter-machine:disabled { opacity: .5; cursor: wait; }
        .enter-machine:focus-visible { outline: 2px solid #fff; outline-offset: 3px; }
        .enter-machine > span:last-child { font-size: 20px; }
        .hub-guidance { margin: 9px 0 0; text-align: center; color: rgba(212,231,251,.65); font-size: 10px; line-height: 1.35; }
        .guide-focus { border-radius: 15px; outline: 2px solid #84e8ff; outline-offset: 4px; }
        @media (max-width: 1100px) {
          .hub-top { min-height: 160px; }
          .hub-reactor { width: min(282px,32vw); }
          .machine-image-stage { height: clamp(140px,28vh,280px); }
          .selected-machine-panel { padding: 10px; gap: 8px; }
          .selected-machine-copy p { font-size: 10px; }
        }
        @media (max-width: 720px) {
          .think-hub { height: calc(100dvh - 58px); padding: 8px 8px 14px; gap: 11px; }
          .hub-top { display: grid; grid-template-columns: 1fr; min-height: 0; gap: 9px; }
          .hub-intro { width: 100%; padding: 10px 13px; border-radius: 16px; }
          .hub-intro h1 { font-size: 23px; margin: 4px 0; }
          .hub-intro p { font-size: 10px; line-height: 1.45; }
          .hub-reactor { width: 100%; max-width: none; }
          .hub-selection { padding: 11px 8px 10px; border-radius: 16px; }
          .hub-selection-heading { padding: 0 4px 9px; align-items: end; }
          .hub-selection-heading h2 { font-size: 16px; }
          .hub-reset { font-size: 9px; }
          .hub-machines { gap: 3px; }
          .machine-image-stage { height: clamp(116px,22vh,190px); }
          .machine-option { padding: 0 2px 6px; border-radius: 12px; }
          .machine-label strong { font-size: 11px; }
          .machine-label > span { font-size: 8px; }
          .machine-selected-indicator { font-size: 7px; }
          .selected-machine-panel { grid-template-columns: minmax(0,1fr) auto; gap: 8px; padding: 10px; }
          .selected-machine-copy { grid-column: 1 / -1; }
          .selected-machine-copy h3 { font-size: 17px; }
          .selected-machine-copy p { font-size: 11px; }
          .selected-machine-meta { text-align: left; white-space: normal; }
          .enter-machine { min-height: 44px; font-size: 12px; padding: 9px 15px; }
          .hub-guidance { font-size: 9px; margin-top: 8px; }
        }
        @media (max-width: 720px) and (orientation: landscape) {
          .hub-top { grid-template-columns: minmax(0,1fr) minmax(190px,240px); align-items: start; }
          .hub-intro p { display: none; }
          .machine-image-stage { height: min(32vh,160px); }
          .hub-selection { margin-top: 0; }
          .selected-machine-panel { grid-template-columns: minmax(0,1fr) auto auto; }
          .selected-machine-copy { grid-column: auto; }
        }
        @media (max-height: 760px) and (min-width: 721px) {
          .hub-top { min-height: 150px; }
          .machine-image-stage { height: clamp(130px,23vh,225px); }
          .hub-selection { padding-top: 10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .machine-option, .machine-image-stage :global(.machine-image), .machine-spotlight { transition: none !important; }
        }
      `}</style>
    </section>
  );
}
