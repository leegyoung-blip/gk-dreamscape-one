"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export const NOVA_WORLD_HREF = "/inventor";
export const DAILY_LIMIT = 3;
export const CLUE_COST = 5;
export const COLOUR_MAX_ATTEMPTS = 15;
export const TOWER_MAX_ATTEMPTS = 5;

export type GameId = "colour-code" | "set-finder" | "tower-memory";
export type ScreenMode = "desktop" | "tablet" | "mobile";
export type DailyLevelNumber = 1 | 2 | 3;

export type ColourOption = {
  id: string;
  name: string;
  hex: string;
};

export type GameDefinition = {
  id: GameId;
  title: string;
  shortTitle: string;
  description: string;
  skill: string;
  icon: string;
  accent: string;
  rewardText: string;
  machineName: string;
};

export type DailyLevelStatus = {
  completed: boolean;
  clues: number;
  reward: number;
};

export type DailyGameStatus = {
  completed: number;
  clues: number;
  levels: Record<DailyLevelNumber, DailyLevelStatus>;
};

export type LabStatus = {
  activityDate: string;
  tokenBalance: number;
  totalSessions: number;
  bestScore: number;
  games: Record<GameId, DailyGameStatus>;
};

export type CompletionResult = {
  reward: number;
  tokenBalance: number;
  completedCount: number;
};

export type ClueResult = {
  clueCost: number;
  cluesUsed: number;
  tokenBalance: number;
};


export const COLOURS: ColourOption[] = [
  { id: "blue", name: "Blue", hex: "#45A7FF" },
  { id: "yellow", name: "Yellow", hex: "#FFD84A" },
  { id: "pink", name: "Pink", hex: "#FF6FB5" },
  { id: "green", name: "Green", hex: "#57D58A" },
  { id: "purple", name: "Purple", hex: "#9B7CFF" },
  { id: "orange", name: "Orange", hex: "#FF9F43" },
];

export const GAME_DEFINITIONS: GameDefinition[] = [
  {
    id: "colour-code",
    title: "Colour Code",
    shortTitle: "Colour Code",
    description:
      "Crack a four-light code across Easy, Medium, and Hard levels.",
    skill: "Deduction",
    icon: "●",
    accent: "#66D9FF",
    rewardText: "5 / 10 / 15 DT",
    machineName: "Code Decoder",
  },
  {
    id: "set-finder",
    title: "SET Finder",
    shortTitle: "SET Finder",
    description:
      "Compare colour, shape, number, and pattern to find three valid SETs.",
    skill: "Flexible thinking",
    icon: "◇",
    accent: "#A98BFF",
    rewardText: "20 DT each",
    machineName: "Pattern Scanner",
  },
  {
    id: "tower-memory",
    title: "Tower Memory",
    shortTitle: "Tower Memory",
    description:
      "Study and rebuild towers that grow from four to six and then eight blocks.",
    skill: "Working memory",
    icon: "▦",
    accent: "#6FE7B1",
    rewardText: "5 / 10 / 15 DT",
    machineName: "Memory Forge",
  },
];



function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

export function seededRandom(seedText: string) {
  let seed = hashString(seedText);

  return function random() {
    seed += 0x6d2b79f5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export function seededShuffle<T>(items: T[], seedText: string) {
  const random = seededRandom(seedText);
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }

  return copy;
}

export function colourById(id: string) {
  return COLOURS.find((colour) => colour.id === id) ?? COLOURS[0];
}

export function makeSeed(
  userId: string,
  activityDate: string,
  gameId: GameId,
  questionNumber: number,
  suffix = ""
) {
  return `${userId}:${activityDate}:${gameId}:${questionNumber}:${suffix}`;
}

export function dailyLevelName(level: DailyLevelNumber) {
  if (level === 1) return "Easy";
  if (level === 2) return "Medium";
  return "Hard";
}

export function rewardForDailyLevel(level: DailyLevelNumber) {
  if (level === 1) return 5;
  if (level === 2) return 10;
  return 15;
}

export function colourCountForLevel(level: DailyLevelNumber) {
  if (level === 1) return 4;
  if (level === 2) return 5;
  return 6;
}


export function formatSupabaseError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Something went wrong. Please try again.";
}

