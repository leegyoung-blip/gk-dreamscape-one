"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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
  stage: "playing" | "answered";
  selectedAnswer: AnswerLetter | null;
  hiddenOptions: AnswerLetter[];
  message?: string;
  isGuest: boolean;
  guestHintUsed: boolean;
  onAnswer: (answer: AnswerLetter) => void;
  onHint: () => void;
  onNext: () => void;
};

const EXPEDITION_METRES_PER_POINT = 10;
const MAX_EXPEDITION_POINTS = 1000;
const WORLD_CYCLE_WIDTH_VH = 900;
const WORLD_IMAGES = [
  "/milo-world/activities/categories/expedition/world-01.png",
  "/milo-world/activities/categories/expedition/world-02.png",
  "/milo-world/activities/categories/expedition/world-03.png",
] as const;

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
  stage,
  selectedAnswer,
  hiddenOptions,
  message,
  isGuest,
  guestHintUsed,
  onAnswer,
  onHint,
  onNext,
}: ExpeditionQuizProps) {
  const [displayPoints, setDisplayPoints] = useState(points);
  const displayPointsRef = useRef(points);
  const animationFrameRef = useRef<number | null>(null);
  const motion = stage === "answered" ? getExpeditionMotion(lastPoints) : "idle";
  const isCorrect = selectedAnswer === question.correct_option;

  const options = useMemo(
    () =>
      (["A", "B", "C", "D"] as const).map((letter) => ({
        letter,
        text: getOptionText(question, letter),
      })),
    [question],
  );

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

    const target = points;
    const start = displayPointsRef.current;

    if (target <= start || stage !== "answered") {
      displayPointsRef.current = target;
      setDisplayPoints(target);
      return;
    }

    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      displayPointsRef.current = target;
      setDisplayPoints(target);
      return;
    }

    const duration = motion === "turbo" ? 1750 : motion === "boost" ? 1500 : 1250;
    const startedAt = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = start + (target - start) * eased;

      displayPointsRef.current = next;
      setDisplayPoints(next);

      if (progress < 1) {
        animationFrameRef.current = window.requestAnimationFrame(animate);
      } else {
        displayPointsRef.current = target;
        setDisplayPoints(target);
        animationFrameRef.current = null;
      }
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
  }, [points, stage, motion]);

  const progress = Math.min(Math.max(displayPoints / MAX_EXPEDITION_POINTS, 0), 1);
  const worldOffsetVh = progress * WORLD_CYCLE_WIDTH_VH;
  const displayMetres = displayPoints * EXPEDITION_METRES_PER_POINT;
  const earnedMetres = lastPoints * EXPEDITION_METRES_PER_POINT;
  const timerProgress = stage === "answered"
    ? Math.min(1, Math.max(0, nextCountdown / 3))
    : Math.min(1, Math.max(0, countdown / timerSeconds));

  return (
    <div className={`expedition-root expedition-motion--${motion}`}>
      <div className="expedition-world" aria-hidden="true">
        <div
          className="expedition-world-track"
          style={{ transform: `translate3d(-${worldOffsetVh}vh, 0, 0)` }}
        >
          {[...WORLD_IMAGES, ...WORLD_IMAGES].map((src, index) => (
            <img
              key={`${src}-${index}`}
              src={src}
              alt=""
              draggable={false}
              className="expedition-world-tile"
            />
          ))}
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

        <div
          className={`expedition-timer ${countdown <= Math.ceil(timerSeconds * 0.3) && stage === "playing" ? "is-low" : ""}`}
          style={{
            background: `conic-gradient(#ffd18a ${timerProgress * 360}deg, rgba(255,255,255,0.10) 0deg)`,
          }}
        >
          <div>
            <strong>{stage === "answered" ? nextCountdown : countdown}</strong>
            <small>{stage === "answered" ? "NEXT" : "SEC"}</small>
          </div>
        </div>
      </div>

      <div className="expedition-quiz-layer">
        <section className="expedition-question-card">
          <div className="expedition-question-topline">
            <span>Question</span>
            {isGuest && (
              <button
                type="button"
                onClick={onHint}
                disabled={guestHintUsed || stage === "answered"}
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

          {stage === "answered" && (
            <div className={`expedition-answer-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
              <strong>{isCorrect ? "Correct" : selectedAnswer ? "Not quite" : "Time's up"}</strong>
              {question.explanation && <span>{question.explanation}</span>}
              <button type="button" onClick={onNext}>
                {questionNumber >= questionCount ? "See Results →" : "Next Question →"}
              </button>
            </div>
          )}
        </section>

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
                disabled={stage === "answered" || isEliminated}
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

      <div className="expedition-vehicle-zone" aria-hidden="true">
        <div className="expedition-dust expedition-dust--one" />
        <div className="expedition-dust expedition-dust--two" />
        <img
          src="/milo-world/activities/categories/expedition/milo-vehicle.png"
          alt=""
          draggable={false}
          className="expedition-vehicle"
        />
      </div>

      {stage === "answered" && (
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
          display: block;
          width: 300vh;
          height: 100%;
          flex: 0 0 300vh;
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

        .expedition-motion--boost .expedition-speed-lines,
        .expedition-motion--turbo .expedition-speed-lines {
          opacity: 1;
          animation: expeditionSpeedLines 360ms linear infinite;
        }

        .expedition-motion--turbo .expedition-speed-lines {
          opacity: 0.9;
          animation-duration: 190ms;
        }

        .expedition-hud {
          position: absolute;
          top: 10px;
          left: 18px;
          right: 168px;
          z-index: 8;
          display: grid;
          grid-template-columns: minmax(210px, 1.1fr) minmax(210px, 0.8fr) minmax(360px, 1.5fr) 76px;
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

        .expedition-quiz-layer {
          position: absolute;
          top: 82px;
          left: clamp(22px, 4vw, 66px);
          right: clamp(22px, 4vw, 66px);
          z-index: 7;
          display: grid;
          grid-template-columns: minmax(0, 0.93fr) minmax(0, 1.07fr);
          gap: 18px;
          height: min(48%, 420px);
          pointer-events: auto;
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
          min-height: 0;
          overflow: hidden;
          border-radius: 22px;
          padding: clamp(18px, 2.4vw, 30px);
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
          max-height: calc(100% - 44px);
          margin: 14px 0 0;
          overflow-y: auto;
          color: white;
          font-size: clamp(22px, 2.4vw, 34px);
          font-weight: 850;
          line-height: 1.30;
          scrollbar-width: none;
        }

        .expedition-question-card h2::-webkit-scrollbar {
          display: none;
        }

        .expedition-inline-message {
          position: absolute;
          right: 18px;
          bottom: 14px;
          left: 18px;
          margin: 0;
          color: #ffd18a;
          font-size: 10px;
          font-weight: 800;
          line-height: 1.4;
        }

        .expedition-answer-feedback {
          position: absolute;
          right: 14px;
          bottom: 14px;
          left: 14px;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 10px;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 14px;
          background: rgba(3, 12, 28, 0.90);
          padding: 9px 10px;
          box-shadow: 0 10px 28px rgba(0,0,0,0.24);
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
          grid-template-rows: repeat(4, minmax(0, 1fr));
          gap: 10px;
        }

        .expedition-option {
          display: flex;
          min-height: 0;
          align-items: center;
          gap: 12px;
          overflow: hidden;
          border-radius: 18px;
          padding: 10px 18px;
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
          font-size: clamp(12px, 1.25vw, 16px);
          font-weight: 800;
          line-height: 1.35;
          text-overflow: ellipsis;
        }

        .expedition-eliminated-label {
          flex: 0 0 auto;
          color: #ffd18a;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .expedition-vehicle-zone {
          position: absolute;
          left: clamp(20px, 4.5vw, 78px);
          bottom: 25.4%;
          z-index: 5;
          width: clamp(250px, 28vw, 520px);
          pointer-events: none;
          transform-origin: 45% 100%;
          will-change: transform;
        }

        .expedition-vehicle {
          position: relative;
          z-index: 2;
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 20px 18px rgba(0,0,0,0.30));
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
          animation: expeditionCruise 420ms ease-in-out 3;
        }

        .expedition-motion--boost .expedition-vehicle-zone {
          animation: expeditionBoost 350ms ease-in-out 4;
        }

        .expedition-motion--turbo .expedition-vehicle-zone {
          animation: expeditionTurbo 220ms ease-in-out 7;
        }

        .expedition-motion--stall .expedition-vehicle-zone {
          animation: expeditionStall 120ms ease-in-out 5;
        }

        .expedition-motion--cruise .expedition-dust,
        .expedition-motion--boost .expedition-dust,
        .expedition-motion--turbo .expedition-dust {
          opacity: 1;
          animation: expeditionDust 720ms ease-out infinite;
        }

        .expedition-motion--turbo .expedition-dust {
          opacity: 0.95;
          animation-duration: 430ms;
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
          padding: 10px 18px;
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
          50% { transform: translate3d(5px, -3px, 0) rotate(-0.6deg); }
        }

        @keyframes expeditionBoost {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          45% { transform: translate3d(12px, -5px, 0) rotate(-1.2deg); }
          70% { transform: translate3d(7px, 1px, 0) rotate(0.5deg); }
        }

        @keyframes expeditionTurbo {
          0%, 100% { transform: translate3d(4px, 0, 0) rotate(-0.4deg); }
          50% { transform: translate3d(20px, -5px, 0) rotate(-1.5deg); }
        }

        @keyframes expeditionStall {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          25% { transform: translate3d(-4px, 1px, 0) rotate(-0.8deg); }
          75% { transform: translate3d(4px, -1px, 0) rotate(0.8deg); }
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
            height: min(49%, 380px);
          }

          .expedition-question-card {
            border-radius: 17px;
            padding: 16px;
          }

          .expedition-option {
            border-radius: 14px;
            padding: 8px 12px;
          }

          .expedition-vehicle-zone {
            width: clamp(230px, 31vw, 420px);
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

          .expedition-quiz-layer {
            top: 56px;
            left: 10px;
            right: 10px;
            height: 51%;
            gap: 8px;
          }

          .expedition-question-card {
            padding: 11px;
          }

          .expedition-question-card h2 {
            margin-top: 7px;
            font-size: clamp(15px, 2.5vw, 21px);
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
            right: 8px;
            bottom: 8px;
            left: 8px;
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
            width: clamp(190px, 28vw, 320px);
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
            padding: 14px;
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
            width: min(58vw, 330px);
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

        @media (prefers-reduced-motion: reduce) {
          .expedition-vehicle-zone,
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
