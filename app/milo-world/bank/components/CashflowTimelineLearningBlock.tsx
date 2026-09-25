"use client";

import { useMemo, useState } from "react";
import type {
  CashflowTimelineBlock,
  FinancialBlockResponse,
} from "../../lib/financial-learning-engine-types";
import LearningBlockShell from "./LearningBlockShell";

function fmt(value: number) {
  return value.toLocaleString("en-SG", { maximumFractionDigits: 0 });
}

export default function CashflowTimelineLearningBlock({
  block,
  response,
  onChange,
}: {
  block: CashflowTimelineBlock;
  response?: FinancialBlockResponse;
  onChange: (response: FinancialBlockResponse) => void;
}) {
  const stored = response?.value && typeof response.value === "object"
    ? response.value as Record<string, string>
    : {};
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const balances = useMemo(() => {
    let running = block.openingCash;
    return block.periods.map((period) => {
      const events = block.events.filter((event) => stored[event.id] === period.id);
      const inflow = events.filter((event) => event.kind === "inflow").reduce((sum, event) => sum + event.amount, 0);
      const outflow = events.filter((event) => event.kind === "outflow").reduce((sum, event) => sum + event.amount, 0);
      running += inflow - outflow;
      return { period, events, inflow, outflow, closing: running };
    });
  }, [block, stored]);

  function assign(eventId: string, periodId: string) {
    const next = { ...stored, [eventId]: periodId };
    const correctItems = block.events.filter((event) => event.correctPeriodId);
    const isCorrect = correctItems.length
      ? correctItems.every((event) => next[event.id] === event.correctPeriodId)
      : undefined;
    onChange({
      blockId: block.id,
      blockType: block.type,
      value: next,
      isCorrect,
      answeredAt: new Date().toISOString(),
    });
    setSelectedEventId(null);
  }

  const placedCount = block.events.filter((event) => Boolean(stored[event.id])).length;
  const complete = placedCount === block.events.length;

  return (
    <LearningBlockShell eyebrow={block.eyebrow} title={block.title}>
      <p style={{ margin: 0, color: "rgba(255,255,255,.68)", fontSize: 13, lineHeight: 1.7 }}>{block.prompt}</p>
      {block.contextNote ? <div style={{ marginTop: 12, borderRadius: 13, background: "rgba(126,232,255,.05)", border: "1px solid rgba(126,232,255,.10)", padding: "11px 12px", color: "rgba(210,246,255,.72)", fontSize: 11, lineHeight: 1.55 }}>{block.contextNote}</div> : null}

      <div style={{ marginTop: 14, borderRadius: 15, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)", padding: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,.38)", fontSize: 8, fontWeight: 900, letterSpacing: ".09em", textTransform: "uppercase" }}>Opening cash</div>
            <div style={{ marginTop: 4, color: "#8ee8ff", fontSize: 22, fontWeight: 900 }}>{fmt(block.openingCash)} DT</div>
          </div>
          <div style={{ color: "rgba(255,255,255,.48)", fontSize: 10, alignSelf: "center" }}>{placedCount} / {block.events.length} cash events placed</div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ color: "rgba(255,255,255,.42)", fontSize: 9, fontWeight: 900, letterSpacing: ".10em", textTransform: "uppercase" }}>Cash events</div>
        <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8 }}>
          {block.events.map((event) => {
            const active = selectedEventId === event.id;
            const assigned = block.periods.find((period) => period.id === stored[event.id]);
            return (
              <button
                key={event.id}
                type="button"
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/milo-finance-cashflow-event", event.id)}
                onClick={() => setSelectedEventId(active ? null : event.id)}
                style={{ textAlign: "left", borderRadius: 13, border: active ? "1px solid rgba(126,232,255,.42)" : "1px solid rgba(255,255,255,.08)", background: active ? "rgba(83,215,255,.08)" : "rgba(255,255,255,.025)", padding: 11, color: "white", cursor: "grab", fontFamily: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 800 }}>{event.label}</span>
                  <span style={{ color: event.kind === "inflow" ? "#9af3c3" : "#ffb8b8", fontSize: 11, fontWeight: 900 }}>{event.kind === "inflow" ? "+" : "-"}{fmt(event.amount)} DT</span>
                </div>
                {event.description ? <div style={{ marginTop: 5, color: "rgba(255,255,255,.45)", fontSize: 9, lineHeight: 1.45 }}>{event.description}</div> : null}
                <div style={{ marginTop: 7, color: assigned ? "#8ee8ff" : "rgba(255,255,255,.30)", fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: ".07em" }}>{assigned ? `Placed: ${assigned.label}` : "Select, then choose a period"}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: `repeat(${Math.min(block.periods.length, 3)}, minmax(0,1fr))`, gap: 9 }}>
        {balances.map(({ period, events, inflow, outflow, closing }) => {
          const warning = typeof block.warningBelow === "number" && closing < block.warningBelow;
          return (
            <button
              key={period.id}
              type="button"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const eventId = e.dataTransfer.getData("text/milo-finance-cashflow-event");
                if (eventId) assign(eventId, period.id);
              }}
              onClick={() => selectedEventId && assign(selectedEventId, period.id)}
              style={{ minHeight: 185, textAlign: "left", borderRadius: 16, border: warning ? "1px solid rgba(255,121,121,.30)" : "1px solid rgba(126,232,255,.11)", background: warning ? "rgba(244,91,91,.05)" : "rgba(3,12,28,.48)", padding: 12, color: "white", cursor: selectedEventId ? "pointer" : "default", fontFamily: "inherit" }}
            >
              <div style={{ color: "#8ee8ff", fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase" }}>{period.label}</div>
              {period.subtitle ? <div style={{ marginTop: 3, color: "rgba(255,255,255,.35)", fontSize: 8 }}>{period.subtitle}</div> : null}
              <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                {events.length ? events.map((event) => (
                  <div key={event.id} style={{ borderRadius: 10, background: "rgba(255,255,255,.035)", padding: "7px 8px", fontSize: 9 }}>
                    <div>{event.label}</div>
                    <div style={{ marginTop: 2, color: event.kind === "inflow" ? "#9af3c3" : "#ffb8b8", fontWeight: 900 }}>{event.kind === "inflow" ? "+" : "-"}{fmt(event.amount)} DT</div>
                  </div>
                )) : <div style={{ color: "rgba(255,255,255,.25)", fontSize: 9 }}>Drop cash events here</div>}
              </div>
              <div style={{ marginTop: 12, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ color: "rgba(255,255,255,.34)", fontSize: 8 }}>In +{fmt(inflow)} · Out -{fmt(outflow)}</div>
                <div style={{ marginTop: 4, color: warning ? "#ffabab" : "#9af3c3", fontSize: 16, fontWeight: 900 }}>Close: {fmt(closing)} DT</div>
              </div>
            </button>
          );
        })}
      </div>

      {complete ? (
        <div style={{ marginTop: 12, borderRadius: 13, border: response?.isCorrect === false ? "1px solid rgba(255,209,138,.18)" : "1px solid rgba(113,236,176,.18)", background: response?.isCorrect === false ? "rgba(255,190,90,.045)" : "rgba(69,207,142,.05)", padding: "10px 12px", color: "rgba(255,255,255,.62)", fontSize: 10, lineHeight: 1.5 }}>
          {response?.isCorrect === false ? "The timeline is complete. Review the timing of the events and notice how moving one payment changes the cash position." : "Timeline complete. You can now see how timing changes the cash available even when the business may be profitable overall."}
        </div>
      ) : null}

      {block.takeaway ? <div style={{ marginTop: 13, borderRadius: 13, border: "1px solid rgba(255,209,138,.13)", background: "rgba(255,190,90,.045)", padding: "11px 12px", color: "rgba(255,235,199,.72)", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#ffd18a" }}>Watch for: </strong>{block.takeaway}</div> : null}
    </LearningBlockShell>
  );
}
