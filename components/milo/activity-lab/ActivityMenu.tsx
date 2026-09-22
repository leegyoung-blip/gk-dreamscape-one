"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";

export type ActivityMode = "quick" | "survival";

type ActivityCardData = {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  href?: string;
  mode?: ActivityMode;
  icon: string;
};

const activities: ActivityCardData[] = [
  {
    id: "mastery-quick",
    title: "Mastery Code",
    eyebrow: "Quick Play",
    description:
      "Solve today’s five-letter Mastery Code and earn up to 60 DT.",
    image: "/milo-world/activities/daily-puzzle.png",
    mode: "quick",
    icon: "◇",
  },
  {
    id: "mastery-survival",
    title: "Mastery Code",
    eyebrow: "Survival Mode",
    description:
      "Clear word after word, protect your three hints, and see how far you can survive.",
    image: "/milo-world/activities/daily-puzzle.png",
    mode: "survival",
    icon: "◆",
  },
  {
    id: "whos-bluffing",
    title: "Who’s Bluffing",
    eyebrow: "Party Game",
    description: "Invent fake answers and identify the truth.",
    image: "/milo-world/activities/whos-bluffing.png",
    href: "/milo-world/whos-bluffing",
    icon: "✦",
  },
];

function ActivityMenuCard({
  activity,
  activeMode,
  drawer,
  dense,
  onSelectMode,
  onNavigate,
}: {
  activity: ActivityCardData;
  activeMode: ActivityMode;
  drawer: boolean;
  dense: boolean;
  onSelectMode: (mode: ActivityMode) => void;
  onNavigate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = Boolean(activity.mode && activity.mode === activeMode);

  const cardStyle: CSSProperties = {
    position: "relative",
    minWidth: 0,
    minHeight: drawer ? "92px" : dense ? "0" : "0",
    height: drawer ? "92px" : "100%",
    overflow: "hidden",
    borderRadius: drawer ? "16px" : "20px",
    border: active
      ? "1px solid rgba(126,232,255,0.7)"
      : hovered
        ? "1px solid rgba(126,232,255,0.5)"
        : "1px solid rgba(126,232,255,0.18)",
    background: active
      ? "linear-gradient(145deg, rgba(17,65,93,0.88), rgba(3,13,29,0.94))"
      : "linear-gradient(145deg, rgba(8,26,48,0.78), rgba(3,10,24,0.9))",
    color: "white",
    textDecoration: "none",
    fontFamily: "inherit",
    cursor: active ? "default" : "pointer",
    boxShadow: active
      ? "0 0 28px rgba(83,215,255,0.13)"
      : hovered
        ? "0 18px 38px rgba(0,0,0,0.34)"
        : "0 12px 28px rgba(0,0,0,0.2)",
    transform: !active && hovered ? "translateY(-3px)" : "none",
    transition:
      "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
    width: "100%",
    padding: 0,
    textAlign: "left",
  };

  const content = (
    <>
      <img
        src={activity.image}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          opacity: hovered || active ? 0.34 : 0.22,
          transform: hovered ? "scale(1.04)" : "scale(1)",
          transition: "opacity 180ms ease, transform 240ms ease",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          background: drawer
            ? "linear-gradient(90deg, rgba(2,10,24,0.94), rgba(2,10,24,0.6))"
            : "linear-gradient(180deg, rgba(2,10,24,0.1), rgba(2,10,24,0.96) 70%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          minHeight: 0,
          padding: drawer ? "14px" : dense ? "14px" : "17px",
          display: "flex",
          flexDirection: drawer ? "row" : "column",
          alignItems: drawer ? "center" : "stretch",
          justifyContent: drawer ? "flex-start" : "flex-end",
          gap: drawer ? "12px" : 0,
        }}
      >
        <span
          style={{
            width: drawer ? "42px" : "38px",
            height: drawer ? "42px" : "38px",
            borderRadius: "12px",
            border: "1px solid rgba(126,232,255,0.32)",
            background: "rgba(83,215,255,0.1)",
            color: "#9bf5ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            fontSize: "17px",
            marginBottom: drawer ? 0 : "auto",
          }}
        >
          {activity.icon}
        </span>

        <span style={{ minWidth: 0 }}>
          <span
            style={{
              display: "block",
              color: "#8ee8ff",
              fontSize: drawer ? "8px" : "9px",
              fontWeight: 900,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {activity.eyebrow}
          </span>

          <strong
            style={{
              display: "block",
              marginTop: drawer ? "4px" : "7px",
              fontSize: drawer ? "16px" : dense ? "18px" : "21px",
              lineHeight: 1.05,
            }}
          >
            {activity.title}
          </strong>

          {!drawer && !dense && (
            <span
              style={{
                display: "block",
                marginTop: "7px",
                color: "rgba(255,255,255,0.57)",
                fontSize: "11px",
                lineHeight: 1.4,
              }}
            >
              {activity.description}
            </span>
          )}
        </span>

        {!active && (
          <span
            style={{
              marginLeft: drawer ? "auto" : 0,
              marginTop: drawer ? 0 : "12px",
              color: "#8ee8ff",
              fontSize: "16px",
              flexShrink: 0,
            }}
          >
            →
          </span>
        )}
      </div>
    </>
  );

  if (activity.href) {
    return (
      <Link
        href={activity.href}
        onClick={onNavigate}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={cardStyle}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={() => activity.mode && onSelectMode(activity.mode)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={cardStyle}
    >
      {content}
    </button>
  );
}

export default function ActivityMenu({
  activeMode,
  drawer,
  dense,
  onSelectMode,
  onNavigate,
}: {
  activeMode: ActivityMode;
  drawer: boolean;
  dense: boolean;
  onSelectMode: (mode: ActivityMode) => void;
  onNavigate?: () => void;
}) {
  return (
    <div
      style={{
        minWidth: 0,
        minHeight: 0,
        height: "100%",
        display: "grid",
        gridTemplateRows: drawer
          ? `repeat(${activities.length}, 92px)`
          : `repeat(${activities.length}, minmax(0, 1fr))`,
        gap: drawer ? "12px" : dense ? "8px" : "11px",
      }}
    >
      {activities.map((activity) => (
        <ActivityMenuCard
          key={activity.id}
          activity={activity}
          activeMode={activeMode}
          drawer={drawer}
          dense={dense}
          onSelectMode={onSelectMode}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
