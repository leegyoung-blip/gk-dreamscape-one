"use client";

import type { CSSProperties } from "react";
import { EXPEDITION_METRES_PER_POINT, MAX_EXPEDITION_METRES, getExpeditionPose } from "./expeditionLandmarks";
import type { MultiplayerExpeditionPlayer } from "./multiplayerExpedition";
import { getMultiplayerVehicleVariant, shortenMultiplayerName } from "./multiplayerExpedition";

type MultiplayerRaceMapProps = {
  players: MultiplayerExpeditionPlayer[];
  currentUserId: string | null;
  currentDisplayPoints?: number;
};

const MAP_IMAGE = "/milo-world/activities/categories/expedition/world-map.png";

function clampMetres(points: number) {
  return Math.min(MAX_EXPEDITION_METRES, Math.max(0, points * EXPEDITION_METRES_PER_POINT));
}

export default function MultiplayerRaceMap({
  players,
  currentUserId,
  currentDisplayPoints,
}: MultiplayerRaceMapProps) {
  const resolvedPlayers = players.map((player) => ({
    ...player,
    points:
      currentUserId && player.userId === currentUserId && currentDisplayPoints !== undefined
        ? currentDisplayPoints
        : player.points,
  }));

  return (
    <aside className="multiplayer-race-map" aria-label="Live multiplayer expedition map">
      <img src={MAP_IMAGE} alt="" draggable={false} className="multiplayer-race-map-image" />
      <div className="multiplayer-race-map-shade" />
      <div className="multiplayer-race-map-title">
        <strong>Live Expedition</strong>
        <span>{players.length} player{players.length === 1 ? "" : "s"}</span>
      </div>

      {resolvedPlayers.map((player) => {
        const variant = getMultiplayerVehicleVariant(player.userId);
        const pose = getExpeditionPose(clampMetres(player.points));
        const isYou = player.userId === currentUserId;

        return (
          <div
            key={player.userId}
            className={`multiplayer-race-player ${isYou ? "is-you" : ""}`}
            style={{
              left: `${pose.x}%`,
              top: `${pose.y}%`,
              "--player-color": variant.color,
              "--player-soft": variant.softColor,
            } as CSSProperties}
          >
            <span className="multiplayer-race-player-glow" />
            <img
              src={variant.topAsset}
              alt=""
              draggable={false}
              className="multiplayer-race-player-vehicle"
              style={{ transform: `rotate(${pose.angle}deg)` }}
            />
            <span className="multiplayer-race-player-label">
              {isYou ? "YOU" : shortenMultiplayerName(player.displayName, 9)}
            </span>
          </div>
        );
      })}

      <style jsx>{`
        .multiplayer-race-map {
          position: absolute;
          right: 18px;
          bottom: 14px;
          z-index: 10;
          width: clamp(250px, 24vw, 390px);
          aspect-ratio: 16 / 8.7;
          overflow: hidden;
          border: 1px solid rgba(155,245,255,0.22);
          border-radius: 18px;
          background: #031023;
          box-shadow: 0 16px 40px rgba(0,0,0,0.32);
          pointer-events: none;
        }

        .multiplayer-race-map-image,
        .multiplayer-race-map-shade {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .multiplayer-race-map-image {
          object-fit: cover;
          opacity: 0.88;
        }

        .multiplayer-race-map-shade {
          background: linear-gradient(180deg, rgba(1,7,20,0.18), rgba(1,7,20,0.12) 54%, rgba(1,7,20,0.42));
        }

        .multiplayer-race-map-title {
          position: absolute;
          top: 8px;
          left: 9px;
          z-index: 4;
          display: flex;
          align-items: baseline;
          gap: 7px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 999px;
          background: rgba(3,12,28,0.76);
          padding: 4px 8px;
          backdrop-filter: blur(9px);
        }

        .multiplayer-race-map-title strong {
          color: #ffd18a;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .multiplayer-race-map-title span {
          color: rgba(255,255,255,0.48);
          font-size: 7px;
          font-weight: 800;
        }

        .multiplayer-race-player {
          position: absolute;
          z-index: 3;
          width: clamp(25px, 3.2vw, 48px);
          transform: translate(-50%, -50%);
          transition: left 900ms cubic-bezier(.18,.78,.22,1), top 900ms cubic-bezier(.18,.78,.22,1);
        }

        .multiplayer-race-player-glow {
          position: absolute;
          inset: 16% 8%;
          z-index: 0;
          border: 2px solid var(--player-color);
          border-radius: 999px;
          background: var(--player-soft);
          box-shadow: 0 0 18px var(--player-color);
        }

        .multiplayer-race-player.is-you .multiplayer-race-player-glow {
          inset: 9% 1%;
          border-width: 3px;
          box-shadow: 0 0 24px var(--player-color);
        }

        .multiplayer-race-player-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 3px 3px rgba(0,0,0,0.48));
          transform-origin: 50% 50%;
          transition: transform 400ms ease;
        }

        .multiplayer-race-player-label {
          position: absolute;
          top: calc(100% - 1px);
          left: 50%;
          z-index: 5;
          transform: translateX(-50%);
          border: 1px solid var(--player-color);
          border-radius: 999px;
          background: rgba(2,9,23,0.92);
          padding: 2px 5px;
          color: white;
          font-size: 6px;
          font-weight: 950;
          letter-spacing: 0.05em;
          white-space: nowrap;
          box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        }

        .multiplayer-race-player.is-you .multiplayer-race-player-label {
          color: var(--player-color);
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .multiplayer-race-map {
            right: 8px;
            bottom: 52px;
            width: min(30vw, 240px);
            border-radius: 12px;
          }

          .multiplayer-race-map-title {
            top: 5px;
            left: 5px;
            padding: 3px 6px;
          }

          .multiplayer-race-map-title span {
            display: none;
          }

          .multiplayer-race-player {
            width: clamp(20px, 3.6vw, 34px);
          }

          .multiplayer-race-player-label {
            font-size: 5px;
            padding: 1px 4px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .multiplayer-race-player,
          .multiplayer-race-player-vehicle {
            transition: none;
          }
        }
      `}</style>
    </aside>
  );
}
