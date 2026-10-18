"use client";

import type { CSSProperties } from "react";
import type { GameId } from "./shared";

export type ReactorMachineOutput = {
  id: GameId;
  title: string;
  completed: number;
  earned: number;
  accent: string;
};

export type ConfirmedReactorAward = {
  id: number;
  machine: string;
  amount: number;
  tokenBalance: number;
};

type DreamTokenReactorProps = {
  machines: ReactorMachineOutput[];
  todayCompleted: number;
  todayGeneratedDT: number;
  loading: boolean;
  isGuest: boolean;
  pulseKey: number;
};

/**
 * Presentation only. The reactor visualises existing daily challenge results;
 * it never issues token transactions or changes a learner's balance.
 */
export function DreamTokenReactor({
  machines,
  todayCompleted,
  todayGeneratedDT,
  loading,
  isGuest,
  pulseKey,
}: DreamTokenReactorProps) {
  const complete = Math.max(0, Math.min(9, todayCompleted));
  const earned = isGuest ? 0 : Math.max(0, todayGeneratedDT);

  return (
    <section className="reactor-console" aria-label="Dream Token reactor">
      <div className="console-heading">
        <span className="power-indicator" aria-hidden="true" />
        <div>
          <span className="console-eyebrow">THINK LAB POWER SYSTEM</span>
          <h2>Dream Token Reactor</h2>
        </div>
        <span className="reactor-state">{loading ? "SYNCING" : isGuest ? "PRACTICE" : "ONLINE"}</span>
      </div>

      <div className="reactor-display">
        <div className={`reactor-chamber${pulseKey > 0 ? " was-charged" : ""}`} key={`pulse-${pulseKey}`} aria-hidden="true">
          <div className="energy-ring ring-outer" />
          <div className="energy-ring ring-inner" />
          <div className="orbit-trace" />
          <div className="energy-beam beam-left" />
          <div className="energy-beam beam-right" />
          <div className="reactor-heart">
            <span>DT</span>
          </div>
          <span className="spark spark-one" />
          <span className="spark spark-two" />
          <span className="spark spark-three" />
          <span className="spark spark-four" />
        </div>
        <div className="power-output" aria-live="polite" aria-atomic="true">
          <span className="output-label">{isGuest ? "PRACTICE OUTPUT" : "TODAY'S OUTPUT"}</span>
          <div className="output-value">
            <strong>{loading ? "—" : earned.toLocaleString("en-US")}</strong>
            <span>DT</span>
          </div>
          <span className="output-caption">
            {loading
              ? "Synchronising with the lab"
              : isGuest
              ? "Sign in to earn Dream Tokens"
              : "Confirmed Dream Tokens earned today"}
          </span>
        </div>
      </div>

      <div className="charge-heading">
        <span>Daily thinking challenges</span>
        <strong>{loading ? "—" : `${complete} / 9`}</strong>
      </div>
      <div
        className="charge-meter"
        role="progressbar"
        aria-label="Daily challenges completed"
        aria-valuemin={0}
        aria-valuemax={9}
        aria-valuenow={complete}
      >
        <span style={{ width: `${(complete / 9) * 100}%` }} />
      </div>

      <div className="machine-output-list" aria-label="Contributions from each thinking machine">
        {machines.map((machine) => (
          <div
            key={machine.id}
            className="machine-output"
            style={{ "--output-accent": machine.accent } as CSSProperties}
          >
            <span className="machine-led" aria-hidden="true" />
            <span className="machine-label">{machine.title}</span>
            <span className="machine-steps">{machine.completed}/3</span>
            <strong>{loading ? "—" : `${isGuest ? 0 : Math.max(0, machine.earned)} DT`}</strong>
          </div>
        ))}
      </div>
      <style jsx>{`
        /* Phase 4B: the reactor is a full-height right-side console on wide screens. */
        .reactor-console {
          display: grid;
          grid-template-rows: auto minmax(0,1fr) auto auto auto;
          gap: clamp(7px,1.2vh,14px);
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: clamp(12px,1.15vw,20px);
          border: 1px solid rgba(152,143,255,.50);
          border-radius: 21px;
          color: #f6f9ff;
          background: linear-gradient(150deg,rgba(13,21,56,.96),rgba(4,13,37,.95));
          box-shadow: 0 15px 44px rgba(0,0,0,.45),inset 0 1px 0 rgba(210,224,255,.13),0 0 40px rgba(120,95,245,.11);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          overflow: hidden;
        }
        .console-heading { display:flex; align-items:center; gap:9px; min-width:0; }
        .power-indicator {
          width:8px;height:8px;flex:0 0 auto;border-radius:50%;
          background:#8be9ff;box-shadow:0 0 12px #7ee7ff;
        }
        .console-heading > div { flex:1; min-width:0; }
        .console-eyebrow {
          display:block;color:#86d2fa;font-size:clamp(8px,.7vw,10px);
          letter-spacing:.12em;font-weight:900;
        }
        h2 { margin:3px 0 0;font-size:clamp(14px,1.22vw,19px);line-height:1.2;letter-spacing:-.02em; }
        .reactor-state {
          flex:0 0 auto;padding:4px 6px;border-radius:6px;
          background:rgba(119,203,248,.1);color:#9cdcff;font-size:8px;font-weight:900;letter-spacing:.05em;
        }
        .reactor-display {
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          gap:clamp(9px,2.3vh,24px);
          min-width:0;min-height:0;
        }
        .reactor-chamber {
          position:relative;
          width:clamp(96px,18dvh,164px);
          height:clamp(96px,18dvh,164px);
          flex:0 0 auto;
          isolation:isolate;
        }
        .reactor-chamber::before {
          content:"";position:absolute;inset:9%;border-radius:50%;
          background:radial-gradient(circle,rgba(129,104,255,.23),rgba(45,122,224,.09) 53%,transparent 75%);
          filter:blur(10px);
        }
        .reactor-chamber.was-charged::after {
          content:"";position:absolute;inset:-4px;border:2px solid rgba(131,240,255,.8);
          border-radius:50%;pointer-events:none;animation:charge-flash 1.6s ease-out both;
        }
        .energy-ring { position:absolute;border-radius:50%;pointer-events:none; }
        .ring-outer {
          inset:6%;border:2px solid rgba(132,196,255,.32);
          border-left-color:#81e7ff;border-right-color:#c69cff;animation:ring-spin 11s linear infinite;
        }
        .ring-inner {
          inset:18%;border:2px solid rgba(179,136,255,.58);
          border-top-color:#7df6ff;border-bottom-color:#7df6ff;animation:ring-spin 7s linear infinite reverse;
        }
        .orbit-trace {
          position:absolute;inset:3% 20%;border-radius:50%;
          border:1px solid rgba(128,179,255,.55);transform:rotate(55deg);
        }
        .reactor-heart {
          position:absolute;inset:30%;display:grid;place-items:center;border-radius:25%;
          transform:rotate(45deg);
          background:linear-gradient(145deg,#f3abff,#8369ff 48%,#4ad4ff);
          box-shadow:0 0 17px rgba(172,105,255,.8),inset 0 0 10px rgba(255,255,255,.45);
          animation:core-beat 3.4s ease-in-out infinite;
        }
        .reactor-heart span {
          transform:rotate(-45deg);color:#160c45;
          font-size:clamp(13px,1.3vw,18px);font-weight:1000;letter-spacing:-.07em;
        }
        .energy-beam {
          position:absolute;top:50%;width:20%;height:3px;border-radius:99px;
          background:linear-gradient(90deg,transparent,#68d9ff);box-shadow:0 0 12px rgba(101,214,255,.65);
        }
        .beam-left { left:0; }
        .beam-right { right:0;transform:rotate(180deg); }
        .spark {
          position:absolute;width:4px;height:4px;border-radius:50%;
          background:#bdefff;box-shadow:0 0 9px #a4e9ff;
        }
        .spark-one { top:12%;left:33%; }
        .spark-two { bottom:15%;right:20%; }
        .spark-three { top:34%;right:6%; }
        .spark-four { bottom:30%;left:8%; }
        .power-output { display:grid;justify-items:center;gap:4px;text-align:center;min-width:0; }
        .output-label { color:#9cbcf6;font-size:clamp(9px,.78vw,11px);font-weight:900;letter-spacing:.1em; }
        .output-value { display:flex;align-items:baseline;justify-content:center;gap:6px; }
        .output-value strong {
          font-size:clamp(29px,3.1vw,45px);
          letter-spacing:-.045em;font-variant-numeric:tabular-nums;
        }
        .output-value span { color:#b09bff;font-size:13px;font-weight:900; }
        .output-caption { font-size:10px;color:#bacbe4;line-height:1.35; }
        .charge-heading {
          display:flex;justify-content:space-between;gap:10px;
          font-size:10px;color:#c5d9ef;font-weight:700;
        }
        .charge-heading strong { color:white; }
        .charge-meter { width:100%;height:7px;overflow:hidden;border-radius:99px;background:rgba(255,255,255,.13); }
        .charge-meter span {
          display:block;height:100%;border-radius:inherit;
          background:linear-gradient(90deg,#5ad9ef,#a290ff);
          box-shadow:0 0 13px #8de4ff;transition:width .5s ease-out;
        }
        .machine-output-list {
          display:grid;gap:clamp(5px,.85vh,12px);
          min-width:0;padding-top:7px;border-top:1px solid rgba(150,191,237,.17);
        }
        .machine-output {
          display:grid;
          grid-template-columns:8px minmax(0,1fr) 28px 55px;
          align-items:center;gap:5px;
          color:#d0e0f1;font-size:clamp(9px,.76vw,11px);
        }
        .machine-led {
          width:7px;height:7px;border-radius:50%;
          background:var(--output-accent);box-shadow:0 0 9px var(--output-accent);
        }
        .machine-label { overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
        .machine-steps { color:#a8bddb;text-align:right;font-variant-numeric:tabular-nums; }
        .machine-output strong { color:white;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums; }
        @keyframes ring-spin { to { transform:rotate(360deg); } }
        @keyframes charge-flash { from { opacity:1;transform:scale(.7); } to { opacity:0;transform:scale(1.35); } }
        @keyframes core-beat {
          50% { filter:brightness(1.35);box-shadow:0 0 28px rgba(172,105,255,.95),inset 0 0 12px rgba(255,255,255,.6); }
        }
        @media (max-width:1100px) {
          .reactor-console { padding:12px 11px;gap:8px; }
          .reactor-chamber { width:clamp(88px,15dvh,136px);height:clamp(88px,15dvh,136px); }
          .reactor-display { gap:8px; }
          .machine-output { grid-template-columns:7px minmax(0,1fr) 24px 47px;font-size:9px;gap:4px; }
        }
        @media (max-width:820px), (max-width:950px) and (max-height:500px) {
          .reactor-console {
            padding:8px 11px;
            gap:4px;
            border-radius:14px;
          }
          .console-eyebrow { font-size:8px;letter-spacing:.04em; }
          h2 { font-size:13px; }
          .reactor-state { padding:3px 5px;font-size:7px; }
          .reactor-display {
            flex-direction:row;
            justify-content:center;
            align-items:center;
            gap:12px;
          }
          .reactor-chamber { width:64px;height:64px; }
          .reactor-heart span { font-size:10px; }
          .power-output { justify-items:start;text-align:left;gap:1px; }
          .output-label { font-size:8px; }
          .output-value strong { font-size:23px; }
          .output-value span { font-size:10px; }
          .output-caption { display:none; }
          .charge-heading { font-size:9px; }
          .charge-meter { height:4px; }
          .machine-output-list { gap:3px;padding-top:3px; }
          .machine-output { grid-template-columns:6px minmax(0,1fr) 26px 47px;font-size:9px; }
          .machine-led { width:6px;height:6px; }
        }
        @media (max-width:820px) and (orientation:landscape), (max-width:950px) and (max-height:500px) and (orientation:landscape) {
          .reactor-console { padding:7px 8px;gap:3px; }
          .console-eyebrow { display:none; }
          h2 { font-size:11px; }
          .power-indicator { width:6px;height:6px; }
          .reactor-state { font-size:6px;padding:2px; }
          .reactor-display { gap:6px; }
          .reactor-chamber { width:59px;height:59px; }
          .output-value strong { font-size:21px; }
          .output-label { font-size:7px; }
          .charge-heading { font-size:8px; }
          .machine-output-list { gap:4px; }
          .machine-output { grid-template-columns:6px minmax(0,1fr) 22px 43px;font-size:8px;gap:2px; }
        }
        @media (max-height:700px) and (min-width:761px) {
          .reactor-console { padding:9px 11px;gap:6px; }
          .reactor-chamber { width:clamp(90px,17vh,118px);height:clamp(90px,17vh,118px); }
          .output-value strong { font-size:26px; }
          .output-caption { display:none; }
          .machine-output-list { gap:4px; }
        }
        @media (max-width:760px) and (orientation:portrait) and (max-height:660px) {
          .reactor-chamber { display:none; }
          .reactor-display { gap:0; }
          .power-output { display:flex;align-items:baseline;gap:10px; }
          .output-value strong { font-size:20px; }
          .reactor-console { gap:2px; }
        }
        @media (prefers-reduced-motion:reduce) {
          .ring-outer,.ring-inner,.reactor-heart,.reactor-chamber.was-charged::after { animation:none; }
          .charge-meter span { transition:none; }
        }
      `}</style>
    </section>
  );
}

