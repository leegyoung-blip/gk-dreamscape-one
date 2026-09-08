"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  EXPEDITION_LANDMARKS,
  EXPEDITION_METRES_PER_POINT,
  MAX_EXPEDITION_POINTS,
} from "./expeditionLandmarks";
import MultiplayerRaceMap from "./MultiplayerRaceMap";
import type { MultiplayerExpeditionPlayer } from "./multiplayerExpedition";
import { getMultiplayerVehicleVariant } from "./multiplayerExpedition";

type AnswerLetter = "A" | "B" | "C" | "D";

type ExpeditionQuestion = {
  id: string;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: AnswerLetter;
  explanation: string | null;
};

type ExpeditionMotion = "idle" | "cruise" | "boost" | "turbo" | "stall";
type ExpeditionTravelPhase = "idle" | "driving" | "coasting";
type MobileAnswerPhase = "question" | "travel";

type ExpeditionQuizProps = {
  category: string;
  playStyleLabel: string;
  question: ExpeditionQuestion;
  questionNumber: number;
  questionCount?: number;
  score: number;
  points: number;
  lastPoints: number;
  timerSeconds: 10 | 20;
  countdown: number;
  nextCountdown: number;
  nextDelaySeconds?: number;
  stage: "playing" | "answered";
  selectedAnswer: AnswerLetter | null;
  hiddenOptions: AnswerLetter[];
  message?: string;
  isGuest: boolean;
  guestHintUsed: boolean;
  canPause: boolean;
  paused: boolean;
  mobileSequencing: boolean;
  racePlayers?: MultiplayerExpeditionPlayer[];
  currentPlayerId?: string | null;
  vehicleBodyAsset?: string;
  waitingForPlayers?: number | null;
  onTogglePause: () => void;
  onAnswer: (answer: AnswerLetter) => void;
  onHint: () => void;
  onNext: () => void;
};

const WORLD_CYCLE_WIDTH_VH = 900;
const WORLD_SCENES = [
  {
    src: "/milo-world/activities/categories/expedition/world-01.png",
    roadOffsetPercent: 0,
  },
  {
    src: "/milo-world/activities/categories/expedition/world-02.png",
    roadOffsetPercent: 5.6,
  },
  {
    src: "/milo-world/activities/categories/expedition/world-03.png",
    roadOffsetPercent: 8.2,
  },
] as const;

const EXPEDITION_EFFECTS = {
  cruiseDust: "/milo-world/activities/categories/expedition/effects/cruise-dust.png",
  boostTrail: "/milo-world/activities/categories/expedition/effects/boost-trail.png",
  turboTrail: "/milo-world/activities/categories/expedition/effects/turbo-trail.png",
  stallSmoke: "/milo-world/activities/categories/expedition/effects/stall-smoke.png",
  turboBurst: "/milo-world/activities/categories/expedition/effects/turbo-burst.png",
  wheelDust: "/milo-world/activities/categories/expedition/effects/wheel-dust.png",
  correctSpark: "/milo-world/activities/categories/expedition/effects/correct-spark.png",
  wrongSputter: "/milo-world/activities/categories/expedition/effects/wrong-sputter.png",
} as const;

const DEFAULT_SIDE_VEHICLE = "/milo-world/activities/categories/expedition/vehicles/vehicle-body-blue.png";

function getExpeditionMotion(points: number): ExpeditionMotion {
  if (points <= 0) return "stall";
  if (points >= 80) return "turbo";
  if (points >= 45) return "boost";
  return "cruise";
}

