"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

export type ObjectiveScope = "nova" | "milo";
export type ObjectiveScreenMode = "desktop" | "tablet" | "mobile";

export type ObjectiveCardData = {
  id?: string;
  objective_key?: string;
  objective_type?: "referral" | "progress";
  objective_scope?: "global" | ObjectiveScope;
  title?: string;
  description?: string | null;
  reward_dt?: number;
  reward_dg?: number;
  sort_order?: number;
  condition_type?: string;
  condition_config?: Record<string, unknown>;
  current?: number;
  target?: number;
  condition_met?: boolean;
  awaiting_settlement?: boolean;
  assigned_at?: string | null;
};

export type ProgressSettlement = {
  settled?: boolean;
  objective_scope?: ObjectiveScope;
  reason?: string;
  reward_dt?: number;
  reward_dg?: number;
  completed_objective?: ObjectiveCardData | null;
  next_objective?: ObjectiveCardData | null;
};

export type CurrentObjectivesStatus = {
  user_id?: string;
  objective_scope?: ObjectiveScope;
  referral_code?: string | null;
  referral_count?: number;
  active_objective_count?: number;
  completed_objective_count?: number;
  referral_objective?: ObjectiveCardData | null;
  progress_objective?: ObjectiveCardData | null;
  progress_settlement?: ProgressSettlement | null;
};

function objectiveHref(
  objective: ObjectiveCardData | null | undefined,
  scope: ObjectiveScope,
) {
  if (!objective) return null;

  const key = String(objective.objective_key || "");
  const conditionType = String(objective.condition_type || "");

  if (scope === "nova") {
    if (
      key === "progress_unlock_rug_rush" ||
      conditionType === "nova_home_zone_unlocked"
    ) {
      return "/inventor/hub";
    }

    if (
      key.startsWith("progress_knowledge_") ||
      conditionType.startsWith("knowledge_arena_")
    ) {
      return "/learning-missions/knowledge-arena";
    }

    if (
      key.startsWith("progress_rover_level_") ||
      conditionType === "rover_level_completed"
    ) {
      return "/learning-missions/core/rover";
    }

    if (
      key.startsWith("progress_core_") ||
      conditionType === "core_unique_mission_count"
    ) {
      return "/learning-missions/core";
    }

    return null;
  }

  if (
    key.startsWith("progress_milo_mastery_") ||
    conditionType === "milo_mastery_code_solved_count"
  ) {
    return "/milo-world/activity-lab";
  }

  if (
    key.startsWith("progress_milo_quiz_") ||
    conditionType.startsWith("milo_category_")
  ) {
    return "/milo-world/quiz-hall";
  }

  if (
    key.startsWith("progress_milo_stock_") ||
    key.startsWith("progress_milo_trades_") ||
    key.startsWith("progress_milo_property_") ||
    conditionType.startsWith("milo_exchange_")
  ) {
    return "/milo-world/exchange";
  }

  return null;
}

function rewardLabel(objective: ObjectiveCardData | null | undefined) {
  const dt = Math.max(0, Number(objective?.reward_dt || 0));
  const dg = Math.max(0, Number(objective?.reward_dg || 0));

  if (dt > 0 && dg > 0) return `+${dt} DT · +${dg} DG`;
  if (dt > 0) return `+${dt} DT`;
  if (dg > 0) return `+${dg} DG`;
  return "Reward";
}

function progressText(
  objective: ObjectiveCardData | null | undefined,
  kind: "referral" | "progress",
) {
  if (!objective) return "";

  const current = Math.max(0, Number(objective.current || 0));
  const target = Math.max(1, Number(objective.target || 1));

  if (objective.condition_met) return "Completed";

  if (kind === "referral") {
    return `${Math.min(current, target)}/${target} referral${target === 1 ? "" : "s"}`;
  }

  if (target > 1) {
    return `${Math.min(current, target)}/${target} complete`;
  }

  return "In progress";
}

function progressPercent(objective: ObjectiveCardData | null | undefined) {
  if (!objective) return 0;

  const current = Math.max(0, Number(objective.current || 0));
  const target = Math.max(1, Number(objective.target || 1));

  return Math.min(100, Math.max(0, (current / target) * 100));
}

