"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

type DeferredVideoProps = {
  src: string;
  poster?: string;
  style?: CSSProperties;
  className?: string;
  ariaHidden?: boolean;
};

/*
 * Muted, looping decorative video that does not download until it is needed.
 *
 * Autoplay videos ignore preload hints and start downloading immediately, so the
 * source is only attached once all of these hold:
 * - the page has finished loading (posters, images and page content go first);
 * - the video is in, or about to enter, the viewport;
 * - the visitor has not asked for reduced motion (the poster is shown instead).
 *
 * It pauses again when scrolled out of view. Until it plays, the poster is shown,
 * exactly as before the video loaded.
 */
export default function DeferredVideo({
  src,
  poster,
  style,
  className,
  ariaHidden,
}: DeferredVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let inView = false;
    let pageLoaded = document.readyState === "complete";

    function sync() {
      if (!video) return;
      const shouldPlay = inView && pageLoaded && !reducedMotion.matches;

      if (shouldPlay) {
        setActive(true);
        if (video.getAttribute("src")) {
          void video.play().catch(() => undefined);
        }
      } else if (!video.paused) {
        video.pause();
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(video);

    function handleLoad() {
      pageLoaded = true;
      sync();
    }

    if (!pageLoaded) window.addEventListener("load", handleLoad, { once: true });
    reducedMotion.addEventListener("change", sync);

    return () => {
      observer.disconnect();
      window.removeEventListener("load", handleLoad);
      reducedMotion.removeEventListener("change", sync);
    };
  }, []);

  return (
    <video
      ref={videoRef}
      src={active ? src : undefined}
      poster={poster}
      autoPlay={active}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden={ariaHidden || undefined}
      className={className}
      style={style}
    />
  );
}