/** Announces only a newly confirmed positive reward from the existing Supabase RPC. */
export function ReactorTransferCelebration({ award }: { award: ConfirmedReactorAward }) {
  return (
    <div className="transfer-overlay" role="status" aria-live="polite" aria-atomic="true">
      <div className="transfer-graphic" aria-hidden="true">
        <div className="source-machine">▣</div>
        <div className="energy-trail"><span /><span /><span /></div>
        <div className="destination-core">DT</div>
      </div>
      <div className="transfer-copy">
        <span className="transfer-kicker">ENERGY TRANSFER COMPLETE</span>
        <strong>+{award.amount.toLocaleString("en-US")} Dream Tokens</strong>
        <span>{award.machine} powered the reactor</span>
        <small>Confirmed balance: {award.tokenBalance.toLocaleString("en-US")} DT</small>
      </div>
      <div className="transfer-particles" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <i key={i} style={{ left: `${15 + i * 9}%`, animationDelay: `${i * 45}ms` }} />
        ))}
      </div>
      <style jsx>{`
        .transfer-overlay {
          position: fixed; z-index: 130; top: 82px; left: 50%;
          width: min(410px, calc(100vw - 24px));
          padding: 14px 16px;
          transform: translateX(-50%);
          display: flex; gap: 14px; align-items: center;
          pointer-events: none;
          border: 1px solid rgba(157, 239, 255, .68);
          border-radius: 18px;
          background: linear-gradient(125deg, rgba(9, 40, 75, .98), rgba(28, 20, 73, .98));
          color: #fff;
          box-shadow: 0 24px 65px rgba(0, 0, 0, .52), 0 0 37px rgba(116, 205, 255, .24), inset 0 1px rgba(255,255,255,.13);
          animation: transfer-in .46s cubic-bezier(.18,.88,.32,1.1) both;
        }
        .transfer-graphic { display: flex; flex: 0 0 auto; align-items: center; gap: 4px; }
        .source-machine, .destination-core { width: 33px; height: 33px; display: grid; place-items: center; border: 1px solid #8ae2ff; border-radius: 10px; color: #85e8ff; font-size: 15px; background: rgba(65, 184, 255, .13); }
        .destination-core { border-radius: 50%; background: linear-gradient(130deg, #9079ff, #4cdbf9); color: #1a164c; font-size: 11px; font-weight: 1000; box-shadow: 0 0 18px rgba(152, 115, 255, .7); animation: received 1.2s .3s ease-in-out 2; }
        .energy-trail { width: 26px; height: 5px; display: flex; align-items: center; gap: 3px; overflow: hidden; }
        .energy-trail span { width: 5px; height: 5px; flex: 0 0 auto; border-radius: 50%; background: #91ebff; box-shadow: 0 0 8px #8defff; animation: travel .8s ease-in-out infinite; }
        .energy-trail span:nth-child(2) { animation-delay: .15s; }
        .energy-trail span:nth-child(3) { animation-delay: .3s; }
        .transfer-copy { position: relative; z-index: 1; display: grid; gap: 4px; min-width: 0; }
        .transfer-kicker { font-size: 9px; font-weight: 900; letter-spacing: .12em; color: #80e7ff; }
        .transfer-copy strong { font-size: 19px; line-height: 1.15; letter-spacing: -.03em; }
        .transfer-copy > span:not(.transfer-kicker) { font-size: 11px; color: #daeafa; }
        .transfer-copy small { font-size: 10px; color: #b7d4ed; }
        .transfer-particles { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; pointer-events: none; }
        .transfer-particles i { position: absolute; top: 45%; width: 4px; height: 4px; border-radius: 50%; background: #a5e7ff; box-shadow: 0 0 11px #87d8ff; animation: scatter 1.2s ease-out both;  }
        @keyframes transfer-in { from { opacity: 0; transform: translate(-50%, -14px) scale(.95); } to { opacity: 1; transform: translate(-50%, 0) scale(1); } }
        @keyframes travel { 0% { opacity: .1; transform: translateX(-8px); } 65% { opacity: 1; } 100% { opacity: .1; transform: translateX(8px); } }
        @keyframes received { 50% { filter: brightness(1.5); transform: scale(1.13); } }
        @keyframes scatter { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-28px) scale(.3); } }
        @media (max-width: 720px) {
          .transfer-overlay { top: 67px; padding: 11px 12px; gap: 9px; }
          .source-machine, .destination-core { width: 26px; height: 26px; font-size: 11px; }
          .energy-trail { width: 18px; }
          .transfer-copy strong { font-size: 15px; }
          .transfer-copy > span:not(.transfer-kicker), .transfer-copy small { font-size: 9px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .transfer-overlay, .destination-core, .energy-trail span, .transfer-particles i { animation: none !important; }
          .transfer-particles { display: none; }
        }
      `}</style>
    </div>
  );
}
