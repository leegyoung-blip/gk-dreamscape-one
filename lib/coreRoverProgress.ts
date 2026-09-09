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
  crashPenaltyMultiplier?: number;
  trapPenaltyMultiplier?: number;
};

export type CoreRoverUpgrade = {
  stage: number;
  roverNumber: number;
  priceDt: number;
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
    roverNumber: 1,
    priceDt: 0,
    name: "Basic Rover Frame",
    shortName: "Frame",
    description: "Nova has the starting frame of her Skyforge Rover.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-0-frame.png",
    accent: "#7ee8ff",
    gameStats: {
      normalSpeed: 8.5,
      boostSpeed: 11,
      accelerationRate: 6.2,
      brakingRate: 6.8,
      jumpVelocity: -8.8,
      boostCapacity: 70,
      boostDrainRate: 15,
      boostRechargeRate: 14,
      airTiltStrength: 0.006,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 1,
    roverNumber: 2,
    priceDt: 100,
    name: "Energy Engine",
    shortName: "Engine",
    description:
      "A stronger power system improves acceleration and gives the rover more usable boost energy.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-1-engine.png",
    accent: "#ffd76a",
    gameStats: {
      normalSpeed: 9.5,
      boostSpeed: 12.5,
      accelerationRate: 6.8,
      brakingRate: 7,
      jumpVelocity: -9.8,
      boostCapacity: 90,
      boostDrainRate: 13.5,
      boostRechargeRate: 17,
      airTiltStrength: 0.007,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 2,
    roverNumber: 3,
    priceDt: 250,
    name: "Navigation Console",
    shortName: "Navigation",
    description:
      "Improved navigation gives the rover sharper braking, steadier handling and better control in the air.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-3-navigation.png",
    accent: "#60f0d0",
    gameStats: {
      normalSpeed: 10.2,
      boostSpeed: 14,
      accelerationRate: 7.1,
      brakingRate: 8,
      jumpVelocity: -11,
      boostCapacity: 95,
      boostDrainRate: 13,
      boostRechargeRate: 18,
      airTiltStrength: 0.012,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 3,
    roverNumber: 4,
    priceDt: 625,
    name: "Turbo Wheels",
    shortName: "Turbo Wheels",
    description:
      "Turbo Wheels deliver the rover's major speed upgrade and the jump power needed for advanced routes.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-5-turbo-wheels.png",
    accent: "#8da2ff",
    gameStats: {
      normalSpeed: 11.8,
      boostSpeed: 16.5,
      accelerationRate: 8.1,
      brakingRate: 8.4,
      jumpVelocity: -13,
      boostCapacity: 100,
      boostDrainRate: 12,
      boostRechargeRate: 19,
      airTiltStrength: 0.016,
      crashPenaltyMultiplier: 1,
      trapPenaltyMultiplier: 1,
    },
  },
  {
    stage: 4,
    roverNumber: 5,
    priceDt: 1560,
    name: "Shield Plating",
    shortName: "Shield",
    description:
      "Shield Plating keeps Turbo performance while reducing damage penalties from crashes, traps and pulse gates.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-8-shield.png",
    accent: "#ff9df0",
    gameStats: {
      normalSpeed: 11.8,
      boostSpeed: 16.5,
      accelerationRate: 8.1,
      brakingRate: 8.8,
      jumpVelocity: -13,
      boostCapacity: 110,
      boostDrainRate: 12,
      boostRechargeRate: 20,
      airTiltStrength: 0.016,
      crashPenaltyMultiplier: 0.65,
      trapPenaltyMultiplier: 0.7,
    },
  },
  {
    stage: 5,
    roverNumber: 6,
    priceDt: 3900,
    name: "Hover Boosters",
    shortName: "Hover Rover",
    description:
      "Hover Boosters add the strongest boost, jump and aerial control while retaining the rover's protective plating.",
    imageSrc:
      "/activities/learning-missions/core/rover/rover-stage-12-hover.png",
    accent: "#53d7ff",
    gameStats: {
      normalSpeed: 13.2,
      boostSpeed: 19.5,
      accelerationRate: 8.8,
      brakingRate: 9.2,
      jumpVelocity: -14.5,
      boostCapacity: 125,
      boostDrainRate: 10.5,
      boostRechargeRate: 22,
      airTiltStrength: 0.024,
      crashPenaltyMultiplier: 0.65,
      trapPenaltyMultiplier: 0.7,
    },
  },
];

export function getCoreRoverByStage(stage: number) {
  const normalisedStage = Math.min(
    coreUpgradeTrack.length - 1,
    Math.max(0, Math.floor(Number(stage) || 0)),
  );

  return (
    coreUpgradeTrack.find((upgrade) => upgrade.stage === normalisedStage) ??
    coreUpgradeTrack[0]
  );
}

/**
 * Compatibility helper for any remaining callers.
 * The argument is now a rover stage, NOT a completed-quiz count.
 */
export function getCurrentCoreRoverUpgrade(stage: number) {
  return getCoreRoverByStage(stage);
}

/**
 * Compatibility helper for any remaining callers.
 * The argument is now a rover stage, NOT a completed-quiz count.
 */
export function getNextCoreRoverUpgrade(stage: number) {
  const current = getCoreRoverByStage(stage);

  return coreUpgradeTrack.find(
    (upgrade) => upgrade.stage === current.stage + 1,
  );
}

/**
 * Compatibility helper for any remaining callers.
 * Rover ownership is authoritative in Supabase; this only describes a stage.
 */
export function getCoreRoverProgress(stage: number) {
  const currentUpgrade = getCoreRoverByStage(stage);
  const nextUpgrade = getNextCoreRoverUpgrade(currentUpgrade.stage);
  const finalUpgrade = coreUpgradeTrack[coreUpgradeTrack.length - 1];

  return {
    currentUpgrade,
    nextUpgrade,
    progressPercentage: nextUpgrade ? 0 : 100,
    isComplete: !nextUpgrade,
    finalUpgrade,
    missionsToNext: 0,
  };
}
