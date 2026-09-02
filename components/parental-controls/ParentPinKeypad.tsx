"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "backspace"] as const;

export default function ParentPinKeypad({
  open,
  title,
  description,
  submitLabel = "Continue",
  error = "",
  busy = false,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  submitLabel?: string;
  error?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (pin: string) => void | Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setPin("");
    const timer = window.setTimeout(() => dialogRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open, title]);

  if (!open) return null;

  function addDigit(digit: string) {
    if (busy) return;
    setPin((current) => (current.length < 4 ? `${current}${digit}` : current));
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      addDigit(event.key);
      return;
    }

    if (event.key === "Backspace") {
      event.preventDefault();
      setPin((current) => current.slice(0, -1));
      return;
    }

    if (event.key === "Escape" && !busy) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Enter" && pin.length === 4 && !busy) {
      event.preventDefault();
      void submitPin();
    }
  }

  async function submitPin() {
    if (pin.length !== 4 || busy) return;
    await onSubmit(pin);
    if (dialogRef.current) {
      setPin("");
      dialogRef.current.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[3000] grid place-items-center bg-[#020611]/90 p-4 backdrop-blur-xl"
      role="presentation"
      onMouseDown={() => {
        if (!busy) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-violet-300/30 bg-[#09172f] p-6 text-center text-white shadow-2xl shadow-black/60 outline-none"
      >
        <div className="flex items-start justify-between gap-4 text-left">
          <div>
            <p className="m-0 text-[10px] font-black tracking-[0.18em] text-violet-200">
              PARENT CONTROLS
            </p>
            <h2 className="mt-2 text-2xl font-black">{title}</h2>
          </div>
          <button
            type="button"
            aria-label="Close PIN keypad"
            disabled={busy}
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-lg disabled:opacity-40"
          >
            ×
          </button>
        </div>

        {description && (
          <p className="mt-3 text-left text-sm leading-6 text-slate-300">
            {description}
          </p>
        )}

        <div className="my-6 flex justify-center gap-3" aria-label={`${pin.length} of 4 PIN digits entered`}>
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className={`grid h-12 w-12 place-items-center rounded-2xl border text-2xl ${
                index < pin.length
                  ? "border-violet-300/60 bg-violet-300/15 text-violet-100"
                  : "border-white/15 bg-white/[0.03] text-transparent"
              }`}
            >
              {index < pin.length ? "•" : "•"}
            </span>
          ))}
        </div>

        <div className="mx-auto grid max-w-[280px] grid-cols-3 gap-3">
          {KEYS.map((key) => {
            const isDigit = /^\d$/.test(key);
            const label = key === "clear" ? "Clear" : key === "backspace" ? "⌫" : key;
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
                aria-label={key === "backspace" ? "Delete last digit" : key === "clear" ? "Clear PIN" : `Digit ${key}`}
                onClick={() => {
                  if (isDigit) addDigit(key);
                  else if (key === "clear") setPin("");
                  else setPin((current) => current.slice(0, -1));
                  dialogRef.current?.focus();
                }}
                className={`min-h-14 rounded-2xl border font-black transition active:scale-95 disabled:opacity-40 ${
                  isDigit
                    ? "border-white/15 bg-white/[0.06] text-xl hover:border-violet-300/50 hover:bg-violet-300/10"
                    : "border-white/10 bg-white/[0.025] text-xs text-slate-300"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-rose-300/25 bg-rose-300/10 p-3 text-sm text-rose-100">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={pin.length !== 4 || busy}
          onClick={() => void submitPin()}
          className="mt-5 min-h-12 w-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 px-5 font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {busy ? "Checking…" : submitLabel}
        </button>
      </div>
    </div>
  );
}
