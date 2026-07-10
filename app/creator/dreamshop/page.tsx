"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const zones = [
  {
    id: "custom",
    title: "Design & Custom Creations",
    subtitle: "Have an idea? We'll help bring it to life.",
    href: "/creator/dreamshop/custom-creations",
    style: { left: "0%", top: "14%", width: "33.33%", height: "72%" },
  },
  {
    id: "membership",
    title: "Dreamscape Membership",
    subtitle: "Learn, earn rewards and unlock adventures.",
    href: "/creator/dreamshop/membership",
    style: { left: "33.33%", top: "14%", width: "33.33%", height: "72%" },
  },
  {
    id: "printing",
    title: "3D Printing Services",
    subtitle: "Already have a design? Let us print it.",
    href: "/creator/dreamshop/printing-services",
    style: { left: "66.66%", top: "14%", width: "33.34%", height: "72%" },
  },
];

function Typewriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    setDisplayed("");

    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;

      if (i > text.length) clearInterval(interval);
    }, 28);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayed}</>;
}

function MiloIntro({ onClose }: { onClose: () => void }) {
  const lines = [
    "Welcome to the Dreamshop. This is where ideas leave the world of dreams and enter the real world.",
    "On the left, we help you design something custom.",
    "In the centre, you can learn about Dreamscape Membership.",
    "On the right, you can send us designs that are ready to be 3D printed.",
    "Choose the area that fits what you need.",
  ];

  const [lineIndex, setLineIndex] = useState(0);
  const isLastLine = lineIndex === lines.length - 1;

  return (
    <div className="absolute bottom-8 left-1/2 z-[120] w-[760px] -translate-x-1/2 rounded-3xl bg-white/85 px-8 py-6 text-amber-950 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-sm font-medium tracking-[0.18em] text-amber-900/60">
        MILO
      </p>

      <p className="min-h-[64px] text-lg font-light leading-8">
        <Typewriter text={lines[lineIndex]} />
      </p>

      <div className="mt-5 flex justify-end">
        {!isLastLine ? (
          <button
            onClick={() => setLineIndex((current) => current + 1)}
            className="rounded-full px-4 py-2 text-sm tracking-wide hover:bg-white"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={onClose}
            className="rounded-full bg-amber-950 px-5 py-2 text-sm tracking-wide text-white hover:bg-amber-900"
          >
            Enter Dreamshop
          </button>
        )}
      </div>
    </div>
  );
}

export default function DreamshopPage() {
  const [introOpen, setIntroOpen] = useState(false);
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  useEffect(() => {
    const seen = localStorage.getItem("seen-dreamshop-intro");

    if (!seen) {
      setIntroOpen(true);
    }
  }, []);

  function closeIntro() {
    localStorage.setItem("seen-dreamshop-intro", "true");
    setIntroOpen(false);
  }

  return (
    <main
      className="relative h-screen w-screen overflow-hidden bg-[#120b07]"
      style={{
        backgroundImage: "url('/backgrounds/dreamshop-interior.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="pointer-events-none absolute inset-0 z-0 bg-black/10" />

      <Link
        href="/creator"
        className="absolute left-8 top-8 z-[130] rounded-full bg-white/85 px-5 py-2 text-sm font-light tracking-wide text-amber-950 shadow-md backdrop-blur-md transition hover:bg-white"
      >
        ← Back to Creator World
      </Link>

      <header className="pointer-events-none absolute left-0 right-0 top-8 z-20 text-center">
        <p className="text-sm font-light tracking-[0.3em] text-black/70">
          CREATOR WORLD
        </p>

        <h1 className="mt-4 text-5xl font-extralight tracking-[0.22em] text-white drop-shadow-lg">
          THE DREAMSHOP
        </h1>
      </header>

      {zones.map((zone) => {
        const isHovered = hoveredZone === zone.id;

        return (
          <Link
            key={zone.id}
            href={zone.href}
            style={zone.style}
            onMouseEnter={() => setHoveredZone(zone.id)}
            onMouseLeave={() => setHoveredZone(null)}
            className="absolute z-[100] block cursor-pointer rounded-[2rem] transition hover:bg-white/5 hover:outline hover:outline-2 hover:outline-white/40"
          >
            {isHovered && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[320px] rounded-3xl bg-white/90 px-8 py-6 text-center text-amber-950 shadow-xl backdrop-blur-md">
                  <h2 className="text-2xl font-light tracking-wide">
                    {zone.title}
                  </h2>

                  <div className="mx-auto mt-3 h-[1px] w-16 bg-orange-400/80" />

                  <p className="mt-4 text-sm leading-7 text-amber-950/75">
                    {zone.subtitle}
                  </p>

                  <p className="mt-5 text-xs font-medium tracking-[0.18em] text-orange-700">
                    ENTER →
                  </p>
                </div>
              </div>
            )}
          </Link>
        );
      })}

      {!introOpen && !hoveredZone && (
        <div className="pointer-events-none absolute bottom-8 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/75 px-6 py-3 text-sm font-light tracking-wide text-amber-950 shadow-md backdrop-blur-md">
          Hover over a service area to begin
        </div>
      )}

      {introOpen && <MiloIntro onClose={closeIntro} />}
    </main>
  );
}