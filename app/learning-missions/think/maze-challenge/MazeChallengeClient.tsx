"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const PhaserGame = dynamic(() => import("./PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="grid h-full w-full place-items-center bg-[#030816]">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-cyan-300" />
        <p className="mt-4 text-xs font-bold tracking-[0.22em] text-cyan-100/60">
          ENTERING THE FOREST
        </p>
      </div>
    </div>
  ),
});

type FullscreenElement = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export default function MazeChallengeClient() {
  const gameAreaRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const requestFullscreen = useCallback(async () => {
    const element = gameAreaRef.current as FullscreenElement | null;

    if (!element) {
      return;
    }

    try {
      if (element.requestFullscreen) {
        await element.requestFullscreen({ navigationUI: "hide" });
      } else if (element.webkitRequestFullscreen) {
        await element.webkitRequestFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be started:", error);
    }
  }, []);

  const exitFullscreen = useCallback(async () => {
    const fullscreenDocument = document as FullscreenDocument;

    try {
      if (fullscreenDocument.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      } else if (
        fullscreenDocument.webkitFullscreenElement &&
        fullscreenDocument.webkitExitFullscreen
      ) {
        await fullscreenDocument.webkitExitFullscreen();
      }
    } catch (error) {
      console.warn("Fullscreen could not be closed:", error);
    }
  }, []);

  useEffect(() => {
    const fullscreenDocument = document as FullscreenDocument;

    function syncFullscreen() {
      setIsFullscreen(
        Boolean(
          fullscreenDocument.fullscreenElement ||
            fullscreenDocument.webkitFullscreenElement,
        ),
      );

      window.setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    document.addEventListener("webkitfullscreenchange", syncFullscreen);

    return () => {
      document.removeEventListener("fullscreenchange", syncFullscreen);
      document.removeEventListener("webkitfullscreenchange", syncFullscreen);
    };
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#030611] text-white">
      <header className="mx-auto flex w-full max-w-[1500px] items-center justify-between px-4 py-4 sm:px-8">
        <Link
          href="/learning-missions/think"
          className="rounded-full border border-cyan-200/20 bg-white/[0.05] px-4 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
        >
          ← Think Missions
        </Link>

        <div className="text-right">
          <p className="text-[10px] font-bold tracking-[0.24em] text-cyan-300/70">
            UNCHARTED DREAMSCAPE
          </p>
          <p className="mt-1 text-sm font-semibold text-white/85">
            Forest Maze Expedition
          </p>
        </div>
      </header>

      <section className="px-3 pb-10 sm:px-5">
        <div className="mx-auto mb-5 flex w-full max-w-[1500px] flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-3">
          <div>
            <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">
              THINK MISSION CHALLENGE
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">
              The Uncharted Forest
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58 sm:text-base">
              The Dreamkeeper has sent Bone Guards into a dark forest Nova has
              never explored. Recover all three energy cores, survive the
              skeleton patrols and reach the forest exit.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
              PLAYABLE PROTOTYPE
            </span>
          </div>
        </div>

        <div
          ref={gameAreaRef}
          className={
            isFullscreen
              ? "relative h-screen w-screen overflow-hidden bg-[#030816]"
              : "relative mx-auto aspect-video w-full max-w-[1500px] overflow-hidden rounded-[24px] border border-cyan-200/15 bg-[#030816] shadow-[0_30px_100px_rgba(0,0,0,0.55)]"
          }
        >
          <PhaserGame />

          <button
            type="button"
            onClick={() => {
              if (isFullscreen) {
                void exitFullscreen();
              } else {
                void requestFullscreen();
              }
            }}
            className="absolute bottom-3 left-3 z-[90] grid h-11 w-11 place-items-center rounded-xl border border-cyan-200/35 bg-[#030816]/80 text-xl text-cyan-100 backdrop-blur-md transition hover:bg-[#11233b]/90"
            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
            title={isFullscreen ? "Exit full screen" : "Enter full screen"}
          >
            {isFullscreen ? "↙" : "⛶"}
          </button>
        </div>

        <div className="mx-auto mt-4 grid w-full max-w-[1500px] gap-3 sm:grid-cols-3">
          <InfoCard label="Objective" value="Collect 3 cores and reach the exit" />
          <InfoCard label="Movement" value="WASD or arrow keys" />
          <InfoCard label="Combat" value="Space to use Nova's energy strike" />
        </div>

        <section className="mx-auto mt-4 w-full max-w-[1500px] rounded-[22px] border border-white/10 bg-white/[0.035] p-5 backdrop-blur-xl sm:p-7">
          <p className="text-[10px] font-bold tracking-[0.22em] text-cyan-300/70">
            CURRENT BUILD
          </p>
          <h2 className="mt-2 text-2xl font-bold">What is included</h2>
          <p className="mt-3 max-w-4xl text-sm leading-6 text-white/58">
            This first build uses the forest background, Nova's walk, idle,
            attack and hurt sprite sheets, and the Bone Guard's walk, idle,
            attack, hurt and defeated sheets. Obstacles, collision walls, fog,
            additional enemy types and gear abilities can be added after the
            basic movement and combat feel correct.
          </p>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("think-forest-restart"))}
            className="mt-5 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-5 py-2.5 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/15"
          >
            Restart Game
          </button>
        </section>
      </section>
    </main>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 backdrop-blur-xl">
      <p className="text-[10px] font-bold tracking-[0.2em] text-white/35">
        {label.toUpperCase()}
      </p>
      <p className="mt-1 text-sm font-medium text-white/82">{value}</p>
    </div>
  );
}