export function towerSizeForQuestion(questionNumber: number) {
  if (questionNumber === 1) return 4;
  if (questionNumber === 2) return 6;
  return 8;
}

export function GamePanel({
  children,
  top,
}: {
  children: ReactNode;
  top?: ReactNode;
}) {
  return (
    <div className="game-panel">
      {top && <div className="game-panel-top">{top}</div>}
      <div className="game-panel-body">{children}</div>

      <style jsx>{`
        .game-panel {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          border-radius: 24px;
          border: 1px solid rgba(137, 215, 255, 0.13);
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.018)
            ),
            rgba(3, 11, 24, 0.58);
          overflow: hidden;
        }

        .game-panel-top {
          flex: 0 0 auto;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(137, 215, 255, 0.1);
          background: rgba(255, 255, 255, 0.025);
        }

        .game-panel-body {
          flex: 1 1 auto;
          min-height: 0;
          padding: 10px;
          overflow: hidden;
        }

        @media (max-width: 760px) {
          .game-panel {
            border-radius: 12px;
          }

          .game-panel-top {
            padding: 6px 8px;
          }

          .game-panel-body {
            padding: 6px;
          }
        }
      `}</style>
    </div>
  );
}

export function InstructionBar({
  items,
}: {
  items: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="instruction-bar">
      {items.map((item) => (
        <div className="instruction-item" key={`${item.label}-${item.value}`}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
        </div>
      ))}

      <style jsx>{`
        .instruction-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          flex-wrap: nowrap;
        }

        .instruction-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(235, 247, 255, 0.62);
          font-size: 9px;
          font-weight: 750;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .instruction-item strong {
          color: white;
          font-size: 13px;
        }
      `}</style>
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  secondary = false,
  highlighted = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
  highlighted?: boolean;
}) {
  return (
    <button
      type="button"
      className={`primary-button ${secondary ? "is-secondary" : ""} ${
        highlighted ? "is-highlighted" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}

      <style jsx>{`
        .primary-button {
          min-height: 40px;
          padding: 0 15px;
          border-radius: 15px;
          border: 1px solid rgba(153, 230, 255, 0.46);
          background: linear-gradient(135deg, #2fbcf4, #596dff);
          color: white;
          font: inherit;
          font-size: 12px;
          font-weight: 850;
          cursor: pointer;
          box-shadow: 0 14px 28px rgba(42, 135, 255, 0.25);
          transition:
            transform 170ms ease,
            opacity 170ms ease;
        }

        .primary-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .primary-button:disabled {
          opacity: 0.38;
          cursor: not-allowed;
          box-shadow: none;
        }

        .primary-button.is-secondary {
          border-color: rgba(137, 215, 255, 0.2);
          background: rgba(255, 255, 255, 0.055);
          box-shadow: none;
          color: rgba(241, 249, 255, 0.82);
        }

        .primary-button.is-highlighted {
          position: relative;
          z-index: 125;
          border-color: rgba(255, 224, 126, 0.82);
          background: rgba(255, 211, 110, 0.16);
          color: #ffe8a8;
          box-shadow:
            0 0 0 3px rgba(255, 211, 110, 0.1),
            0 0 30px rgba(255, 211, 110, 0.34);
          filter: brightness(1.18);
          animation: clueGlow 1.4s ease-in-out infinite alternate;
        }

        @keyframes clueGlow {
          from {
            box-shadow:
              0 0 0 3px rgba(255,211,110,.08),
              0 0 18px rgba(255,211,110,.22);
          }
          to {
            box-shadow:
              0 0 0 5px rgba(255,211,110,.14),
              0 0 34px rgba(255,211,110,.42);
          }
        }
      `}</style>
    </button>
  );
}

export function RewardResult({
  title,
  text,
  reward,
  isGuest = false,
  score,
  isLastQuestion,
  onContinue,
}: {
  title: string;
  text: string;
  reward: number;
  isGuest?: boolean;
  score: number;
  isLastQuestion: boolean;
  onContinue: () => void;
}) {
  return (
    <div className="result-card">
      <span className="result-star" aria-hidden="true">
        ✦
      </span>
      <p>Challenge complete</p>
      <h3>{title}</h3>

      <div className="reward-row">
        <div>
          <strong>{isGuest ? `${reward} DT` : `+${reward} DT`}</strong>
          <small>{isGuest ? "Log in to collect" : "Dream Tokens"}</small>
        </div>
        <div>
          <strong>{score}</strong>
          <small>Score</small>
        </div>
      </div>

      <p className="result-copy">{text}</p>
      {isGuest && (
        <Link
          href="/login"
          style={{
            margin: "0 0 12px",
            color: "#8ee8ff",
            fontSize: "12px",
            fontWeight: 850,
            textDecoration: "none",
          }}
        >
          Log in to collect rewards and save progress →
        </Link>
      )}
      <PrimaryButton onClick={onContinue}>
        {isLastQuestion ? "View daily completion" : "Play next challenge"}
      </PrimaryButton>

      <style jsx>{`
        .result-card {
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 18px 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .result-star {
          width: 48px;
          height: 48px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(126, 224, 255, 0.38);
          background: rgba(89, 182, 255, 0.12);
          color: #83e5ff;
          font-size: 22px;
          box-shadow: 0 0 34px rgba(85, 201, 255, 0.18);
        }

        .result-card > p:first-of-type {
          margin: 10px 0 0;
          color: #79defc;
          font-size: 12px;
          font-weight: 900;
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .result-card h3 {
          margin: 8px 0 0;
          font-size: clamp(28px, 5vw, 44px);
          letter-spacing: -0.045em;
        }

        .reward-row {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(2, minmax(130px, 1fr));
          gap: 12px;
        }

        .reward-row > div {
          padding: 10px 15px;
          display: grid;
          gap: 3px;
          border-radius: 16px;
          border: 1px solid rgba(127, 221, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
        }

        .reward-row strong {
          color: #8ee8ff;
          font-size: 21px;
        }

        .reward-row small {
          color: rgba(235, 247, 255, 0.46);
          font-size: 10px;
          font-weight: 850;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        .result-copy {
          max-width: 480px;
          margin: 13px 0 15px;
          color: rgba(235, 246, 255, 0.66);
          line-height: 1.55;
        }

        @media (max-width: 500px) {
          .result-card {
            padding-left: 10px;
            padding-right: 10px;
          }

          .reward-row {
            width: 100%;
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
}

export function LoadingPanel() {
  return (
    <GamePanel>
      <div className="state-panel">
        <span className="spinner" />
        <h3>Loading today’s games</h3>
        <p>Nova is preparing your daily challenges.</p>
      </div>

      <style jsx>{`
        .state-panel {
          width: 100%;
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .spinner {
          width: 42px;
          height: 42px;
          border-radius: 999px;
          border: 3px solid rgba(126, 224, 255, 0.13);
          border-top-color: #7fe2ff;
          animation: spin 800ms linear infinite;
        }

        h3 {
          margin: 19px 0 0;
          font-size: 25px;
        }

        p {
          margin: 8px 0 0;
          color: rgba(235, 247, 255, 0.56);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </GamePanel>
  );
}

export function LoginPanel() {
  return (
    <GamePanel>
      <div className="login-panel">
        <span aria-hidden="true">✦</span>
        <h3>Log in to play daily games</h3>
        <p>
          Daily limits, clues, rewards, and progress are connected to your
          Dreamscape profile.
        </p>
        <Link href="/login">Go to login</Link>
      </div>

      <style jsx>{`
        .login-panel {
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .login-panel > span {
          color: #80e4ff;
          font-size: 42px;
        }

        h3 {
          margin: 14px 0 0;
          font-size: 29px;
        }

        p {
          max-width: 480px;
          margin: 11px 0 22px;
          color: rgba(235, 247, 255, 0.58);
          line-height: 1.55;
        }

        a {
          min-height: 46px;
          padding: 0 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 14px;
          background: linear-gradient(135deg, #2fbcf4, #596dff);
          color: white;
          font-weight: 850;
          text-decoration: none;
        }
      `}</style>
    </GamePanel>
  );
}

export function DailyCompletePanel({
  game,
  countdown,
}: {
  game: GameDefinition;
  countdown: string;
}) {
  return (
    <GamePanel
      top={
        <InstructionBar
          items={[
            { label: "Daily progress", value: "3/3" },
            { label: "Status", value: "Complete" },
          ]}
        />
      }
    >
      <div className="daily-complete">
        <span className="complete-icon" aria-hidden="true">
          ✓
        </span>
        <p>Today’s {game.shortTitle}</p>
        <h3>All three challenges complete</h3>
        <p className="complete-copy">
          Your next three challenges will become available automatically at
          midnight Singapore time.
        </p>
        <div className="countdown-box">
          <small>Next reset</small>
          <strong>{countdown}</strong>
        </div>
      </div>

      <style jsx>{`
        .daily-complete {
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 32px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .complete-icon {
          width: 64px;
          height: 64px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(111, 231, 177, 0.42);
          background: rgba(73, 198, 139, 0.12);
          color: #8ff1c0;
          font-size: 30px;
          box-shadow: 0 0 34px rgba(73, 198, 139, 0.18);
        }

        .daily-complete > p:first-of-type {
          margin: 18px 0 0;
          color: #82e5ff;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
        }

        h3 {
          margin: 8px 0 0;
          font-size: clamp(29px, 5vw, 44px);
          letter-spacing: -0.04em;
        }

        .complete-copy {
          max-width: 500px;
          margin: 16px 0 22px;
          color: rgba(235, 247, 255, 0.62);
          line-height: 1.55;
        }

        .countdown-box {
          min-width: 210px;
          padding: 14px 18px;
          display: grid;
          gap: 4px;
          border-radius: 16px;
          border: 1px solid rgba(126, 224, 255, 0.16);
          background: rgba(255, 255, 255, 0.035);
        }

        .countdown-box small {
          color: rgba(235, 247, 255, 0.43);
          font-size: 9px;
          font-weight: 850;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .countdown-box strong {
          color: #8ee8ff;
          font-size: 26px;
          letter-spacing: 0.06em;
        }
      `}</style>
    </GamePanel>
  );
}

export function DailyLevelTabs({
  selectedLevel,
  levelStatuses,
  game,
  onSelectLevel,
}: {
  selectedLevel: DailyLevelNumber;
  levelStatuses: Record<DailyLevelNumber, DailyLevelStatus>;
  game: "colour-code" | "tower-memory";
  onSelectLevel: (level: DailyLevelNumber) => void;
}) {
  const levels = [1, 2, 3] as DailyLevelNumber[];

  return (
    <div className="daily-level-tabs" aria-label="Choose daily level">
      {levels.map((level) => {
        const selected = selectedLevel === level;
        const completed = levelStatuses[level].completed;
        const detail =
          game === "colour-code"
            ? `${colourCountForLevel(level)} colours`
            : `${towerSizeForQuestion(level)} blocks`;

        return (
          <button
            type="button"
            key={level}
            className={`${selected ? "is-selected" : ""} ${
              completed ? "is-complete" : ""
            }`}
            onClick={() => onSelectLevel(level)}
            aria-pressed={selected}
          >
            <span className="level-status" aria-hidden="true">
              {completed ? "✓" : level}
            </span>
            <span className="level-copy">
              <strong>{dailyLevelName(level)}</strong>
              <small>
                {detail} · {rewardForDailyLevel(level)} DT
              </small>
            </span>
          </button>
        );
      })}

      <style jsx>{`
        .daily-level-tabs {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
        }
        .daily-level-tabs button {
          min-width: 0;
          min-height: 42px;
          padding: 5px 9px;
          display: grid;
          grid-template-columns: 27px minmax(0, 1fr);
          align-items: center;
          gap: 7px;
          border-radius: 12px;
          border: 1px solid rgba(137, 215, 255, 0.14);
          background: rgba(255, 255, 255, 0.035);
          color: white;
          font: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            transform 160ms ease;
        }
        .daily-level-tabs button:hover {
          transform: translateY(-1px);
          border-color: rgba(126, 224, 255, 0.38);
        }
        .daily-level-tabs button.is-selected {
          border-color: rgba(126, 224, 255, 0.66);
          background: rgba(83, 198, 255, 0.12);
          box-shadow: inset 0 0 18px rgba(83, 198, 255, 0.06);
        }
        .daily-level-tabs button.is-complete {
          border-color: rgba(111, 231, 177, 0.28);
        }
        .level-status {
          width: 27px;
          height: 27px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          border: 1px solid rgba(126, 224, 255, 0.22);
          background: rgba(126, 224, 255, 0.075);
          color: #8ee8ff;
          font-size: 10px;
          font-weight: 900;
        }
        button.is-complete .level-status {
          border-color: rgba(111, 231, 177, 0.32);
          background: rgba(111, 231, 177, 0.1);
          color: #8ff1c0;
        }
        .level-copy {
          min-width: 0;
          display: grid;
          gap: 2px;
        }
        .level-copy strong {
          overflow: hidden;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .level-copy small {
          overflow: hidden;
          color: rgba(235, 247, 255, 0.5);
          font-size: 9px;
          font-weight: 750;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        @media (max-width: 720px) {
          .daily-level-tabs { gap: 4px; }
          .daily-level-tabs button {
            min-height: 36px;
            padding: 4px 5px;
            grid-template-columns: 22px minmax(0, 1fr);
            gap: 4px;
            border-radius: 9px;
          }
          .level-status {
            width: 22px;
            height: 22px;
            border-radius: 7px;
            font-size: 8px;
          }
          .level-copy strong { font-size: 9px; }
          .level-copy small { font-size: 6px; }
        }
      `}</style>
    </div>
  );
}

export function CompletedSelectedLevel({
  gameTitle,
  level,
  detail,
  reward,
  isGuest = false,
}: {
  gameTitle: string;
  level: DailyLevelNumber;
  detail: string;
  reward: number;
  isGuest?: boolean;
}) {
  return (
    <div className="selected-level-complete">
      <span aria-hidden="true">✓</span>
      <p>{dailyLevelName(level)} level complete</p>
      <h3>{gameTitle}</h3>
      <strong>
        {detail} · {isGuest ? `${reward} DT available when signed in` : `${reward} DT collected`}
      </strong>
      <small>Select another level above to continue today.</small>

      <style jsx>{`
        .selected-level-complete {
          width: 100%;
          height: 100%;
          min-height: 0;
          padding: 22px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }
        .selected-level-complete > span {
          width: 58px;
          height: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          border: 1px solid rgba(111, 231, 177, 0.42);
          background: rgba(73, 198, 139, 0.12);
          color: #8ff1c0;
          font-size: 27px;
          box-shadow: 0 0 32px rgba(73, 198, 139, 0.16);
        }
        .selected-level-complete p {
          margin: 14px 0 0;
          color: #8ff1c0;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }
        .selected-level-complete h3 {
          margin: 7px 0 0;
          font-size: clamp(28px, 5vw, 44px);
          letter-spacing: -0.04em;
        }
        .selected-level-complete strong {
          margin-top: 12px;
          color: #ffe39a;
          font-size: 15px;
        }
        .selected-level-complete small {
          margin-top: 10px;
          color: rgba(235, 247, 255, 0.58);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
}

