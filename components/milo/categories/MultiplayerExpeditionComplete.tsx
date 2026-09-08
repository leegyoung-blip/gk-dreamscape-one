"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import {
  EXPEDITION_LANDMARKS,
  EXPEDITION_METRES_PER_POINT,
  EXPEDITION_ROUTE_POINTS,
  MAX_EXPEDITION_METRES,
  getExpeditionPose,
} from "./expeditionLandmarks";
import type { MultiplayerExpeditionPlayer } from "./multiplayerExpedition";
import { getMultiplayerVehicleVariant, shortenMultiplayerName } from "./multiplayerExpedition";

type MultiplayerExpeditionCompleteProps = {
  category: string;
  players: MultiplayerExpeditionPlayer[];
  currentUserId: string | null;
  isHost: boolean;
  lobbyFinished: boolean;
  onEndLobby: () => void;
  onChooseNewTopic: () => void;
  onLeaveLobby: () => void;
  onBackToLobby: () => void;
};

const MAP_IMAGE = "/milo-world/activities/categories/expedition/world-map.png";

function formatDistance(metres: number) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

function pointsToMetres(points: number) {
  return Math.min(MAX_EXPEDITION_METRES, Math.max(0, points * EXPEDITION_METRES_PER_POINT));
}

export default function MultiplayerExpeditionComplete({
  category,
  players,
  currentUserId,
  isHost,
  lobbyFinished,
  onEndLobby,
  onChooseNewTopic,
  onLeaveLobby,
  onBackToLobby,
}: MultiplayerExpeditionCompleteProps) {
  const [resultsOpen, setResultsOpen] = useState(true);
  const rankedPlayers = useMemo(
    () => [...players].sort((a, b) => b.points - a.points || b.score - a.score),
    [players],
  );
  const leader = rankedPlayers[0] || null;
  const leaderMetres = leader ? pointsToMetres(leader.points) : 0;
  const leaderPose = getExpeditionPose(leaderMetres);
  const leaderProgress = Math.min(1, Math.max(0, leaderMetres / MAX_EXPEDITION_METRES));
  const routePoints = EXPEDITION_ROUTE_POINTS.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="multiplayer-complete-root">
      <div className="multiplayer-complete-map" aria-label="Multiplayer expedition results map">
        <img src={MAP_IMAGE} alt="" draggable={false} className="multiplayer-complete-map-image" />
        <div className="multiplayer-complete-map-vignette" />
        <div
          className="multiplayer-complete-unreached"
          style={{ left: `${Math.min(100, Math.max(0, leaderPose.x))}%` }}
        />

        <svg className="multiplayer-complete-route" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline
            points={routePoints}
            fill="none"
            stroke="rgba(2,8,23,0.76)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <polyline
            points={routePoints}
            pathLength="100"
            fill="none"
            stroke="rgba(255,209,138,0.92)"
            strokeWidth="0.44"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={`${leaderProgress * 100} ${100 - leaderProgress * 100}`}
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        {EXPEDITION_LANDMARKS.map((landmark) => {
          const reachedByLeader = leaderMetres >= landmark.thresholdMetres;
          return (
            <div
              key={landmark.id}
              className={`multiplayer-complete-landmark ${reachedByLeader ? "is-reached" : "is-future"}`}
              style={{ left: `${landmark.mapX}%`, top: `${landmark.mapY}%` }}
              aria-hidden="true"
            >
              <span />
            </div>
          );
        })}

        {rankedPlayers.map((player, rankIndex) => {
          const metres = pointsToMetres(player.points);
          const pose = getExpeditionPose(metres);
          const variant = getMultiplayerVehicleVariant(player.userId);
          const isYou = player.userId === currentUserId;

          return (
            <div
              key={player.userId}
              className={`multiplayer-complete-player ${isYou ? "is-you" : ""}`}
              style={{
                left: `${pose.x}%`,
                top: `${pose.y}%`,
                "--player-color": variant.color,
                "--player-soft": variant.softColor,
                "--rank-z": String(20 + rankedPlayers.length - rankIndex),
              } as CSSProperties}
            >
              <span className="multiplayer-complete-player-glow" />
              <img
                src={variant.topAsset}
                alt=""
                draggable={false}
                className="multiplayer-complete-player-vehicle"
                style={{ transform: `rotate(${pose.angle}deg)` }}
              />
              <div className="multiplayer-complete-player-card">
                <strong>{isYou ? "YOU" : shortenMultiplayerName(player.displayName, 12)}</strong>
                <span>{formatDistance(metres)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {resultsOpen ? (
        <section className="multiplayer-complete-panel">
          <button
            type="button"
            className="multiplayer-complete-close"
            onClick={() => setResultsOpen(false)}
            aria-label="Close results and view the map"
          >
            ×
          </button>
          <div className="multiplayer-complete-heading">
          <div>
            <p>{category} · Multiplayer Expedition</p>
            <h1>Expedition Results</h1>
          </div>
          {leader && (
            <div className="multiplayer-complete-winner">
              <small>Leader</small>
              <strong>{leader.userId === currentUserId ? "You" : leader.displayName}</strong>
              <span>{formatDistance(leaderMetres)}</span>
            </div>
          )}
        </div>

        <div className="multiplayer-complete-leaderboard">
          {rankedPlayers.map((player, index) => {
            const variant = getMultiplayerVehicleVariant(player.userId);
            const isYou = player.userId === currentUserId;
            return (
              <div
                key={player.userId}
                className={isYou ? "is-you" : ""}
                style={{ "--player-color": variant.color } as CSSProperties}
              >
                <span className="multiplayer-complete-rank">#{index + 1}</span>
                <span className="multiplayer-complete-color-dot" />
                <p>
                  <strong>{isYou ? `${player.displayName} · You` : player.displayName}</strong>
                  <small>{player.score}/10 correct</small>
                </p>
                <b>{formatDistance(pointsToMetres(player.points))}</b>
              </div>
            );
          })}
        </div>

          <div className="multiplayer-complete-actions">
            {isHost ? (
              <>
                <button type="button" className="is-secondary" onClick={onEndLobby}>
                  End Lobby
                </button>
                <button type="button" className="is-primary" onClick={onChooseNewTopic} disabled={lobbyFinished}>
                  Choose New Topic
                </button>
              </>
            ) : (
              <>
                <button type="button" className="is-secondary" onClick={onLeaveLobby}>
                  Leave Lobby
                </button>
                <button type="button" className="is-primary" onClick={onBackToLobby}>
                  Back to Lobby
                </button>
              </>
            )}
          </div>
        </section>
      ) : (
        <button
          type="button"
          className="multiplayer-complete-show-results"
          onClick={() => setResultsOpen(true)}
        >
          Show Results
        </button>
      )}

      <style jsx>{`
        .multiplayer-complete-root {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
          isolation: isolate;
          background: #020817;
          color: white;
        }

        .multiplayer-complete-map {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .multiplayer-complete-map-image,
        .multiplayer-complete-map-vignette,
        .multiplayer-complete-unreached,
        .multiplayer-complete-route {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .multiplayer-complete-map-image {
          object-fit: cover;
        }

        .multiplayer-complete-map-vignette {
          background: radial-gradient(circle at 50% 45%, transparent 10%, rgba(1,6,18,0.10) 55%, rgba(1,6,18,0.58) 100%);
          pointer-events: none;
        }

        .multiplayer-complete-unreached {
          right: 0;
          width: auto;
          background: linear-gradient(90deg, rgba(1,6,18,0.42), rgba(1,6,18,0.78) 7%, rgba(1,6,18,0.90) 100%);
          backdrop-filter: saturate(0.35) brightness(0.45);
          pointer-events: none;
          z-index: 4;
        }

        .multiplayer-complete-route {
          z-index: 5;
          pointer-events: none;
        }

        .multiplayer-complete-landmark {
          position: absolute;
          z-index: 6;
          transform: translate(-50%, -50%);
        }

        .multiplayer-complete-landmark span {
          display: block;
          width: 9px;
          height: 9px;
          border: 2px solid rgba(255,209,138,0.92);
          border-radius: 999px;
          background: rgba(3,12,28,0.9);
          box-shadow: 0 0 12px rgba(255,209,138,0.32);
        }

        .multiplayer-complete-landmark.is-future {
          opacity: 0.24;
        }

        .multiplayer-complete-player {
          position: absolute;
          z-index: var(--rank-z);
          width: clamp(54px, 6.4vw, 104px);
          transform: translate(-50%, -50%);
          pointer-events: none;
          transition: left 1050ms cubic-bezier(.18,.78,.22,1), top 1050ms cubic-bezier(.18,.78,.22,1);
          will-change: left, top;
        }

        .multiplayer-complete-player-glow {
          position: absolute;
          inset: 16% 7%;
          z-index: 0;
          border: 3px solid var(--player-color);
          border-radius: 999px;
          background: var(--player-soft);
          box-shadow: 0 0 28px var(--player-color);
        }

        .multiplayer-complete-player.is-you .multiplayer-complete-player-glow {
          inset: 9% 0;
          border-width: 4px;
        }

        .multiplayer-complete-player-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 7px 7px rgba(0,0,0,0.48));
        }

        .multiplayer-complete-player-card {
          position: absolute;
          top: 88%;
          left: 50%;
          z-index: 4;
          display: grid;
          min-width: max-content;
          transform: translateX(-50%);
          border: 1px solid var(--player-color);
          border-radius: 10px;
          background: rgba(2,9,23,0.94);
          padding: 4px 7px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.34);
          text-align: center;
        }

        .multiplayer-complete-player-card strong {
          color: var(--player-color);
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.05em;
        }

        .multiplayer-complete-player-card span {
          margin-top: 1px;
          color: rgba(255,255,255,0.72);
          font-size: 7px;
          font-weight: 850;
        }

        .multiplayer-complete-panel {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 40;
          display: grid;
          width: min(720px, calc(100vw - 40px));
          max-height: min(78%, 620px);
          transform: translate(-50%, -50%);
          overflow: hidden;
          border: 1px solid rgba(155,245,255,0.22);
          border-radius: 24px;
          background: linear-gradient(145deg, rgba(3,14,34,0.91), rgba(2,8,23,0.84));
          padding: 20px;
          box-shadow: 0 26px 80px rgba(0,0,0,0.48);
          backdrop-filter: blur(18px);
        }

        .multiplayer-complete-close {
          position: absolute;
          top: 12px;
          right: 12px;
          z-index: 4;
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(255,255,255,0.16);
          border-radius: 999px;
          background: rgba(2,9,23,0.88);
          color: rgba(255,255,255,0.78);
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .multiplayer-complete-close:hover {
          border-color: rgba(255,209,138,0.48);
          color: #ffd18a;
        }

        .multiplayer-complete-show-results {
          position: absolute;
          right: 18px;
          top: 18px;
          z-index: 50;
          min-height: 40px;
          border: 1px solid rgba(255,209,138,0.38);
          border-radius: 999px;
          background: rgba(2,9,23,0.90);
          padding: 8px 14px;
          color: #ffd18a;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: .08em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 28px rgba(0,0,0,.3);
          backdrop-filter: blur(10px);
        }

        .multiplayer-complete-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }

        .multiplayer-complete-heading p {
          margin: 0;
          color: #ffd18a;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .multiplayer-complete-heading h1 {
          margin: 5px 0 0;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(30px, 5vw, 48px);
          font-weight: 400;
          line-height: 1;
        }

        .multiplayer-complete-winner {
          display: grid;
          min-width: 150px;
          justify-items: end;
          border-left: 1px solid rgba(255,255,255,0.10);
          padding-left: 16px;
        }

        .multiplayer-complete-winner small {
          color: rgba(255,255,255,0.40);
          font-size: 8px;
          font-weight: 850;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .multiplayer-complete-winner strong {
          margin-top: 2px;
          font-size: 15px;
          font-weight: 950;
        }

        .multiplayer-complete-winner span {
          margin-top: 1px;
          color: #ffd18a;
          font-size: 22px;
          font-weight: 950;
        }

        .multiplayer-complete-leaderboard {
          display: grid;
          min-height: 0;
          gap: 6px;
          margin-top: 16px;
          overflow-y: auto;
          scrollbar-width: thin;
        }

        .multiplayer-complete-leaderboard > div {
          display: grid;
          grid-template-columns: 34px 12px minmax(0, 1fr) auto;
          align-items: center;
          gap: 9px;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 13px;
          background: rgba(255,255,255,0.045);
          padding: 9px 11px;
        }

        .multiplayer-complete-leaderboard > div.is-you {
          border-color: var(--player-color);
          background: rgba(255,255,255,0.075);
        }

        .multiplayer-complete-rank {
          color: rgba(255,255,255,0.48);
          font-size: 11px;
          font-weight: 950;
        }

        .multiplayer-complete-color-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          background: var(--player-color);
          box-shadow: 0 0 10px var(--player-color);
        }

        .multiplayer-complete-leaderboard p {
          display: grid;
          min-width: 0;
          gap: 1px;
          margin: 0;
        }

        .multiplayer-complete-leaderboard p strong {
          overflow: hidden;
          font-size: 11px;
          font-weight: 900;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .multiplayer-complete-leaderboard p small {
          color: rgba(255,255,255,0.42);
          font-size: 8px;
        }

        .multiplayer-complete-leaderboard b {
          color: #ffd18a;
          font-size: 13px;
          font-weight: 950;
        }

        .multiplayer-complete-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
          margin-top: 14px;
        }

        .multiplayer-complete-actions button {
          min-height: 42px;
          border-radius: 12px;
          padding: 9px 12px;
          font-size: 9px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .multiplayer-complete-actions .is-secondary {
          border: 1px solid rgba(255,209,138,0.28);
          background: rgba(255,209,138,0.08);
          color: #ffd18a;
        }

        .multiplayer-complete-actions button:disabled {
          cursor: not-allowed;
          opacity: .42;
        }

        .multiplayer-complete-actions .is-primary {
          border: 1px solid rgba(255,209,138,0.42);
          background: linear-gradient(90deg, #c47a25, #e5b75e);
          color: white;
        }

        @media (prefers-reduced-motion: reduce) {
          .multiplayer-complete-player {
            transition: none;
          }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .multiplayer-complete-panel {
            width: min(620px, calc(100vw - 24px));
            max-height: 84%;
            border-radius: 18px;
            padding: 12px;
          }

          .multiplayer-complete-heading h1 {
            font-size: 27px;
          }

          .multiplayer-complete-winner span {
            font-size: 17px;
          }

          .multiplayer-complete-leaderboard {
            margin-top: 9px;
            gap: 4px;
          }

          .multiplayer-complete-leaderboard > div {
            padding: 6px 8px;
          }

          .multiplayer-complete-actions {
            margin-top: 8px;
          }

          .multiplayer-complete-player {
            width: clamp(38px, 6vw, 68px);
          }
        }
      `}</style>
    </div>
  );
}
