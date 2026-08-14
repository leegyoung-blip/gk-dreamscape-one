"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getRigTargetBox,
  type WardrobeRig,
  type WardrobeRigCategory,
} from "@/lib/novaHome/wardrobeRig";

type AlphaBounds = {
  imageWidth: number;
  imageHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type FittedWardrobeItem = {
  item_key: string;
  category: WardrobeRigCategory;
  layer_image: string | null;
  layer_order: number;
  fit_mode?: string | null;
  fit_scale?: number | null;
  fit_offset_x_pct?: number | null;
  fit_offset_y_pct?: number | null;
  fit_rotation_deg?: number | null;
};

const alphaBoundsCache = new Map<string, AlphaBounds>();
const alphaBoundsPromises = new Map<string, Promise<AlphaBounds>>();

function detectAlphaBounds(src: string): Promise<AlphaBounds> {
  const cached = alphaBoundsCache.get(src);
  if (cached) return Promise.resolve(cached);

  const existing = alphaBoundsPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<AlphaBounds>((resolve) => {
    const image = new Image();
    image.decoding = "async";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) throw new Error("Canvas 2D context unavailable");

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0);

        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let minX = canvas.width;
        let minY = canvas.height;
        let maxX = -1;
        let maxY = -1;

        // Alpha threshold of 8 ignores tiny antialiasing halos around transparent PNGs.
        for (let y = 0; y < canvas.height; y += 1) {
          const rowOffset = y * canvas.width * 4;
          for (let x = 0; x < canvas.width; x += 1) {
            const alpha = data[rowOffset + x * 4 + 3];
            if (alpha <= 8) continue;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }

        const bounds: AlphaBounds =
          maxX >= minX && maxY >= minY
            ? {
                imageWidth: canvas.width,
                imageHeight: canvas.height,
                x: minX,
                y: minY,
                width: maxX - minX + 1,
                height: maxY - minY + 1,
              }
            : {
                imageWidth: canvas.width,
                imageHeight: canvas.height,
                x: 0,
                y: 0,
                width: canvas.width,
                height: canvas.height,
              };

        alphaBoundsCache.set(src, bounds);
        resolve(bounds);
      } catch (error) {
        console.warn("Wardrobe auto-fit could not inspect PNG alpha bounds:", src, error);
        const fallback = {
          imageWidth: image.naturalWidth || 1,
          imageHeight: image.naturalHeight || 1,
          x: 0,
          y: 0,
          width: image.naturalWidth || 1,
          height: image.naturalHeight || 1,
        };
        alphaBoundsCache.set(src, fallback);
        resolve(fallback);
      }
    };

    image.onerror = () => {
      resolve({ imageWidth: 1, imageHeight: 1, x: 0, y: 0, width: 1, height: 1 });
    };

    image.src = src;
  }).finally(() => {
    alphaBoundsPromises.delete(src);
  });

  alphaBoundsPromises.set(src, promise);
  return promise;
}

export default function WardrobeFittedLayer({
  item,
  rig,
}: {
  item: FittedWardrobeItem;
  rig: WardrobeRig;
}) {
  const src = item.layer_image || "";
  const [bounds, setBounds] = useState<AlphaBounds | null>(() =>
    src ? alphaBoundsCache.get(src) ?? null : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!src) {
      setBounds(null);
      return;
    }

    detectAlphaBounds(src).then((next) => {
      if (!cancelled) setBounds(next);
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  const style = useMemo(() => {
    if (!bounds || !src) return null;

    const target = getRigTargetBox(rig, item.category);
    const fitScale = Number(item.fit_scale ?? 1) || 1;
    const offsetX = (Number(item.fit_offset_x_pct ?? 0) || 0) / 100;
    const offsetY = (Number(item.fit_offset_y_pct ?? 0) || 0) / 100;
    const rotation = Number(item.fit_rotation_deg ?? 0) || 0;

    // Fit the actual visible alpha content into the rig target box instead of
    // fitting the full transparent PNG canvas. This is what lets differently
    // padded source images still land on Nova's shoulders / waist / ankles.
    const sourceToStage =
      Math.min(target.width / bounds.width, target.height / bounds.height) * fitScale;

    const renderedImageWidth = bounds.imageWidth * sourceToStage;
    const renderedImageHeight = bounds.imageHeight * sourceToStage;
    const targetCenterX = target.x + target.width / 2 + offsetX;
    const targetCenterY = target.y + target.height / 2 + offsetY;
    const alphaCenterX = bounds.x + bounds.width / 2;
    const alphaCenterY = bounds.y + bounds.height / 2;

    const left = targetCenterX - alphaCenterX * sourceToStage;
    const top = targetCenterY - alphaCenterY * sourceToStage;

    return {
      left: `${left * 100}%`,
      top: `${top * 100}%`,
      width: `${renderedImageWidth * 100}%`,
      height: `${renderedImageHeight * 100}%`,
      transform: `rotate(${rotation}deg)`,
      transformOrigin: "center center",
      zIndex: 20 + item.layer_order,
    } as const;
  }, [bounds, item.category, item.fit_offset_x_pct, item.fit_offset_y_pct, item.fit_rotation_deg, item.fit_scale, item.layer_order, rig, src]);

  if (!src) return null;

  // First frame uses the old safe full-canvas placement while alpha bounds are
  // being inspected, then snaps into the rig-calculated position.
  if (!style) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-0"
        draggable={false}
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute max-w-none select-none object-fill transition-[left,top,width,height,transform] duration-150"
      draggable={false}
      style={style}
    />
  );
}
