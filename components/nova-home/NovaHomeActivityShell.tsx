"use client";

import { useEffect, useState, type ReactNode } from "react";

export type NovaHomeActivityLayout = {
  compactLandscape: boolean;
  portraitTouchDevice: boolean;
};

export function useNovaHomeActivityLayout(): NovaHomeActivityLayout {
  const [layout, setLayout] = useState<NovaHomeActivityLayout>({
    compactLandscape: false,
    portraitTouchDevice: false,
  });

  useEffect(() => {
    const compactQuery = window.matchMedia(
      "(orientation: landscape) and (max-height: 560px) and (max-width: 1100px)",
    );
    const portraitQuery = window.matchMedia(
      "(orientation: portrait) and (pointer: coarse) and (max-width: 1366px)",
    );

    const sync = () => {
      setLayout({
        compactLandscape: compactQuery.matches,
        portraitTouchDevice: portraitQuery.matches,
      });
    };

    sync();
    compactQuery.addEventListener?.("change", sync);
    portraitQuery.addEventListener?.("change", sync);
    window.addEventListener("orientationchange", sync);
    window.addEventListener("resize", sync);

    return () => {
      compactQuery.removeEventListener?.("change", sync);
      portraitQuery.removeEventListener?.("change", sync);
      window.removeEventListener("orientationchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  return layout;
}

type NovaHomeActivityShellProps = {
  title: string;
  eyebrow?: string;
  badges?: ReactNode;
  hud?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export default function NovaHomeActivityShell({
  title,
  eyebrow = "Nova Home Minigame",
  badges,
  hud,
  actions,
  footer,
  children,
}: NovaHomeActivityShellProps) {
  const { compactLandscape, portraitTouchDevice } = useNovaHomeActivityLayout();

  return (
    <div className={`fixed inset-0 z-[120] h-[100dvh] max-h-[100dvh] w-[100vw] overflow-hidden bg-slate-950/92 backdrop-blur-md ${compactLandscape ? "" : "flex items-center justify-center p-1.5 sm:p-3"}`}>
      {compactLandscape ? (
        <div className="grid h-full min-h-0 w-full grid-cols-[84px_minmax(0,1fr)_56px] overflow-hidden bg-[#03101d]">
          <aside className="flex min-h-0 flex-col border-r border-white/[0.07] bg-slate-950/68 p-1.5">
            <div className="shrink-0 border-b border-white/[0.06] px-1 pb-1.5">
              <p className="truncate text-[6px] font-black uppercase tracking-[0.13em] text-cyan-200/46">{eyebrow}</p>
              <h2 className="mt-0.5 truncate text-[13px] font-black leading-none text-white">{title}</h2>
            </div>
            <div className="mt-1.5 min-h-0 flex-1 overflow-hidden">{hud}</div>
            {badges ? <div className="mt-1.5 shrink-0 space-y-1">{badges}</div> : null}
          </aside>

          <main className="relative min-h-0 overflow-hidden bg-[radial-gradient(circle_at_50%_45%,rgba(55,190,226,0.10),transparent_55%),linear-gradient(180deg,#071a2a,#020914)] p-1">
            {children}
            {footer ? <div className="pointer-events-none absolute inset-x-2 bottom-2 z-[80] flex justify-center"><div className="pointer-events-auto">{footer}</div></div> : null}
          </main>

          <aside className="flex min-h-0 flex-col items-stretch gap-1.5 border-l border-white/[0.07] bg-slate-950/68 p-1.5">
            {actions}
          </aside>
        </div>
      ) : (
        <div className={`grid h-full max-h-[920px] w-full max-w-[1180px] min-h-0 overflow-hidden rounded-[20px] border border-cyan-200/25 bg-[#03101d] shadow-[0_36px_110px_rgba(0,0,0,0.72)] sm:rounded-[30px] ${footer ? "grid-rows-[auto_auto_minmax(0,1fr)_auto]" : "grid-rows-[auto_auto_minmax(0,1fr)]"}`}>
          <header className="flex min-w-0 items-center justify-between gap-3 border-b border-white/[0.07] bg-slate-950/55 px-4 py-2.5 sm:px-6 sm:py-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-cyan-200/60">{eyebrow}</p>
              <h2 className="mt-1 truncate text-xl font-black text-white sm:text-2xl">{title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          </header>

          <div className="border-b border-white/[0.055] bg-slate-950/28 px-2 py-2 sm:px-3 sm:py-2.5">
            {badges ? <div className="mb-2 flex flex-wrap items-center gap-2">{badges}</div> : null}
            {hud}
          </div>

          <main className="min-h-0 overflow-hidden p-2 sm:p-3">{children}</main>

          {footer ? <footer className="border-t border-white/[0.07] bg-slate-950/76 px-3 py-2.5 sm:px-4">{footer}</footer> : null}
        </div>
      )}

      {portraitTouchDevice && (
        <div className="absolute inset-0 z-[300] flex items-center justify-center bg-[#020914]/98 p-6 text-center backdrop-blur-xl">
          <div className="w-full max-w-sm rounded-[28px] border border-cyan-200/20 bg-slate-950/90 p-7 shadow-[0_28px_80px_rgba(0,0,0,0.65)]">
            <div className="mx-auto flex h-24 w-24 items-center justify-center">
              <div className="relative h-16 w-10 rotate-90 rounded-[12px] border-[3px] border-cyan-100/75 bg-cyan-300/[0.06] shadow-[0_0_28px_rgba(103,232,249,0.22)]">
                <div className="absolute left-1/2 top-1.5 h-1 w-4 -translate-x-1/2 rounded-full bg-cyan-100/45" />
                <div className="absolute bottom-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-cyan-100/55" />
              </div>
            </div>
            <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200/60">Nova Home activities use landscape</p>
            <h3 className="mt-2 text-2xl font-black text-white">Turn your device sideways</h3>
            <p className="mt-3 text-sm leading-6 text-white/56">Rotate to landscape so the full activity stays visible and the main game area gets the most space.</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-cyan-100/70">
              <span>↻</span>
              <span>Rotate to continue</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
