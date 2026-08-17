"use client";

import {
  getRigTargetBox,
  type WardrobeRig,
  type WardrobeRigCategory,
} from "@/lib/novaHome/wardrobeRig";

const ANCHOR_LABELS: Record<string, string> = {
  headTop: "Head",
  neck: "Neck",
  leftShoulder: "L Sh",
  rightShoulder: "R Sh",
  leftWrist: "L Wr",
  rightWrist: "R Wr",
  waist: "Waist",
  leftHip: "L Hip",
  rightHip: "R Hip",
  leftKnee: "L Knee",
  rightKnee: "R Knee",
  leftAnkle: "L Ankle",
  rightAnkle: "R Ankle",
  leftToe: "L Toe",
  rightToe: "R Toe",
};

export default function WardrobeRigOverlay({
  rig,
  category,
  showAnchors = true,
}: {
  rig: WardrobeRig;
  category: WardrobeRigCategory;
  showAnchors?: boolean;
}) {
  const target = getRigTargetBox(rig, category);

  return (
    <div className="pointer-events-none absolute inset-0 z-[88]" aria-hidden="true">
      <div
        className="absolute border border-dashed border-cyan-200/70 bg-cyan-300/[0.035] shadow-[0_0_22px_rgba(34,211,238,0.12)]"
        style={{
          left: `${target.x * 100}%`,
          top: `${target.y * 100}%`,
          width: `${target.width * 100}%`,
          height: `${target.height * 100}%`,
        }}
        title={`${category} target`}
      />

      {showAnchors &&
        (Object.entries(rig.anchors) as [keyof WardrobeRig["anchors"], { x: number; y: number }][]).map(([key, point]) => (
          <div
            key={key}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
            title={ANCHOR_LABELS[String(key)] || String(key)}
          >
            <span className="block h-2.5 w-2.5 rounded-full border border-white/90 bg-cyan-300 shadow-[0_0_9px_rgba(34,211,238,0.8)]" />
          </div>
        ))}
    </div>
  );
}
