"use client";

export default function BudgetAssetIcon({
  src,
  alt,
  size = 72,
  muted = false,
}: {
  src: string | null;
  alt: string;
  size?: number;
  muted?: boolean;
}) {
  if (!src) {
    return (
      <span
        aria-hidden="true"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          flex: "0 0 auto",
          borderRadius: "18px",
          border: "1px solid rgba(126,232,255,.10)",
          background:
            "radial-gradient(circle at 50% 35%,rgba(126,232,255,.10),transparent 55%),rgba(255,255,255,.018)",
        }}
      />
    );
  }

  return (
    <span
      style={{
        width: `${size}px`,
        height: `${size}px`,
        flex: "0 0 auto",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: `${Math.max(12, Math.round(size * 0.24))}px`,
        border: "1px solid rgba(126,232,255,.12)",
        background:
          "radial-gradient(circle at 50% 40%,rgba(126,232,255,.09),transparent 60%),rgba(2,8,20,.52)",
        overflow: "hidden",
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{
          width: "92%",
          height: "92%",
          objectFit: "contain",
          opacity: muted ? 0.66 : 1,
          filter: muted
            ? "saturate(.75) brightness(.88)"
            : "drop-shadow(0 8px 15px rgba(0,0,0,.26))",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </span>
  );
}
