export type WardrobeRigCategory =
  | "outfit"
  | "top"
  | "bottom"
  | "shoes"
  | "accessory";

export type RigPoint = {
  x: number;
  y: number;
};

export type WardrobeRig = {
  characterKey: "nova" | "milo";
  version: number;
  anchors: {
    headTop: RigPoint;
    neck: RigPoint;
    leftShoulder: RigPoint;
    rightShoulder: RigPoint;
    leftWrist: RigPoint;
    rightWrist: RigPoint;
    waist: RigPoint;
    leftHip: RigPoint;
    rightHip: RigPoint;
    leftKnee: RigPoint;
    rightKnee: RigPoint;
    leftAnkle: RigPoint;
    rightAnkle: RigPoint;
    leftToe: RigPoint;
    rightToe: RigPoint;
  };
};

export type RigTargetBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// Coordinates are normalised against Nova's fixed 1254 x 1254 wardrobe base canvas.
// These points are intentionally stored as data instead of being re-detected at runtime.
// Phase 2 will add the admin calibrator for fine corrections.
export const NOVA_WARDROBE_RIG: WardrobeRig = {
  characterKey: "nova",
  version: 1,
  anchors: {
    headTop: { x: 0.5, y: 0.012 },
    neck: { x: 0.5, y: 0.238 },
    leftShoulder: { x: 0.405, y: 0.29 },
    rightShoulder: { x: 0.595, y: 0.29 },
    leftWrist: { x: 0.325, y: 0.57 },
    rightWrist: { x: 0.675, y: 0.57 },
    waist: { x: 0.5, y: 0.493 },
    leftHip: { x: 0.445, y: 0.535 },
    rightHip: { x: 0.555, y: 0.535 },
    leftKnee: { x: 0.435, y: 0.69 },
    rightKnee: { x: 0.565, y: 0.69 },
    leftAnkle: { x: 0.42, y: 0.89 },
    rightAnkle: { x: 0.58, y: 0.89 },
    leftToe: { x: 0.382, y: 0.965 },
    rightToe: { x: 0.618, y: 0.965 },
  },
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function boxFromEdges(left: number, top: number, right: number, bottom: number): RigTargetBox {
  const x = clamp01(left);
  const y = clamp01(top);
  const safeRight = clamp01(right);
  const safeBottom = clamp01(bottom);

  return {
    x,
    y,
    width: Math.max(0.01, safeRight - x),
    height: Math.max(0.01, safeBottom - y),
  };
}

export function getRigTargetBox(
  rig: WardrobeRig,
  category: WardrobeRigCategory,
): RigTargetBox {
  const a = rig.anchors;

  if (category === "outfit") {
    return boxFromEdges(
      Math.min(a.leftWrist.x, a.leftShoulder.x) - 0.025,
      a.neck.y - 0.015,
      Math.max(a.rightWrist.x, a.rightShoulder.x) + 0.025,
      Math.max(a.leftToe.y, a.rightToe.y) + 0.015,
    );
  }

  if (category === "top") {
    return boxFromEdges(
      Math.min(a.leftWrist.x, a.leftShoulder.x) - 0.03,
      a.neck.y - 0.02,
      Math.max(a.rightWrist.x, a.rightShoulder.x) + 0.03,
      a.waist.y + 0.075,
    );
  }

  if (category === "bottom") {
    return boxFromEdges(
      Math.min(a.leftHip.x, a.leftKnee.x, a.leftAnkle.x) - 0.06,
      a.waist.y - 0.02,
      Math.max(a.rightHip.x, a.rightKnee.x, a.rightAnkle.x) + 0.06,
      Math.max(a.leftAnkle.y, a.rightAnkle.y) + 0.04,
    );
  }

  if (category === "shoes") {
    return boxFromEdges(
      Math.min(a.leftAnkle.x, a.leftToe.x) - 0.065,
      Math.min(a.leftAnkle.y, a.rightAnkle.y) - 0.035,
      Math.max(a.rightAnkle.x, a.rightToe.x) + 0.065,
      Math.max(a.leftToe.y, a.rightToe.y) + 0.025,
    );
  }

  // Accessories are intentionally broad in V1 because future accessories can
  // belong to the head, face, neck, wrist, or torso. Phase 2 calibration can
  // save an item-specific correction without changing this base rig.
  return boxFromEdges(0.28, 0.08, 0.72, 0.62);
}

export function getRigStretchLabel(category: WardrobeRigCategory) {
  if (category === "top") return "Stretch shoulders → waist";
  if (category === "bottom") return "Stretch waist → ankles";
  if (category === "shoes") return "Stretch ankles → toes";
  if (category === "outfit") return "Stretch neck → feet";
  return "Stretch to target box";
}
