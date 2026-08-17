"use client";

import { getRigTargetBox, type WardrobeRig, type WardrobeRigCategory } from "@/lib/novaHome/wardrobeRig";

export default function WardrobeRigOverlay({
  rig,
  category,
  showAnchors,
}: {
  rig: WardrobeRig;
  category: WardrobeRigCategory;
  showAnchors: boolean;
}) {
  const target = getRigTargetBox(rig, category);
  const anchors = Object.entries(rig.anchors);

  return (
    <div className="pointer-events-none absolute inset-0 z-[70]">
      <div
        className="absolute border border-cyan-300/50 bg-cyan-300/[0.04] shadow-[0_0_0_1px_rgba(34,211,238,0.08)]"
        style={{
          left: `${target.x * 100}%`,
          top: `${target.y * 100}%`,
          width: `${target.width * 100}%`,
          height: `${target.height * 100}%`,
        }}
      />
      {showAnchors &&
        anchors.map(([key, point]) => (
          <div
            key={key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
          >
            <div className="h-2.5 w-2.5 rounded-full border border-cyan-100/80 bg-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.5)]" />
            <span className="mt-1 block whitespace-nowrap rounded-full border border-cyan-300/20 bg-slate-950/80 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-100/80">
              {key}
            </span>
          </div>
        ))}
    </div>
  );
}
