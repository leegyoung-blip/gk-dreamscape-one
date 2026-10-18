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
        /* Phase 4A: a single-viewport game hub with adaptive space allocation. */
        .think-hub {
          position: relative;
          z-index: 2;
          width: 100%;
          height: calc(100dvh - var(--lab-header-height, 66px));
          min-height: 0;
          display: grid;
          grid-template-rows: minmax(0, .40fr) minmax(0, 1fr);
          gap: clamp(5px, 1vh, 12px);
          padding: clamp(7px, 1.2vh, 14px) clamp(9px, 1.15vw, 18px);
          overflow: hidden;
          color: #f6fbff;
        }
        .hub-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          min-height: 0;
          overflow: hidden;
        }
        .hub-eyebrow {
          color: #8ee9ff;
          font-size: clamp(8px, .69vw, 10px);
          font-weight: 900;
          letter-spacing: .15em;
        }
        .hub-intro {
          width: min(350px, 34vw);
          max-height: 100%;
          flex: 0 1 auto;
          padding: clamp(10px,1.2vw,19px);
          border: 1px solid rgba(124,215,255,.29);
          border-radius: 18px;
          background: linear-gradient(140deg,rgba(3,13,32,.92),rgba(7,19,46,.81));
          box-shadow: 0 12px 34px rgba(0,0,0,.28);
          backdrop-filter: blur(9px);
          overflow: hidden;
        }
        .hub-intro h1 {
          margin: 7px 0 5px;
          font-size: clamp(19px, 2.3vw, 34px);
          letter-spacing: -.045em;
          line-height: 1.13;
        }
        .hub-intro p {
          margin: 0;
          color: rgba(234,246,255,.82);
          font-size: clamp(10px,.8vw,12px);
          line-height: 1.48;
        }
        .hub-reactor { width: min(304px,31vw); min-width: 0; max-height: 100%; flex: 0 0 auto; }
        .hub-selection {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          gap: clamp(4px,.7vh,9px);
          width: 100%;
          min-height: 0;
          overflow: hidden;
          padding: clamp(8px,1vw,14px) clamp(8px,1vw,16px);
          border: 1px solid rgba(131,211,255,.28);
          border-radius: 21px;
          background: linear-gradient(180deg,rgba(4,12,30,.68),rgba(4,10,28,.93));
          backdrop-filter: blur(8px);
          box-shadow: 0 14px 36px rgba(0,0,0,.4);
        }
        .hub-selection-heading { display:flex; align-items:end; justify-content:space-between; gap:8px; min-height:0; padding:0 3px; }
        .hub-selection-heading h2 { margin:3px 0 0; font-size:clamp(16px,1.35vw,21px); line-height:1.15; }
        .hub-reset { color:rgba(220,239,255,.7); font-size:clamp(8px,.68vw,10px); white-space:nowrap; }
        .hub-machines {
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          align-items:stretch;
          gap:clamp(4px,1.4vw,20px);
          min-height:0;
          overflow:hidden;
        }
        .machine-option {
          position:relative;
          min-width:0;
          min-height:0;
          padding:1px 4px 6px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-end;
          gap:3px;
          border:1px solid transparent;
          border-radius:14px;
          appearance:none;
          background:transparent;
          color:#effaff;
          text-align:center;
          cursor:pointer;
          transition:background .18s ease,box-shadow .18s ease;
        }
        .machine-image-stage {
          position:relative;
          display:flex;
          align-items:end;
          justify-content:center;
          flex:1 1 auto;
          min-height:0;
          height:0;
          width:100%;
        }
        .machine-image-stage :global(.machine-image) {
          position:relative;
          z-index:1;
          display:block;
          width:auto;
          height:100%;
          max-width:100%;
          object-fit:contain;
          object-position:center bottom;
          filter:drop-shadow(0 10px 14px rgba(0,0,0,.55));
          transform-origin:center bottom;
          transition:transform .22s ease,filter .22s ease;
        }
        .machine-spotlight {
          position:absolute;
          bottom:2px;
          left:17%;right:17%;
          height:16px;
          border-radius:50%;
          background:color-mix(in srgb,var(--machine-accent) 33%,transparent);
          filter:blur(15px);
          opacity:.32;
          transition:opacity .2s ease;
        }
        .machine-option:hover .machine-image-stage :global(.machine-image),
        .machine-option:focus-visible .machine-image-stage :global(.machine-image) { transform:translateY(-3px) scale(1.025); }
        .machine-option.is-selected {
          border-color:transparent;
          background:radial-gradient(ellipse at 50% 92%,color-mix(in srgb,var(--machine-accent) 13%,transparent),transparent 61%);
          box-shadow:none;
        }
        .machine-option.is-selected::after {
          content:"";
          position:absolute;left:30%;right:30%;bottom:0;height:2px;
          border-radius:99px;
          background:var(--machine-accent);
          box-shadow:0 0 14px var(--machine-accent);
        }
        .machine-option.is-selected .machine-image-stage :global(.machine-image) {
          transform:translateY(-2px) scale(1.035);
          filter:brightness(1.17) drop-shadow(0 0 14px color-mix(in srgb,var(--machine-accent) 43%,transparent));
        }
        .machine-option.is-selected .machine-spotlight { opacity:1; }
        .machine-option:focus-visible { outline:2px solid #dcfbff; outline-offset:-2px; }
        .machine-label { flex:0 0 auto; min-height:0; display:grid; gap:2px; }
        .machine-label strong { font-size:clamp(12px,1.16vw,17px); font-weight:850; line-height:1.13; letter-spacing:-.028em; }
        .machine-label > span { color:rgba(226,240,255,.7); font-size:clamp(8px,.65vw,10px); line-height:1.1; }
        .machine-selected-indicator { flex:0 0 auto; font-size:clamp(7px,.61vw,9px); font-weight:900; letter-spacing:.1em; line-height:1.1; color:var(--machine-accent); }
        .selected-machine-panel {
          min-width:0;
          display:grid;
          grid-template-columns:minmax(0,1fr) auto auto;
          align-items:center;
          gap:clamp(6px,1vw,14px);
          padding:clamp(7px,.8vw,12px) clamp(9px,1vw,15px);
          border:1px solid color-mix(in srgb,var(--machine-accent) 38%,transparent);
          border-radius:13px;
          background:linear-gradient(90deg,color-mix(in srgb,var(--machine-accent) 11%,rgba(7,19,42,.94)),rgba(4,14,35,.97));
        }
        .selected-machine-copy { min-width:0; }
        .selected-kicker { color:var(--machine-accent); font-size:clamp(8px,.65vw,9px); font-weight:900; letter-spacing:.055em; text-transform:uppercase; }
        .selected-machine-copy h3 { margin:3px 0; font-size:clamp(15px,1.28vw,19px); line-height:1.1; letter-spacing:-.035em; }
        .selected-machine-copy p { margin:0; color:rgba(230,244,255,.83); font-size:clamp(10px,.74vw,11px); line-height:1.4; }
        .selected-machine-meta { display:grid; gap:4px; text-align:right; white-space:nowrap; }
        .reward-label { color:#ffe49b; font-weight:900; font-size:clamp(10px,.85vw,12px); }
        .daily-label { color:rgba(220,240,255,.75); font-size:clamp(9px,.7vw,10px); }
        .enter-machine {
          min-height:42px;
          display:flex;align-items:center;justify-content:center;gap:10px;
          padding:8px 17px;
          border:1px solid color-mix(in srgb,var(--machine-accent) 65%,white);
          border-radius:11px;
          background:linear-gradient(130deg,color-mix(in srgb,var(--machine-accent) 38%,#0c2549),#143154);
          color:#fff;
          font:inherit;font-size:12px;font-weight:900;
          white-space:nowrap;cursor:pointer;
        }
        .enter-machine:hover:not(:disabled),.enter-machine:focus-visible { filter:brightness(1.2); }
        .enter-machine:disabled { opacity:.55;cursor:wait; }
        .enter-machine:focus-visible { outline:2px solid white;outline-offset:2px; }
        .enter-machine > span:last-child { font-size:18px; }
        .hub-guidance { margin:0; color:rgba(212,231,251,.64); font-size:9px; line-height:1.2; text-align:center; }
        .guide-focus { border-radius:12px; outline:2px solid #84e8ff; outline-offset:-2px; }
        @media (max-width:1120px) {
          .think-hub { grid-template-rows:minmax(0,.35fr) minmax(0,1fr); }
          .hub-intro { width:min(300px,39vw); }
          .hub-reactor { width:min(282px,36vw); }
          .selected-machine-panel { gap:8px; }
          .selected-machine-copy p { font-size:10px; }
        }
        @media (max-width:720px) {
          .think-hub {
            grid-template-rows:minmax(0,auto) minmax(0,1fr);
            padding:5px;
            gap:5px;
          }
          .hub-top { height:clamp(91px,17dvh,126px);gap:5px; }
          .hub-intro { width:50%; flex:1 1 0; padding:9px; border-radius:12px; }
          .hub-eyebrow { font-size:8px;letter-spacing:.075em; }
          .hub-intro h1 { margin:4px 0; font-size:clamp(15px,3.1vw,21px); }
          .hub-intro p { font-size:9px;line-height:1.3; }
          .hub-reactor { width:50%;flex:1 1 0; }
          .hub-selection { gap:4px;padding:7px 6px;border-radius:14px; }
          .hub-selection-heading h2 { font-size:clamp(14px,3.5vw,18px); }
          .hub-reset { font-size:8px; }
          .hub-machines { gap:2px; }
          .machine-option { padding:0 1px 4px; gap:2px; border-radius:9px; }
          .machine-label strong { font-size:clamp(10px,2.7vw,13px); }
          .machine-label > span { font-size:8px; }
          .machine-selected-indicator { font-size:7px;letter-spacing:.03em; }
          .selected-machine-panel { grid-template-columns:minmax(0,1fr) auto;gap:5px 8px;padding:7px 8px;border-radius:11px; }
          .selected-machine-copy { grid-column:1 / -1; }
          .selected-kicker { font-size:8px; }
          .selected-machine-copy h3 { font-size:15px;margin:2px 0; }
          .selected-machine-copy p { font-size:9px;line-height:1.27; }
          .selected-machine-meta { text-align:left;white-space:normal; }
          .enter-machine { min-height:36px;padding:6px 11px;font-size:10px; }
          .hub-guidance { display:none; }
        }
        @media (max-width:580px) and (orientation:portrait) {
          .hub-top { height:clamp(86px,16dvh,109px); }
          .hub-machines { align-self:center; height:min(100%,280px); }
          .hub-intro p { display:none; }
          .hub-intro h1 { font-size:clamp(16px,4vw,20px); }
        }
        @media (max-width:720px) and (orientation:landscape) {
          .hub-top { height:clamp(66px,20dvh,92px); }
          .hub-intro p { display:none; }
          .hub-selection { grid-template-rows:auto minmax(0,1fr) auto; }
          .selected-machine-panel { grid-template-columns:minmax(0,1fr) auto auto; padding:5px 9px; }
          .selected-machine-copy { grid-column:auto; }
          .selected-machine-copy p { display:none; }
          .hub-guidance { display:none; }
          .machine-label strong { font-size:11px; }
        }
        @media (max-height:700px) and (min-width:721px) {
          .hub-intro p { display:none; }
          .selected-machine-copy p { display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden; }
          .hub-guidance { display:none; }
          .hub-selection { grid-template-rows:auto minmax(0,1fr) auto; }
        }
        @media (max-height:570px) {
          .hub-intro { padding:7px; }
          .hub-intro h1 { font-size:16px;margin:3px 0; }
          .hub-intro p { display:none; }
          .hub-selection { padding:5px;gap:3px; }
          .hub-selection-heading .hub-eyebrow { display:none; }
          .machine-label > span, .machine-selected-indicator { display:none; }
          .selected-machine-copy p { display:none; }
          .selected-machine-panel { padding:4px 7px; }
          .enter-machine { min-height:31px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .machine-option,.machine-image-stage :global(.machine-image),.machine-spotlight { transition:none !important; }
        }
      `}</style>
    </section>
  );
}
