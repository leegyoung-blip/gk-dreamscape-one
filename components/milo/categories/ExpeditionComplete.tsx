"use client";

import { useMemo, useState } from "react";
import {
  EXPEDITION_LANDMARKS,
  EXPEDITION_METRES_PER_POINT,
  EXPEDITION_ROUTE_POINTS,
  MAX_EXPEDITION_METRES,
  getExpeditionPosition,
} from "./expeditionLandmarks";

type ExpeditionCompleteProps = {
  category: string;
  score: number;
  questionCount?: number;
  points: number;
  isFinalizing: boolean;
  onContinue: () => void;
};

const EXPEDITION_MAP_IMAGE =
  "/milo-world/activities/categories/expedition/world-map.png";
const EXPEDITION_TOP_VEHICLE =
  "/milo-world/activities/categories/expedition/milo-vehicle-top.png";

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
  const [showMapOnly, setShowMapOnly] = useState(false);

  const metres = Math.min(
    MAX_EXPEDITION_METRES,
    Math.max(0, points * EXPEDITION_METRES_PER_POINT),
  );
  const progress = Math.min(Math.max(metres / MAX_EXPEDITION_METRES, 0), 1);
  const vehiclePosition = getExpeditionPosition(metres);
  const landmarksCovered = useMemo(
    () => EXPEDITION_LANDMARKS.filter((landmark) => metres >= landmark.thresholdMetres).length,
    [metres],
  );
  const routePoints = EXPEDITION_ROUTE_POINTS.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className={`expedition-complete-root ${showMapOnly ? "is-map-only" : ""}`}>
      <div className="expedition-map-camera" aria-hidden="true">
        <img
          src={EXPEDITION_MAP_IMAGE}
          alt=""
          draggable={false}
          className="expedition-map-image"
        />
        <div className="expedition-map-vignette" />

        <svg
          className="expedition-map-route-overlay"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={routePoints}
            fill="none"
            stroke="rgba(2, 8, 23, 0.78)"
            strokeWidth="1.45"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={routePoints}
            pathLength="100"
            fill="none"
            stroke="rgba(255, 209, 138, 0.96)"
            strokeWidth="0.42"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${progress * 100} ${100 - progress * 100}`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {EXPEDITION_LANDMARKS.map((landmark, index) => {
          const passed = metres >= landmark.thresholdMetres;
          return (
            <div
              key={landmark.id}
              className={`expedition-map-landmark ${passed ? "is-passed" : "is-future"}`}
              style={{ left: `${landmark.mapX}%`, top: `${landmark.mapY}%` }}
            >
              <span className="expedition-map-landmark-dot">{index + 1}</span>
              {passed && showMapOnly && (
                <span
                  className={`expedition-map-landmark-card is-${landmark.cardAlign || "center"}`}
                >
                  {landmark.name}
                </span>
              )}
            </div>
          );
        })}

        <div
          className="expedition-map-vehicle-position"
          style={{ left: `${vehiclePosition.x}%`, top: `${vehiclePosition.y}%` }}
        >
          <span className="expedition-map-vehicle-glow" />
          <img
            src={EXPEDITION_TOP_VEHICLE}
            alt=""
            draggable={false}
            className="expedition-map-vehicle"
          />
        </div>
      </div>

      {!showMapOnly ? (
        <div className="expedition-complete-hud" role="dialog" aria-label="Expedition complete">
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
              <strong>{landmarksCovered}<span> / {EXPEDITION_LANDMARKS.length}</span></strong>
            </div>
            <div>
              <small>Correct</small>
              <strong>{score}<span> / {questionCount}</span></strong>
            </div>
          </div>

          <div className="expedition-complete-actions">
            <button
              type="button"
              className="expedition-complete-button is-secondary"
              onClick={() => setShowMapOnly(true)}
            >
              See Map
            </button>
            <button
              type="button"
              className="expedition-complete-button is-primary"
              onClick={onContinue}
              disabled={isFinalizing}
            >
              {isFinalizing ? "Finalizing expedition…" : "Continue to Summary"}
            </button>
          </div>
        </div>
      ) : (
        <div className="expedition-map-only-ui">
          <div className="expedition-map-only-stats">
            <span>{formatDistance(metres)}</span>
            <span>{landmarksCovered} / {EXPEDITION_LANDMARKS.length} landmarks</span>
          </div>
          <button
            type="button"
            onClick={onContinue}
            disabled={isFinalizing}
            className="expedition-map-continue"
          >
            {isFinalizing ? "Finalizing…" : "Continue to Summary"}
          </button>
        </div>
      )}

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

        .expedition-map-camera {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          transform-origin: 50% 50%;
          animation: expeditionMapReveal 1.35s cubic-bezier(.18,.78,.22,1) forwards;
        }

        .expedition-map-image {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
          user-select: none;
        }

        .expedition-map-vignette {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 48% 51%, transparent 0 38%, rgba(1,6,18,0.10) 67%, rgba(1,6,18,0.48) 100%),
            linear-gradient(180deg, rgba(2,8,23,0.08), rgba(2,8,23,0.18));
          pointer-events: none;
        }

        .expedition-map-route-overlay {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          overflow: visible;
          pointer-events: none;
          filter: drop-shadow(0 0 4px rgba(255,209,138,0.16));
        }

        .expedition-map-landmark {
          position: absolute;
          z-index: 4;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }

        .expedition-map-landmark-dot {
          display: grid;
          width: clamp(20px, 1.8vw, 30px);
          height: clamp(20px, 1.8vw, 30px);
          place-items: center;
          border: 2px solid rgba(255,209,138,0.92);
          border-radius: 999px;
          background: rgba(7,20,40,0.90);
          color: #ffd18a;
          font-size: clamp(7px, 0.65vw, 10px);
          font-weight: 950;
          box-shadow: 0 0 16px rgba(255,209,138,0.28);
        }

        .expedition-map-landmark.is-future {
          opacity: 0.34;
          filter: grayscale(0.78) brightness(0.55);
        }

        .expedition-map-landmark.is-future .expedition-map-landmark-dot {
          border-color: rgba(255,255,255,0.30);
          background: rgba(2,8,23,0.92);
          color: rgba(255,255,255,0.42);
          box-shadow: none;
        }

        .expedition-map-landmark-card {
          position: absolute;
          top: calc(100% + 7px);
          left: 50%;
          width: max-content;
          max-width: 150px;
          transform: translateX(-50%);
          border: 1px solid rgba(255,209,138,0.24);
          border-radius: 9px;
          background: rgba(4,14,32,0.88);
          padding: 4px 7px;
          color: white;
          font-size: clamp(7px, 0.72vw, 10px);
          font-weight: 850;
          line-height: 1.18;
          text-align: center;
          white-space: normal;
          box-shadow: 0 7px 20px rgba(0,0,0,0.24);
          backdrop-filter: blur(8px);
        }

        .expedition-map-landmark-card.is-left {
          left: 0;
          transform: none;
        }

        .expedition-map-landmark-card.is-right {
          right: 0;
          left: auto;
          transform: none;
        }

        .expedition-map-vehicle-position {
          position: absolute;
          z-index: 6;
          width: clamp(64px, 8vw, 130px);
          transform: translate(-50%, -50%);
          transition: left 900ms ease, top 900ms ease;
        }

        .expedition-map-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 10px 14px rgba(0,0,0,0.42));
          user-select: none;
          animation: expeditionMapVehicleArrive 650ms ease-out 450ms both;
        }

        .expedition-map-vehicle-glow {
          position: absolute;
          top: 58%;
          left: 50%;
          z-index: 1;
          width: 54%;
          aspect-ratio: 1;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: rgba(255,209,138,0.18);
          box-shadow: 0 0 30px rgba(255,209,138,0.48);
        }

        .expedition-complete-hud {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 10;
          width: min(760px, calc(100vw - 36px));
          transform: translate(-50%, -48%);
          border: 1px solid rgba(155,245,255,0.20);
          border-radius: 28px;
          background: linear-gradient(145deg, rgba(4,16,37,0.90), rgba(5,12,28,0.80));
          padding: clamp(22px, 3vw, 38px);
          box-shadow: 0 30px 90px rgba(0,0,0,0.46), 0 0 44px rgba(83,215,255,0.08);
          text-align: center;
          backdrop-filter: blur(18px);
          animation: expeditionCompleteHudIn 700ms ease-out 720ms both;
        }

        .expedition-complete-kicker {
          margin: 0;
          color: #9bf5ff;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        .expedition-complete-hud h1 {
          margin: 8px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(34px, 6vw, 68px);
          font-weight: 400;
          line-height: 0.95;
        }

        .expedition-complete-copy {
          margin: 12px 0 0;
          color: rgba(255,255,255,0.58);
          font-size: 13px;
        }

        .expedition-complete-metrics {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
          margin-top: 22px;
        }

        .expedition-complete-metrics > div {
          display: grid;
          gap: 5px;
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 18px;
          background: rgba(255,255,255,0.045);
          padding: 16px 12px;
        }

        .expedition-complete-metrics > div.is-distance {
          border-color: rgba(255,209,138,0.24);
          background: rgba(255,209,138,0.08);
        }

        .expedition-complete-metrics small {
          color: rgba(255,255,255,0.42);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .expedition-complete-metrics strong {
          color: white;
          font-size: clamp(20px, 3vw, 34px);
          font-weight: 950;
        }

        .expedition-complete-metrics .is-distance strong {
          color: #ffd18a;
        }

        .expedition-complete-metrics strong span {
          color: rgba(255,255,255,0.36);
          font-size: 0.55em;
        }

        .expedition-complete-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
          margin-top: 20px;
        }

        .expedition-complete-button,
        .expedition-map-continue {
          min-height: 46px;
          border-radius: 14px;
          padding: 11px 16px;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          cursor: pointer;
          transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
        }

        .expedition-complete-button.is-primary,
        .expedition-map-continue {
          border: 1px solid rgba(255,209,138,0.46);
          background: linear-gradient(90deg, #c47a25, #e5b75e);
          color: white;
          box-shadow: 0 14px 34px rgba(196,122,37,0.22);
        }

        .expedition-complete-button.is-secondary {
          border: 1px solid rgba(155,245,255,0.24);
          background: rgba(7,22,43,0.82);
          color: #9bf5ff;
        }

        .expedition-complete-button:hover:not(:disabled),
        .expedition-map-continue:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .expedition-complete-button:disabled,
        .expedition-map-continue:disabled {
          cursor: wait;
          opacity: 0.52;
        }

        .expedition-map-only-ui {
          position: absolute;
          inset: 0;
          z-index: 12;
          pointer-events: none;
        }

        .expedition-map-only-stats {
          position: absolute;
          top: 16px;
          left: 18px;
          display: flex;
          gap: 8px;
          pointer-events: none;
        }

        .expedition-map-only-stats span {
          border: 1px solid rgba(255,209,138,0.24);
          border-radius: 999px;
          background: rgba(4,14,32,0.84);
          padding: 7px 11px;
          color: #ffd18a;
          font-size: 9px;
          font-weight: 900;
          backdrop-filter: blur(10px);
        }

        .expedition-map-continue {
          position: absolute;
          right: 18px;
          bottom: 18px;
          pointer-events: auto;
        }

        .expedition-complete-root:not(.is-map-only) .expedition-map-landmark {
          opacity: 0.35;
        }

        @keyframes expeditionMapReveal {
          from { transform: scale(1.22); filter: saturate(0.88) brightness(0.76); }
          to { transform: scale(1); filter: saturate(1) brightness(1); }
        }

        @keyframes expeditionCompleteHudIn {
          from { opacity: 0; transform: translate(-50%, -44%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -48%) scale(1); }
        }

        @keyframes expeditionMapVehicleArrive {
          from { opacity: 0; transform: translateY(8px) scale(0.86); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .expedition-complete-hud {
            width: min(680px, calc(100vw - 24px));
            padding: 16px 18px;
          }

          .expedition-complete-hud h1 {
            font-size: clamp(28px, 5.4vw, 48px);
          }

          .expedition-complete-copy {
            margin-top: 7px;
            font-size: 10px;
          }

          .expedition-complete-metrics {
            margin-top: 13px;
          }

          .expedition-complete-metrics > div {
            border-radius: 13px;
            padding: 9px 8px;
          }

          .expedition-complete-actions {
            margin-top: 12px;
          }

          .expedition-map-vehicle-position {
            width: clamp(54px, 9vw, 86px);
          }

          .expedition-map-landmark-card {
            max-width: 110px;
            padding: 3px 5px;
            font-size: 7px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .expedition-map-camera,
          .expedition-complete-hud,
          .expedition-map-vehicle {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
