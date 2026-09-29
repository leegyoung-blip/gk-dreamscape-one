"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";

export default function BudgetInfoButton({
  title,
  children,
  label = "More information",
  accent = "#8ee8ff",
}: {
  title: string;
  children: ReactNode;
  label?: string;
  accent?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const dialog = open && typeof document !== "undefined"
    ? createPortal(
        <div
          role="presentation"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            background: "rgba(1,6,17,.72)",
            backdropFilter: "blur(10px)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(520px,100%)",
              borderRadius: "22px",
              border: `1px solid ${accent}55`,
              background: "linear-gradient(160deg,rgba(8,24,49,.98),rgba(3,10,25,.98))",
              boxShadow: "0 28px 90px rgba(0,0,0,.48)",
              padding: "20px",
              color: "white",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "14px" }}>
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: accent,
                    fontSize: "15px",
                    fontWeight: 950,
                    letterSpacing: ".10em",
                    textTransform: "uppercase",
                  }}
                >
                  Quick explanation
                </span>
                <h4
                  style={{
                    margin: "6px 0 0",
                    fontFamily: 'Georgia, "Times New Roman", serif',
                    fontSize: "26px",
                    lineHeight: 1.1,
                    fontWeight: 500,
                  }}
                >
                  {title}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close explanation"
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.12)",
                  background: "rgba(255,255,255,.05)",
                  color: "rgba(255,255,255,.78)",
                  cursor: "pointer",
                  fontSize: "21px",
                  fontWeight: 800,
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </div>
            <div
              style={{
                marginTop: "14px",
                color: "rgba(255,255,255,.74)",
                fontSize: "18px",
                lineHeight: 1.65,
              }}
            >
              {children}
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        aria-label={label}
        title={label}
        style={{
          width: "34px",
          height: "34px",
          minWidth: "34px",
          borderRadius: "50%",
          border: `1px solid ${accent}55`,
          background: `${accent}14`,
          color: accent,
          display: "inline-grid",
          placeItems: "center",
          padding: 0,
          cursor: "pointer",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "19px",
          fontStyle: "italic",
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </button>
      {dialog}
    </>
  );
}
