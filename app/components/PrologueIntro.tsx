"use client";

import { useEffect, useRef, useState } from "react";

const slides = [
  "/story/prologue-00.png",
  "/story/prologue-01.png",
  "/story/prologue-02.png",
  "/story/prologue-03.png",
  "/story/prologue-04.png",
  "/story/prologue-05.png",
  "/story/prologue-06.png",
  "/story/prologue-07.png",
  "/story/prologue-08.png",
];

const audioFiles = [
  "",
  "/audio/prologue-01.mp3",
  "/audio/prologue-02.mp3",
  "/audio/prologue-03.mp3",
  "/audio/prologue-04.mp3",
  "/audio/prologue-05.mp3",
  "/audio/prologue-06.mp3",
  "/audio/prologue-07.mp3",
  "/audio/prologue-08.mp3",
];

export default function PrologueIntro({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [current, setCurrent] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

useEffect(() => {
  if (!started) return;
  if (!audioFiles[current]) return;

  if (audioRef.current) {
    audioRef.current.pause();
  }

  const audio = new Audio(audioFiles[current]);

  audio.volume = 1;

  audio.onended = () => {
    if (current === slides.length - 1) {
      onFinish();
    } else {
      setCurrent((prev) => prev + 1);
    }
  };

  audio.play();

  audioRef.current = audio;

  return () => {
    audio.pause();
  };
}, [current, started]);
  function nextSlide() {
    if (current === slides.length - 1) {
      onFinish();
    } else {
      setCurrent((prev) => prev + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black">
      <div className="relative h-[60vh] w-[70vw] overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
        <img
          src={slides[current]}
          alt={`Prologue slide ${current + 1}`}
          className="h-full w-full object-contain"
        />
      </div>

      {!started ? (
        <button
        onClick={() => {
            setStarted(true);
            setCurrent(1);
        }}
        className="absolute bottom-8 rounded-full bg-white px-8 py-3 text-sm font-medium tracking-[0.2em] text-indigo-950 shadow-xl"
        >
        START PROLOGUE
        </button>
      ) : (
        <button
          onClick={nextSlide}
          className="absolute bottom-8 rounded-full bg-white px-8 py-3 text-sm font-medium tracking-[0.2em] text-indigo-950 shadow-xl"
        >
          {current === slides.length - 1 ? "ENTER DREAMSCAPE" : "SKIP TO NEXT"}
        </button>
      )}

      <button
        onClick={onFinish}
        className="absolute right-8 top-8 rounded-full bg-white/80 px-5 py-2 text-sm text-indigo-950 shadow-md backdrop-blur-md"
      >
        Skip
      </button>
    </div>
  );
}

