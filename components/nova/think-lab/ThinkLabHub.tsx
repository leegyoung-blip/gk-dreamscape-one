"use client";

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

const MACHINE_DETAILS: Record<GameId, { number: string; purpose: string; icon: string }> = {
  "colour-code": {
    number: "01",
    purpose: "Crack secret colour combinations",
    icon: "●",
  },
  "set-finder": {
    number: "02",
    purpose: "Discover hidden patterns",
    icon: "◇",
  },
  "tower-memory": {
    number: "03",
    purpose: "Memorise and rebuild structures",
    icon: "▦",
  },
};

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
  return (
    <section className="think-hub" aria-label="NOVA Think Lab machine selection">
      <div className="hub-intro">
        <span className="hub-eyebrow">NOVA'S THINK LAB</span>
        <h1>Power the journey.</h1>
        <p>
          Three thinking machines. One Dream Token reactor.
          Choose a challenge, activate a machine and help NOVA explore DREAMSCAPE.
        </p>
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

      <div className="hub-selection">
        <div className="hub-selection-heading">
          <div>
            <span className="hub-eyebrow">THINKING MACHINE BAY</span>
            <h2>Choose your machine</h2>
          </div>
          <span className="hub-reset">Daily reset in {countdown}</span>
        </div>

        <div className={`hub-machines${guideHighlight ? " guide-focus" : ""}`}>
          {games.map((game) => {
            const details = MACHINE_DETAILS[game.id];
            const completed = progress[game.id].completed;
            const complete = completed >= 3;
            return (
              <button
                key={game.id}
                type="button"
                className={`machine-card${complete ? " is-complete" : ""}`}
                style={{ "--machine-accent": game.accent } as CSSProperties}
                onClick={() => onActivate(game.id)}
                aria-label={`Activate ${game.title}, ${completed} of 3 challenges completed`}
              >
                <div className="machine-card-head">
                  <span className="machine-number">MACHINE {details.number}</span>
                  <span className="machine-progress">{loading ? "—" : `${completed}/3`} TODAY</span>
                </div>
                <div className="machine-body">
                  <div className="machine-symbol" aria-hidden="true">
                    <span>{details.icon}</span>
                  </div>
                  <div className="machine-details">
                    <strong className="machine-name">{game.title}</strong>
                    <span className="machine-alias">{game.machineName} · {game.skill}</span>
                    <span className="machine-purpose">{details.purpose}</span>
                  </div>
                </div>
                <div className="machine-card-foot">
                  <div className="machine-progress-track" aria-hidden="true">
                    <span style={{ width: `${Math.min(100, (completed / 3) * 100)}%` }} />
                  </div>
                  <div className="machine-earn">
                    <span>{game.rewardText}</span>
                    <span className="machine-activate">
                      {complete ? "View machine" : "Activate"} <span aria-hidden="true">→</span>
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="hub-guidance">
          <span aria-hidden="true">✦</span>
          {isGuest
            ? "Guest mode lets you practise. Sign in to collect Dream Tokens and save progress."
            : "Finish challenges to generate Dream Tokens. Your rewards stay in your existing balance."}
        </div>
      </div>

      <style jsx>{`
        .think-hub {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          height: calc(100dvh - 66px - clamp(104px, 14vh, 142px) - 10px);
          padding: clamp(12px, 2vw, 26px);
          overflow: auto;
          color: #f6fbff;
          scrollbar-width: thin;
          scrollbar-color: rgba(114, 218, 255, .34) transparent;
        }
        .hub-eyebrow {
          color: #78e2ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .19em;
        }
        .hub-intro {
          position: relative;
          width: min(340px, 32vw);
          min-width: 245px;
          padding: 17px 19px;
          border-radius: 18px;
          border: 1px solid rgba(117, 222, 255, .32);
          background: linear-gradient(145deg, rgba(4, 17, 37, .88), rgba(6, 17, 43, .62));
          backdrop-filter: blur(14px);
          box-shadow: 0 12px 34px rgba(0, 0, 0, .3);
        }
        .hub-intro h1 {
          margin: 8px 0 5px;
          font-size: clamp(23px, 2.4vw, 36px);
          line-height: 1.12;
          letter-spacing: -.045em;
        }
        .hub-intro p {
          margin: 0;
          color: rgba(231, 244, 255, .81);
          font-size: 12px;
          line-height: 1.58;
        }
        .hub-reactor {
          position: absolute;
          top: clamp(12px, 2vw, 26px);
          right: clamp(12px, 2vw, 26px);
          z-index: 2;
          width: min(304px, 30vw);
        }
        .machine-progress-track {
          overflow: hidden;
          height: 5px;
          border-radius: 99px;
          background: rgba(255,255,255,.14);
        }
        .hub-selection {
          width: 100%;
          margin-top: auto;
          padding: 15px;
          border: 1px solid rgba(125, 205, 255, .24);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(4, 11, 28, .8), rgba(4, 11, 32, .88));
          backdrop-filter: blur(13px);
          box-shadow: 0 22px 65px rgba(0,0,0,.42);
        }
        .hub-selection-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 12px;
          padding: 2px 4px 13px;
        }
        .hub-selection-heading h2 {
          margin: 3px 0 0;
          font-size: 19px;
          letter-spacing: -.025em;
        }
        .hub-reset {
          color: rgba(220, 239, 255, .64);
          font-size: 10px;
        }
        .hub-machines {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }
        .machine-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-width: 0;
          min-height: 174px;
          padding: 12px 13px;
          border: 1px solid color-mix(in srgb, var(--machine-accent) 50%, transparent);
          border-radius: 17px;
          background:
            radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--machine-accent) 18%, transparent), transparent 60%),
            rgba(7, 20, 43, .9);
          color: white;
          appearance: none;
          text-align: left;
          cursor: pointer;
          transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
        }
        .machine-card:hover, .machine-card:focus-visible {
          transform: translateY(-3px);
          border-color: var(--machine-accent);
          outline: none;
          box-shadow: 0 0 28px color-mix(in srgb, var(--machine-accent) 28%, transparent);
        }
        .machine-card:active { transform: translateY(-1px) scale(.995); }
        .machine-card-head, .machine-earn {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .machine-number {
          color: var(--machine-accent);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .13em;
        }
        .machine-progress {
          color: rgba(223,239,255,.73);
          font-size: 9px;
          font-weight: 850;
        }
        .machine-body {
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 72px;
        }
        .machine-symbol {
          display: flex;
          flex: 0 0 59px;
          width: 59px;
          height: 62px;
          justify-content: center;
          align-items: center;
          border-radius: 16px;
          border: 1px solid var(--machine-accent);
          color: var(--machine-accent);
          background:
            radial-gradient(circle at center, color-mix(in srgb, var(--machine-accent) 28%, transparent), rgba(2, 9, 25, .6));
          box-shadow: 0 0 19px color-mix(in srgb, var(--machine-accent) 24%, transparent), inset 0 0 14px color-mix(in srgb, var(--machine-accent) 16%, transparent);
          font-size: 32px;
          text-shadow: 0 0 15px var(--machine-accent);
        }
        .machine-details { display: grid; gap: 4px; min-width: 0; }
        .machine-name { font-size: clamp(14px, 1.5vw, 20px); letter-spacing: -.02em; }
        .machine-alias { color: var(--machine-accent); font-size: 10px; font-weight: 800; }
        .machine-purpose { color: rgba(229,244,255,.64); font-size: 10px; line-height: 1.4; }
        .machine-card-foot { display: grid; gap: 9px; margin-top: auto; }
        .machine-progress-track span {
          display: block;
          height: 100%;
          background: var(--machine-accent);
          box-shadow: 0 0 11px var(--machine-accent);
        }
        .machine-earn { font-size: 10px; color: rgba(236,244,255,.69); }
        .machine-activate {
          padding: 7px 12px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--machine-accent) 24%, rgba(6,20,40,.9));
          border: 1px solid color-mix(in srgb, var(--machine-accent) 54%, transparent);
          color: white;
          font-weight: 900;
          white-space: nowrap;
        }
        .machine-activate span { margin-left: 5px; }
        .is-complete .machine-activate { opacity: .8; }
        .hub-guidance {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 11px;
          color: rgba(212,230,255,.7);
          font-size: 10px;
          line-height: 1.4;
          text-align: center;
        }
        .hub-guidance > span { color: #82dfff; }
        .guide-focus { border-radius: 15px; outline: 2px solid #84e8ff; outline-offset: 5px; }
        @media (max-width: 950px) and (min-width: 721px) {
          .hub-intro { width: 250px; }
          .hub-machines { gap: 8px; }
          .machine-card { padding: 10px; }
          .machine-symbol { flex-basis: 46px; width: 46px; height: 54px; font-size: 26px; }
          .machine-body { gap: 8px; }
          .machine-earn { font-size: 9px; }
        }
        @media (max-width: 720px) {
          .think-hub {
            height: calc(100dvh - 58px - 104px - 5px);
            padding: 10px 9px 18px;
            gap: 10px;
          }
          .hub-intro { width: 100%; min-width: 0; padding: 12px 13px; }
          .hub-intro h1 { font-size: 23px; }
          .hub-intro p { font-size: 11px; }
          .hub-reactor {
            position: static;
            width: min(100%, 440px);
            align-self: center;
            margin-top: 2px;
          }
          .hub-selection { padding: 10px; margin-top: auto; border-radius: 17px; }
          .hub-selection-heading { padding: 0 2px 8px; }
          .hub-selection-heading h2 { font-size: 16px; }
          .hub-reset { max-width: 105px; text-align: right; font-size: 8px; }
          .hub-machines { grid-template-columns: 1fr; gap: 7px; }
          .machine-card { min-height: 93px; padding: 9px 11px; gap: 5px; border-radius: 13px; }
          .machine-body { min-height: 43px; gap: 9px; }
          .machine-symbol { flex-basis: 40px; width: 40px; height: 42px; border-radius: 11px; font-size: 23px; }
          .machine-details { gap: 1px; }
          .machine-name { font-size: 15px; }
          .machine-alias { font-size: 9px; }
          .machine-purpose { display: none; }
          .machine-card-foot { gap: 5px; }
          .machine-progress-track { height: 3px; }
          .machine-activate { padding: 5px 8px; font-size: 9px; }
          .machine-earn { font-size: 9px; }
          .hub-guidance { font-size: 9px; margin-top: 8px; }
        }
        @media (max-width: 720px) and (orientation: landscape) {
          .hub-intro { width: 260px; }
          .hub-intro p { display: none; }
          .hub-reactor { position: absolute; top: 10px; right: 10px; width: 220px; }
          .think-hub { height: calc(100dvh - 58px - 58px - 5px); }
          .hub-machines { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .machine-card { padding: 8px; }
          .machine-symbol { display: none; }
          .machine-purpose { display: none; }
          .hub-selection { margin-top: 90px; }
          .machine-earn { flex-wrap: wrap; }
        }
        @media (max-height: 740px) and (min-width: 721px) {
          .think-hub { height: calc(100dvh - 66px - 78px - 10px); }
        }
        @media (max-width: 720px) and (max-height: 660px) and (orientation: portrait) {
          .think-hub { height: calc(100dvh - 58px - 72px - 5px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .machine-card { transition: none; }
        }
      `}</style>
    </section>
  );
}
