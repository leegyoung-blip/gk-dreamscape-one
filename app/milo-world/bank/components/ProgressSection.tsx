"use client";

import type { FinancialProgressSnapshot } from "../lib/financial-progress-types";
import type { BankScreenMode } from "../lib/bank-types";
import BankJourneyBar from "./BankJourneyBar";
import MiloFinanceBadge from "./MiloFinanceBadge";

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ProgressSection({
  screenMode,
  unlockedCount,
  totalCount,
  progressPercent,
  milestonesLoading,
  progress,
  progressLoading,
  progressError,
  onRetryProgress,
  onOpenAchievements,
  onOpenGuide,
  hasMiloFinanceAccess,
  accessLoading,
  onOpenUpgrade,
}: {
  screenMode: BankScreenMode;
  unlockedCount: number;
  totalCount: number;
  progressPercent: number;
  milestonesLoading: boolean;
  progress: FinancialProgressSnapshot;
  progressLoading: boolean;
  progressError: string | null;
  onRetryProgress: () => void;
  onOpenAchievements: () => void;
  onOpenGuide: () => void;
  hasMiloFinanceAccess: boolean;
  accessLoading: boolean;
  onOpenUpgrade: () => void;
}) {
  const isMobile = screenMode === "mobile";
  const compact = screenMode !== "desktop";

  return (
    <div style={{ marginTop: "18px" }}>
      <section
        style={{
          borderRadius: isMobile ? "22px" : "26px",
          border: "1px solid rgba(255,209,138,0.15)",
          background:
            "linear-gradient(145deg, rgba(45,32,17,0.50), rgba(5,10,27,0.92))",
          padding: isMobile ? "19px" : "22px 24px",
        }}
      >
        <p style={eyebrowStyle}>Financial Development</p>
        <h2
          style={{
            margin: "7px 0 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: isMobile ? "38px" : "48px",
            lineHeight: 0.98,
            fontWeight: 500,
            letterSpacing: "-0.035em",
          }}
        >
          My Progress
        </h2>
        <p
          style={{
            margin: "11px 0 0",
            maxWidth: "800px",
            color: "rgba(255,255,255,0.54)",
            fontSize: "12px",
            lineHeight: 1.65,
          }}
        >
          Follow completed learning, real Bank actions and the evidence behind your developing
          financial skills. Milo Finance will build this profile from what you actually do—not from
          a single overall quiz percentage.
        </p>
      </section>

      <BankJourneyBar
        screenMode={screenMode}
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        progressPercent={progressPercent}
        loading={milestonesLoading}
        onOpenAchievements={onOpenAchievements}
        onOpenGuide={onOpenGuide}
      />

      {progressError && (
        <div
          role="alert"
          style={{
            marginTop: "12px",
            borderRadius: "15px",
            border: "1px solid rgba(255,121,121,0.22)",
            background: "rgba(244,91,91,0.07)",
            padding: "13px 15px",
            color: "#ffc0c0",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span>{progressError}</span>
          <button type="button" onClick={onRetryProgress} style={retryStyle}>
            Try Again
          </button>
        </div>
      )}

      <section
        style={{
          marginTop: "14px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0,1fr))",
          gap: "10px",
        }}
      >
        <SummaryCard
          label="Financial Foundations"
          value={progressLoading ? "—" : `${progress.foundationCompleted} / ${progress.foundationTotal}`}
          detail="Lessons completed"
          accent="#8ee8ff"
        />
        <SummaryCard
          label="Applied finance"
          value={progressLoading ? "—" : String(progress.appliedActions)}
          detail="Goals, targets, Bonds and collected returns"
          accent="#9fffd2"
        />
        <SummaryCard
          label="Milestones"
          value={milestonesLoading ? "—" : `${unlockedCount} / ${totalCount}`}
          detail="Bank journey milestones unlocked"
          accent="#ffd18a"
        />
      </section>

      <section
        style={{
          marginTop: "14px",
          borderRadius: "22px",
          border: hasMiloFinanceAccess
            ? "1px solid rgba(159,255,210,0.14)"
            : "1px solid rgba(255,209,138,0.14)",
          background: hasMiloFinanceAccess
            ? "linear-gradient(145deg, rgba(95,255,180,0.045), rgba(4,13,29,0.74))"
            : "linear-gradient(145deg, rgba(255,209,138,0.04), rgba(4,13,29,0.74))",
          padding: isMobile ? "18px" : "20px 21px",
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
          gap: "14px",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
            <p style={{ ...eyebrowStyle, color: "#ffd18a" }}>Advanced Financial Profile</p>
            <MiloFinanceBadge active={hasMiloFinanceAccess} compact />
          </div>
          <h3
            style={{
              margin: "7px 0 0",
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: "26px",
              fontWeight: 500,
            }}
          >
            Deeper evidence, trends and skill development.
          </h3>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.46)", fontSize: "10px", lineHeight: 1.55 }}>
            The free profile keeps core evidence and milestones. Milo Finance will add deeper skill stages, simulation analysis, learning trends and future certificates as the new learning engine comes online.
          </p>
        </div>
        {!hasMiloFinanceAccess && (
          <button
            type="button"
            onClick={onOpenUpgrade}
            disabled={accessLoading}
            style={{
              minHeight: "42px",
              padding: "0 14px",
              borderRadius: "12px",
              border: "1px solid rgba(255,209,138,0.26)",
              background: "rgba(255,190,90,0.06)",
              color: "#ffd18a",
              cursor: accessLoading ? "wait" : "pointer",
              fontFamily: "inherit",
              fontSize: "8px",
              fontWeight: 900,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
            }}
          >
            {accessLoading ? "Checking access…" : "Explore Milo Finance →"}
          </button>
        )}
      </section>

      <section
        style={{
          marginTop: "14px",
          borderRadius: "22px",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(4,13,29,0.76)",
          padding: isMobile ? "18px" : "21px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "14px",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ ...eyebrowStyle, color: "rgba(255,255,255,0.36)" }}>Financial Skills</p>
            <h3
              style={{
                margin: "6px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "28px",
                fontWeight: 500,
              }}
            >
              Evidence, not just scores.
            </h3>
          </div>
          <span style={sectionMetaStyle}>Early profile</span>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "grid",
            gridTemplateColumns: isMobile
              ? "1fr"
              : compact
                ? "repeat(2, minmax(0,1fr))"
                : "repeat(5, minmax(0,1fr))",
            gap: "8px",
          }}
        >
          {progress.skills.map((skill) => {
            const hasEvidence = skill.evidence.length > 0;
            return (
              <div
                key={skill.id}
                style={{
                  minHeight: "150px",
                  borderRadius: "15px",
                  border: hasEvidence
                    ? "1px solid rgba(126,232,255,0.14)"
                    : "1px solid rgba(255,255,255,0.055)",
                  background: hasEvidence
                    ? "linear-gradient(145deg, rgba(83,215,255,0.055), rgba(255,255,255,0.022))"
                    : "rgba(255,255,255,0.022)",
                  padding: "13px",
                }}
              >
                <div
                  style={{
                    color: hasEvidence ? "#8ee8ff" : "rgba(255,255,255,0.28)",
                    fontSize: "8px",
                    fontWeight: 900,
                    letterSpacing: "0.09em",
                    textTransform: "uppercase",
                  }}
                >
                  {hasEvidence ? "Evidence collected" : "Not assessed yet"}
                </div>
                <strong style={{ display: "block", marginTop: "6px", fontSize: "11px", lineHeight: 1.35 }}>
                  {skill.title}
                </strong>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "rgba(255,255,255,0.36)",
                    fontSize: "9px",
                    lineHeight: 1.45,
                  }}
                >
                  {skill.description}
                </p>

                {hasEvidence ? (
                  <div style={{ marginTop: "10px", display: "grid", gap: "5px" }}>
                    {skill.evidence.slice(0, 3).map((item) => (
                      <div
                        key={item}
                        style={{
                          color: "rgba(255,255,255,0.58)",
                          fontSize: "8px",
                          lineHeight: 1.4,
                        }}
                      >
                        <span style={{ color: "#9fffd2" }}>✓</span> {item}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    style={{
                      margin: "10px 0 0",
                      color: "rgba(255,255,255,0.25)",
                      fontSize: "8px",
                      lineHeight: 1.45,
                    }}
                  >
                    {skill.upcoming}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <p
          style={{
            margin: "13px 0 0",
            color: "rgba(255,255,255,0.30)",
            fontSize: "9px",
            lineHeight: 1.5,
          }}
        >
          These cards currently show evidence only. Skill levels will be introduced after the new
          lesson and simulation engines can provide enough meaningful data.
        </p>
      </section>

      <section
        style={{
          marginTop: "14px",
          borderRadius: "22px",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(4,13,29,0.72)",
          padding: isMobile ? "18px" : "21px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p style={{ ...eyebrowStyle, color: "rgba(255,255,255,0.36)" }}>Learning History</p>
            <h3
              style={{
                margin: "6px 0 0",
                fontFamily: 'Georgia, "Times New Roman", serif',
                fontSize: "28px",
                fontWeight: 500,
              }}
            >
              What you have done so far.
            </h3>
          </div>
          <span style={sectionMetaStyle}>
            {progressLoading ? "Loading" : `${progress.history.length} recorded events`}
          </span>
        </div>

        {progressLoading ? (
          <div style={emptyStyle}>Loading your financial learning history…</div>
        ) : progress.history.length === 0 ? (
          <div style={emptyStyle}>
            Complete a Financial Foundations lesson or use Savings and Bonds to begin building your
            history.
          </div>
        ) : (
          <div style={{ marginTop: "14px", display: "grid", gap: "7px" }}>
            {progress.history.slice(0, 10).map((item) => (
              <div
                key={item.id}
                style={{
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.055)",
                  background: "rgba(255,255,255,0.022)",
                  padding: "11px 12px",
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "minmax(0,1fr) auto",
                  gap: "8px 16px",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ display: "block", fontSize: "11px" }}>{item.title}</strong>
                  <span
                    style={{
                      display: "block",
                      marginTop: "3px",
                      color: "rgba(255,255,255,0.36)",
                      fontSize: "9px",
                    }}
                  >
                    {item.detail}
                  </span>
                </div>
                <span
                  style={{
                    color: "rgba(255,255,255,0.30)",
                    fontSize: "8px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                  }}
                >
                  {formatDate(item.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}) {
  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${accent}22`,
        background: "rgba(4,13,29,0.72)",
        padding: "16px",
      }}
    >
      <div
        style={{
          color: "rgba(255,255,255,0.36)",
          fontSize: "8px",
          fontWeight: 900,
          letterSpacing: "0.11em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <strong
        style={{
          display: "block",
          marginTop: "6px",
          color: accent,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "30px",
          fontWeight: 500,
        }}
      >
        {value}
      </strong>
      <div style={{ marginTop: "5px", color: "rgba(255,255,255,0.34)", fontSize: "9px" }}>{detail}</div>
    </div>
  );
}

const eyebrowStyle = {
  margin: 0,
  color: "#ffd18a",
  fontSize: "9px",
  fontWeight: 900,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
} as const;

const sectionMetaStyle = {
  color: "rgba(255,255,255,0.30)",
  fontSize: "8px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
} as const;

const retryStyle = {
  minHeight: "34px",
  padding: "0 12px",
  borderRadius: "10px",
  border: "1px solid rgba(255,192,192,0.22)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffd0d0",
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: "9px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
} as const;

const emptyStyle = {
  marginTop: "14px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.055)",
  background: "rgba(255,255,255,0.022)",
  padding: "16px",
  color: "rgba(255,255,255,0.36)",
  fontSize: "10px",
  lineHeight: 1.55,
} as const;
