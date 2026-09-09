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
  slug: string;
  priceDt: number;
  name: string;
  shortName: string;
  description: string;
  imageSrc: string;
  gameImageSrc: string;
  accent: string;
  gameStats: CoreRoverGameStats;
};

const ROVER_ASSET_ROOT =
  "/activities/learning-missions/core/rover/vehicles";

export const coreUpgradeTrack: CoreRoverUpgrade[] = [
  {
    stage: 0,
    roverNumber: 1,
    slug: "scout-buggy",
    priceDt: 0,
    name: "Scout Buggy",
    shortName: "Scout",
    description:
      "A lightweight exploration buggy with exposed suspension, a compact cockpit and responsive handling for first expeditions.",
    imageSrc: `${ROVER_ASSET_ROOT}/scout-buggy.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-scout-buggy.png`,
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
    slug: "ignition-runner",
    priceDt: 100,
    name: "Ignition Runner",
    shortName: "Ignition",
    description:
      "A low, aggressive performance rover built around oversized rear power units, stronger acceleration and a larger boost reserve.",
    imageSrc: `${ROVER_ASSET_ROOT}/ignition-runner.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-ignition-runner.png`,
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
    slug: "pathfinder-command",
    priceDt: 250,
    name: "Pathfinder Command",
    shortName: "Pathfinder",
    description:
      "A long-range command rover packed with navigation arrays, communications equipment and steadier all-terrain control.",
    imageSrc: `${ROVER_ASSET_ROOT}/pathfinder-command.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-pathfinder-command.png`,
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
    slug: "turbo-striker",
    priceDt: 625,
    name: "Turbo Striker",
    shortName: "Striker",
    description:
      "A sleek high-speed rover with twin turbo assemblies, a low aerodynamic profile and major gains in speed and jump power.",
    imageSrc: `${ROVER_ASSET_ROOT}/turbo-striker.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-turbo-striker.png`,
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
    slug: "aegis-defender",
    priceDt: 1560,
    name: "Aegis Defender",
    shortName: "Aegis",
    description:
      "A heavily armoured expedition rover designed to absorb punishment from crashes, traps and hostile course hazards.",
    imageSrc: `${ROVER_ASSET_ROOT}/aegis-defender.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-aegis-defender.png`,
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
    slug: "nova-hover-x",
    priceDt: 3900,
    name: "Nova Hover X",
    shortName: "Hover X",
    description:
      "The ultimate Skyforge vehicle: a high-output hover rover combining advanced propulsion, maximum aerial control and protective systems.",
    imageSrc: `${ROVER_ASSET_ROOT}/nova-hover-x.png`,
    gameImageSrc: `${ROVER_ASSET_ROOT}/side-nova-hover-x.png`,
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

export function getCurrentCoreRoverUpgrade(stage: number) {
  return getCoreRoverByStage(stage);
}

export function getNextCoreRoverUpgrade(stage: number) {
  const current = getCoreRoverByStage(stage);

  return coreUpgradeTrack.find(
    (upgrade) => upgrade.stage === current.stage + 1,
  );
}

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
