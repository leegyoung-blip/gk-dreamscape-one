export type CoreRoverGameStats = {
  normalSpeed: number;
  boostSpeed: number;
  accelerationRate: number;
  brakingRate: number;
  jumpVelocity: number;
  boostCapacity: number;
  boostDrainRate: number;
  boostRechargeRate: number;
  airTiltStrength: number;
};

export type CoreRoverUpgrade = {
  stage: number;
  missionsRequired: number;
  name: string;
  shortName: string;
  description: string;
  imageSrc: string;
  accent: string;
  gameStats: CoreRoverGameStats;
};

export const coreUpgradeTrack: CoreRoverUpgrade[] = [
  {
    stage: 0,
    missionsRequired: 0,
    name: "Basic Rover Frame",
    shortName: "Frame",
    description: "Nova has the starting frame of her Skyforge Rover.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-0-frame.png",
    accent: "#7ee8ff",
    gameStats: {
      normalSpeed: 8,
      boostSpeed: 16,
      accelerationRate: 10,
      brakingRate: 7.3,
      jumpVelocity: -6.8,
      boostCapacity: 80,
      boostDrainRate: 20,
      boostRechargeRate: 10,
      airTiltStrength: 0.10,
    },
  },
  {
    stage: 1,
    missionsRequired: 1,
    name: "Energy Engine",
    shortName: "Engine",
    description: "The rover can now power up and move through Dreamscape.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-1-engine.png",
    accent: "#ffd76a",
    gameStats: {
      normalSpeed: 10,
      boostSpeed: 18,
      accelerationRate: 12,
      brakingRate: 6.9,
      jumpVelocity: -6,
      boostCapacity: 90,
      boostDrainRate: 18,
      boostRechargeRate: 12,
      airTiltStrength: 0.10,
    },
  },
  {
    stage: 2,
    missionsRequired: 3,
    name: "Navigation Console",
    shortName: "Navigation",
    description: "Nova can now find safer paths through mission zones.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-3-navigation.png",
    accent: "#60f0d0",
    gameStats: {
      normalSpeed: 12,
      boostSpeed: 20,
      accelerationRate: 14,
      brakingRate: 7.3,
      jumpVelocity: -6.8,
      boostCapacity: 95,
      boostDrainRate: 16,
      boostRechargeRate: 14,
      airTiltStrength: 0.15,
    },
  },
  {
    stage: 3,
    missionsRequired: 5,
    name: "Turbo Wheels",
    shortName: "Turbo Wheels",
    description: "The rover moves faster across learning routes.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-5-turbo-wheels.png",
    accent: "#8da2ff",
    gameStats: {
      normalSpeed: 14,
      boostSpeed: 22,
      accelerationRate: 16,
      brakingRate: 7.8,
      jumpVelocity: -7.7,
      boostCapacity: 110,
      boostDrainRate: 14,
      boostRechargeRate: 16,
      airTiltStrength: 0.2,
    },
  },
  {
    stage: 4,
    missionsRequired: 8,
    name: "Shield Plating",
    shortName: "Shield",
    description: "The rover is protected during harder missions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-8-shield.png",
    accent: "#ff9df0",
    gameStats: {
      normalSpeed: 16,
      boostSpeed: 24,
      accelerationRate: 18,
      brakingRate: 8.2,
      jumpVelocity: -8.7,
      boostCapacity: 120,
      boostDrainRate: 12,
      boostRechargeRate: 18,
      airTiltStrength: 0.2,
    },
  },
  {
    stage: 5,
    missionsRequired: 12,
    name: "Hover Boosters",
    shortName: "Hover Rover",
    description:
      "Nova’s rover is fully upgraded with hover boosters for advanced expeditions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-12-hover.png",
    accent: "#53d7ff",
    gameStats: {
      normalSpeed: 18,
      boostSpeed: 26,
      accelerationRate: 20,
      brakingRate: 9.2,
      jumpVelocity: -10.2,
      boostCapacity: 125,
      boostDrainRate: 10,
      boostRechargeRate: 20,
      airTiltStrength: 0.25,
    },
  },
];

export function getCurrentCoreRoverUpgrade(completedCount: number) {
  let currentUpgrade = coreUpgradeTrack[0];

  for (const upgrade of coreUpgradeTrack) {
    if (completedCount >= upgrade.missionsRequired) {
      currentUpgrade = upgrade;
    }
  }

  return currentUpgrade;
}

export function getNextCoreRoverUpgrade(completedCount: number) {
  return coreUpgradeTrack.find(
    (upgrade) => completedCount < upgrade.missionsRequired
  );
}

export function getCoreRoverProgress(completedCount: number) {
  const currentUpgrade = getCurrentCoreRoverUpgrade(completedCount);
  const nextUpgrade = getNextCoreRoverUpgrade(completedCount);
  const finalUpgrade = coreUpgradeTrack[coreUpgradeTrack.length - 1];

  const progressTarget =
    nextUpgrade?.missionsRequired ?? finalUpgrade.missionsRequired;
  const previousTarget = currentUpgrade.missionsRequired;
  const progressRange = Math.max(1, progressTarget - previousTarget);
  const progressWithinRange = Math.max(0, completedCount - previousTarget);

  return {
    currentUpgrade,
    nextUpgrade,
    progressPercentage: nextUpgrade
      ? Math.min(100, Math.round((progressWithinRange / progressRange) * 100))
      : 100,
    isComplete: !nextUpgrade,
    finalUpgrade,
    missionsToNext: nextUpgrade
      ? Math.max(0, nextUpgrade.missionsRequired - completedCount)
      : 0,
  };
}
