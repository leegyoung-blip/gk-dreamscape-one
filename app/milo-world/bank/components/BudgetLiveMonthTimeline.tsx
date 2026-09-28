"use client";

import type { BudgetLiveEvent, BudgetPaidCommitment } from "../lib/budget-simulator-types";

export default function BudgetLiveMonthTimeline({
  currentDay,
  events,
  resolvedEventIds,
  paidCommitments,
}: {
  currentDay: number;
  events: BudgetLiveEvent[];
  resolvedEventIds: string[];
  paidCommitments: BudgetPaidCommitment[];
}) {
  const eventDays = new Map<number, BudgetLiveEvent[]>();
  events.forEach((event) => {
    const list = eventDays.get(event.day) ?? [];
    list.push(event);
    eventDays.set(event.day, list);
  });
  const commitmentDays = new Set(paidCommitments.map((item) => item.day));

  return (
    <div
      aria-label={`Live month timeline, currently Day ${currentDay}`}
      style={{
        borderRadius: "15px",
        border: "1px solid rgba(126,232,255,.11)",
        background: "rgba(1,8,23,.5)",
        padding: "10px 10px 8px",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          minWidth: "640px",
          display: "grid",
          gridTemplateColumns: "repeat(30, minmax(16px, 1fr))",
          gap: "2px",
          alignItems: "end",
        }}
      >
        {Array.from({ length: 30 }, (_, index) => {
          const day = index + 1;
          const dayEvents = eventDays.get(day) ?? [];
          const hasResolvedEvent = dayEvents.some((event) => resolvedEventIds.includes(event.id));
          const hasFutureEvent = dayEvents.some((event) => !resolvedEventIds.includes(event.id));
          const active = day === currentDay;
          const past = day < currentDay;
          const paidCommitment = commitmentDays.has(day);

          return (
            <div key={day} style={{ textAlign: "center", minWidth: 0 }}>
              <div
                style={{
                  height: hasFutureEvent || hasResolvedEvent ? "9px" : paidCommitment ? "6px" : "3px",
                  borderRadius: "999px",
                  background: active
                    ? "#8ee8ff"
                    : hasResolvedEvent
                      ? "#80efb8"
                      : hasFutureEvent
                        ? "#c3b5ff"
                        : paidCommitment
                          ? "#ffd18a"
                          : past
                            ? "rgba(255,255,255,.20)"
                            : "rgba(255,255,255,.075)",
                  boxShadow: active ? "0 0 14px rgba(126,232,255,.45)" : "none",
                }}
              />
              <span
                style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "6px",
                  fontWeight: active ? 950 : 750,
                  color: active ? "#b8f4ff" : "rgba(255,255,255,.26)",
                }}
              >
                {day}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: "7px", display: "flex", flexWrap: "wrap", gap: "8px", color: "rgba(255,255,255,.34)", fontSize: "6px", fontWeight: 800 }}>
        <LegendDot color="#8ee8ff" label="Today" />
        <LegendDot color="#c3b5ff" label="Upcoming decision" />
        <LegendDot color="#80efb8" label="Decision completed" />
        <LegendDot color="#ffd18a" label="Commitment paid" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: color }} />
      {label}
    </span>
  );
}
