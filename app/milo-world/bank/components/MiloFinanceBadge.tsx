"use client";

export default function MiloFinanceBadge({
  active = false,
  compact = false,
}: {
  active?: boolean;
  compact?: boolean;
}) {
  return (
    <span
      style={{
        minHeight: compact ? "24px" : "28px",
        padding: compact ? "0 8px" : "0 10px",
        borderRadius: "999px",
        border: active
          ? "1px solid rgba(159,255,210,0.28)"
          : "1px solid rgba(255,209,138,0.26)",
        background: active
          ? "rgba(96,255,182,0.075)"
          : "rgba(255,190,90,0.075)",
        color: active ? "#a9ffd4" : "#ffd18a",
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        whiteSpace: "nowrap",
        fontSize: compact ? "7px" : "8px",
        fontWeight: 900,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
      }}
    >
      <span aria-hidden="true">{active ? "✓" : "◆"}</span>
      {active ? "Milo Finance Active" : "Milo Finance"}
    </span>
  );
}
