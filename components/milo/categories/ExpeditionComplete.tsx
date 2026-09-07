"use client";

import { useMemo, useState } from "react";

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
const TOTAL_LANDMARKS = 9;
const LANDMARK_THRESHOLDS_METRES = [800, 1800, 2800, 3800, 4800, 5800, 6800, 7800, 8800] as const;

// These two assets are intentionally the next art step.
// Until they are added, the map uses world-01 as a visual fallback and a glowing marker
// stands in for the top-view Milo vehicle.
const EXPEDITION_MAP_IMAGE =
  "/milo-world/activities/categories/expedition/world-map.png";
const EXPEDITION_MAP_FALLBACK =
  "/milo-world/activities/categories/expedition/world-01.png";
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
  const [topVehicleLoaded, setTopVehicleLoaded] = useState(false);

  const metres = Math.max(0, points * EXPEDITION_METRES_PER_POINT);
  const progress = Math.min(Math.max(points / MAX_EXPEDITION_POINTS, 0), 1);
  const landmarksCovered = useMemo(
    () => LANDMARK_THRESHOLDS_METRES.filter((threshold) => metres >= threshold).length,
    [metres],
  );

  // Temporary generic route placement. Once the final top-view map is drawn,
  // these can be swapped for landmark/path coordinates that match the artwork exactly.
  const mapVehicleLeft = 12 + progress * 76;
  const mapVehicleTop = 70 - Math.sin(progress * Math.PI) * 25;

  return (
    <div className="expedition-complete-root">
      <div className="expedition-map-camera" aria-hidden="true">
        <div
          className="expedition-map-image"
          style={{
            backgroundImage: `url('${EXPEDITION_MAP_IMAGE}'), url('${EXPEDITION_MAP_FALLBACK}')`,
          }}
        />
        <div className="expedition-map-shade" />

        <div
          className="expedition-map-vehicle-position"
          style={{
            left: `${mapVehicleLeft}%`,
            top: `${mapVehicleTop}%`,
          }}
        >
          {!topVehicleLoaded && <span className="expedition-map-fallback-marker" />}
          <img
            src={EXPEDITION_TOP_VEHICLE}
            alt=""
            draggable={false}
            onLoad={() => setTopVehicleLoaded(true)}
            onError={() => setTopVehicleLoaded(false)}
            className={`expedition-map-vehicle ${topVehicleLoaded ? "is-loaded" : ""}`}
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
            <span>⌖</span>
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

        .expedition-map-camera {
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
          transform-origin: 50% 50%;
          animation: expeditionMapReveal 1.45s cubic-bezier(.18,.78,.22,1) forwards;
        }

        .expedition-map-image {
          position: absolute;
          inset: -4%;
          background-color: #061936;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }

        .expedition-map-shade {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(circle at 50% 52%, transparent 0 28%, rgba(1,6,18,0.18) 66%, rgba(1,6,18,0.62) 100%),
            linear-gradient(180deg, rgba(2,8,23,0.12), rgba(2,8,23,0.46));
        }

        .expedition-map-vehicle-position {
          position: absolute;
          z-index: 2;
          width: clamp(58px, 7vw, 112px);
          transform: translate(-50%, -50%);
          transition: left 900ms ease, top 900ms ease;
        }

        .expedition-map-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          opacity: 0;
          filter: drop-shadow(0 10px 14px rgba(0,0,0,0.38));
          user-select: none;
        }

        .expedition-map-vehicle.is-loaded {
          opacity: 1;
          animation: expeditionMapVehicleArrive 650ms ease-out 500ms both;
        }

        .expedition-map-fallback-marker {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 24px;
          height: 24px;
          transform: translate(-50%, -50%);
          border: 4px solid #ffd18a;
          border-radius: 999px;
          background: #0a1c37;
          box-shadow: 0 0 0 6px rgba(255,209,138,0.16), 0 0 32px rgba(255,209,138,0.68);
          animation: expeditionMapMarkerPulse 900ms ease-in-out infinite alternate;
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
          background: linear-gradient(145deg, rgba(4,16,37,0.88), rgba(5,12,28,0.76));
          padding: clamp(22px, 3vw, 38px);
          box-shadow: 0 30px 90px rgba(0,0,0,0.46), 0 0 44px rgba(83,215,255,0.08);
          text-align: center;
          backdrop-filter: blur(18px);
          animation: expeditionCompleteHudIn 700ms ease-out 850ms both;
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
          border-color: rgba(255,209,138,0.26);
          background: rgba(255,209,138,0.08);
        }

        .expedition-complete-metrics small {
          color: rgba(255,255,255,0.40);
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.11em;
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
          font-size: 0.54em;
        }

        .expedition-complete-route {
          position: relative;
          height: 34px;
          margin: 18px 4px 0;
        }

        .expedition-complete-route-base,
        .expedition-complete-route-progress {
          position: absolute;
          top: 50%;
          left: 0;
          height: 3px;
          transform: translateY(-50%);
          border-radius: 999px;
        }

        .expedition-complete-route-base {
          width: 100%;
          background: rgba(255,255,255,0.10);
        }

        .expedition-complete-route-progress {
          background: linear-gradient(90deg, #ffd18a, #9bf5ff);
          box-shadow: 0 0 16px rgba(155,245,255,0.26);
        }

        .expedition-complete-route-marker {
          position: absolute;
          top: 50%;
          transform: translate(-50%, -50%);
        }

        .expedition-complete-route-marker span {
          display: grid;
          width: 30px;
          height: 30px;
          place-items: center;
          border: 1px solid rgba(255,209,138,0.46);
          border-radius: 999px;
          background: #07162c;
          color: #ffd18a;
          box-shadow: 0 0 18px rgba(255,209,138,0.24);
          font-size: 14px;
        }

        .expedition-complete-button {
          width: min(420px, 100%);
          min-height: 48px;
          margin-top: 10px;
          border: 1px solid rgba(255,209,138,0.45);
          border-radius: 14px;
          background: linear-gradient(90deg, #c47a25, #e5b75e);
          padding: 12px 18px;
          color: white;
          font-size: 11px;
          font-weight: 950;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          box-shadow: 0 16px 36px rgba(196,122,37,0.22);
          cursor: pointer;
        }

        .expedition-complete-button:disabled {
          cursor: wait;
          opacity: 0.55;
        }

        @keyframes expeditionMapReveal {
          from { transform: scale(1.22); filter: blur(1px); }
          to { transform: scale(1); filter: blur(0); }
        }

        @keyframes expeditionMapVehicleArrive {
          from { transform: scale(0.75); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes expeditionMapMarkerPulse {
          from { transform: translate(-50%, -50%) scale(0.92); }
          to { transform: translate(-50%, -50%) scale(1.08); }
        }

        @keyframes expeditionCompleteHudIn {
          from { opacity: 0; transform: translate(-50%, -43%) scale(0.96); }
          to { opacity: 1; transform: translate(-50%, -48%) scale(1); }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .expedition-complete-hud {
            width: min(690px, calc(100vw - 24px));
            border-radius: 20px;
            padding: 16px 18px;
          }

          .expedition-complete-hud h1 {
            font-size: clamp(30px, 5vw, 46px);
          }

          .expedition-complete-copy {
            display: none;
          }

          .expedition-complete-metrics {
            margin-top: 12px;
          }

          .expedition-complete-metrics > div {
            padding: 10px 8px;
          }

          .expedition-complete-route {
            margin-top: 10px;
          }

          .expedition-complete-button {
            min-height: 40px;
            margin-top: 4px;
            padding: 8px 14px;
            font-size: 9px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .expedition-map-camera,
          .expedition-map-vehicle,
          .expedition-map-fallback-marker,
          .expedition-complete-hud {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
