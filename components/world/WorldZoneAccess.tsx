"use client";

import { useState } from "react";

export type WorldZoneAdminItem<K extends string = string> = {
  key: K;
  label: string;
  enabled: boolean;
};

export function WorldZoneAdminBar<K extends string>({
  worldLabel,
  items,
  loading,
  updatingKey,
  onToggle,
}: {
  worldLabel: string;
  items: WorldZoneAdminItem<K>[];
  loading: boolean;
  updatingKey: K | null;
  onToggle: (key: K) => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        top: "74px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 96,
        width: "min(920px, calc(100vw - 24px))",
        borderRadius: "18px",
        border: "1px solid rgba(196,181,253,0.28)",
        background: "rgba(16,8,42,0.88)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        boxShadow: "0 18px 42px rgba(0,0,0,0.38)",
        padding: "9px 11px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      <span
        style={{
          color: "#ddd6fe",
          fontSize: "9px",
          fontWeight: 900,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          marginRight: "3px",
        }}
      >
        {worldLabel} · Public Access
      </span>

      {items.map((item) => {
        const updating = updatingKey === item.key;
        const disabled = loading || Boolean(updatingKey);

        return (
          <button
            key={item.key}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(item.key)}
            aria-label={`Turn ${item.label} public access ${
              item.enabled ? "off" : "on"
            }`}
            style={{
              minHeight: "32px",
              minWidth: "104px",
              padding: "0 11px",
              borderRadius: "999px",
              border: item.enabled
                ? "1px solid rgba(110,231,183,0.48)"
                : "1px solid rgba(251,191,36,0.42)",
              background: item.enabled
                ? "rgba(16,185,129,0.16)"
                : "rgba(245,158,11,0.14)",
              color: item.enabled ? "#a7f3d0" : "#fde68a",
              fontSize: "9px",
              fontWeight: 900,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: disabled ? "wait" : "pointer",
              opacity: disabled ? 0.58 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {updating
              ? "Saving..."
              : `${item.label} · ${item.enabled ? "OPEN" : "BLOCKED"}`}
          </button>
        );
      })}
    </div>
  );
}

export function ZoneUnderUpgradeModal({
  zoneTitle,
  onClose,
}: {
  zoneTitle: string;
  onClose: () => void;
}) {
  const [miloFallback, setMiloFallback] = useState(false);
  const [novaFallback, setNovaFallback] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Close upgrading notice"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 198,
          border: "none",
          background: "rgba(0,3,12,0.76)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          cursor: "default",
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${zoneTitle} upgrading notice`}
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          zIndex: 199,
          width: "min(650px, calc(100vw - 28px))",
          maxHeight: "calc(100dvh - 28px)",
          overflowY: "auto",
          transform: "translate(-50%, -50%)",
          borderRadius: "28px",
          border: "1px solid rgba(255,205,94,0.46)",
          background:
            "radial-gradient(circle at 50% 0%, rgba(255,190,72,0.14), transparent 36%), linear-gradient(145deg, rgba(8,27,49,0.99), rgba(3,10,25,0.995))",
          boxShadow:
            "0 34px 100px rgba(0,0,0,0.7), 0 0 44px rgba(255,190,72,0.12)",
          color: "white",
          padding: "26px 26px 24px",
          textAlign: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <button
          type="button"
          aria-label="Close upgrading notice"
          onClick={onClose}
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "36px",
            height: "36px",
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(255,255,255,0.07)",
            color: "white",
            cursor: "pointer",
            fontSize: "20px",
          }}
        >
          ×
        </button>

        <p
          style={{
            margin: 0,
            color: "#ffd76a",
            fontSize: "10px",
            fontWeight: 900,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Dreamscape Work Crew
        </p>

        <h2
          style={{
            margin: "9px 42px 0",
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: "clamp(30px, 6vw, 44px)",
            lineHeight: 1.04,
            fontWeight: 500,
          }}
        >
          Zone under upgrading works
        </h2>

        <p
          style={{
            margin: "12px auto 0",
            maxWidth: "520px",
            color: "rgba(255,255,255,0.74)",
            fontSize: "14px",
            lineHeight: 1.55,
          }}
        >
          Milo and Nova are upgrading <strong>{zoneTitle}</strong>. This zone is
          temporarily closed to the public. Please check back soon.
        </p>

        <div
          style={{
            margin: "18px auto 0",
            minHeight: "220px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            alignItems: "end",
            gap: "14px",
            padding: "16px 18px 0",
            borderRadius: "22px",
            border: "1px solid rgba(255,205,94,0.17)",
            background:
              "linear-gradient(180deg, rgba(255,205,94,0.04), rgba(83,215,255,0.05))",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", minHeight: "190px" }}>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                bottom: "6px",
                transform: "translateX(-50%)",
                width: "82%",
                height: "24px",
                borderRadius: "999px",
                background: "rgba(0,0,0,0.28)",
                filter: "blur(8px)",
              }}
            />
            <img
              src={
                miloFallback
                  ? "/milo-world/milo-character.png"
                  : "/shared/milo-construction.png"
              }
              alt="Milo working in construction gear"
              onError={() => setMiloFallback(true)}
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                height: "205px",
                objectFit: "contain",
                objectPosition: "center bottom",
                display: "block",
              }}
            />
            {miloFallback && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  zIndex: 3,
                  left: "50%",
                  top: "4px",
                  transform: "translateX(-50%)",
                  fontSize: "34px",
                }}
              >
                ⛑️
              </span>
            )}
          </div>

          <div style={{ position: "relative", minHeight: "190px" }}>
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "50%",
                bottom: "6px",
                transform: "translateX(-50%)",
                width: "82%",
                height: "24px",
                borderRadius: "999px",
                background: "rgba(0,0,0,0.28)",
                filter: "blur(8px)",
              }}
            />
            <img
              src={
                novaFallback
                  ? "/nova/nova-character.png"
                  : "/shared/nova-construction.png"
              }
              alt="Nova working in construction gear"
              onError={() => setNovaFallback(true)}
              style={{
                position: "relative",
                zIndex: 2,
                width: "100%",
                height: "205px",
                objectFit: "contain",
                objectPosition: "center bottom",
                display: "block",
              }}
            />
            {novaFallback && (
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  zIndex: 3,
                  left: "50%",
                  top: "4px",
                  transform: "translateX(-50%)",
                  fontSize: "34px",
                }}
              >
                ⛑️
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "16px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            color: "#ffd76a",
            fontSize: "11px",
            fontWeight: 850,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span aria-hidden="true">🚧</span>
          Upgrades in progress
          <span aria-hidden="true">🚧</span>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: "18px",
            minHeight: "44px",
            padding: "0 20px",
            borderRadius: "13px",
            border: "1px solid rgba(255,215,106,0.42)",
            background: "rgba(255,190,72,0.12)",
            color: "white",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "11px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Back to World
        </button>
      </div>
    </>
  );
}
