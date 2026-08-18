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
      normalSpeed: 7,
      boostSpeed: 9,
      accelerationRate: 5.5,
      brakingRate: 6.5,
      jumpVelocity: -5.2,
      boostCapacity: 70,
      boostDrainRate: 15,
      boostRechargeRate: 14,
      airTiltStrength: 0.006,
    },
  },
  {
    stage: 1,
    missionsRequired: 5,
    name: "Energy Engine",
    shortName: "Engine",
    description: "The rover can now power up and move through Dreamscape.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-1-engine.png",
    accent: "#ffd76a",
    gameStats: {
      normalSpeed: 8,
      boostSpeed: 10.5,
      accelerationRate: 6,
      brakingRate: 6.9,
      jumpVelocity: -6,
      boostCapacity: 80,
      boostDrainRate: 14,
      boostRechargeRate: 16,
      airTiltStrength: 0.008,
    },
  },
  {
    stage: 2,
    missionsRequired: 15,
    name: "Navigation Console",
    shortName: "Navigation",
    description: "Nova can now find safer paths through mission zones.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-3-navigation.png",
    accent: "#60f0d0",
    gameStats: {
      normalSpeed: 9,
      boostSpeed: 12,
      accelerationRate: 6.6,
      brakingRate: 7.3,
      jumpVelocity: -6.8,
      boostCapacity: 85,
      boostDrainRate: 12,
      boostRechargeRate: 18,
      airTiltStrength: 0.012,
    },
  },
  {
    stage: 3,
    missionsRequired: 30,
    name: "Turbo Wheels",
    shortName: "Turbo Wheels",
    description: "The rover moves faster across learning routes.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-5-turbo-wheels.png",
    accent: "#8da2ff",
    gameStats: {
      normalSpeed: 10,
      boostSpeed: 14,
      accelerationRate: 7.2,
      brakingRate: 7.8,
      jumpVelocity: -7.7,
      boostCapacity: 100,
      boostDrainRate: 10,
      boostRechargeRate: 20,
      airTiltStrength: 0.016,
    },
  },
  {
    stage: 4,
    missionsRequired: 50,
    name: "Shield Plating",
    shortName: "Shield",
    description: "The rover is protected during harder missions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-8-shield.png",
    accent: "#ff9df0",
    gameStats: {
      normalSpeed: 11,
      boostSpeed: 16,
      accelerationRate: 7.8,
      brakingRate: 8.2,
      jumpVelocity: -8.7,
      boostCapacity: 110,
      boostDrainRate: 9,
      boostRechargeRate: 22,
      airTiltStrength: 0.019,
    },
  },
  {
    stage: 5,
    missionsRequired: 75,
    name: "Hover Boosters",
    shortName: "Hover Rover",
    description:
      "Nova’s rover is fully upgraded with hover boosters for advanced expeditions.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-12-hover.png",
    accent: "#53d7ff",
    gameStats: {
      normalSpeed: 12,
      boostSpeed: 18,
      accelerationRate: 8.6,
      brakingRate: 8.8,
      jumpVelocity: -10.2,
      boostCapacity: 125,
      boostDrainRate: 8,
      boostRechargeRate: 24,
      airTiltStrength: 0.023,
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
    (upgrade) => completedCount < upgrade.missionsRequired,
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
