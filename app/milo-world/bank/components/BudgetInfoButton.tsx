"use client";

import { useEffect, useRef, useState } from "react";
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
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, side: "right" as "left" | "right" });

  function clearCloseTimer() {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function updatePosition() {
    const button = buttonRef.current;
    if (!button || typeof window === "undefined") return;

    const rect = button.getBoundingClientRect();
    const tooltipWidth = Math.min(330, Math.max(260, window.innerWidth - 24));
    const gap = 8;
    const roomRight = window.innerWidth - rect.right;
    const side = roomRight >= tooltipWidth + gap ? "right" : "left";
    const rawLeft = side === "right" ? rect.right + gap : rect.left - tooltipWidth - gap;
    const left = Math.max(12, Math.min(window.innerWidth - tooltipWidth - 12, rawLeft));
    const top = Math.max(10, Math.min(window.innerHeight - 120, rect.top + rect.height / 2 - 32));

    setPosition({ left, top, side });
  }

  function show() {
    if (typeof window === "undefined") return;
    clearCloseTimer();
    updatePosition();
    setOpen(true);
  }

  function scheduleHide() {
    if (typeof window === "undefined") return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 110);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    function onPointerDown(event: PointerEvent) {
      const button = buttonRef.current;
      if (button?.contains(event.target as Node)) return;
      setOpen(false);
    }

    function reposition() {
      updatePosition();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  useEffect(() => () => clearCloseTimer(), []);

  const tooltip = open && typeof document !== "undefined"
    ? createPortal(
        <div
          role="tooltip"
          onMouseEnter={clearCloseTimer}
          onMouseLeave={scheduleHide}
          style={{
            position: "fixed",
            zIndex: 10000,
            left: `${position.left}px`,
            top: `${position.top}px`,
            width: "min(330px, calc(100vw - 24px))",
            borderRadius: "12px",
            border: `1px solid ${accent}42`,
            background: "rgba(5,16,34,.97)",
            boxShadow: "0 12px 30px rgba(0,0,0,.30)",
            padding: "10px 11px",
            color: "white",
            pointerEvents: "auto",
          }}
        >
          <strong
            style={{
              display: "block",
              color: accent,
              fontSize: "13px",
              lineHeight: 1.25,
            }}
          >
            {title}
          </strong>
          <div
            style={{
              marginTop: "4px",
              color: "rgba(255,255,255,.78)",
              fontSize: "14px",
              lineHeight: 1.45,
            }}
          >
            {children}
          </div>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "18px",
              [position.side === "right" ? "left" : "right"]: "-5px",
              width: "9px",
              height: "9px",
              transform: "rotate(45deg)",
              background: "rgba(5,16,34,.97)",
              borderLeft: position.side === "right" ? `1px solid ${accent}42` : "none",
              borderBottom: position.side === "right" ? `1px solid ${accent}42` : "none",
              borderTop: position.side === "left" ? `1px solid ${accent}42` : "none",
              borderRight: position.side === "left" ? `1px solid ${accent}42` : "none",
            }}
          />
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onFocus={show}
        onBlur={scheduleHide}
        onClick={(event) => {
          event.stopPropagation();
          if (open) setOpen(false);
          else show();
        }}
        aria-label={label}
        aria-expanded={open}
        title={label}
        style={{
          width: "24px",
          height: "24px",
          minWidth: "24px",
          borderRadius: "50%",
          border: `1px solid ${accent}52`,
          background: `${accent}12`,
          color: accent,
          display: "inline-grid",
          placeItems: "center",
          padding: 0,
          cursor: "help",
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontSize: "14px",
          fontStyle: "italic",
          fontWeight: 700,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        i
      </button>
      {tooltip}
    </>
  );
}
