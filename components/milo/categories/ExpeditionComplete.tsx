"use client";

import { useMemo } from "react";

type ExpeditionCompleteProps = {
  category: string;
  score: number;
  questionCount?: number;
  points: number;
  isFinalizing: boolean;
  onContinue: () => void;
};

const EXPEDITION_METRES_PER_POINT = 10;
const MAX_EXPEDITION_POINTS = 1000;
const WORLD_CYCLE_WIDTH_VH = 900;
const TOTAL_LANDMARKS = 9;
const LANDMARK_THRESHOLDS_METRES = [800, 1800, 2800, 3800, 4800, 5800, 6800, 7800, 8800] as const;
const WORLD_IMAGES = [
  "/milo-world/activities/categories/expedition/world-01.png",
  "/milo-world/activities/categories/expedition/world-02.png",
  "/milo-world/activities/categories/expedition/world-03.png",
] as const;

function formatDistance(metres: number) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

export default function ExpeditionComplete({
  category,
  score,
  questionCount = 10,
  points,
  isFinalizing,
  onContinue,
}: ExpeditionCompleteProps) {
  const metres = Math.max(0, points * EXPEDITION_METRES_PER_POINT);
  const progress = Math.min(Math.max(points / MAX_EXPEDITION_POINTS, 0), 1);
  const worldOffsetVh = progress * WORLD_CYCLE_WIDTH_VH;
  const landmarksCovered = useMemo(
    () => LANDMARK_THRESHOLDS_METRES.filter((threshold) => metres >= threshold).length,
    [metres],
  );

  return (
    <div className="expedition-complete-root">
      <div className="expedition-complete-camera" aria-hidden="true">
        <div
          className="expedition-complete-world-track"
          style={{ transform: `translate3d(-${worldOffsetVh}vh, 0, 0)` }}
        >
          {[...WORLD_IMAGES, ...WORLD_IMAGES].map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt=""
              draggable={false}
              className="expedition-complete-world-tile"
            />
          ))}
        </div>
        <div className="expedition-complete-shade" />
        <div className="expedition-complete-vehicle-zone">
          <div className="expedition-complete-wheel expedition-complete-wheel--rear">
            <img
              src="/milo-world/activities/categories/expedition/milo-vehicle-rear-wheel.png"
              alt=""
              draggable={false}
              className="expedition-complete-wheel-image"
            />
          </div>
          <div className="expedition-complete-wheel expedition-complete-wheel--front">
            <img
              src="/milo-world/activities/categories/expedition/milo-vehicle-front-wheel.png"
              alt=""
              draggable={false}
              className="expedition-complete-wheel-image"
            />
          </div>
          <img
            src="/milo-world/activities/categories/expedition/milo-vehicle-body.png"
            alt=""
            draggable={false}
            className="expedition-complete-vehicle-body"
          />
        </div>
      </div>

      <div className="expedition-complete-hud">
        <p className="expedition-complete-kicker">{category} · Dreamway Expedition</p>
        <h1>Expedition Complete</h1>
        <p className="expedition-complete-copy">
          Milo made it this far on today&apos;s run.
        </p>

        <div className="expedition-complete-metrics">
          <div className="is-distance">
            <small>Total distance</small>
            <strong>{formatDistance(metres)}</strong>
          </div>
          <div>
            <small>Landmarks passed</small>
            <strong>{landmarksCovered}<span> / {TOTAL_LANDMARKS}</span></strong>
          </div>
          <div>
            <small>Correct</small>
            <strong>{score}<span> / {questionCount}</span></strong>
          </div>
        </div>

        <div className="expedition-complete-route" aria-hidden="true">
          <div className="expedition-complete-route-base" />
          <div
            className="expedition-complete-route-progress"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="expedition-complete-route-marker"
            style={{ left: `clamp(0%, ${progress * 100}%, 100%)` }}
          >
            <span>🚙</span>
          </div>
        </div>

        <button
          type="button"
          className="expedition-complete-button"
          onClick={onContinue}
          disabled={isFinalizing}
        >
          {isFinalizing ? "Finalizing expedition…" : "Continue to Summary"}
        </button>
      </div>

      <style jsx>{`
        .expedition-complete-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          isolation: isolate;
          background: #020817;
          color: white;
        }

        .expedition-complete-camera {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          transform-origin: 50% 62%;
          animation: expeditionCompleteZoomOut 1.45s cubic-bezier(.18,.78,.22,1) forwards;
        }

        .expedition-complete-world-track {
          position: absolute;
          inset: 0;
          display: flex;
          width: max-content;
          will-change: transform;
        }

        .expedition-complete-world-tile {
          display: block;
          width: 300vh;
          height: 100%;
          flex: 0 0 300vh;
          object-fit: fill;
          user-select: none;
          pointer-events: none;
        }

        .expedition-complete-shade {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 58%, transparent 0 22%, rgba(1,6,18,0.20) 60%, rgba(1,6,18,0.62) 100%),
            linear-gradient(180deg, rgba(2,8,23,0.18), rgba(2,8,23,0.50));
        }

        .expedition-complete-vehicle-zone {
          position: absolute;
          left: 8%;
          bottom: 24.8%;
          width: clamp(150px, 18vw, 310px);
          pointer-events: none;
        }

        .expedition-complete-vehicle-body {
          position: relative;
          z-index: 3;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 16px 18px rgba(0,0,0,0.34));
          user-select: none;
        }

        .expedition-complete-wheel {
          position: absolute;
          z-index: 2;
          display: grid;
          place-items: center;
          filter: drop-shadow(0 10px 10px rgba(0,0,0,0.22));
        }

        .expedition-complete-wheel--rear {
          left: 2.8%;
          top: 59.7%;
          width: 27.0%;
        }

        .expedition-complete-wheel--front {
          left: 69.4%;
          top: 61.1%;
          width: 25.2%;
        }

        .expedition-complete-wheel-image {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
        }

        .expedition-complete-hud {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 4;
          width: min(760px, calc(100vw - 36px));
          transform: translate(-50%, -48%);
          border: 1px solid rgba(155,245,255,0.20);
          border-radius: 28px;
          background: linear-gradient(155deg, rgba(5,21,48,0.88), rgba(4,13,31,0.82));
          padding: clamp(24px, 4vw, 42px);
          box-shadow: 0 34px 90px rgba(0,0,0,0.42), 0 0 54px rgba(83,215,255,0.08);
          text-align: center;
          backdrop-filter: blur(18px);
          animation: expeditionCompleteHudIn 720ms 620ms ease-out both;
        }

        .expedition-complete-kicker {
          margin: 0;
          color: #ffd18a;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.17em;
          text-transform: uppercase;
        }

        .expedition-complete-hud h1 {
          margin: 10px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 5vw, 58px);
          font-weight: 500;
          line-height: 1;
        }

        .expedition-complete-copy {
          margin: 10px 0 0;
          color: rgba(255,255,255,0.55);
          font-size: 12px;
          font-weight: 700;
        }

        .expedition-complete-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0,1fr));
          gap: 12px;
          margin-top: 24px;
        }

        .expedition-complete-metrics > div {
          display: grid;
          gap: 5px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 18px;
          background: rgba(255,255,255,0.045);
          padding: 16px 12px;
        }

        .expedition-complete-metrics > div.is-distance {
          border-color: rgba(255,209,138,0.28);
          background: rgba(255,209,138,0.08);
        }

        .expedition-complete-metrics small {
          color: rgba(255,255,255,0.40);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .expedition-complete-metrics strong {
          color: white;
          font-size: clamp(22px, 3vw, 34px);
          font-weight: 950;
        }

        .expedition-complete-metrics .is-distance strong {
          color: #ffd18a;
        }

        .expedition-complete-metrics strong span {
          color: rgba(255,255,255,0.42);
          font-size: 0.48em;
        }

        .expedition-complete-route {
          position: relative;
          height: 42px;
          margin: 20px 6px 0;
        }

        .expedition-complete-route-base,
        .expedition-complete-route-progress {
          position: absolute;
          top: 23px;
          left: 0;
          height: 3px;
          border-radius: 999px;
        }

        .expedition-complete-route-base {
          right: 0;
          background: rgba(255,255,255,0.13);
        }

        .expedition-complete-route-progress {
          background: linear-gradient(90deg, #c47a25, #ffd18a);
          box-shadow: 0 0 16px rgba(255,209,138,0.28);
        }

        .expedition-complete-route-marker {
          position: absolute;
          top: 3px;
          transform: translateX(-50%);
        }

        .expedition-complete-route-marker span {
          display: block;
          font-size: 22px;
          filter: drop-shadow(0 5px 6px rgba(0,0,0,0.42));
        }

        .expedition-complete-button {
          min-width: 220px;
          min-height: 46px;
          margin-top: 8px;
          border: 1px solid rgba(255,209,138,0.44);
          border-radius: 14px;
          background: linear-gradient(90deg, #c47a25, #e5b75e);
          padding: 11px 20px;
          color: white;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          box-shadow: 0 14px 32px rgba(196,122,37,0.20);
          cursor: pointer;
        }

        .expedition-complete-button:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        @keyframes expeditionCompleteZoomOut {
          from {
            transform: scale(1.16);
            filter: blur(0px) brightness(1.02);
          }
          to {
            transform: scale(0.88);
            filter: blur(0px) brightness(0.80);
          }
        }

        @keyframes expeditionCompleteHudIn {
          from { opacity: 0; transform: translate(-50%, -43%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -48%) scale(1); }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .expedition-complete-hud {
            width: min(680px, calc(100vw - 28px));
            border-radius: 20px;
            padding: 18px 22px;
          }

          .expedition-complete-hud h1 {
            margin-top: 6px;
            font-size: clamp(26px, 4.5vw, 38px);
          }

          .expedition-complete-copy {
            display: none;
          }

          .expedition-complete-metrics {
            gap: 8px;
            margin-top: 14px;
          }

          .expedition-complete-metrics > div {
            padding: 10px 8px;
          }

          .expedition-complete-route {
            margin-top: 10px;
          }

          .expedition-complete-button {
            min-height: 38px;
            margin-top: 2px;
            padding: 8px 16px;
            font-size: 8px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .expedition-complete-camera,
          .expedition-complete-hud {
            animation: none !important;
          }

          .expedition-complete-camera {
            transform: scale(0.88);
            filter: brightness(0.80);
          }
        }
      `}</style>
    </div>
  );
}
