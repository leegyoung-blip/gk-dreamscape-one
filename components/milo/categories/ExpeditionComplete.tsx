"use client";

import { useMemo, useState } from "react";
import {
  EXPEDITION_LANDMARKS,
  EXPEDITION_METRES_PER_POINT,
  EXPEDITION_ROUTE_POINTS,
  MAX_EXPEDITION_METRES,
  getExpeditionPose,
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
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);

  const metres = Math.min(
    MAX_EXPEDITION_METRES,
    Math.max(0, points * EXPEDITION_METRES_PER_POINT),
  );
  const progress = Math.min(Math.max(metres / MAX_EXPEDITION_METRES, 0), 1);
  const vehiclePose = getExpeditionPose(metres);
  const landmarksCovered = useMemo(
    () => EXPEDITION_LANDMARKS.filter((landmark) => metres >= landmark.thresholdMetres).length,
    [metres],
  );
  const routePoints = EXPEDITION_ROUTE_POINTS.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className={`expedition-complete-root ${showMapOnly ? "is-map-only" : ""}`}>
      <div className="expedition-map-camera">
        <img
          src={EXPEDITION_MAP_IMAGE}
          alt=""
          draggable={false}
          className="expedition-map-image"
        />
        <div className="expedition-map-vignette" />

        <div
          className="expedition-map-unreached-area"
          style={{ left: `${Math.min(100, Math.max(0, vehiclePose.x))}%` }}
        />

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
          const isActive = activeLandmarkId === landmark.id;
          const storyVertical = landmark.mapY >= 45 ? "is-above" : "is-below";

          return (
            <div
              key={landmark.id}
              className={`expedition-map-landmark ${passed ? "is-passed" : "is-future"}`}
              style={{ left: `${landmark.mapX}%`, top: `${landmark.mapY}%` }}
            >
              <button
                type="button"
                className="expedition-map-landmark-trigger"
                disabled={!passed || !showMapOnly}
                aria-label={passed ? `Learn about ${landmark.name}` : `${landmark.name} not reached`}
                aria-expanded={passed && showMapOnly ? isActive : false}
                onPointerEnter={() => {
                  if (passed && showMapOnly) setActiveLandmarkId(landmark.id);
                }}
                onFocus={() => {
                  if (passed && showMapOnly) setActiveLandmarkId(landmark.id);
                }}
                onClick={() => {
                  if (passed && showMapOnly) setActiveLandmarkId(landmark.id);
                }}
              >
                <span className="expedition-map-landmark-dot">{index + 1}</span>
                {passed && showMapOnly && (
                  <span
                    className={`expedition-map-landmark-card is-${landmark.cardAlign || "center"}`}
                  >
                    {landmark.name}
                  </span>
                )}
              </button>

              {passed && showMapOnly && isActive && (
                <div
                  className={`expedition-map-landmark-story ${storyVertical} is-${landmark.cardAlign || "center"}`}
                  role="dialog"
                  aria-label={`${landmark.name} story`}
                >
                  <button
                    type="button"
                    className="expedition-map-landmark-story-close"
                    aria-label={`Close ${landmark.name} story`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveLandmarkId(null);
                    }}
                  >
                    ×
                  </button>
                  <small>{landmark.location} · {landmark.year}</small>
                  <strong>{landmark.name}</strong>
                  <p>{landmark.story}</p>
                </div>
              )}
            </div>
          );
        })}

        <div
          className="expedition-map-vehicle-position"
          style={{ left: `${vehiclePose.x}%`, top: `${vehiclePose.y}%` }}
        >
          <span className="expedition-map-vehicle-glow" />
          <img
            src={EXPEDITION_TOP_VEHICLE}
            alt=""
            draggable={false}
            className="expedition-map-vehicle"
            style={{ transform: `rotate(${vehiclePose.angle}deg)` }}
          />
          <span className="expedition-map-vehicle-distance">{formatDistance(metres)}</span>
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
              onClick={() => { setActiveLandmarkId(null); setShowMapOnly(true); }}
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

        .expedition-map-unreached-area {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          z-index: 5;
          background: linear-gradient(90deg, rgba(1, 6, 18, 0.28) 0%, rgba(1, 6, 18, 0.74) 4%, rgba(1, 6, 18, 0.82) 100%);
          box-shadow: -18px 0 28px rgba(1, 6, 18, 0.32);
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

        .expedition-map-landmark.is-passed {
          z-index: 8;
        }

        .expedition-map-landmark-trigger {
          position: relative;
          display: grid;
          place-items: center;
          border: 0;
          background: transparent;
          padding: 0;
          color: inherit;
          pointer-events: none;
        }

        .is-map-only .expedition-map-landmark.is-passed .expedition-map-landmark-trigger {
          pointer-events: auto;
          cursor: pointer;
        }

        .expedition-map-landmark-trigger:disabled {
          cursor: default;
        }

        .expedition-map-landmark-trigger:focus-visible {
          outline: 2px solid #9bf5ff;
          outline-offset: 4px;
          border-radius: 999px;
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

        .expedition-map-landmark-story {
          position: absolute;
          z-index: 24;
          left: 50%;
          width: clamp(190px, 19vw, 270px);
          transform: translateX(-50%);
          border: 1px solid rgba(255,209,138,0.34);
          border-radius: 14px;
          background: linear-gradient(150deg, rgba(5,18,40,0.98), rgba(4,12,29,0.96));
          padding: 13px 14px 12px;
          color: white;
          box-shadow: 0 18px 44px rgba(0,0,0,0.42), 0 0 24px rgba(255,209,138,0.08);
          text-align: left;
          backdrop-filter: blur(14px);
          animation: expeditionLandmarkStoryIn 180ms ease-out both;
          pointer-events: auto;
        }

        .expedition-map-landmark-story.is-below {
          top: calc(100% + 38px);
        }

        .expedition-map-landmark-story.is-above {
          bottom: calc(100% + 20px);
        }

        .expedition-map-landmark-story.is-left {
          left: -4px;
          transform: none;
        }

        .expedition-map-landmark-story.is-right {
          right: -4px;
          left: auto;
          transform: none;
        }

        .expedition-map-landmark-story small {
          display: block;
          padding-right: 26px;
          color: #9bf5ff;
          font-size: clamp(7px, 0.65vw, 9px);
          font-weight: 900;
          letter-spacing: 0.07em;
          line-height: 1.35;
          text-transform: uppercase;
        }

        .expedition-map-landmark-story strong {
          display: block;
          margin-top: 4px;
          padding-right: 24px;
          color: #ffd18a;
          font-size: clamp(11px, 1vw, 14px);
          font-weight: 950;
          line-height: 1.2;
        }

        .expedition-map-landmark-story p {
          margin: 8px 0 0;
          color: rgba(255,255,255,0.72);
          font-size: clamp(9px, 0.82vw, 11px);
          font-weight: 650;
          line-height: 1.48;
        }

        .expedition-map-landmark-story-close {
          position: absolute;
          top: 7px;
          right: 7px;
          display: grid;
          width: 26px;
          height: 26px;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.78);
          font-size: 17px;
          line-height: 1;
          cursor: pointer;
        }

        .expedition-map-landmark-story-close:hover,
        .expedition-map-landmark-story-close:focus-visible {
          border-color: rgba(255,209,138,0.52);
          color: #ffd18a;
          outline: none;
        }

        .expedition-map-vehicle-position {
          position: absolute;
          z-index: 6;
          width: clamp(64px, 8vw, 130px);
          transform: translate(-50%, -50%);
          transition: left 900ms ease, top 900ms ease;
          animation: expeditionMapVehicleArrive 650ms ease-out 450ms both;
        }

        .expedition-map-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 10px 14px rgba(0,0,0,0.42));
          user-select: none;
          transform-origin: 50% 55%;
          transition: transform 700ms cubic-bezier(.2,.75,.25,1);
        }

        .expedition-map-vehicle-distance {
          position: absolute;
          top: calc(100% + 3px);
          left: 50%;
          z-index: 4;
          min-width: max-content;
          transform: translateX(-50%);
          border: 1px solid rgba(255,209,138,0.34);
          border-radius: 999px;
          background: rgba(4,14,32,0.92);
          padding: 4px 8px;
          color: #ffd18a;
          box-shadow: 0 7px 18px rgba(0,0,0,0.30);
          font-size: clamp(7px, 0.72vw, 10px);
          font-weight: 950;
          line-height: 1;
          white-space: nowrap;
          backdrop-filter: blur(8px);
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

        @keyframes expeditionLandmarkStoryIn {
          from { opacity: 0; margin-top: 5px; }
          to { opacity: 1; margin-top: 0; }
        }

        @keyframes expeditionCompleteHudIn {
          from { opacity: 0; transform: translate(-50%, -44%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -48%) scale(1); }
        }

        @keyframes expeditionMapVehicleArrive {
          from { opacity: 0; transform: translate(-50%, calc(-50% + 8px)) scale(0.86); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
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

          .expedition-map-landmark-story {
            width: min(220px, 34vw);
            padding: 10px 11px;
          }

          .expedition-map-landmark-story p {
            font-size: 8px;
            line-height: 1.4;
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