function ObjectiveRow({
  label,
  objective,
  kind,
  scope,
  accent,
}: {
  label: string;
  objective: ObjectiveCardData | null | undefined;
  kind: "referral" | "progress";
  scope: ObjectiveScope;
  accent: string;
}) {
  if (!objective) {
    return (
      <div
        style={{
          minHeight: "76px",
          borderRadius: "16px",
          border: "1px solid rgba(126,232,255,0.12)",
          background: "rgba(255,255,255,0.025)",
          padding: "12px 13px",
        }}
      >
        <span
          style={{
            display: "block",
            color: "rgba(255,255,255,0.38)",
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>

        <strong
          style={{
            display: "block",
            marginTop: "7px",
            color: "rgba(255,255,255,0.65)",
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          {kind === "referral"
            ? "All referral milestones complete"
            : "All current progress objectives complete"}
        </strong>
      </div>
    );
  }

  const href = kind === "referral" ? "/profile" : objectiveHref(objective, scope);
  const percent = progressPercent(objective);

  const rowStyle: CSSProperties = {
    display: "block",
    minHeight: "92px",
    borderRadius: "16px",
    border: `1px solid ${accent}44`,
    background: `linear-gradient(145deg, ${accent}12, rgba(255,255,255,0.025))`,
    padding: "12px 13px",
    color: "white",
    textDecoration: "none",
    boxShadow: `inset 0 0 24px ${accent}08`,
  };

  const content = (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <span
          style={{
            color: accent,
            fontSize: "9px",
            fontWeight: 900,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>

        <strong
          style={{
            color: accent,
            fontSize: "10px",
            whiteSpace: "nowrap",
          }}
        >
          {rewardLabel(objective)}
        </strong>
      </div>

      <strong
        style={{
          display: "block",
          marginTop: "7px",
          color: "white",
          fontSize: "12px",
          lineHeight: 1.35,
        }}
      >
        {objective.title || "Objective"}
      </strong>

      {objective.description && kind === "progress" && (
        <span
          style={{
            display: "block",
            marginTop: "4px",
            color: "rgba(255,255,255,0.48)",
            fontSize: "10px",
            lineHeight: 1.4,
          }}
        >
          {objective.description}
        </span>
      )}

      <div
        style={{
          marginTop: "9px",
          display: "flex",
          alignItems: "center",
          gap: "9px",
        }}
      >
        <div
          style={{
            height: "4px",
            flex: 1,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: "100%",
              borderRadius: "999px",
              background: accent,
              boxShadow: `0 0 12px ${accent}66`,
              transition: "width 300ms ease",
            }}
          />
        </div>

        <span
          style={{
            color: "rgba(255,255,255,0.56)",
            fontSize: "9px",
            whiteSpace: "nowrap",
          }}
        >
          {progressText(objective, kind)}
        </span>
      </div>
    </>
  );

  if (!href) {
    return <div style={rowStyle}>{content}</div>;
  }

  return (
    <Link href={href} style={rowStyle}>
      {content}
    </Link>
  );
}

export default function ObjectivesPanel({
  isLoggedIn,
  status,
  isLoading,
  screenMode,
  scope,
}: {
  isLoggedIn: boolean;
  status: CurrentObjectivesStatus | null;
  isLoading: boolean;
  screenMode: ObjectiveScreenMode;
  scope: ObjectiveScope;
}) {
  const isMobile = screenMode === "mobile";
  const isTablet = screenMode === "tablet";
  const isDesktop = screenMode === "desktop";
  const isMilo = scope === "milo";
  const [isOpen, setIsOpen] = useState(false);

  const activeCount = Math.max(0, Number(status?.active_objective_count || 0));
  const referralCount = Math.max(0, Number(status?.referral_count || 0));
  const settlement = status?.progress_settlement;
  const settlementRewardDt = Math.max(0, Number(settlement?.reward_dt || 0));
  const settlementRewardDg = Math.max(0, Number(settlement?.reward_dg || 0));

  const referralAccent = "#8dfcff";
  const progressAccent = isMilo ? "#ffd18a" : "#c58cff";

  return (
    <aside
      style={{
        position: isMilo && !isDesktop ? "relative" : "fixed",
        top: isMilo
          ? isDesktop
            ? "72px"
            : "auto"
          : isMobile
            ? "108px"
            : isDesktop
              ? "76px"
              : "126px",
        right: isMilo
          ? isDesktop
            ? "28px"
            : "auto"
          : isMobile
            ? "12px"
            : "18px",
        left: !isMilo && isMobile ? "12px" : "auto",
        zIndex: isMilo ? 29 : 69,
        width: isMilo
          ? isMobile
            ? "calc(100% - 24px)"
            : "min(380px, calc(100% - 44px))"
          : isMobile
            ? "auto"
            : "min(380px, calc(100vw - 36px))",
        margin: isMilo
          ? isDesktop
            ? 0
            : isMobile
              ? "10px auto 0"
              : isTablet
                ? "18px 22px 0 auto"
                : 0
          : 0,
        borderRadius: isOpen ? "20px" : "999px",
        border: "1px solid rgba(126,232,255,0.38)",
        background:
          "linear-gradient(145deg, rgba(3,20,39,0.94), rgba(3,10,25,0.96))",
        boxShadow:
          "0 20px 48px rgba(0,0,0,0.38), 0 0 24px rgba(83,215,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        overflow: "hidden",
        color: "white",
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        style={{
          width: "100%",
          minHeight: isMobile ? "50px" : "54px",
          padding: isMobile ? "10px 14px" : "10px 16px",
          border: "none",
          background: "transparent",
          color: "white",
          display: "grid",
          gridTemplateColumns: "36px minmax(0, 1fr) auto",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "12px",
            border: "1px solid rgba(126,232,255,0.42)",
            background: "rgba(83,215,255,0.12)",
            color: "#8dfcff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "16px",
            boxShadow: "0 0 16px rgba(83,215,255,0.14)",
          }}
        >
          ↗
        </span>

        <span style={{ minWidth: 0 }}>
          <strong
            style={{
              display: "block",
              color: "white",
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: 900,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            Objectives
          </strong>

          <span
            style={{
              display: "block",
              marginTop: "3px",
              color: "rgba(255,255,255,0.56)",
              fontSize: isMobile ? "10px" : "11px",
            }}
          >
            {isLoading
              ? "Loading objectives..."
              : isLoggedIn
                ? !status
                  ? "Objectives unavailable"
                  : activeCount > 0
                    ? `${activeCount} active · ${referralCount} successful referral${
                        referralCount === 1 ? "" : "s"
                      }`
                    : "All current objectives complete"
                : "Log in to view objectives"}
          </span>
        </span>

        <span
          aria-hidden="true"
          style={{
            color: "#8dfcff",
            fontSize: "18px",
            transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 180ms ease",
          }}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(126,232,255,0.14)",
            padding: isMobile ? "12px" : "14px",
          }}
        >
          {!isLoggedIn ? (
            <Link
              href="/login"
              style={{
                minHeight: "54px",
                borderRadius: "15px",
                border: "1px solid rgba(126,232,255,0.28)",
                background: "rgba(83,215,255,0.09)",
                color: "white",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "12px 16px",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Log in to view objectives
            </Link>
          ) : isLoading ? (
            <div
              style={{
                padding: "18px",
                color: "rgba(255,255,255,0.58)",
                fontSize: "12px",
                textAlign: "center",
              }}
            >
              Loading objectives...
            </div>
          ) : !status ? (
            <div
              style={{
                padding: "18px",
                borderRadius: "14px",
                background: "rgba(255,255,255,0.035)",
                color: "rgba(255,255,255,0.62)",
                fontSize: "12px",
                lineHeight: 1.5,
                textAlign: "center",
              }}
            >
              Objectives could not be loaded. Refresh the page to try again.
            </div>
          ) : (
            <>
              {settlement?.settled && (
                <div
                  style={{
                    marginBottom: "10px",
                    borderRadius: "14px",
                    border: "1px solid rgba(93,255,181,0.38)",
                    background: "rgba(93,255,181,0.08)",
                    padding: "10px 12px",
                    color: "#b9ffda",
                    fontSize: "10px",
                    fontWeight: 800,
                    lineHeight: 1.45,
                  }}
                >
                  Objective complete
                  {settlementRewardDt > 0 ? ` · +${settlementRewardDt} DT` : ""}
                  {settlementRewardDg > 0 ? ` · +${settlementRewardDg} DG` : ""}
                </div>
              )}

              <p
                style={{
                  margin: "0 2px 12px",
                  color: "rgba(255,255,255,0.55)",
                  fontSize: "11px",
                  lineHeight: 1.5,
                }}
              >
                Complete your current objectives to earn one-time bonuses.
                Referral milestone bonuses are additional to the normal +10 DT
                for each successful referral.
              </p>

              <div style={{ display: "grid", gap: "9px" }}>
                <ObjectiveRow
                  label="Referral Objective"
                  objective={status?.referral_objective}
                  kind="referral"
                  scope={scope}
                  accent={referralAccent}
                />

                <Link
                  href="/profile"
                  style={{
                    minHeight: "40px",
                    borderRadius: "13px",
                    border: "1px solid rgba(126,232,255,0.2)",
                    background: "rgba(83,215,255,0.07)",
                    color: "#bdf6ff",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  View and copy referral code
                </Link>

                <ObjectiveRow
                  label="Progress Objective"
                  objective={status?.progress_objective}
                  kind="progress"
                  scope={scope}
                  accent={progressAccent}
                />
              </div>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
