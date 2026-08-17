"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import {
  getRigTargetBox,
  type WardrobeRig,
  type WardrobeRigCategory,
} from "@/lib/novaHome/wardrobeRig";

type FitDraft = {
  fit_mode: "auto" | "manual";
  fit_scale: number;
  fit_scale_x: number;
  fit_scale_y: number;
  fit_offset_x_pct: number;
  fit_offset_y_pct: number;
  fit_rotation_deg: number;
  fit_skew_x_deg: number;
  fit_skew_y_deg: number;
  fit_stretch_mode: "contain" | "stretch";
};

type HandleKind =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "rotate";

type DragState = {
  pointerId: number;
  kind: HandleKind;
  startX: number;
  startY: number;
  start: FitDraft;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function WardrobeTransformHandles({
  rig,
  category,
  fit,
  onChange,
}: {
  rig: WardrobeRig;
  category: WardrobeRigCategory;
  fit: FitDraft;
  onChange: (fit: FitDraft) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const target = getRigTargetBox(rig, category);

  const width = target.width * fit.fit_scale * fit.fit_scale_x;
  const height = target.height * fit.fit_scale * fit.fit_scale_y;
  const centerX = target.x + target.width / 2 + fit.fit_offset_x_pct / 100;
  const centerY = target.y + target.height / 2 + fit.fit_offset_y_pct / 100;
  const left = centerX - width / 2;
  const top = centerY - height / 2;

  function begin(event: ReactPointerEvent<HTMLButtonElement>, kind: HandleKind) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      kind,
      startX: event.clientX,
      startY: event.clientY,
      start: { ...fit },
    };
  }

  function move(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    const root = rootRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !root) return;

    event.preventDefault();
    event.stopPropagation();

    const rect = root.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (event.clientX - drag.startX) / rect.width;
    const dy = (event.clientY - drag.startY) / rect.height;
    const baseTarget = getRigTargetBox(rig, category);
    const baseWidth = Math.max(0.01, baseTarget.width * drag.start.fit_scale);
    const baseHeight = Math.max(0.01, baseTarget.height * drag.start.fit_scale);
    const next = { ...drag.start, fit_mode: "manual" as const };

    const resizeLeft = drag.kind.includes("left");
    const resizeRight = drag.kind.includes("right");
    const resizeTop = drag.kind.includes("top");
    const resizeBottom = drag.kind.includes("bottom");

    if (drag.kind === "rotate") {
      const centerClientX = rect.left + centerX * rect.width;
      const centerClientY = rect.top + centerY * rect.height;
      const startAngle = Math.atan2(drag.startY - centerClientY, drag.startX - centerClientX);
      const currentAngle = Math.atan2(event.clientY - centerClientY, event.clientX - centerClientX);
      const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
      next.fit_rotation_deg = clamp(drag.start.fit_rotation_deg + deltaDeg, -60, 60);
      onChange(next);
      return;
    }

    if (resizeLeft || resizeRight) {
      const signedDx = resizeLeft ? -dx : dx;
      next.fit_scale_x = clamp(
        drag.start.fit_scale_x + signedDx / baseWidth,
        0.2,
        4,
      );
      next.fit_offset_x_pct = clamp(
        drag.start.fit_offset_x_pct + dx * 50,
        -50,
        50,
      );
    }

    if (resizeTop || resizeBottom) {
      const signedDy = resizeTop ? -dy : dy;
      next.fit_scale_y = clamp(
        drag.start.fit_scale_y + signedDy / baseHeight,
        0.2,
        4,
      );
      next.fit_offset_y_pct = clamp(
        drag.start.fit_offset_y_pct + dy * 50,
        -50,
        50,
      );
    }

    onChange(next);
  }

  function end(event: ReactPointerEvent<HTMLButtonElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  const handleClass =
    "absolute z-[80] h-3.5 w-3.5 rounded-[4px] border border-amber-100 bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.55)]";

  const handles: Array<{
    kind: HandleKind;
    className: string;
    cursor: string;
    label: string;
  }> = [
    { kind: "top-left", className: "-left-2 -top-2", cursor: "nwse-resize", label: "Resize top left" },
    { kind: "top-right", className: "-right-2 -top-2", cursor: "nesw-resize", label: "Resize top right" },
    { kind: "bottom-left", className: "-bottom-2 -left-2", cursor: "nesw-resize", label: "Resize bottom left" },
    { kind: "bottom-right", className: "-bottom-2 -right-2", cursor: "nwse-resize", label: "Resize bottom right" },
    { kind: "left", className: "-left-2 top-1/2 -translate-y-1/2", cursor: "ew-resize", label: "Stretch left" },
    { kind: "right", className: "-right-2 top-1/2 -translate-y-1/2", cursor: "ew-resize", label: "Stretch right" },
    { kind: "top", className: "-top-2 left-1/2 -translate-x-1/2", cursor: "ns-resize", label: "Stretch top" },
    { kind: "bottom", className: "-bottom-2 left-1/2 -translate-x-1/2", cursor: "ns-resize", label: "Stretch bottom" },
  ];

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[75]">
      <div
        className="pointer-events-none absolute border border-amber-200/70 bg-amber-300/[0.025] shadow-[0_0_0_1px_rgba(251,191,36,0.08)]"
        style={{
          left: `${left * 100}%`,
          top: `${top * 100}%`,
          width: `${width * 100}%`,
          height: `${height * 100}%`,
          transform: `rotate(${fit.fit_rotation_deg}deg) skewX(${fit.fit_skew_x_deg}deg) skewY(${fit.fit_skew_y_deg}deg)`,
          transformOrigin: "center center",
        }}
      >
        {handles.map((handle) => (
          <button
            key={handle.kind}
            type="button"
            aria-label={handle.label}
            className={`${handleClass} ${handle.className} pointer-events-auto`}
            style={{ cursor: handle.cursor }}
            onPointerDown={(event) => begin(event, handle.kind)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
          />
        ))}
        <div className="absolute left-1/2 top-0 h-7 w-px -translate-x-1/2 -translate-y-full bg-amber-200/60" />
        <button
          type="button"
          aria-label="Rotate garment"
          className="pointer-events-auto absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-[38px] rounded-full border border-amber-100 bg-slate-950 shadow-[0_0_12px_rgba(252,211,77,0.4)]"
          style={{ cursor: "grab" }}
          onPointerDown={(event) => begin(event, "rotate")}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
      </div>
    </div>
  );
}
