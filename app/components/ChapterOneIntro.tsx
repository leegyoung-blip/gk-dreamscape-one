"use client";

import { useState } from "react";

const slides = [
  "/story/chapter-one-01.png",
  "/story/chapter-one-02.png",
  "/story/chapter-one-03.png",
  "/story/chapter-one-04.png",
  "/story/chapter-one-05.png",
  "/story/chapter-one-06.png",
];

export default function ChapterOneIntro({
  onFinish,
}: {
  onFinish: () => void;
}) {
  const [current, setCurrent] = useState(0);

  function nextSlide() {
    if (current === slides.length - 1) {
      onFinish();
    } else {
      setCurrent((prev) => prev + 1);
    }
  }

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/90">
      <div className="relative h-[75vh] w-[80vw] overflow-hidden rounded-3xl border border-white/20 bg-black shadow-2xl">
        <img
          src={slides[current]}
          alt={`Chapter One slide ${current + 1}`}
          className="h-full w-full object-contain"
        />
      </div>

      <button
        onClick={nextSlide}
        className="absolute bottom-8 rounded-full bg-white px-8 py-3 text-sm font-medium tracking-[0.2em] text-indigo-950 shadow-xl"
      >
        {current === slides.length - 1 ? "ENTER DREAMSCAPE" : "NEXT"}
      </button>

      <button
        onClick={onFinish}
        className="absolute right-8 top-8 rounded-full bg-white/80 px-5 py-2 text-sm text-indigo-950 shadow-md backdrop-blur-md"
      >
        Skip
      </button>
    </div>
  );
}