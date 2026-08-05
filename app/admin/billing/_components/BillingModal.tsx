"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";

export default function BillingModal({
  open,
  title,
  eyebrow,
  description,
  children,
  footer,
  onClose,
  widthClass = "max-w-3xl",
}: {
  open: boolean;
  title: string;
  eyebrow: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  widthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeydown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={onClose}
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#0c1728]/55 p-3 backdrop-blur-sm sm:p-6"
    >
      <div className="flex min-h-full items-start justify-center py-4 sm:items-center">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onMouseDown={(event) => event.stopPropagation()}
          className={`w-full ${widthClass} overflow-hidden rounded-[2rem] border border-white/60 bg-[#fbfaf7] shadow-[0_35px_120px_rgba(9,19,34,0.38)]`}
        >
          <header className="flex items-start justify-between gap-5 border-b border-[#e8e1d5] px-5 py-5 sm:px-7">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#a27627]">
                {eyebrow}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#15233b]">
                {title}
              </h2>
              {description && (
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#777065]">
                  {description}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#ded5c4] bg-white text-xl text-[#5f594f] transition hover:border-[#b89555]"
            >
              ×
            </button>
          </header>

          <div className="max-h-[72vh] overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {children}
          </div>

          {footer && (
            <footer className="border-t border-[#e8e1d5] bg-white/70 px-5 py-4 sm:px-7">
              {footer}
            </footer>
          )}
        </section>
      </div>
    </div>
  );
}