function formatDistance(metres: number) {
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(2)} km`;
}

function getMotionLabel(motion: ExpeditionMotion) {
  if (motion === "turbo") return "TURBO!";
  if (motion === "boost") return "BOOST!";
  if (motion === "cruise") return "CRUISE";
  if (motion === "stall") return "ENGINE STALLED";
  return "READY";
}

function getOptionText(question: ExpeditionQuestion, letter: AnswerLetter) {
  if (letter === "A") return question.option_a;
  if (letter === "B") return question.option_b;
  if (letter === "C") return question.option_c;
  return question.option_d;
}

export default function ExpeditionQuiz({
  category,
  playStyleLabel,
  question,
  questionNumber,
  questionCount = 10,
  score,
  points,
  lastPoints,
  timerSeconds,
  countdown,
  nextCountdown,
  nextDelaySeconds = 5,
  stage,
  selectedAnswer,
  hiddenOptions,
  message,
  isGuest,
  guestHintUsed,
  canPause,
  paused,
  mobileSequencing,
  racePlayers = [],
  currentPlayerId = null,
  vehicleBodyAsset,
  waitingForPlayers = null,
  onTogglePause,
  onAnswer,
  onHint,
  onNext,
}: ExpeditionQuizProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const [travelPhase, setTravelPhase] = useState<ExpeditionTravelPhase>("idle");
  const [mobileAnswerPhase, setMobileAnswerPhase] = useState<MobileAnswerPhase>("question");
  const displayPointsRef = useRef(points);
  const travelPhaseRef = useRef<ExpeditionTravelPhase>("idle");
  const animationFrameRef = useRef<number | null>(null);
  const onNextRef = useRef(onNext);
  const motion = stage === "answered" ? getExpeditionMotion(lastPoints) : "idle";
  const isCorrect = selectedAnswer === question.correct_option;
  const currentPlayerVariant = currentPlayerId
    ? getMultiplayerVehicleVariant(currentPlayerId)
    : null;
  const currentVehicleBodyAsset = vehicleBodyAsset || currentPlayerVariant?.sideAsset || DEFAULT_SIDE_VEHICLE;

  const options = useMemo(
    () =>
      (["A", "B", "C", "D"] as const).map((letter) => ({
        letter,
        text: getOptionText(question, letter),
      })),
    [question],
  );

  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);

  useEffect(() => {
    if (!mobileSequencing) {
      setMobileAnswerPhase("question");
      return;
    }

    if (stage === "playing") {
      setMobileAnswerPhase("question");
      return;
    }

    // Mobile should react immediately: hide the question/options and start
    // the rover movement (or stall) as soon as the answer is submitted.
    setMobileAnswerPhase("travel");
  }, [mobileSequencing, stage, question.id]);

  useEffect(() => {
    if (!mobileSequencing || stage !== "answered" || mobileAnswerPhase !== "travel" || paused) return;
    if (isCorrect && lastPoints > 0) return;

    // Wrong answer / timeout: show the short stall reaction, then immediately
    // reveal the next question. No extra five-second dead period on mobile.
    const timer = window.setTimeout(() => {
      onNextRef.current();
    }, 720);

    return () => window.clearTimeout(timer);
  }, [mobileSequencing, stage, mobileAnswerPhase, paused, isCorrect, lastPoints]);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (paused) return;

    const setTravelPhaseSafely = (nextPhase: ExpeditionTravelPhase) => {
      if (travelPhaseRef.current === nextPhase) return;
      travelPhaseRef.current = nextPhase;
      setTravelPhase(nextPhase);
    };

    const target = points;
    const start = displayPointsRef.current;

    if (mobileSequencing && stage === "answered" && mobileAnswerPhase !== "travel") {
      setTravelPhaseSafely("idle");
      return;
    }

    if (target <= start || stage !== "answered") {
      displayPointsRef.current = target;
      setDisplayPoints(target);
      setTravelPhaseSafely("idle");
      return;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      displayPointsRef.current = target;
      setDisplayPoints(target);
      setTravelPhaseSafely("idle");
      return;
    }

    const duration = motion === "turbo" ? 1750 : motion === "boost" ? 1500 : 1250;
    const coastStartProgress = 0.58;
    const startedAt = performance.now();
    setTravelPhaseSafely("driving");

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;

      setTravelPhaseSafely(progress >= coastStartProgress ? "coasting" : "driving");
      displayPointsRef.current = next;
      setDisplayPoints(next);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        displayPointsRef.current = target;
        setDisplayPoints(target);
        setTravelPhaseSafely("idle");
        animationFrameRef.current = null;

        if (mobileSequencing && mobileAnswerPhase === "travel") {
          window.setTimeout(() => onNextRef.current(), 120);
        }
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }, [points, stage, motion, paused, mobileSequencing, mobileAnswerPhase]);

  const progress = Math.min(Math.max(displayPoints / MAX_EXPEDITION_POINTS, 0), 1);
  const wheelRotationDeg = displayPoints * 12;
  const worldOffsetVh = progress * WORLD_CYCLE_WIDTH_VH;
  const displayMetres = displayPoints * EXPEDITION_METRES_PER_POINT;
  const earnedMetres = lastPoints * EXPEDITION_METRES_PER_POINT;

  const mobileTimerValue = stage === "answered" ? null : countdown;
  const mobileTimerLabel = stage === "answered" ? "MOVE" : "SEC";
  const timerProgress = mobileSequencing
    ? stage === "answered"
      ? 0
      : Math.min(1, Math.max(0, countdown / timerSeconds))
    : stage === "answered"
      ? Math.min(1, Math.max(0, nextCountdown / nextDelaySeconds))
      : Math.min(1, Math.max(0, countdown / timerSeconds));

  return (
    <div className={`expedition-root expedition-motion--${motion} expedition-travel--${travelPhase} expedition-mobile-phase--${mobileAnswerPhase} ${mobileSequencing ? "is-mobile-sequenced" : ""} ${paused ? "is-paused" : ""}`}>
      <div className="expedition-world" aria-hidden="true">
        <div
          className="expedition-world-track"
          style={{ transform: `translate3d(-${worldOffsetVh}vh, 0, 0)` }}
        >
          {[...WORLD_SCENES, ...WORLD_SCENES].map((scene, index) => {
            const sceneIndex = (index % WORLD_SCENES.length) as 0 | 1 | 2;
            const isPrimaryRouteCycle = index < WORLD_SCENES.length;
            const sceneLandmarks = isPrimaryRouteCycle
              ? EXPEDITION_LANDMARKS.filter((landmark) => landmark.liveSceneIndex === sceneIndex)
              : [];

            return (
              <div
                key={`${scene.src}-${index}`}
                className="expedition-world-tile"
              >
                <img
                  src={scene.src}
                  alt=""
                  draggable={false}
                  className="expedition-world-image"
                  style={{ top: `${scene.roadOffsetPercent}%` }}
                />

                {sceneLandmarks.map((landmark) => {
                  const passed = displayMetres >= landmark.thresholdMetres;
                  const nearLandmark = Math.abs(displayMetres - landmark.thresholdMetres) <= 250;

                  return (
                    <div
                      key={landmark.id}
                      className={`expedition-live-landmark ${passed ? "is-passed" : "is-ahead"} ${nearLandmark ? "is-near" : ""}`}
                      style={{
                        left: `${landmark.liveXPercent}%`,
                        top: `calc(${landmark.liveYPercent}% + ${scene.roadOffsetPercent}%)`,
                      }}
                    >
                      <span className="expedition-live-landmark-pin" />
                      <span className="expedition-live-landmark-card">
                        <strong>{landmark.name}</strong>
                        <small>{landmark.year}</small>
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="expedition-world-shade" />
        <div className="expedition-horizon-glow" />
        <div className="expedition-speed-lines" />
      </div>

      <div className="expedition-hud">
        <div className="expedition-category-block">
          <span className="expedition-category-icon" aria-hidden="true">✦</span>
          <span className="expedition-category-copy">
            <strong>{category}</strong>
            <small>Dreamway Expedition · {playStyleLabel}</small>
          </span>
        </div>

        <div className="expedition-question-progress">
          <strong>Question {questionNumber} / {questionCount}</strong>
          <div className="expedition-progress-dots" aria-hidden="true">
            {Array.from({ length: questionCount }).map((_, index) => (
              <span
                key={index}
                className={index < questionNumber ? "is-active" : ""}
              />
            ))}
          </div>
        </div>

        <div className="expedition-mini-stats">
          <div>
            <span>★</span>
            <p><small>Score</small><strong>{score}/{questionCount}</strong></p>
          </div>
          <div>
            <span>⌖</span>
            <p><small>Distance</small><strong>{formatDistance(displayMetres)}</strong></p>
          </div>
          <div className="is-gold">
            <span>▲</span>
            <p><small>Last</small><strong>+{formatDistance(earnedMetres)}</strong></p>
          </div>
        </div>

        <div className="expedition-timer-stack">
          {canPause && (
            <button
              type="button"
              className={`expedition-pause-button ${paused ? "is-paused" : ""}`}
              onClick={onTogglePause}
              aria-pressed={paused}
            >
              <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
              <strong>{paused ? "Resume" : "Pause"}</strong>
            </button>
          )}

          <div
            className={`expedition-timer ${countdown <= Math.ceil(timerSeconds * 0.3) && stage === "playing" && !paused ? "is-low" : ""}`}
            style={{
              background: `conic-gradient(#ffd18a ${timerProgress * 360}deg, rgba(255,255,255,0.10) 0deg)`,
            }}
          >
            <div>
              <strong>{paused ? "Ⅱ" : waitingForPlayers !== null && stage === "answered" ? (waitingForPlayers > 0 ? waitingForPlayers : "✓") : mobileSequencing ? (mobileTimerValue ?? "→") : stage === "answered" ? nextCountdown : countdown}</strong>
              <small>{paused ? "PAUSED" : waitingForPlayers !== null && stage === "answered" ? (waitingForPlayers > 0 ? "WAIT" : "READY") : mobileSequencing ? mobileTimerLabel : stage === "answered" ? "NEXT" : "SEC"}</small>
            </div>
          </div>
        </div>
      </div>

      <div className={`expedition-quiz-layer ${mobileSequencing && stage === "answered" ? "is-mobile-travel-hidden" : ""}`}>
        <div className="expedition-question-column">
          <section className="expedition-question-card">
            <div className="expedition-question-topline">
              <span>Question</span>
              {isGuest && (
                <button
                  type="button"
                  onClick={onHint}
                  disabled={paused || guestHintUsed || stage === "answered"}
                  className="expedition-hint-button"
                >
                  {guestHintUsed ? "50:50 used" : "50:50 hint"}
                </button>
              )}
            </div>
            <h2>{question.question}</h2>

            {message && stage === "playing" && guestHintUsed && (
              <p className="expedition-inline-message">{message}</p>
            )}
          </section>

          {stage === "answered" && !mobileSequencing && (
            <div className={`expedition-answer-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
              <strong>{isCorrect ? "Correct" : selectedAnswer ? "Not quite" : "Time's up"}</strong>
              {question.explanation && <span>{question.explanation}</span>}
              {waitingForPlayers !== null ? (
                <em className="expedition-waiting-copy">
                  {waitingForPlayers > 0
                    ? `Waiting for ${waitingForPlayers} player${waitingForPlayers === 1 ? "" : "s"}…`
                    : "Everyone answered — moving on…"}
                </em>
              ) : (
                <button type="button" onClick={onNext} disabled={paused}>
                  {questionNumber >= questionCount ? "See Results →" : "Next Question →"}
                </button>
              )}
            </div>
          )}
        </div>

        <div className="expedition-options-grid">
          {options.map(({ letter, text }) => {
            const isEliminated = hiddenOptions.includes(letter);
            const isSelected = selectedAnswer === letter;
            const isCorrectOption = question.correct_option === letter;
            const showResult = stage === "answered";

            const stateClass = showResult && isCorrectOption
              ? "is-correct"
              : showResult && isSelected && !isCorrectOption
                ? "is-wrong"
                : !showResult && isSelected
                  ? "is-selected"
                  : "";

            return (
              <button
                key={letter}
                type="button"
                disabled={paused || stage === "answered" || isEliminated}
                onClick={() => onAnswer(letter)}
                className={`expedition-option ${stateClass} ${isEliminated ? "is-eliminated" : ""}`}
              >
                <span className="expedition-option-letter">{letter}</span>
                <span className="expedition-option-text">{text}</span>
                {isEliminated && <span className="expedition-eliminated-label">Eliminated</span>}
              </button>
            );
          })}
        </div>
      </div>

      {racePlayers.length > 0 && (
        <MultiplayerRaceMap
          players={racePlayers}
          currentUserId={currentPlayerId}
          currentDisplayPoints={displayPoints}
        />
      )}

      {paused && (
        <div className="expedition-paused-overlay" role="status" aria-live="polite">
          <div>
            <span aria-hidden="true">Ⅱ</span>
            <strong>Expedition Paused</strong>
            <small>Admin pause is active. The timer and question are frozen.</small>
          </div>
        </div>
      )}

      <div
        className={`expedition-vehicle-zone ${currentPlayerVariant ? "is-multiplayer-player" : ""}`}
        aria-hidden="true"
        style={currentPlayerVariant ? ({
          "--player-color": currentPlayerVariant.color,
          "--player-soft": currentPlayerVariant.softColor,
        } as CSSProperties) : undefined}
      >
        <img src={EXPEDITION_EFFECTS.cruiseDust} alt="" draggable={false} className="expedition-effect expedition-effect--cruise" />
        <img src={EXPEDITION_EFFECTS.boostTrail} alt="" draggable={false} className="expedition-effect expedition-effect--boost" />
        <img src={EXPEDITION_EFFECTS.turboTrail} alt="" draggable={false} className="expedition-effect expedition-effect--turbo" />
        <img src={EXPEDITION_EFFECTS.wheelDust} alt="" draggable={false} className="expedition-effect expedition-effect--wheel-dust" />
        <img src={EXPEDITION_EFFECTS.turboBurst} alt="" draggable={false} className="expedition-effect expedition-effect--turbo-burst" />
        <img src={EXPEDITION_EFFECTS.stallSmoke} alt="" draggable={false} className="expedition-effect expedition-effect--stall-smoke" />
        <img src={EXPEDITION_EFFECTS.wrongSputter} alt="" draggable={false} className="expedition-effect expedition-effect--wrong-sputter" />
        <img src={EXPEDITION_EFFECTS.correctSpark} alt="" draggable={false} className="expedition-effect expedition-effect--correct-spark" />

        <div className="expedition-wheel expedition-wheel--rear">
          <img
            src="/milo-world/activities/categories/expedition/milo-vehicle-rear-wheel.png"
            alt=""
            draggable={false}
            className="expedition-wheel-image"
            style={{ transform: `rotate(${wheelRotationDeg}deg)` }}
          />
        </div>

        <div className="expedition-wheel expedition-wheel--front">
          <img
            src="/milo-world/activities/categories/expedition/milo-vehicle-front-wheel.png"
            alt=""
            draggable={false}
            className="expedition-wheel-image"
            style={{ transform: `rotate(${wheelRotationDeg}deg)` }}
          />
        </div>

        <img
          src={currentVehicleBodyAsset}
          alt=""
          draggable={false}
          className="expedition-vehicle-body"
        />
        {currentPlayerVariant && (
          <span className="expedition-player-accent-ring" />
        )}
      </div>

      {stage === "answered" && (!mobileSequencing || mobileAnswerPhase === "travel") && (
        <div className={`expedition-motion-callout is-${motion}`} aria-live="polite">
          <strong>{getMotionLabel(motion)}</strong>
          <span>+{formatDistance(earnedMetres)}</span>
        </div>
      )}

      <style jsx>{`
        .expedition-root {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 0;
          overflow: hidden;
          isolation: isolate;
          background: #041126;
          color: white;
        }

        .expedition-world,
        .expedition-world-track,
        .expedition-world-shade,
        .expedition-horizon-glow,
        .expedition-speed-lines {
          position: absolute;
          inset: 0;
        }

        .expedition-world {
          z-index: 0;
          overflow: hidden;
        }

        .expedition-world-track {
          display: flex;
          width: max-content;
          will-change: transform;
        }

        .expedition-world-tile {
          position: relative;
          width: 300vh;
          height: 100%;
          flex: 0 0 300vh;
          overflow: hidden;
          background: #061936;
          user-select: none;
          pointer-events: none;
        }

        .expedition-world-image {
          position: absolute;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: fill;
          user-select: none;
          pointer-events: none;
        }

        .expedition-world-shade {
          background:
            linear-gradient(180deg, rgba(1, 8, 24, 0.46) 0%, rgba(1, 8, 24, 0.12) 42%, rgba(1, 8, 24, 0.02) 64%, rgba(1, 8, 24, 0.30) 100%),
            linear-gradient(90deg, rgba(2, 10, 28, 0.22), transparent 25%, transparent 74%, rgba(2, 10, 28, 0.18));
          pointer-events: none;
        }

        .expedition-horizon-glow {
          top: 52%;
          bottom: auto;
          height: 30%;
          background: radial-gradient(ellipse at 45% 50%, rgba(83, 215, 255, 0.08), transparent 62%);
          pointer-events: none;
        }

        .expedition-speed-lines {
          inset: auto 0 21% 0;
          height: 18%;
          opacity: 0;
          background:
            repeating-linear-gradient(90deg, transparent 0 8%, rgba(255, 209, 138, 0.12) 8.2% 8.8%, transparent 9% 19%);
          transform: skewX(-24deg);
          filter: blur(1px);
          pointer-events: none;
        }

        .expedition-speed-lines {
          transition: opacity 220ms ease;
        }

        .expedition-travel--driving.expedition-motion--boost .expedition-speed-lines,
        .expedition-travel--driving.expedition-motion--turbo .expedition-speed-lines {
          opacity: 0.82;
          animation: expeditionSpeedLines 430ms linear infinite;
        }

        .expedition-travel--driving.expedition-motion--turbo .expedition-speed-lines {
          opacity: 0.92;
          animation-duration: 260ms;
        }

        .expedition-travel--coasting.expedition-motion--boost .expedition-speed-lines,
        .expedition-travel--coasting.expedition-motion--turbo .expedition-speed-lines {
          opacity: 0.32;
          animation: expeditionSpeedLines 760ms linear infinite;
        }

        .expedition-live-landmark {
          position: absolute;
          z-index: 3;
          transform: translate(-50%, 0);
          pointer-events: none;
        }

        .expedition-live-landmark-pin {
          position: absolute;
          top: -16px;
          left: 50%;
          width: 1px;
          height: 16px;
          transform: translateX(-50%);
          background: linear-gradient(180deg, rgba(255,209,138,0.08), rgba(255,209,138,0.75));
          box-shadow: 0 0 7px rgba(255,209,138,0.20);
        }

        .expedition-live-landmark-pin::after {
          content: "";
          position: absolute;
          top: -3px;
          left: 50%;
          width: 7px;
          height: 7px;
          transform: translateX(-50%);
          border: 1px solid rgba(255,209,138,0.92);
          border-radius: 999px;
          background: #ffd18a;
          box-shadow: 0 0 10px rgba(255,209,138,0.50);
        }

        .expedition-live-landmark-card {
          display: grid;
          min-width: 118px;
          max-width: 178px;
          gap: 2px;
          border: 1px solid rgba(155,245,255,0.20);
          border-radius: 11px;
          background: rgba(4,14,32,0.84);
          padding: 6px 9px;
          box-shadow: 0 8px 22px rgba(0,0,0,0.25);
          text-align: center;
          backdrop-filter: blur(9px);
          transition: border-color 180ms ease, background 180ms ease, opacity 180ms ease, transform 180ms ease;
        }

        .expedition-live-landmark-card strong {
          color: white;
          font-size: 9px;
          font-weight: 900;
          line-height: 1.15;
        }

        .expedition-live-landmark-card small {
          color: #ffd18a;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.05em;
        }

        .expedition-live-landmark.is-ahead .expedition-live-landmark-card {
          opacity: 0.90;
        }

        .expedition-live-landmark.is-near .expedition-live-landmark-card {
          transform: translateY(-2px);
          border-color: rgba(255,209,138,0.62);
          background: rgba(24,31,45,0.94);
          box-shadow: 0 8px 24px rgba(0,0,0,0.28), 0 0 18px rgba(255,209,138,0.22);
        }

        .expedition-live-landmark.is-passed .expedition-live-landmark-card {
          opacity: 0.62;
        }

        .expedition-hud {
          position: absolute;
          top: 10px;
          left: 18px;
          right: 168px;
          z-index: 24;
          display: grid;
          grid-template-columns: minmax(210px, 1.1fr) minmax(210px, 0.8fr) minmax(360px, 1.5fr) minmax(76px, auto);
          align-items: center;
          gap: 12px;
          pointer-events: none;
        }

        .expedition-category-block,
        .expedition-question-progress,
        .expedition-mini-stats > div {
          border: 1px solid rgba(155, 245, 255, 0.18);
          background: linear-gradient(145deg, rgba(5, 21, 48, 0.78), rgba(7, 18, 39, 0.60));
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
          backdrop-filter: blur(15px);
        }

        .expedition-category-block {
          display: flex;
          min-width: 0;
          align-items: center;
          gap: 11px;
          min-height: 54px;
          border-radius: 18px;
          padding: 8px 13px;
        }

        .expedition-category-icon {
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid rgba(255, 209, 138, 0.35);
          border-radius: 12px;
          background: rgba(255, 209, 138, 0.10);
          color: #ffd18a;
          box-shadow: 0 0 22px rgba(255, 209, 138, 0.08);
        }

        .expedition-category-copy {
          display: grid;
          min-width: 0;
          gap: 2px;
        }

        .expedition-category-copy strong {
          overflow: hidden;
          color: #ffd18a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.11em;
          text-overflow: ellipsis;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .expedition-category-copy small {
          overflow: hidden;
          color: rgba(155, 245, 255, 0.80);
          font-size: 9px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .expedition-question-progress {
          display: grid;
          min-height: 54px;
          place-content: center;
          gap: 6px;
          border-radius: 18px;
          padding: 8px 14px;
          text-align: center;
        }

        .expedition-question-progress strong {
          font-size: 11px;
          font-weight: 900;
        }

        .expedition-progress-dots {
          display: flex;
          justify-content: center;
          gap: 6px;
        }

        .expedition-progress-dots span {
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: rgba(255,255,255,0.20);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }

        .expedition-progress-dots span.is-active {
          background: #ffd18a;
          box-shadow: 0 0 12px rgba(255, 209, 138, 0.65);
        }

        .expedition-mini-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
        }

        .expedition-mini-stats > div {
          display: flex;
          min-width: 0;
          min-height: 54px;
          align-items: center;
          gap: 8px;
          border-radius: 16px;
          padding: 8px 10px;
        }

        .expedition-mini-stats > div.is-gold {
          border-color: rgba(255, 209, 138, 0.26);
          background: linear-gradient(145deg, rgba(73, 56, 28, 0.60), rgba(25, 26, 36, 0.56));
        }

        .expedition-mini-stats > div > span {
          display: grid;
          width: 28px;
          height: 28px;
          place-items: center;
          flex: 0 0 auto;
          border-radius: 999px;
          background: rgba(255,255,255,0.06);
          color: #ffd18a;
          font-size: 13px;
        }

        .expedition-mini-stats p {
          display: grid;
          min-width: 0;
          gap: 1px;
          margin: 0;
        }

        .expedition-mini-stats small {
          color: rgba(255,255,255,0.40);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .expedition-mini-stats strong {
          overflow: hidden;
          font-size: 13px;
          font-weight: 950;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .expedition-mini-stats .is-gold strong {
          color: #ffd18a;
        }

        .expedition-timer-stack {
          display: flex;
          align-items: center;
          justify-self: end;
          gap: 8px;
          pointer-events: auto;
        }

        .expedition-pause-button {
          display: flex;
          min-height: 38px;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(155,245,255,0.22);
          border-radius: 12px;
          background: rgba(4,14,32,0.86);
          padding: 7px 10px;
          color: rgba(255,255,255,0.76);
          box-shadow: 0 10px 24px rgba(0,0,0,0.18);
          backdrop-filter: blur(12px);
          cursor: pointer;
        }

        .expedition-pause-button:hover,
        .expedition-pause-button.is-paused {
          border-color: rgba(255,209,138,0.42);
          background: rgba(255,209,138,0.12);
          color: #ffd18a;
        }

        .expedition-root.is-paused .expedition-pause-button {
          position: relative;
          z-index: 30;
          backdrop-filter: none;
          background: #10223d;
          box-shadow: 0 10px 30px rgba(0,0,0,0.38), 0 0 20px rgba(255,209,138,0.12);
        }

        .expedition-pause-button span {
          font-size: 12px;
          font-weight: 950;
        }

        .expedition-pause-button strong {
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .expedition-timer {
          display: grid;
          width: 62px;
          height: 62px;
          place-items: center;
          justify-self: end;
          border-radius: 999px;
          box-shadow: 0 0 24px rgba(255, 209, 138, 0.14);
        }

        .expedition-timer > div {
          display: grid;
          width: 50px;
          height: 50px;
          place-items: center;
          align-content: center;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 999px;
          background: rgba(4, 14, 32, 0.92);
          backdrop-filter: blur(12px);
        }

        .expedition-timer strong {
          color: #ffd18a;
          font-size: 18px;
          font-weight: 950;
          line-height: 1;
        }

        .expedition-timer small {
          margin-top: 2px;
          color: rgba(255,255,255,0.42);
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.12em;
        }

        .expedition-timer.is-low {
          animation: expeditionTimerPulse 600ms ease-in-out infinite alternate;
        }

        .expedition-quiz-layer.is-mobile-travel-hidden {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 180ms ease, visibility 180ms ease;
        }

        .expedition-quiz-layer {
          position: absolute;
          top: 82px;
          left: clamp(22px, 4vw, 66px);
          right: clamp(22px, 4vw, 66px);
          z-index: 7;
          display: grid;
          grid-template-columns: minmax(280px, 0.76fr) minmax(0, 1.24fr);
          gap: 18px;
          height: min(36%, 300px);
          pointer-events: auto;
        }

        .expedition-question-column {
          display: flex;
          min-height: 0;
          flex-direction: column;
          align-self: start;
          gap: 10px;
        }

        .expedition-question-card,
        .expedition-option {
          border: 1px solid rgba(155, 245, 255, 0.20);
          background: linear-gradient(145deg, rgba(5, 20, 45, 0.80), rgba(5, 14, 32, 0.64));
          box-shadow: 0 18px 46px rgba(0,0,0,0.16);
          backdrop-filter: blur(14px);
        }

        .expedition-question-card {
          position: relative;
          min-height: 150px;
          max-height: 230px;
          align-self: start;
          overflow: hidden;
          border-radius: 22px;
          padding: clamp(16px, 2vw, 24px);
        }

        .expedition-question-topline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .expedition-question-topline > span {
          color: #ffd18a;
          font-size: 10px;
          font-weight: 950;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .expedition-hint-button {
          min-height: 30px;
          border: 1px solid rgba(255, 209, 138, 0.28);
          border-radius: 999px;
          background: rgba(255, 209, 138, 0.08);
          padding: 5px 10px;
          color: #ffd18a;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .expedition-hint-button:disabled {
          cursor: not-allowed;
          opacity: 0.42;
        }

        .expedition-question-card h2 {
          max-height: 142px;
          margin: 14px 0 0;
          overflow-y: auto;
          color: white;
          font-size: clamp(20px, 2.05vw, 30px);
          font-weight: 850;
          line-height: 1.30;
          scrollbar-width: none;
        }

        .expedition-question-card h2::-webkit-scrollbar {
          display: none;
        }

        .expedition-inline-message {
          margin: 10px 0 0;
          color: #ffd18a;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.4;
        }

        .expedition-answer-feedback {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          background: rgba(3, 12, 28, 0.90);
          padding: 10px 12px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.24);
          backdrop-filter: blur(12px);
        }

        .expedition-answer-feedback.is-correct {
          border-color: rgba(134, 239, 172, 0.35);
          background: rgba(16, 65, 46, 0.86);
        }

        .expedition-answer-feedback.is-wrong {
          border-color: rgba(252, 165, 165, 0.35);
          background: rgba(74, 25, 34, 0.86);
        }

        .expedition-answer-feedback strong {
          font-size: 11px;
          font-weight: 950;
          white-space: nowrap;
        }

        .expedition-answer-feedback span {
          overflow: hidden;
          color: rgba(255,255,255,0.66);
          font-size: 9px;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .expedition-waiting-copy {
          justify-self: end;
          color: #ffd18a;
          font-size: 8px;
          font-style: normal;
          font-weight: 900;
          letter-spacing: 0.04em;
          white-space: nowrap;
        }

        .expedition-answer-feedback button {
          min-height: 30px;
          border: 1px solid rgba(255, 209, 138, 0.35);
          border-radius: 10px;
          background: rgba(255, 209, 138, 0.12);
          padding: 5px 9px;
          color: #ffd18a;
          font-size: 8px;
          font-weight: 950;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .expedition-options-grid {
          display: grid;
          min-height: 0;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .expedition-option {
          display: flex;
          min-height: 0;
          align-items: center;
          gap: 10px;
          overflow: hidden;
          border-radius: 18px;
          padding: 10px 14px;
          color: rgba(255,255,255,0.88);
          text-align: left;
          cursor: pointer;
          transition: transform 150ms ease, border-color 150ms ease, background 150ms ease, opacity 150ms ease;
        }

        .expedition-option:hover:not(:disabled) {
          transform: translateX(4px);
          border-color: rgba(255, 209, 138, 0.40);
          background: linear-gradient(145deg, rgba(10, 31, 62, 0.88), rgba(8, 19, 41, 0.74));
        }

        .expedition-option.is-selected {
          border-color: rgba(255, 209, 138, 0.72);
          background: rgba(255, 209, 138, 0.13);
        }

        .expedition-option.is-correct {
          border-color: rgba(134, 239, 172, 0.68);
          background: rgba(34, 197, 94, 0.18);
          color: #dcfce7;
        }

        .expedition-option.is-wrong {
          border-color: rgba(252, 165, 165, 0.65);
          background: rgba(239, 68, 68, 0.17);
          color: #fee2e2;
        }

        .expedition-option.is-eliminated {
          cursor: not-allowed;
          opacity: 0.28;
          filter: grayscale(0.7);
        }

        .expedition-option-letter {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          flex: 0 0 auto;
          border: 1px solid currentColor;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 950;
          opacity: 0.82;
        }

        .expedition-option-text {
          min-width: 0;
          flex: 1;
          overflow: hidden;
          display: -webkit-box;
          font-size: clamp(11px, 1.08vw, 15px);
          font-weight: 800;
          line-height: 1.3;
          text-overflow: ellipsis;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .expedition-eliminated-label {
          flex: 0 0 auto;
          color: #ffd18a;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .expedition-paused-overlay {
          position: absolute;
          inset: 0;
          z-index: 20;
          display: grid;
          place-items: center;
          background: rgba(2,8,23,0.34);
          backdrop-filter: blur(2px);
          pointer-events: none;
        }

        .expedition-paused-overlay > div {
          display: grid;
          min-width: 240px;
          place-items: center;
          gap: 6px;
          border: 1px solid rgba(255,209,138,0.34);
          border-radius: 18px;
          background: rgba(4,14,32,0.92);
          padding: 18px 22px;
          box-shadow: 0 20px 54px rgba(0,0,0,0.36), 0 0 32px rgba(255,209,138,0.08);
        }

        .expedition-paused-overlay span {
          color: #ffd18a;
          font-size: 22px;
          font-weight: 950;
        }

        .expedition-paused-overlay strong {
          color: white;
          font-size: 15px;
          font-weight: 950;
        }

        .expedition-paused-overlay small {
          color: rgba(255,255,255,0.48);
          font-size: 9px;
          font-weight: 700;
        }

        .expedition-root.is-paused .expedition-vehicle-zone,
        .expedition-root.is-paused .expedition-wheel,
        .expedition-root.is-paused .expedition-effect,
        .expedition-root.is-paused .expedition-dust,
        .expedition-root.is-paused .expedition-speed-lines,
        .expedition-root.is-paused .expedition-motion-callout,
        .expedition-root.is-paused .expedition-timer {
          animation-play-state: paused !important;
        }

        .expedition-vehicle-zone {
          position: absolute;
          left: clamp(20px, 4.5vw, 78px);
          bottom: 25.4%;
          z-index: 5;
          width: clamp(220px, 24vw, 450px);
          pointer-events: none;
          transform-origin: 45% 100%;
          will-change: transform;
        }

        .expedition-vehicle-body {
          position: relative;
          z-index: 3;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 20px 18px rgba(0,0,0,0.30));
          user-select: none;
        }


        .expedition-vehicle-zone.is-multiplayer-player::after {
          content: "";
          position: absolute;
          z-index: 0;
          left: 7%;
          right: 8%;
          bottom: -1%;
          height: 19%;
          border-radius: 999px;
          background: radial-gradient(ellipse, var(--player-soft), transparent 68%);
          filter: blur(7px);
          opacity: 0.9;
        }

        .expedition-player-accent-ring {
          position: absolute;
          z-index: 4;
          left: 43%;
          bottom: 18%;
          width: 17%;
          aspect-ratio: 1;
          border: 3px solid var(--player-color);
          border-radius: 999px;
          box-shadow: 0 0 22px var(--player-color), inset 0 0 15px var(--player-soft);
          opacity: 0.82;
          pointer-events: none;
        }
        .expedition-effect {
          position: absolute;
          z-index: 1;
          display: block;
          height: auto;
          opacity: 0;
          pointer-events: none;
          user-select: none;
          mix-blend-mode: screen;
          filter: saturate(1.18) brightness(1.08) drop-shadow(0 0 10px rgba(155,245,255,0.22));
          transition: opacity 150ms ease, transform 280ms ease, filter 220ms ease;
          will-change: transform, opacity, filter;
        }

        .expedition-effect--cruise {
          left: -76%;
          bottom: -1%;
          width: 125%;
          transform-origin: 100% 65%;
        }

        .expedition-effect--boost {
          left: -100%;
          bottom: -3%;
          width: 165%;
          transform-origin: 100% 60%;
        }

        .expedition-effect--turbo {
          left: -125%;
          bottom: 3%;
          width: 205%;
          transform-origin: 100% 55%;
        }

        .expedition-effect--wheel-dust {
          left: -24%;
          bottom: -9%;
          width: 148%;
        }

        .expedition-effect--turbo-burst {
          left: -28%;
          top: 30%;
          width: 38%;
          transform: scale(.55);
        }

        .expedition-effect--stall-smoke {
          right: 1%;
          top: 24%;
          width: 42%;
          z-index: 4;
          mix-blend-mode: normal;
          filter: drop-shadow(0 0 9px rgba(255,132,54,0.22));
        }

        .expedition-effect--wrong-sputter {
          right: 6%;
          top: 34%;
          width: 27%;
          z-index: 5;
          filter: brightness(1.18) drop-shadow(0 0 12px rgba(255,124,38,0.64));
        }

        .expedition-effect--correct-spark {
          left: 43%;
          top: 1%;
          width: 25%;
          z-index: 5;
          transform: scale(.72);
          filter: brightness(1.22) drop-shadow(0 0 13px rgba(255,209,138,0.62)) drop-shadow(0 0 7px rgba(34,211,238,0.45));
        }

        .expedition-travel--driving.expedition-motion--cruise .expedition-effect--cruise {
          opacity: .54;
          animation: expeditionTrailGlow 620ms ease-in-out infinite alternate;
        }

        .expedition-travel--coasting.expedition-motion--cruise .expedition-effect--cruise {
          opacity: .20;
          transform: scaleX(.78);
        }

        .expedition-travel--driving.expedition-motion--boost .expedition-effect--boost {
          opacity: .72;
          animation: expeditionTrailGlow 430ms ease-in-out infinite alternate;
          filter: saturate(1.25) brightness(1.18) drop-shadow(0 0 15px rgba(255,209,138,0.34));
        }

        .expedition-travel--coasting.expedition-motion--boost .expedition-effect--boost {
          opacity: .24;
          transform: scaleX(.74);
        }

        .expedition-travel--driving.expedition-motion--turbo .expedition-effect--turbo {
          opacity: .84;
          animation: expeditionTurboTrailFlow 310ms ease-in-out infinite alternate;
          filter: saturate(1.35) brightness(1.26) drop-shadow(0 0 18px rgba(34,211,238,0.58)) drop-shadow(0 0 9px rgba(255,209,138,0.40));
        }

        .expedition-travel--coasting.expedition-motion--turbo .expedition-effect--turbo {
          opacity: .28;
          transform: scaleX(.72);
        }

        .expedition-travel--driving:not(.expedition-motion--stall) .expedition-effect--wheel-dust {
          opacity: .34;
          animation: expeditionWheelDustFlow 520ms ease-in-out infinite alternate;
        }

        .expedition-travel--coasting:not(.expedition-motion--stall) .expedition-effect--wheel-dust {
          opacity: .16;
          transform: translateX(-6px) scale(.96);
        }


        .expedition-travel--driving.expedition-motion--turbo .expedition-effect--turbo-burst {
          animation: expeditionEffectBurst 520ms ease-out 1 both;
        }

        .expedition-motion--stall .expedition-effect--stall-smoke {
          opacity: .82;
          animation: expeditionSmokePuff 720ms ease-out 1 both;
        }

        .expedition-motion--stall .expedition-effect--wrong-sputter {
          opacity: .92;
          animation: expeditionEffectBurst 520ms ease-out 1 both;
        }

        .expedition-motion--cruise.expedition-travel--driving .expedition-effect--correct-spark,
        .expedition-motion--boost.expedition-travel--driving .expedition-effect--correct-spark,
        .expedition-motion--turbo.expedition-travel--driving .expedition-effect--correct-spark {
          animation: expeditionCorrectSpark 620ms ease-out 1 both;
        }

        .expedition-wheel {
          position: absolute;
          z-index: 2;
          display: grid;
          place-items: center;
          will-change: transform;
          transform-origin: 50% 50%;
          filter: drop-shadow(0 12px 10px rgba(0,0,0,0.20));
        }

        .expedition-wheel--rear {
          left: 2.8%;
          top: 59.7%;
          width: 27.0%;
        }

        .expedition-wheel--front {
          left: 69.4%;
          top: 61.1%;
          width: 25.2%;
        }

        .expedition-wheel-image {
          display: block;
          width: 100%;
          height: auto;
          user-select: none;
        }

        .expedition-dust {
          position: absolute;
          z-index: 1;
          left: -4%;
          bottom: 2%;
          width: 34%;
          height: 21%;
          border-radius: 999px;
          background: radial-gradient(ellipse, rgba(255, 209, 138, 0.24), rgba(169, 132, 85, 0.08) 42%, transparent 72%);
          filter: blur(7px);
          opacity: 0;
        }

        .expedition-dust--two {
          left: 8%;
          bottom: -1%;
          width: 44%;
          transform: scale(0.7);
        }

        .expedition-motion--cruise .expedition-vehicle-zone {
          animation: expeditionCruise 520ms ease-in-out 2;
        }

        .expedition-motion--boost .expedition-vehicle-zone {
          animation: expeditionBoost 430ms ease-in-out 3;
        }

        .expedition-motion--turbo .expedition-vehicle-zone {
          animation: expeditionTurbo 320ms ease-in-out 4;
        }

        .expedition-motion--stall .expedition-vehicle-zone {
          animation: expeditionStall 150ms ease-in-out 3;
        }


        .expedition-wheel-image {
          transform-origin: 50% 50%;
          will-change: transform;
        }

        .expedition-motion--stall .expedition-wheel {
          animation: none;
        }

        .expedition-dust {
          transition: opacity 260ms ease;
        }

        .expedition-travel--driving.expedition-motion--cruise .expedition-dust,
        .expedition-travel--driving.expedition-motion--boost .expedition-dust,
        .expedition-travel--driving.expedition-motion--turbo .expedition-dust {
          opacity: 0.9;
          animation: expeditionDust 760ms ease-out infinite;
        }

        .expedition-travel--driving.expedition-motion--turbo .expedition-dust {
          opacity: 0.98;
          animation-duration: 520ms;
        }

        .expedition-travel--coasting .expedition-dust {
          opacity: 0.28;
          animation: expeditionDust 980ms ease-out infinite;
        }

        .expedition-motion-callout {
          position: absolute;
          left: 50%;
          bottom: 21%;
          z-index: 9;
          display: grid;
          min-width: 170px;
          place-items: center;
          gap: 3px;
          transform: translateX(-50%);
          border: 1px solid rgba(255, 209, 138, 0.34);
          border-radius: 18px;
          background: rgba(4, 14, 32, 0.84);
          padding: 10px 14px;
          box-shadow: 0 14px 36px rgba(0,0,0,0.28), 0 0 28px rgba(255,209,138,0.10);
          backdrop-filter: blur(12px);
          animation: expeditionCalloutIn 260ms ease-out both;
          pointer-events: none;
        }

        .expedition-motion-callout strong {
          color: #ffd18a;
          font-size: 12px;
          font-weight: 950;
          letter-spacing: 0.14em;
        }

        .expedition-motion-callout span {
          color: white;
          font-size: 19px;
          font-weight: 950;
        }

        .expedition-motion-callout.is-turbo {
          border-color: rgba(155, 245, 255, 0.55);
          box-shadow: 0 14px 36px rgba(0,0,0,0.28), 0 0 36px rgba(83,215,255,0.24);
        }

        .expedition-motion-callout.is-turbo strong {
          color: #9bf5ff;
        }

        .expedition-motion-callout.is-stall {
          border-color: rgba(252,165,165,0.34);
        }

        .expedition-motion-callout.is-stall strong {
          color: #fecaca;
        }

        @keyframes expeditionCruise {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(2px, -1px, 0) rotate(-0.2deg); }
        }

        @keyframes expeditionBoost {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          45% { transform: translate3d(5px, -2px, 0) rotate(-0.45deg); }
          70% { transform: translate3d(3px, 0, 0) rotate(0.18deg); }
        }

        @keyframes expeditionTurbo {
          0%, 100% { transform: translate3d(2px, 0, 0) rotate(-0.15deg); }
          50% { transform: translate3d(7px, -2px, 0) rotate(-0.55deg); }
        }

        @keyframes expeditionStall {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          30% { transform: translate3d(-2px, 0, 0) rotate(-0.3deg); }
          70% { transform: translate3d(2px, 0, 0) rotate(0.3deg); }
        }


        @keyframes expeditionWheelDustFlow {
          from { transform: translate3d(5px, 1px, 0) scale(.96); filter: brightness(.98) drop-shadow(0 0 4px rgba(255,209,138,0.12)); }
          to { transform: translate3d(-7px, -1px, 0) scale(1.03); filter: brightness(1.12) drop-shadow(0 0 8px rgba(255,209,138,0.24)); }
        }

        @keyframes expeditionTrailGlow {
          from { transform: translate3d(8px, 0, 0) scaleX(.96) scaleY(.96); filter: saturate(1.08) brightness(1.02) drop-shadow(0 0 7px rgba(255,209,138,0.16)); }
          to { transform: translate3d(-8px, -1px, 0) scaleX(1.04) scaleY(1.02); filter: saturate(1.24) brightness(1.16) drop-shadow(0 0 14px rgba(255,209,138,0.34)); }
        }

        @keyframes expeditionTurboTrailFlow {
          from { transform: translate3d(10px, 0, 0) scaleX(.94) scaleY(.97); opacity: .66; }
          to { transform: translate3d(-12px, -2px, 0) scaleX(1.06) scaleY(1.03); opacity: .92; }
        }

        @keyframes expeditionDust {
          0% { transform: translate3d(16px, 0, 0) scale(0.65); opacity: 0.1; }
          45% { opacity: 0.55; }
          100% { transform: translate3d(-70px, -10px, 0) scale(1.25); opacity: 0; }
        }

        @keyframes expeditionSpeedLines {
          from { background-position: 0 0; }
          to { background-position: -180px 0; }
        }

        @keyframes expeditionLandmarkIn {
          from { opacity: 0; transform: translateY(8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes expeditionCalloutIn {
          from { opacity: 0; transform: translate(-50%, 10px) scale(0.94); }
          to { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }

        @keyframes expeditionTimerPulse {
          from { filter: drop-shadow(0 0 0 rgba(255,209,138,0)); }
          to { filter: drop-shadow(0 0 12px rgba(255,209,138,0.55)); }
        }

        @media (max-width: 1180px) {
          .expedition-hud {
            right: 134px;
            grid-template-columns: minmax(185px, 1fr) minmax(170px, 0.75fr) minmax(300px, 1.35fr) 62px;
            gap: 8px;
          }

          .expedition-category-block,
          .expedition-question-progress,
          .expedition-mini-stats > div {
            min-height: 48px;
          }

          .expedition-category-copy small {
            display: none;
          }

          .expedition-mini-stats > div > span {
            display: none;
          }

          .expedition-quiz-layer {
            top: 72px;
            left: 18px;
            right: 18px;
            gap: 12px;
            height: min(37%, 280px);
          }

          .expedition-question-card {
            min-height: 138px;
            max-height: 205px;
            border-radius: 17px;
            padding: 14px 16px;
          }

          .expedition-option {
            border-radius: 14px;
            padding: 8px 12px;
          }

          .expedition-vehicle-zone {
            width: clamp(205px, 27vw, 365px);
          }
        }

        @media (max-width: 900px) and (orientation: landscape) {
          .expedition-hud {
            top: 6px;
            left: 10px;
            right: 110px;
            grid-template-columns: minmax(150px, 1fr) minmax(140px, 0.72fr) minmax(250px, 1.3fr) 50px;
            gap: 5px;
          }

          .expedition-category-block,
          .expedition-question-progress,
          .expedition-mini-stats > div {
            min-height: 42px;
            border-radius: 12px;
            padding: 5px 8px;
          }

          .expedition-category-icon {
            width: 28px;
            height: 28px;
            border-radius: 9px;
          }

          .expedition-category-copy strong,
          .expedition-question-progress strong,
          .expedition-mini-stats strong {
            font-size: 9px;
          }

          .expedition-progress-dots {
            gap: 4px;
          }

          .expedition-progress-dots span {
            width: 5px;
            height: 5px;
          }

          .expedition-mini-stats small {
            font-size: 6px;
          }

          .expedition-timer {
            width: 44px;
            height: 44px;
          }

          .expedition-timer > div {
            width: 36px;
            height: 36px;
          }

          .expedition-timer strong {
            font-size: 13px;
          }

          .expedition-pause-button {
            min-height: 34px;
            padding: 5px 8px;
          }

          .expedition-pause-button strong {
            display: none;
          }

          .expedition-quiz-layer {
            top: 56px;
            left: 10px;
            right: 10px;
            height: 39%;
            gap: 8px;
          }

          .expedition-question-card {
            min-height: 112px;
            max-height: 148px;
            padding: 10px 11px;
          }

          .expedition-question-card h2 {
            max-height: 88px;
            margin-top: 6px;
            font-size: clamp(14px, 2.25vw, 19px);
          }

          .expedition-question-topline > span {
            font-size: 7px;
          }

          .expedition-hint-button {
            min-height: 25px;
            font-size: 6px;
          }

          .expedition-options-grid {
            gap: 6px;
          }

          .expedition-option {
            border-radius: 10px;
            padding: 5px 8px;
          }

          .expedition-option-letter {
            width: 25px;
            height: 25px;
            font-size: 9px;
          }

          .expedition-option-text {
            font-size: 10px;
          }

          .expedition-answer-feedback {
            gap: 6px;
            padding: 6px 7px;
          }

          .expedition-answer-feedback span {
            display: none;
          }

          .expedition-answer-feedback strong {
            font-size: 9px;
          }

          .expedition-answer-feedback button {
            min-height: 25px;
            font-size: 6px;
          }

          .expedition-vehicle-zone {
            left: 18px;
            bottom: 24.8%;
            width: clamp(170px, 24vw, 280px);
          }

          .expedition-motion-callout {
            bottom: 18%;
            min-width: 130px;
            padding: 7px 12px;
          }

          .expedition-motion-callout strong {
            font-size: 9px;
          }

          .expedition-motion-callout span {
            font-size: 14px;
          }
        }

        @media (orientation: portrait) {
          .expedition-hud {
            top: 8px;
            left: 8px;
            right: 8px;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 6px;
          }

          .expedition-category-block {
            grid-column: 1;
            min-height: 44px;
          }

          .expedition-question-progress {
            display: none;
          }

          .expedition-mini-stats {
            grid-column: 1 / -1;
            order: 3;
          }

          .expedition-timer {
            grid-column: 2;
            grid-row: 1;
            width: 48px;
            height: 48px;
          }

          .expedition-timer > div {
            width: 40px;
            height: 40px;
          }

          .expedition-quiz-layer {
            top: 112px;
            left: 10px;
            right: 10px;
            height: 58%;
            grid-template-columns: 1fr;
            grid-template-rows: minmax(0, 0.72fr) minmax(0, 1.28fr);
            gap: 8px;
          }

          .expedition-question-card {
            min-height: 130px;
            max-height: 180px;
            padding: 12px 14px;
          }

          .expedition-question-card h2 {
            font-size: clamp(17px, 5vw, 24px);
          }

          .expedition-options-grid {
            gap: 6px;
          }

          .expedition-vehicle-zone {
            left: 10px;
            bottom: 18%;
            width: min(50vw, 290px);
          }

          .expedition-motion-callout {
            right: 12px;
            bottom: 18%;
            left: auto;
            transform: none;
          }

          @keyframes expeditionCalloutIn {
            from { opacity: 0; transform: translateY(10px) scale(0.94); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        }


        @media (max-width: 900px) and (orientation: landscape) {
          .expedition-live-landmark-card {
            min-width: 92px;
            max-width: 132px;
            border-radius: 8px;
            padding: 4px 6px;
          }

          .expedition-live-landmark-card strong { font-size: 7px; }
          .expedition-live-landmark-card small { font-size: 6px; }
          .expedition-live-landmark-pin { height: 11px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .expedition-vehicle-zone,
          .expedition-wheel,
          .expedition-effect,
          .expedition-dust,
          .expedition-speed-lines,
          .expedition-motion-callout,
          .expedition-timer {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
